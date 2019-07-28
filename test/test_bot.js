const Helper = require('hubot-test-helper');
require('should');

const scriptHelper = new Helper('../scripts/hubot-rss-reader.js');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

let room;
describe('rsschecker', () => {
  beforeEach(() => {
    room = scriptHelper.createRoom({ httpd: false });
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
});
