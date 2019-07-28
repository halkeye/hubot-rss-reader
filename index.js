const Fs = require('fs');
const Path = require('path');

module.exports = function (robot) {
  const path = Path.resolve(__dirname, 'scripts');
  Fs.exists(path, (exists) => {
    if (!exists) { return; }
    Fs.readdirSync(path).map(file => robot.loadFile(path, file));
  });
};
