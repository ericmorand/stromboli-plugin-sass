const fs = require('fs');
const merge = require('merge');
const path = require('path');
const gonzales = require('gonzales-pe');

const Promise = require('promise');

class Plugin {
  constructor(config) {
    this.config = config || {};
  }

  /**
   *
   * @param file {String}
   * @returns {Promise}
   */
  render(file, output) {
    var that = this;

    const sass = require('node-sass');
    const sassRender = Promise.denodeify(sass.render);

    if (!output) {
      output = 'index.css';
    }

    let renderResult = {
      binaries: [],
      dependencies: [],
      error: null
    };

    var pushDependency = function(dependency) {
      if (renderResult.dependencies.indexOf(dependency) < 0) {
        renderResult.dependencies.push(dependency);
      }
    };

    var replaceUrls = function (filePath) {
      if (!path.extname(filePath)) {
        filePath += '.scss';
      }

      try {
        var data = fs.readFileSync(filePath).toString();
      }
      catch (err) {
        // try with an "_"
        var basename = path.basename(filePath);
        var dirname = path.dirname(filePath);

        basename = '_' + basename;

        filePath = path.join(dirname, basename);

        data = fs.readFileSync(filePath).toString();
      }

      pushDependency(filePath);

      if (data) {
        try {
          var parseTree = gonzales.parse(data, {syntax: 'scss'});
          var basePath = path.dirname(path.relative(path.resolve('.'), filePath)).replace(/\\/g, '/');

          parseTree.traverseByType('uri', function (node, i, parentNode) {
            var contentNode = node.first('string');

            if (contentNode) {
              contentNode.content = contentNode.content + ', "' + basePath + '"';
            }
          });

          data = parseTree.toString();
        }
        catch (err) {
          // return data as-is
        }
      }

      return {
        file: filePath,
        contents: data
      };
    };

    var data = replaceUrls(file);

    pushDependency(file);

    var sassConfig = merge.recursive({
      file: data.file,
      data: data.contents,
      importer: function (url, prev, done) {
        var importPath = path.resolve(path.join(path.dirname(prev), url));

        try {
          var result = replaceUrls(importPath);
        }
        catch (err) {
          pushDependency(prev);

          return new Error(err.message);
        }

        return result;
      },
      functions: {
        'url($url, $base: null)': function (url, base) {
          if (base.getValue) {
            var Url = require('url');
            var urlUrl = Url.parse(url.getValue());
            var rewrotePath = null;

            if (urlUrl.host) {
              rewrotePath = url.getValue();
            }
            else {
              rewrotePath = path.join(base.getValue(), url.getValue());

              var resourceUrl = Url.parse(rewrotePath);
              var resolvedPath = path.resolve(resourceUrl.pathname);

              try {
                fs.statSync(resolvedPath);

                pushDependency(resolvedPath);
              }
              catch (err) {
                // that's OK, don't return the file as a dependency
              }
            }

            rewrotePath = rewrotePath.replace(/\\/g, '/');

            return new sass.types.String('url("' + rewrotePath + '")');
          }
          else {
            return new sass.types.String('url("' + url.getValue() + '")');
          }
        }
      }
    }, that.config);

    sassConfig.outFile = output;

    // sass render
    return sassRender(sassConfig).then(
      function (sassRenderResult) { // sass render success
        var outFile = sassConfig.outFile;
        var includedFiles = sassRenderResult.stats.includedFiles;

        return Promise.all(includedFiles.map(function (includedFile) {
          pushDependency(includedFile);

          return includedFile;
        })).then(function () {
          renderResult.binaries.push({
            name: outFile,
            data: sassRenderResult.css.toString()
          });

          if (sassRenderResult.map && !sassConfig.sourceMapEmbed) {
            renderResult.binaries.push({
              name: outFile + '.map',
              data: sassRenderResult.map.toString()
            });
          }

          return renderResult;
        });
      },
      function (err) {
        renderResult.error = {
          file: err.file,
          message: err.formatted
        };

        return Promise.reject(renderResult);
      }
    );
  }
}

module.exports = Plugin;