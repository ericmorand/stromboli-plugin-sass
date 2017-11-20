const Plugin = require('../src/plugin');
const test = require('tap').test;
const path = require('path');
const fs = require('fs');

var cleanCSS = require('./_lib/clean-css');

test('render', function (t) {
  var plugin = new Plugin({
    sourceComments: true
  });

  t.plan(4);

  return plugin.render(path.resolve('test/render/valid/index.scss')).then(
    function (renderResult) {
      t.same(renderResult.binaryDependencies.sort(), [
        path.resolve('test/render/valid/import/false.eot'),
        path.resolve('test/render/valid/images/local-background.png'),
        path.resolve('test/render/images/foo.png'),
        path.resolve('test/render/images/bar.png'),
        path.resolve('test/images/background-without-quote.png'),
        path.resolve('test/images/background.png')
      ].sort());

      t.same(renderResult.sourceDependencies.sort(), [
        path.resolve('test/render/valid/index.scss'),
        path.resolve('test/render/valid/_import2.scss'),
        path.resolve('test/render/valid/import/index.scss'),
        path.resolve('test/render/valid/foo.bar.scss')
      ].sort());

      t.equal(renderResult.binaries.length, 1);

      var render = renderResult.binaries[0].data;
      var expected = fs.readFileSync(path.resolve('test/render/valid/expected.css')).toString();

      t.equal(cleanCSS(render), cleanCSS(expected));
    },
    function (err) {
      t.fail(err);
    }
  );
});

test('render with external map', function (t) {
  var plugin = new Plugin({
    sourceMap: true,
    sourceComments: true,
    sourceMapEmbed: false
  });

  t.plan(2);

  return plugin.render(path.resolve('test/render/map/index.scss')).then(
    function (renderResult) {
      t.equal(renderResult.sourceDependencies.length, 1);
      t.equal(renderResult.binaries.length, 2);
    },
    function (err) {
      t.fail(err);
    }
  );
});

test('render with outFile', function (t) {
  var plugin = new Plugin();

  t.plan(3);

  return plugin.render(path.resolve('test/render/map/index.scss'), 'custom.css').then(
    function (renderResult) {
      t.equal(renderResult.sourceDependencies.length, 1);
      t.equal(renderResult.binaries.length, 1);
      t.equal(renderResult.binaries[0].name, 'custom.css');
    },
    function (err) {
      t.fail(err);
    }
  );
});

test('render with outFile and external map', function (t) {
  var plugin = new Plugin({
    sourceMap: true,
    sourceComments: true,
    sourceMapEmbed: false
  });

  t.plan(4);

  return plugin.render(path.resolve('test/render/map/index.scss'), 'custom.css').then(
    function (renderResult) {
      t.equal(renderResult.sourceDependencies.length, 1);
      t.equal(renderResult.binaries.length, 2);
      t.equal(renderResult.binaries[0].name, 'custom.css');
      t.equal(renderResult.binaries[1].name, 'custom.css.map');
    },
    function (err) {
      t.fail(err);
    }
  );
});

test('render with error in entry', function (t) {
  var plugin = new Plugin();

  t.plan(3);

  return plugin.render(path.resolve('test/render/error/index.scss')).then(
    function (renderResult) {
      t.fail();
    },
    function (renderResult) {
      t.same(renderResult.sourceDependencies, [
        path.resolve('test/render/error/index.scss')
      ]);
      t.equal(renderResult.error.file, path.resolve('test/render/error/index.scss'));
      t.ok(renderResult.error.message);
    }
  );
});

test('render with error in import', function (t) {
  var plugin = new Plugin();

  t.plan(3);

  return plugin.render(path.resolve('test/render/error-in-import/index.scss')).then(
    function (renderResult) {
      t.fail();
    },
    function (renderResult) {
      t.same(renderResult.sourceDependencies, [
        path.resolve('test/render/error-in-import/index.scss'),
        path.resolve('test/render/error-in-import/bar.scss')
      ]);
      t.equal(renderResult.error.file, path.resolve('test/render/error-in-import/bar.scss'));
      t.ok(renderResult.error.message);
    }
  );
});

test('render with duplicate import', function (t) {
  var plugin = new Plugin();

  t.plan(2);

  return plugin.render(path.resolve('test/render/duplicate-import/index.scss')).then(
    function (renderResult) {
      t.same(renderResult.sourceDependencies.sort(), [
        path.resolve('test/render/duplicate-import/index.scss'),
        path.resolve('test/render/duplicate-import/foo.scss')
      ].sort());

      t.equal(renderResult.binaries.length, 1);
    },
    function (err) {
      t.fail(err);
    }
  );
});

test('render with missing import', function (t) {
  var plugin = new Plugin();

  t.plan(3);

  return plugin.render(path.resolve('test/render/missing-import/entry.scss')).then(
    function (renderResult) {
      t.fail();
    },
    function (renderResult) {
      t.same(renderResult.sourceDependencies, [
        path.resolve('test/render/missing-import/entry.scss'),
        path.resolve('test/render/missing-import/foo.scss'),
        path.resolve('test/render/missing-import/_foo.scss')
      ]);
      t.equal(renderResult.error.file, path.resolve('test/render/missing-import/entry.scss'));
      t.ok(renderResult.error.message);
    }
  );
});

test('render with file specific config', function (t) {
  let file = path.resolve('test/render/file-specific-config/index.scss');
  let data = `.foo {content: "${file}";}`;

  class CustomPlugin extends Plugin {
    getConfig(file) {
      let config = super.getConfig(file);

      config.data = data;

      return config;
    }
  }

  var plugin = new CustomPlugin();

  t.plan(1);

  plugin.render(file).then(
    function (renderResult) {
      t.equal(cleanCSS(renderResult.binaries[0].data), cleanCSS(data));
    },
    function (renderResult) {
      t.fail();
    }
  );
});