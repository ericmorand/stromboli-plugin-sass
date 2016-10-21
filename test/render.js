const Plugin = require('../src/plugin');
const RenderResult = require('../node_modules/stromboli/lib/render-result.js');
const test = require('tap').test;
const path = require('path');
const fs = require('fs');

test('render', function (t) {
  var plugin = new Plugin({}, 'sass', 'index.scss');

  t.plan(3);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/valid/index.scss'), renderResult).then(
    function(renderResult) {
      t.equal(renderResult.getDependencies().size, 4);
      t.equal(renderResult.getBinaries().length, 1);

      var render = renderResult.getBinaries()[0].data;
      var awaited = '.test {\n  background: url("test/render/valid/images/background.png"); }\n  .test .inner {\n    background: url("test/images/background.png"); }\n';

      t.equal(render, awaited);
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
  }, 'sass', 'index.scss');

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

test('render with postcss', function (t) {
  var plugin = new Plugin({
    postcss: {
      plugins: [
        require('cssnano')()
      ]
    }
  }, 'sass', 'index.scss');

  t.plan(1);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/postcss/index.scss'), renderResult).then(
    function(renderResult) {
      var render = renderResult.getBinaries()[0].data;
      var awaited = '.render-with-postcss{color:tomato}';

      t.equal(render, awaited);
    },
    function(err) {
      t.fail(err);
    }
  );
});

test('render with error', function (t) {
  var plugin = new Plugin({}, 'sass', 'index.scss');

  t.plan(1);

  var renderResult = new RenderResult();

  return plugin.render(path.resolve('test/render/error/index.scss'), renderResult).then(
    function(renderResult) {
      t.fail();
    },
    function(err) {
      t.pass(err);
    }
  );
});