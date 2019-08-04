/* eslint no-underscore-dangle: 0 */
const Helper = require('hubot-test-helper');
const should = require('should');

const scriptHelper = new Helper('../scripts/hubot-rss-reader.js');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

let room;
describe('rsschecker', () => {
  beforeEach(() => {
    room = scriptHelper.createRoom({ httpd: false });
    room.robot.RSSChecker.fetch = async () => [];
  });
  afterEach(() => { room.destroy(); });

  describe('rss add', () => {
    beforeEach(async () => room.user.say('Shell', 'hubot rss add https://www.prusa3d.com/feed/mk3s-drivers-rss').then(() => sleep(25)));
    it('doesnt error', () => {
      room.messages.should.eql([
        ['Shell', 'hubot rss add https://www.prusa3d.com/feed/mk3s-drivers-rss'],
        ['hubot', 'registered https://www.prusa3d.com/feed/mk3s-drivers-rss'],
      ]);
    });
  });
  describe('rss delete', () => {
    it('happy path doesnt error', async () => {
      await room.user.say('Shell', 'hubot rss add https://www.prusa3d.com/feed/mk3s-drivers-rss');
      await sleep(25);
      await room.user.say('Shell', 'hubot rss add https://www.prusa3d.com/');
      await sleep(25);
      room.robot.brain.data._private.feeds.should.eql({
        room1: ['https://www.prusa3d.com/', 'https://www.prusa3d.com/feed/mk3s-drivers-rss'],
      });
      await room.user.say('Shell', 'hubot rss delete https://www.prusa3d.com/feed/mk3s-drivers-rss');
      await sleep(25);
      room.robot.brain.data._private.feeds.should.eql({
        room1: ['https://www.prusa3d.com/'],
      });
      room.messages.should.eql([
        ['Shell', 'hubot rss add https://www.prusa3d.com/feed/mk3s-drivers-rss'],
        ['hubot', 'registered https://www.prusa3d.com/feed/mk3s-drivers-rss'],
        ['Shell', 'hubot rss add https://www.prusa3d.com/'],
        ['hubot', 'registered https://www.prusa3d.com/'],
        ['Shell', 'hubot rss delete https://www.prusa3d.com/feed/mk3s-drivers-rss'],
        ['hubot', 'deleted https://www.prusa3d.com/feed/mk3s-drivers-rss'],
      ]);
    });
  });
});
