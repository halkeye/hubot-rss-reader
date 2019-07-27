/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const path = require('path');
require(path.resolve('tests', 'test_helper'));

const assert     = require('assert');
const RSSChecker = require(path.resolve('libs', 'rss-checker'));
const Promise    = require('bluebird');
const DummyBot   = require('./dummy_bot');

let checker = new RSSChecker(new DummyBot);

describe('RSSChecker', function() {

  it('sohuld have method "fetch"', () => assert.equal(typeof checker['fetch'], 'function'));

  describe('method "fetch"', function() {

    it('should emit the event "new entry", and callback entries Array', function() {

      this.timeout(5000);

      checker = new RSSChecker(new DummyBot);
      const _entries = [];
      checker.on('new entry', entry => _entries.push(entry));

      return checker.fetch('http://shokai.org/blog/feed')
      .then(function(entries) {
        assert.ok(entries instanceof Array);
        for (let entry of Array.from(entries)) {
          assert.equal(typeof entry.url, 'string', '"url" property not exists');
          assert.equal(typeof entry.title, 'string', '"title" property not exists');
          assert.equal(typeof entry.summary, 'string', '"summary" property not exists');
          assert.equal(typeof (entry.feed != null ? entry.feed.url : undefined), 'string', '"feed.url" property not exists');
          assert.equal(typeof (entry.feed != null ? entry.feed.title : undefined), 'string', '"feed.title" property not exists');
        }
        return assert.equal(JSON.stringify(entries.sort()), JSON.stringify(_entries.sort()));
      });
    });




    return it('should not emit the event "new entry" if already crawled', function() {

      this.timeout(5000);

      checker.on('new entry', entry => assert.ok(false));

      return checker.fetch('http://shokai.org/blog/feed')
      .then(entries =>
        new Promise(function(resolve, reject) {
          return setTimeout(() => resolve(entries)
          , 500);
        })
      );
    });
  });



  it('should have method "check"', () => assert.equal(typeof checker['check'], 'function'));

  return describe('methods "check"', () =>

    it('should emit the event "new entry"', function() {

      this.timeout(15000);

      checker = new RSSChecker(new DummyBot);
      checker.on('new entry', entry => assert.ok(true, 'detect new entry'));

      return checker.check({
        feeds: [
          'http://shokai.org/blog/feed',
          'https://github.com/shokai.atom'
        ]});
  })
);
});
