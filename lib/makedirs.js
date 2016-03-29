module.exports = makedirs;

const fs = require('fs');
const mkdirp = require('mkdirp');

function makedirs(dirSpecList) {
  dirSpecList.forEach(
    (dirSpec) => {
      mkdirp.sync(dirSpec.path);
      if (dirSpec.mode) {
        fs.chmodSync(dirSpec.path, dirSpec.mode);
      }
      fs.chownSync(dirSpec.path, dirSpec.uid, dirSpec.gid);
    }
  )
}

makedirs.sync = makedirs;
