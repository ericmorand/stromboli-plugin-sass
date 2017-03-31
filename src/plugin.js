const fs = require('fs');
const merge = require('merge');
const path = require('path');
const Rebaser = require('css-region-rebase');
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
      dependencies: [],
      error: null
    };

    let cache = new Map();

    let customImporter = function (url, prev, done) {
      let importPath = path.resolve(path.join(path.dirname(prev), url));

      let ext = '.scss';

      if (path.extname(importPath) !== ext) {
        importPath += ext;
      }

      let contents = '';

      if (!cache.has(importPath)) {
        cache.set(importPath, true);

        try {
          contents = fs.readFileSync(importPath).toString();
        }
        catch (err) {
          // try with an "_"
          let basename = path.basename(importPath);
          let dirname = path.dirname(importPath);

          basename = '_' + basename;

          importPath = path.join(dirname, basename);

          contents = fs.readFileSync(importPath).toString();
        }

        if (contents.length) {
          let basePath = path.dirname(path.relative(path.resolve('.'), importPath)).replace(/\\/g, '/');

          let contentsComponents = [
            '/* region stromboli-plugin-sass: ' + basePath + ' */',
            contents,
            '/* endregion stromboli-plugin-sass: ' + basePath + ' */'
          ];

          contents = contentsComponents.join('');
        }
      }

      return {
        file: importPath,
        contents: contents
      };
    };

    let data = customImporter(path.relative(path.resolve('.'), file), '.');

    var sassConfig = merge.recursive({
      file: data.file,
      data: data.contents,
      importer: customImporter
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
          return new Promise(function (fulfill, reject) {
            let binary = '';

            let rebaser = new Rebaser({
              format: 'stromboli-plugin-sass:'
            });

            rebaser.on('rebase', function (rebased) {
              renderResult.dependencies.push(path.resolve(rebased));
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
}

module.exports = Plugin;