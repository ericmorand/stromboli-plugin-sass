const Plugin = require('../src/plugin');
const RenderResult = require('../node_modules/stromboli/lib/render-result.js');
const test = require('tap').test;
const path = require('path');
const fs = require('fs');

var cleanCSS = require('./_lib/clean-css');

test('render', function (t) {
  var plugin = new Plugin();

  t.plan(3);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/valid/index.scss'), renderResult).then(
    function(renderResult) {
      t.equal(renderResult.getDependencies().size, 6);
      t.equal(renderResult.getBinaries().length, 1);

      var render = renderResult.getBinaries()[0].data;
      var expected = fs.readFileSync(path.resolve('test/render/valid/expected.css')).toString();

      t.equal(cleanCSS(render), cleanCSS(expected));
    },
    function(err) {
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

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/map/index.scss'), renderResult).then(
    function(renderResult) {
      t.equal(renderResult.getDependencies().size, 1);
      t.equal(renderResult.getBinaries().length, 2);
    },
    function(err) {
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

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/map/index.scss'), renderResult).then(
    function(renderResult) {
      t.equal(renderResult.getDependencies().size, 1);
      t.equal(renderResult.getBinaries().length, 1);
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('render with outFile', function (t) {
  var plugin = new Plugin();

  t.plan(3);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/map/index.scss'), renderResult, 'custom.css').then(
    function(renderResult) {
      t.equal(renderResult.getDependencies().size, 1);
      t.equal(renderResult.getBinaries().length, 1);
      t.equal(renderResult.getBinaries()[0].name, 'custom.css');
    },
    function(err) {
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

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/map/index.scss'), renderResult, 'custom.css').then(
    function(renderResult) {
      t.equal(renderResult.getDependencies().size, 1);
      t.equal(renderResult.getBinaries().length, 2);
      t.equal(renderResult.getBinaries()[0].name, 'custom.css');
      t.equal(renderResult.getBinaries()[1].name, 'custom.css.map');
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('render with error', function (t) {
  var plugin = new Plugin();

  t.plan(1);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/error/index.scss'), renderResult).then(
    function(renderResult) {
      t.fail();
    },
    function(err) {
      var expected = fs.readFileSync(path.resolve('test/render/error/expected.txt')).toString();

      t.equal(err.message, expected);
    }
  );
});