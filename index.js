const Fs   = require('fs');
const Path = require('path');

module.exports = function(robot) {
  const path = Path.resolve(__dirname, 'src');
  Fs.exists(path, function(exists) {
    if (!exists) { return; }
    Fs.readdirSync(path).map(file => robot.loadFile(path, file));
  });
};
