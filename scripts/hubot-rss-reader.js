// Description:
//   Hubot RSS Reader
//
// Configuration:
//   HUBOT_RSS_PRINTIMAGE - Consumer key from https://developer.twitter.com/en/apps
//   HUBOT_RSS_INTERVAL - how often to check for new feeds
//   HUBOT_RSS_HEADER - RSS Header Emoji (default is "sushi")
//   HUBOT_RSS_USERAGENT - What useragent to use (default is "hubot-rss-reader/#{package_version}"
//   HUBOT_RSS_PRINTSUMMARY - should print summary (default is "true")
//   HUBOT_RSS_PRINTIMAGE - should print image in summary (default is "true")
//   HUBOT_RSS_PRINTERROR - should print error message (default is "true")
//   HUBOT_RSS_IRCCOLORS - should  use IRC color message (default is "false")
//   HUBOT_RSS_LIMIT_ON_ADD - limit printing entries on add new feed. (default is 5)
//
// Commands:
//   hubot rss add https://github.com/shokai.atom
//   hubot rss delete http://shokai.org/blog/feed
//   hubot rss delete #room_name
//   hubot rss list
//   hubot rss dump
//
// Author:
//   @shokai


const debug = require('debug')('hubot-rss-reader');

const util = require('util');
const FindRSS = util.promisify(require('find-rss'));
const RSSChecker = require('../libs/rss-checker');

// # config
const packageJson = require('../package.json');

if (!process.env.HUBOT_RSS_INTERVAL) { process.env.HUBOT_RSS_INTERVAL = 60 * 10; } // 10 minutes
if (!process.env.HUBOT_RSS_HEADER) { process.env.HUBOT_RSS_HEADER = ':sushi:'; }
if (!process.env.HUBOT_RSS_USERAGENT) { process.env.HUBOT_RSS_USERAGENT = `hubot-rss-reader/${packageJson.version}`; }
if (!process.env.HUBOT_RSS_PRINTSUMMARY) { process.env.HUBOT_RSS_PRINTSUMMARY = 'true'; }
if (!process.env.HUBOT_RSS_PRINTIMAGE) { process.env.HUBOT_RSS_PRINTIMAGE = 'true'; }
if (!process.env.HUBOT_RSS_PRINTERROR) { process.env.HUBOT_RSS_PRINTERROR = 'true'; }
if (!process.env.HUBOT_RSS_IRCCOLORS) { process.env.HUBOT_RSS_IRCCOLORS = 'false'; }
if (!process.env.HUBOT_RSS_LIMIT_ON_ADD) { process.env.HUBOT_RSS_LIMIT_ON_ADD = 5; }

module.exports = function (robot) {
  const logger = {
    info(msg) {
      if (debug.enabled) { return debug(msg); }
      // eslint-disable-next-line no-param-reassign
      if (typeof msg !== 'string') { msg = JSON.stringify(msg); }
      return robot.logger.info(`${debug.namespace}: ${msg}`);
    },
    error(msg) {
      if (debug.enabled) { return debug(msg); }
      // eslint-disable-next-line no-param-reassign
      if (typeof msg !== 'string') { msg = JSON.stringify(msg); }
      return robot.logger.error(`${debug.namespace}: ${msg}`);
    },
  };

  const getRoom = function (msg) {
    switch (robot.adapterName) {
      case 'hipchat':
        return msg.message.user.reply_to;
      default:
        return msg.message.room;
    }
  };

  const checker = new RSSChecker(robot);
  // eslint-disable-next-line no-param-reassign
  robot.RSSChecker = checker;

  // # wait until connect to brain
  robot.brain.once('loaded', () => {
    if (process.env.HUBOT_RSS_INTERVAL > 0) {
      const run = function (opts) {
        logger.info('checker start');
        return checker.check(opts)
          .then(() => {
            logger.info(`wait ${process.env.HUBOT_RSS_INTERVAL} seconds`);
            return setTimeout(run, 1000 * process.env.HUBOT_RSS_INTERVAL);
          },
          (err) => {
            logger.error(err);
            logger.info(`wait ${process.env.HUBOT_RSS_INTERVAL} seconds`);
            return setTimeout(run, 1000 * process.env.HUBOT_RSS_INTERVAL);
          });
      };

      run();
    }
  });


  const lastStateIsError = {};

  checker.on('new entry', (entry) => {
    lastStateIsError[entry.feed.url] = false;
    return (() => {
      const result = [];
      const object = checker.getAllFeeds();
      for (const room of Object.keys(object)) {
        const feeds = object[room];
        if (room !== entry.args.room && feeds.includes(entry.feed.url)) {
          logger.info(`${entry.title} ${entry.url} => ${room}`);
          result.push(robot.send({ room }, entry.toString()));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  });

  checker.on('error', (err) => {
    logger.error(err);
    if (process.env.HUBOT_RSS_PRINTERROR !== 'true') {
      return;
    }
    if (lastStateIsError[err.feed.url]) { // reduce error notify
      return;
    }
    lastStateIsError[err.feed.url] = true;
    const result = [];
    const object = checker.getAllFeeds();
    for (const room of Object.keys(object)) {
      const feeds = object[room];
      if (feeds.includes(err.feed.url)) {
        result.push(robot.send({ room }, `[ERROR] ${err.feed.url} - ${err.error.message || err.error}`));
      } else {
        result.push(undefined);
      }
    }
  });

  robot.respond(/rss\s+(add|register)\s+(https?:\/\/[^\s]+)$/im, async (msg) => {
    const url = msg.match[2].trim();
    lastStateIsError[url] = false;
    try {
      logger.info(`add ${url}`);
      const room = getRoom(msg);
      const res = await checker.addFeed(room, url);
      msg.send(res);
      const entries = await checker.fetch({ url, room });
      const entryLimit = process.env.HUBOT_RSS_LIMIT_ON_ADD === 'false'
        ? entries.length
        : process.env.HUBOT_RSS_LIMIT_ON_ADD - 0;

      for (const entry of entries.splice(0, entryLimit)) {
        msg.send(entry.toString());
      }

      if (entries.length > 0) {
        msg.send(`${process.env.HUBOT_RSS_HEADER} ${entries.length} entries has been omitted`);
      }
    } catch (err) {
      try {
        msg.send(`[ERROR] ${err}`);
        if (err.message !== 'Not a feed') { return; }
        checker.deleteFeed(getRoom(msg), url)
          .then(() => FindRSS(url)).then((feeds) => {
            if ((feeds != null ? feeds.length : undefined) < 1) { return; }
            msg.send([`found some Feeds from ${url}`].concat(feeds.map(i => ` * ${i.url}`)).join('\n'));
          });
      } catch (err2) {
        msg.send(`[ERROR] ${err2}`);
        logger.error(err2.stack);
      }
    }
  });


  robot.respond(/rss\s+delete\s+(https?:\/\/[^\s]+)$/im, (msg) => {
    const url = msg.match[1].trim();
    logger.info(`delete ${url}`);
    return checker.deleteFeed(getRoom(msg), url)
      .then(res => msg.send(res)).catch((err) => {
        msg.send(`Error: ${err.message}`);
        logger.error(err.stack);
      });
  });

  robot.respond(/rss\s+delete\s+#([^\s]+)$/im, (msg) => {
    const room = msg.match[1].trim();
    logger.info(`delete #${room}`);
    return checker.deleteRoom(room)
      .then(res => msg.send(res)).catch((err) => {
        msg.send(err);
        logger.error(err.stack);
      });
  });

  robot.respond(/rss\s+list$/i, (msg) => {
    const feeds = checker.getFeeds(getRoom(msg));
    if (feeds.length < 1) {
      return msg.send('nothing');
    }
    return msg.send(feeds.join('\n'));
  });

  robot.respond(/rss dump$/i, (msg) => {
    const feeds = checker.getAllFeeds();
    msg.send(JSON.stringify(feeds, null, 2));
  });
};
