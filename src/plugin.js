const fs = require('fs');
const merge = require('merge');
const path = require('path');
const Rebaser = require('css-source-map-rebase');
const Readable = require('stream').Readable;
const through = require('through2');

const Promise = require('promise');

class Plugin {
  constructor(config) {
    this.config = config || {};
  }

  /**
   *
   * @param file {String}
   * @param output {String}
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
      binaryDependencies: [],
      sourceDependencies: [],
      error: null
    };

    var sassConfig = that.getConfig(file);

    sassConfig.outFile = output;
    sassConfig.sourceMap = true;

    return Promise.all([
      that.getDependencies(file).then(
        function (dependencies) {
          renderResult.sourceDependencies = dependencies;
        }
      ),
      sassRender(sassConfig).then(
        function (sassRenderResult) { // sass render success
          return new Promise(function (fulfill, reject) {
            let binary = '';

            let rebaser = new Rebaser({
              map: sassRenderResult.map.toString()
            });

            rebaser.on('rebase', function (rebased) {
              renderResult.binaryDependencies.push(path.resolve(rebased));
            });

            let stream = new Readable();

            stream
              .pipe(rebaser)
              .pipe(through(function (chunk, enc, cb) {
                binary = chunk;

                cb();
              }))
              .on('finish', function () {
                let outFile = sassConfig.outFile;

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

                fulfill(renderResult);
              });

            stream.push(sassRenderResult.css);
            stream.push(null);
          });
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

  getDependencies(file) {
    const SSDeps = require('stylesheet-deps');

    let dependencies = [];

    return new Promise(function (fulfill, reject) {
      let depper = new SSDeps({
        syntax: 'scss'
      });

      depper.on('data', function (dep) {
        dependencies.push(dep);
      });

      depper.on('missing', function (dep) {
        dependencies.push(dep);
      });

      depper.on('finish', function () {
        fulfill(dependencies);
      });

      depper.write(file);
      depper.end();
    });
  }

  getConfig(file) {
    return merge.recursive(true, {
      file: file,
      sourceMapEmbed: true
    }, this.config);
  };
}

module.exports = Plugin;