const fs = require('fs');
const merge = require('merge');
const path = require('path');
const gonzales = require('gonzales-pe');
const Url = require('url');

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

      if (data) {
        try {
          var parseTree = gonzales.parse(data, {syntax: 'scss'});
          var basePath = path.dirname(path.relative(path.resolve('.'), filePath)).replace(/\\/g, '/');

          parseTree.traverseByType('uri', function (node, i, parentNode) {
            var contentNode = node.first('string');

            if (!contentNode) {
              contentNode = node.first('raw');

              if (contentNode) {
                contentNode.content = '"' + contentNode.content + '"';
              }
            }

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

    var sassConfig = merge.recursive({
      file: data.file,
      data: data.contents,
      importer: function (url, prev, done) {
        var importPath = path.resolve(path.join(path.dirname(prev), url));
        var result = replaceUrls(importPath);

        return result;
      },
      functions: {
        'url($url, $base: null)': function (url, base) {
          if (base.getValue) {
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

    return Promise.all([
      that.getDependencies(file).then(
        function (dependencies) {
          renderResult.dependencies = dependencies;
        }
      ),
      sassRender(sassConfig).then(
        function (sassRenderResult) { // sass render success
          var outFile = sassConfig.outFile;
          var binary = sassRenderResult.css.toString();

          renderResult.binaries.push({
            name: outFile,
            data: binary
          });

          if (sassRenderResult.map && !sassConfig.sourceMapEmbed) {
            renderResult.binaries.push({
              name: outFile + '.map',
              data: sassRenderResult.map.toString()
            });
          }

          return that.getDependencies(file, binary).then(
            function (dependencies) {
              dependencies.forEach(function(dependency) {
                renderResult.dependencies.push(dependency);
              });

              return renderResult;
            }
          )
        },
        function (err) {
          renderResult.error = {
            file: err.file,
            message: err.formatted
          };

          return Promise.reject(renderResult);
        }
      )
    ]).then(
      function () {
        return renderResult;
      }
    );
  }

  getDependencies(file, binary) {
    const SSDeps = require('stylesheet-deps');

    let dependencies = [];

    return new Promise(function (fulfill, reject) {
      let depper = new SSDeps({
        syntax: binary ? 'css' : 'scss'
      });

      depper.on('data', function (dep) {
        dependencies.push(dep);
      });

      depper.on('missing', function (dep) {
        dependencies.push(dep);
      });

      depper.on('error', function (err) {
        // noop, we don't care but we have to catch this
      });

      depper.on('finish', function () {
        fulfill(dependencies);
      });

      if (binary) {
        depper.inline(binary, path.dirname(file));
      }
      else {
        depper.write(file);
      }

      depper.end();
    });
  }
}

module.exports = Plugin;