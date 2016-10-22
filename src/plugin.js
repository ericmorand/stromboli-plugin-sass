const fs = require('fs-extra');
const merge = require('merge');
const path = require('path');

const Promise = require('promise');
const readFile = Promise.denodeify(fs.readFile);

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

      return readFile(filePath).then(
        function (data) {
          data = data.toString();

          var basePath = path.dirname(path.relative(path.resolve('.'), filePath));
          var regExp = /[:,\s]\s*url\s*\(\s*(?:'(\S*?)'|"(\S*?)"|((?:\\\s|\\\)|\\"|\\'|\S)*?))\s*\)/gi; // @see https://regex101.com/r/1ot3Ax/2

          var matches = null;

          while (matches = regExp.exec(data)) {
            var match = matches[0];
            var resourceUrl = matches[1] || matches[2];

            data = data.replace(match, ': stromboli-plugin-sass-url("' + resourceUrl + '", "' + basePath + '")');
          }

          return {
            file: filePath,
            contents: data
          };
        }
      );
    };

    return replaceUrls(file).then(
      function (data) {
        renderResult.addDependency(file);

        var sassConfig = merge.recursive({
          file: data.file,
          data: data.contents,
          outFile: 'index',
          importer: function (url, prev, done) {
            var importPath = path.resolve(path.join(path.dirname(prev), url));

            replaceUrls(importPath).then(
              function (data) {
                done(data);
              }
            );
          },
          functions: {
            'stromboli-plugin-sass-url($url, $base)': function (url, base) {
              var Url = require('url');
              var rewrotePath = path.join(base.getValue(), url.getValue());

              renderResult.addDependency(path.resolve(Url.parse(rewrotePath).pathname))

              return new sass.types.String('url("' + rewrotePath + '")');
            }
          }
        }, that.config);

        // sass render
        return sassRender(sassConfig).then(
          function (sassRenderResult) { // sass render success
            var includedFiles = sassRenderResult.stats.includedFiles;

            return Promise.all(includedFiles.map(function (includedFile) {
              renderResult.addDependency(includedFile);

              return includedFile;
            })).then(function () {
              renderResult.addBinary('index.css', sassRenderResult.css.toString());

              if (sassRenderResult.map) {
                renderResult.addBinary('index.map', sassRenderResult.map.toString());
              }

              return renderResult;
            });
          },
          function (err) {
            var error = {
              file: err.file,
              message: err.message
            };

            return Promise.reject(error);
          }
        );
      }
    );
  };
}

module.exports = Plugin;