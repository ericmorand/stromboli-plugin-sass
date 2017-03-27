const Plugin = require('../src/plugin');
const tap = require('tap');
const path = require('path');

let plugin = new Plugin({});

tap.test('getDependencies', function (test) {
  test.plan(3);

  test.test('should resolve with dependencies on success', function (test) {
    return plugin.getDependencies(path.resolve('test/get-dependencies/valid/index.scss')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-dependencies/valid/index.scss'),
          path.resolve('test/get-dependencies/valid/foo.scss'),
          path.resolve('test/get-dependencies/valid/foo.png'),
          'http://foo.bar/foo.png'
        ].sort());

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    )
  });

  test.test('should resolve with dependencies on error', function (test) {
    return plugin.getDependencies(path.resolve('test/get-dependencies/error/index.scss')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-dependencies/error/index.scss')
        ].sort());

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    )
  });

  test.test('should resolve with dependencies on missing dependency', function (test) {
    return plugin.getDependencies(path.resolve('test/get-dependencies/missing/index.scss')).then(
      function (results) {
        test.same(results.sort(), [
          path.resolve('test/get-dependencies/missing/index.scss'),
          path.resolve('test/get-dependencies/missing/foo.scss')
        ].sort());

        test.end();
      },
      function (err) {
        test.fail(err);

        test.end();
      }
    )
  });
});