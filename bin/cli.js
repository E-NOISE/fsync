#! /usr/bin/env node

var path = require('path');
var util = require('util');
var minimist = require('minimist');
var pkg = require('../package.json');
var fsync = require('../');

var argv = minimist(process.argv.slice(2));
var cmd = argv._.shift();


if (argv.v || argv.version) {
  console.log(pkg.version);
  process.exit(0);
} else if (!cmd || argv.h || argv.help) {
  console.log([
    'Usage: ' + pkg.name + ' [ options ] [ <command> ] <src> <dest>',
    '',
    'Commands:',
    '',
    'ls               List files.',
    'push             Push file(s) from src to dest',
    'pull             Pull files from src to dest.',
    '',
    'Options:',
    '',
    '-h, --help       Show this help.',
    '-v, --version    Show version.',
    '--no-colors      Diable pretty colours in output.',
    '',
    pkg.author.name + ' ' + (new Date()).getFullYear()
  ].join('\n'));
  process.exit(0);
}


var siteConfigPath = path.join(process.cwd(), 'fsync.json');
var site = require(siteConfigPath);

var client = fsync(site);
var fn = client[cmd];

if (typeof fn !== 'function') {
  return error(new Error('Unknown command'));
}

fn.apply(client, argv._.concat(function (err, data) {
  if (err) { return error(err); }
  console.log(data);
  process.exit(0);
}));


function error(err) {
  console.error(util.inspect(err, { depth: null }));
  if (err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
}

