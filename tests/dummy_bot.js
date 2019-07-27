/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let DummyBot;
module.exports = (DummyBot = class DummyBot {

  constructor() {
    this._brain = {};

    this.brain = {
      get: key => {
        return this._brain[key];
      },
      set: (key, value) => {
        return this._brain[key] = value;
      }
    };
  }
});
