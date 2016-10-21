const StromboliPlugin = require('stromboli-plugin');

var log = require('log-util');
var merge = require('merge');
var path = require('path');

var Promise = require('promise');

class Plugin extends StromboliPlugin {
  /**
   *
   * @param file {String}
   * @param renderResult {StromboliRenderResult}
   * @returns {Promise}
   */
  render(file, renderResult) {
    var that = this;
    var sass = require('node-sass');
    var sassRender = Promise.denodeify(sass.render);

    var sassConfig = merge.recursive({
      file: file,
      outFile: 'index',
      importer: function (url, prev, done) {
        var importPath = path.resolve(path.join(path.dirname(prev), url));

        if (!path.extname(importPath)) {
          importPath += '.scss';
        }

        that.readFile(importPath).then(
          function (data) {
            var basePath = path.dirname(path.relative(path.resolve('.'), importPath));
            var regExp = /[:,\s]\s*url\s*\(\s*(?:'(\S*?)'|"(\S*?)"|((?:\\\s|\\\)|\\"|\\'|\S)*?))\s*\)/gi; // @see https://regex101.com/r/1ot3Ax/2

            var matches = null;

            while (matches = regExp.exec(data)) {
              var match = matches[0];
              var resourceUrl = matches[1] || matches[2];

              data = data.replace(match, ': stromboli-plugin-sass-url("' + resourceUrl + '", "' + basePath + '")');
            }

            done({
              file: importPath,
              contents: data
            });
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
          var processConfig = {
            from: path.join('index')
          };

          if (sassRenderResult.map) {
            processConfig.map = {
              prev: sassRenderResult.map.toString(),
              inline: false
            };
          }

          return that.postprocessCss(sassRenderResult.css, processConfig).then(
            function (result) {
              renderResult.addBinary('index.css', result.css);

              if (result.map) {
                renderResult.addBinary('index.map', result.map.toString());
              }

              return renderResult;
            }
          );
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
  };

  postprocessCss(css, config) {
    var that = this;
    var plugins = [];

    if (that.config.postcss && that.config.postcss.plugins) {
      plugins = that.config.postcss.plugins;
    }

    var postcss = require('postcss')(plugins);

    return postcss.process(css, config);
  };
}

module.exports = Plugin;