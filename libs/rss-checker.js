// Description:
//   RSS Checker Component for Hubot RSS Reader
//
// Author:
//   @shokai


const events = require('events');
const request = require('request');
const FeedParser = require('feedparser');
const Entities = require('html-entities').XmlEntities;

const entities = new Entities();
const debug = require('debug')('hubot-rss-reader:rss-checker');
const cheerio = require('cheerio');
const IrcColor = require('irc-colors');

const charsetConvertStream = require('./charset-convert-stream');
const Entries = require('./entries');

// eslint-disable-next-line no-underscore-dangle
function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}

class RSSChecker extends events.EventEmitter {
  constructor(robot) {
    super();
    this.robot = robot;
    this.entries = new Entries(this.robot);
  }

  getSummaryFromHtml(html) {
    try {
      const $ = cheerio.load(html);
      if (process.env.HUBOT_RSS_PRINTIMAGE === 'true') {
        const img = $('img').attr('src');
        if (img) {
          return `${img}\n${$.root().text()}`;
        }
      }
      return $.root().text();
    } catch (error) {
      return html;
    }
  }

  cleanupSummary(html = '') {
    let summary = this.getSummaryFromHtml(html);
    let lines = summary.split(/[\r\n]/);
    lines = lines.map((line) => { if (/^\s+$/.test(line)) { return ''; } return line; });
    summary = lines.join('\n');
    return summary.replace(/\n\n\n+/g, '\n\n');
  }

  async fetch(args) {
    return new Promise((resolve, reject) => {
      if (typeof args === 'string') {
        // eslint-disable-next-line no-param-reassign
        args = { url: args };
      }

      debug(`fetch ${args.url}`);
      debug(args);
      const feedparser = new FeedParser();
      const req = request({
        uri: args.url,
        timeout: 10000,
        encoding: null,
        headers: {
          'User-Agent': process.env.HUBOT_RSS_USERAGENT,
        },
      });

      req.on('error', err => reject(err));

      req.on('response', (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`statusCode: ${res.statusCode}`));
        }
        return req
          .pipe(charsetConvertStream())
          .pipe(feedparser);
      });

      feedparser.on('error', err => reject(err));

      const entries = [];
      feedparser.on('data', (chunk) => {
        const entry = {
          url: chunk.link,
          title: entities.decode(chunk.title || ''),
          summary: this.cleanupSummary(entities.decode(chunk.summary || chunk.description || '')),
          feed: {
            url: args.url,
            title: entities.decode(feedparser.meta.title || ''),
          },
          toString() {
            let s;
            if (process.env.HUBOT_RSS_IRCCOLORS === 'true') {
              s = `${IrcColor.pink(process.env.HUBOT_RSS_HEADER)} ${this.title} ${IrcColor.purple(`- [${this.feed.title}]`)}\n${IrcColor.lightgrey.underline(this.url)}`;
            } else {
              s = `${process.env.HUBOT_RSS_HEADER} ${this.title} - [${this.feed.title}]\n${this.url}`;
            }

            if ((process.env.HUBOT_RSS_PRINTSUMMARY === 'true') && ((this.summary != null ? this.summary.length : undefined) > 0)) {
              s += `\n${this.summary}`;
            }
            return s;
          },
          args,
        };

        debug(entry);
        entries.push(entry);
        if (!this.entries.include(entry.url)) {
          this.entries.add(entry.url);
          this.emit('new entry', entry);
        }
      });

      feedparser.on('end', () => resolve(entries));
    });
  }

  check(opts) {
    // eslint-disable-next-line no-param-reassign
    if (opts == null) { opts = {}; }
    return new Promise((resolve) => {
      debug('start checking all feeds');
      let feeds = [];
      const object = opts.feeds || this.robot.brain.get('feeds') || [];
      for (const room of Object.keys(object)) {
        feeds = feeds.concat(object[room]);
      }
      return resolve([...new Set(feeds)]);
    }).then((feeds) => {
      const promises = [];
      for (const url of feeds) {
        promises.push(this.fetch({ ...opts, url })
          .then((data) => {
            debug(`check done (${(data != null ? data.length : undefined) || 0} feeds)`);
            return data;
          })
          .catch((err) => {
            debug(err);
            this.emit('error', { error: err, feed: { url } });
          }));
      }
      return Promise.all(promises);
    });
  }

  getAllFeeds() {
    return this.robot.brain.get('feeds');
  }

  getFeeds(room) {
    return __guard__(this.getAllFeeds(), x => x[room]) || [];
  }

  setFeeds(room, urls) {
    if (!(urls instanceof Array)) { return; }
    const feeds = this.robot.brain.get('feeds') || {};
    feeds[room] = urls;
    this.robot.brain.set('feeds', feeds);
  }

  async addFeed(room, url) {
    const feeds = this.getFeeds(room);
    if (feeds.includes(url)) {
      throw new Error(`${url} is already registered`);
    }
    feeds.push(url);
    this.setFeeds(room, feeds.sort());
    return `registered ${url}`;
  }

  async deleteFeed(room, url) {
    const feeds = this.getFeeds(room);
    if (!feeds.includes(url)) {
      debug(`Feeds for ${room}: ${JSON.stringify(feeds)}`);
      throw new Error(`${url} is not registered`);
    }
    feeds.splice(feeds.indexOf(url), 1);
    this.setFeeds(room, feeds);
    if (feeds.length === 0) {
      await this.deleteRoom(room);
    }
    return `deleted ${url}`;
  }

  async deleteRoom(name) {
    const rooms = this.getAllFeeds() || {};
    if (!(name in rooms)) {
      throw new Error(`room #${name} is not exists`);
    }
    delete rooms[name];
    this.robot.brain.set('feeds', rooms);
    return `deleted room #${name}`;
  }
}

module.exports = function Exported(robot) {
  // eslint-disable-next-line no-param-reassign
  return new RSSChecker(robot);
};
