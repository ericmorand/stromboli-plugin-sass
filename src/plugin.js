const fs = require('fs');
const merge = require('merge');
const path = require('path');

const Promise = require('promise');
const Url = require('url');

class Plugin {
  constructor(config) {
    this.config = config || {};
  }

  /**
   *
   * @param file {String}
   * @param renderResult {StromboliRenderResult}
   * @returns {Promise}
   */
  render(file, renderResult) {
    var that = this;

    const sass = require('node-sass');
    const sassRender = Promise.denodeify(sass.render);

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

      renderResult.addDependency(filePath);

      var basePath = path.dirname(path.relative(path.resolve('.'), filePath)).replace(/\\/g, '/');
      var regExp = /\s*url\s*\(\s*(?:'(\S*?)'|"(\S*?)"|((?:\\\s|\\\)|\\"|\\'|\S)*?))\s*\)/gi; // @see https://regex101.com/r/1ot3Ax/3

      var matches = null;

      while (matches = regExp.exec(data)) {
        var match = matches[0];
        var resourceUrl = matches[1] || matches[2];

        data = data.replace(match, ' stromboli-plugin-sass-url("' + resourceUrl + '", "' + basePath + '")');
      }

      return {
        file: filePath,
        contents: data
      };
    };

    var data = replaceUrls(file);

    renderResult.addDependency(file);

    var sassConfig = merge.recursive({
      file: data.file,
      data: data.contents,
      outFile: 'index.css',
      importer: function (url, prev, done) {
        var importPath = path.resolve(path.join(path.dirname(prev), url));

        try {
          var result = replaceUrls(importPath);
        }
        catch (err) {
          renderResult.addDependency(prev);

          return new Error(err.message);
        }

        return result;
      },
      functions: {
        'stromboli-plugin-sass-url($url, $base)': function (url, base) {
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

              renderResult.addDependency(resolvedPath)
            }
            catch (err) {
              // that's OK, don't return the file as a dependency
            }
          }

          rewrotePath = rewrotePath.replace(/\\/g, '/');

          return new sass.types.String('url("' + rewrotePath + '")');
        }
      }
    }, that.config);

    // sass render
    return sassRender(sassConfig).then(
      function (sassRenderResult) { // sass render success
        var outFile = sassConfig.outFile || 'index.css';
        var includedFiles = sassRenderResult.stats.includedFiles;

        return Promise.all(includedFiles.map(function (includedFile) {
          renderResult.addDependency(includedFile);

          return includedFile;
        })).then(function () {
          renderResult.addBinary(outFile, sassRenderResult.css.toString());

          if (sassRenderResult.map && !sassConfig.sourceMapEmbed) {
            renderResult.addBinary(outFile + '.map', sassRenderResult.map.toString());
          }

          return renderResult;
        });
      },
      function (err) {
        var error = {
          file: err.file,
          message: err.formatted
        };

        return Promise.reject(error);
      }
    );
  }
}

module.exports = Plugin;