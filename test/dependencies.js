const Plugin = require('../src/plugin');
const RenderResult = require('../node_modules/stromboli/lib/render-result.js');
const test = require('tap').test;
const path = require('path');
const fs = require('fs');

test('font-face', function (t) {
  var plugin = new Plugin();

  t.plan(1);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/dependencies/font-face/index.scss'), renderResult).then(
    function(renderResult) {
      t.equal(renderResult.getDependencies().size, 5);
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('missing import', function (t) {
  var plugin = new Plugin();

  t.plan(1);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/dependencies/missing/import/index.scss'), renderResult).then(
    function() {
      t.fail();
    },
    function(err) {
      t.equal(renderResult.getDependencies().size, 1);
    }
  );
});

test('missing sub-import', function (t) {
  var plugin = new Plugin();

  t.plan(1);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/dependencies/missing/sub-import/index.scss'), renderResult).then(
    function() {
      t.fail();
    },
    function(err) {
      t.equal(renderResult.getDependencies().size, 2);
    }
  );
});

test('mixin error', function (t) {
  var plugin = new Plugin();

  t.plan(1);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/dependencies/error/mixin/index.scss'), renderResult).then(
    function() {
      t.fail();
    },
    function(err) {
      t.equal(renderResult.getDependencies().size, 2);
    }
  );
});