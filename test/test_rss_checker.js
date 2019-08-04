const path = require('path');
const should = require('should');
const Helper = require('hubot-test-helper');
const nock = require('nock');

const RSSChecker = require('../libs/rss-checker.js');

const scriptHelper = new Helper('../libs/rss-checker.js');
nock.disableNetConnect();

describe('RSSChecker', function () {
  beforeEach(() => {
    nock('https://github.com')
      .get('/shokai.atom')
      .replyWithFile(200, path.join(__dirname, 'fixtures', 'shokai.atom'), { 'Content-Type': 'application/atom+xml; charset=utf-8' });
    nock('http://shokai.org')
      .get('/blog/feed')
      .times(5)
      .replyWithFile(200, path.join(__dirname, 'fixtures', 'shokai.blog.feed'), { 'Content-Type': 'application/rss+xml; charset=utf-8' });
    this.room = scriptHelper.createRoom({ httpd: false });
    this.rssChecker = new RSSChecker(this.room.robot);
  });
  afterEach(() => {
    this.room.destroy();
    nock.cleanAll();
  });

  describe('method "fetch"', () => {
    it('should emit the event "new entry", and callback entries Array', async () => {
      this.timeout(5000);

      const allEntries = [];
      this.rssChecker.on('new entry', entry => allEntries.push(entry));

      await this.rssChecker.fetch('http://shokai.org/blog/feed')
        .then((entries) => {
          for (const entry of entries) {
            entry.should.have.keys('url', 'title', 'summary', 'feed');
            entry.feed.should.have.keys('url', 'title');
          }
          entries.sort().should.eql(allEntries.sort());
        });
    });

    it('should not emit the event "new entry" if already crawled', async () => {
      this.timeout(5000);
      await this.rssChecker.fetch('http://shokai.org/blog/feed');

      this.rssChecker.on('new entry', () => should.ok(false));

      await this.rssChecker.fetch('http://shokai.org/blog/feed');
    });
  });
  describe('methods "getAllFeeds"', () => {
    it('returns a list of all feeds', async () => {
      this.timeout(15000);
      this.rssChecker.addFeed('samplerepo', 'https://github.com/shokai.atom');
      this.rssChecker.getAllFeeds().should.be.eql({
        samplerepo: ['https://github.com/shokai.atom'],
      });
      this.rssChecker.getFeeds('samplerepo').should.be.eql(['https://github.com/shokai.atom']);
    });
  });

  describe('methods "check"', () => {
    it('should emit the event "new entry"', async () => {
      this.timeout(15000);

      this.rssChecker.on('new entry', () => should.ok(true, 'detect new entry'));

      await this.rssChecker.check({
        feeds: [
          'http://shokai.org/blog/feed',
          'https://github.com/shokai.atom',
        ],
      });
    });
  });
});
