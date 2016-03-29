#!/usr/bin/env node

const program = require('commander');
const makedirs = require('../lib/makedirs');
const console = require('console');


program.command('*')
  .description('deploy the given env')
  .action(
    (input) => {
      var dirSpecList = JSON.parse(input);
      makedirs.sync(
        dirSpecList
      );
      dirSpecList.forEach(
        (dirSpec) => console.log(
          'created directory with path[%s], mode[%s], uid [%d], gid[%d]',
          dirSpec.path,
          dirSpec.mode,
          dirSpec.uid,
          dirSpec.gid
        )
      )
    }
  );

program.parse(process.argv);
