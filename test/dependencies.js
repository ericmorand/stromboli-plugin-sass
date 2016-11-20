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