const Plugin = require('../src/plugin');
const test = require('tap').test;
const path = require('path');
const fs = require('fs');

test('font-face', function (t) {
  var plugin = new Plugin();

  t.plan(1);
  
  return plugin.render(path.resolve('test/dependencies/font-face/index.scss')).then(
    function(renderResult) {
      t.equal(renderResult.dependencies.length, 5);
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('missing import', function (t) {
  var plugin = new Plugin();

  t.plan(1);
  
  return plugin.render(path.resolve('test/dependencies/missing/import/index.scss')).then(
    function() {
      t.fail();
    },
    function(renderResult) {
      t.equal(renderResult.dependencies.length, 1);
    }
  );
});

test('missing sub-import', function (t) {
  var plugin = new Plugin();

  t.plan(1);
  
  return plugin.render(path.resolve('test/dependencies/missing/sub-import/index.scss')).then(
    function() {
      t.fail();
    },
    function(renderResult) {
      t.equal(renderResult.dependencies.length, 2);
    }
  );
});

test('data:image/svg+xml', function (t) {
  var plugin = new Plugin();

  t.plan(1);
  
  return plugin.render(path.resolve('test/dependencies/svg/index.scss')).then(
    function(renderResult) {
      t.equal(renderResult.dependencies.length, 1);
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('mixin error', function (t) {
  var plugin = new Plugin();

  t.plan(1);
  
  return plugin.render(path.resolve('test/dependencies/error/mixin/index.scss')).then(
    function() {
      t.fail();
    },
    function(renderResult) {
      t.equal(renderResult.dependencies.length, 2);
    }
  );
});