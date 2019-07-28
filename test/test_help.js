const Helper = require('hubot-test-helper');
require('should');

const scriptHelper = new Helper('../scripts/hubot-rss-reader.js');

let room;
describe('rsschecker', () => {
  beforeEach(() => {
    room = scriptHelper.createRoom({ httpd: false });
  });
  afterEach(() => { room.destroy(); });

  describe('help', () => {
    it('lists help', () => {
      room.robot.helpCommands().should.eql([
        'hubot rss add https://github.com/shokai.atom',
        'hubot rss delete #room_name',
        'hubot rss delete http://shokai.org/blog/feed',
        'hubot rss dump',
        'hubot rss list',
      ]);
    });
  });
});
