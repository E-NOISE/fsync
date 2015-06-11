var fs = require('fs');
var path = require('path');
var async = require('async');
var mkdirp = require('mkdirp');
var Ftp = require('ftp');
var _ = require('lodash');
var prettyBytes = require('pretty-bytes');


var defaults = {
  host: 'localhost',
  port: 21,
  secure: false,
  secureOptions: {},
  user: 'anonymous',
  password: 'anonymous@',
  connTimeout: 10000,
  pasvTimeout: 10000,
  keepalive: 10000,
  localDir: process.cwd(),
  remoteDir: '',
  maxConcurrency: 3
};


function removeLeadingSlash(str) {
  return (str.charAt(0) === '/') ? str.slice(1) : str;
}

function removeTrailingSlash(str) {
  return (str.charAt(str.length - 1) === '/') ? str.slice(0, -1) : str;
}

// compare modified time and size
function hasChanged(obj, absPath) {
  if (!fs.existsSync(absPath)) { return true; }
  var stat = fs.statSync(absPath);
  if (obj.size !== stat.size) { return true; }
  if (obj.date > stat.mtime) { return true; }
  return false;
}


module.exports = function Fsync(options) {

  var settings = _.extend({}, defaults, options);
  var clients = [];

  function queue(cmd, args, cb) {
    getClient(function (err, client) {
      if (err) { return cb(err); }
      client._available = false;
      client[cmd].apply(client, args.concat(function (err, data) {
        client._available = true;
        cb(err, data);
      }));
    });
  }

  function removeClient(id) {
    var client = clients[id];
    if (!client) { return; }
    clients.splice(id, 1);
    client.destroy();
  }

  function getClient(cb) {
    var client = clients.filter(function (client) {
      return client._available;
    }).shift();

    if (client) {
      return cb(null, client);
    } else if (clients.length >= settings.maxConcurrency) {
      return setTimeout(function () { getClient(cb); }, 10);
    }

    var id = clients.length;
    var prefix = 'client-' + id;

    clients[id] = client = new Ftp();

    client.on('error', function (err) {
      err.client = id;
      cb(err);
      cb = function () {};
      removeClient(id);
    });

    client.on('greeting', function (msg) {
      //console.log(prefix + ': Greeting: ' + msg);
    });

    client.on('ready', function () {
      cb(null, client);
    });

    client.on('end', function () {
      removeClient(id);
    });

    client.connect(settings);
  }


  return {

    queue: queue,

    ls: function (path, cb) {
      queue('list', [ path || '' ], function (err, data) {
        if (err) { return cb(err); }
        cb(null, data.filter(function (obj) {
          return [ '.', '..' ].indexOf(obj.name) === -1;
        }));
      });
    },

    pull: function (remote, local, cb) {
      var fsync = this;
      var src = removeTrailingSlash(settings.remoteDir) + '/' + removeLeadingSlash(remote);
      var dest = path.resolve(local || settings.localDir);

      doPull(src, dest, cb);

      function doPull(src, dest, cb) {
        mkdirp.sync(dest);
        fsync.ls(src, function (err, list) {
          if (err) { return cb(err); }
          async.each(list, download.bind(null, src, dest), cb);
        });
      }

      function download(src, dest, obj, cb) {
        var fname = removeLeadingSlash(removeTrailingSlash(src) + '/' + obj.name);
        var absPath = path.join(dest, obj.name);

        if (src === obj.name) {
          fname = obj.name;
        }

        if (obj.type === 'd') {
          doPull(fname, absPath, cb);
        } else if (obj.type === '-') {
          if (!hasChanged(obj, absPath)) {
            console.log(('Skip file (no change): ' + fname).grey);
            return cb();
          }
          console.log(('Queuing download: ' + fname + ' ' + prettyBytes(obj.size)).cyan);
          queue('get', [ fname ], function (err, stream) {
            if (err) {
              console.error(('Error downloading: ' + fname + ' ' + err.message).red);
              return cb();
            }
            stream
              .pipe(fs.createWriteStream(absPath))
              .on('error', function (err) {
                console.error(('Error writing file: ' + absPath + ' ' + err.message).red);
                cb();
              })
              .on('finish', function () {
                fs.utimesSync(absPath, new Date(), obj.date);
                console.log(('File downloaded: ' + fname + ' ' + prettyBytes(obj.size)).green);
                cb();
              });
          });
        } else if (obj.type === 'l') {
          console.log('HANDLE SYMLINKS!!!');
          cb();
        }
      }
    }

  };

};


