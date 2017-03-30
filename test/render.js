const Plugin = require('../src/plugin');
const test = require('tap').test;
const path = require('path');
const fs = require('fs');

var cleanCSS = require('./_lib/clean-css');

test('render', function (t) {
  var plugin = new Plugin();

  t.plan(3);

  return plugin.render(path.resolve('test/render/valid/index.scss')).then(
    function (renderResult) {
      t.same(renderResult.dependencies.sort(), [
        path.resolve('test/render/valid/index.scss'),
        path.resolve('test/render/valid/_import2.scss'),
        path.resolve('test/render/valid/import/index.scss'),
        path.resolve('test/render/valid/import/false.eot'),
        path.resolve('test/render/valid/images/local-background.png'),
        path.resolve('test/render/images/foo.png'),
        path.resolve('test/render/images/bar.png'),
        path.resolve('test/images/background-without-quote.png'),
        path.resolve('test/images/background.png')
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

test('render with map', function (t) {
  var plugin = new Plugin({
    sourceMap: true,
    sourceComments: true
  });

  t.plan(2);

  return plugin.render(path.resolve('test/render/map/index.scss')).then(
    function (renderResult) {
      t.equal(renderResult.dependencies.length, 1);
      t.equal(renderResult.binaries.length, 2);
    },
    function (err) {
      t.fail(err);
    }
  );
});

test('render with embedded map', function (t) {
  var plugin = new Plugin({
    sourceMap: true,
    sourceComments: true,
    sourceMapEmbed: true
  });

  t.plan(2);

  return plugin.render(path.resolve('test/render/map/index.scss')).then(
    function (renderResult) {
      t.equal(renderResult.dependencies.length, 1);
      t.equal(renderResult.binaries.length, 1);
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
      t.equal(renderResult.dependencies.length, 1);
      t.equal(renderResult.binaries.length, 1);
      t.equal(renderResult.binaries[0].name, 'custom.css');
    },
    function (err) {
      t.fail(err);
    }
  );
});

test('render with outFile and map', function (t) {
  var plugin = new Plugin({
    sourceMap: true,
    sourceComments: true
  });

  t.plan(4);

  return plugin.render(path.resolve('test/render/map/index.scss'), 'custom.css').then(
    function (renderResult) {
      t.equal(renderResult.dependencies.length, 1);
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

  return plugin.render(path.resolve('test/render/error/index.scss')).then(
    function (renderResult) {
      t.fail();
    },
    function (renderResult) {
      t.same(renderResult.dependencies, [
        path.resolve('test/render/error/index.scss')
      ]);
      t.equal(renderResult.error.file, path.resolve('test/render/error/index.scss'));
      t.ok(renderResult.error.message);
    }
  );
});

test('render with error in import', function (t) {
  var plugin = new Plugin();

  return plugin.render(path.resolve('test/render/error-in-import/index.scss')).then(
    function (renderResult) {
      t.fail();
    },
    function (renderResult) {
      t.same(renderResult.dependencies, [
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
      t.same(renderResult.dependencies.sort(), [
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