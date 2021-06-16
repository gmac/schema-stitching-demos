const fs = require('fs');
const path = require('path');

module.exports = function readFileSync(dir, filename) {
  return fs.readFileSync(path.join(dir, filename), 'utf8');
};
