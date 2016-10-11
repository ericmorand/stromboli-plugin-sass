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
      functions: {
        'local-url($url, $base)': function (url, base) {
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

  getPostCSSProcessors() {
    return [];
  }

  postprocessCss(css, config) {
    var that = this;

    var postcss = require('postcss')();
    var processors = this.getPostCSSProcessors();

    processors.forEach(function (processor) {
      postcss.use(processor);
    });

    return postcss.process(css, config);
  };
}

module.exports = Plugin;