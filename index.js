var fs = require('fs');
var path = require('path');
var events = require('events');
var stream = require('stream');
var async = require('async');
var mkdirp = require('mkdirp');
var Ftp = require('ftp');


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
  remoteDir: null,
  maxConcurrency: 3
};


module.exports = function (options) {

  var settings = Object.keys(defaults).reduce(function (memo, key) {
    memo[key] = options.hasOwnProperty(key) ? options[key] : defaults[key];
    return memo;
  }, {});

  var q = async.queue(function (task, cb) {
    var ee = task.ee;
    var client = new Ftp();
    var resp;

    client.on('error', cb);

    client.on('greeting', function (msg) {
      ee.emit('data', 'greeting: ' + msg);
    });

    client.on('ready', function () {
      client[task.command].apply(client, task.args.concat(function (err, data) {
        if (data instanceof stream.Readable) {
          data.on('close', function () {
            console.log('CLOSE', arguments);
          });
        } else {
          resp = data;
          client.end();
        }
      }));
    });

    client.on('close', function (hadError) {
      console.log('close', hadError);
    });

    client.on('end', function () {
      console.log('end');
      cb(null, resp);
    });

    client.connect(settings);
  }, settings.maxConcurrency);


  function queueRequest() {
    var ee = new events.EventEmitter();
    var args = Array.prototype.slice.call(arguments, 0)
    var command = args.shift();

    process.nextTick(function () {
      ee.emit('data', 'Queuing command ' + command + '...');
      q.push({
        command: command,
        args: args,
        ee: ee
      }, function (err, data) {
        if (err) { return ee.emit('error', err); }
        //ee.emit('data', data);
      });
    });

    return ee;
  }


  var fsync = {};


  fsync.status = function () {
    return queueRequest('status');
  };

  fsync.system = function () {
    return queueRequest('system');
  };

  fsync.ls = function (path) {
    return queueRequest('list', path || '/');
  };

  fsync.push = function () {};

  fsync.pull = function (src, dest) {
    var ee = new events.EventEmitter();

    src = src || settings.remoteDir;
    dest = path.resolve(dest || settings.localDir);

    mkdirp.sync(dest);

    fsync.ls(src).on('error', function (err) {
      ee.emit('error', err);
    }).on('data', function (list) {
      async.each(list, function (obj, cb) {
        console.log(obj);
        var nameParts = obj.name.split('/');
        var fname = nameParts.pop();
        var dir = path.join(dest, nameParts.join('/'));
        var absPath = path.join(dir, fname);

        mkdirp.sync(dir);

        console.log(dir, fname, absPath);

        if (obj.type === 'd') {
          mkdirp(absPath, cb);
        } else if (obj.type === '-') {
          queueRequest('get', obj.name)
            .on('error', cb)
            .on('data', function (stream) {
              stream
                .pipe(fs.createWriteStream(absPath))
                .on('error', cb)
                .on('finish', function () {
                  console.log('finish', arguments);
                });
            });
        } else if (obj.type === 'l') {
          console.log('HANDLE SYMLINKS!!!');
        }
      }, function (err) {
        console.log('ERROR', err);
      });
    });

    return ee;
  };

  return fsync;

};

