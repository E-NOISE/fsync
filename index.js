var fs = require('fs');
var path = require('path');
var events = require('events');
var stream = require('stream');
var async = require('async');
var mkdirp = require('mkdirp');
var bunyan = require('bunyan');
var Ftp = require('ftp');
var pkg = require('./package.json');


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

  var log = bunyan.createLogger({ name: pkg.name, level: 'debug' });

  var clients = [];

  function getClient(cb) {
    var client = clients.filter(function (client) {
      return client._available;
    }).shift();

    if (client) {
      client.log.info('Reusing client...');
      return cb(null, client);
    }

    var clientId = clients.length;
    clients[clientId] = client = new Ftp();

    client.log = log.child({ client: clientId });
    client.log.debug('Instantiating new client...');

    client.on('error', cb);

    client.on('greeting', function (msg) {
      client.log.debug('Greeting: ' + msg);
    });

    client.on('ready', function () {
      client.log.debug('Client is ready');
      cb(null, client);
    });

    client.on('end', function () {
      client.log.debug('Client ended');
    });

    client.on('close', function (hadError) {
      client.log.debug('Client has closed', hadError);
    });

    client.connect(settings);
  }

  var q = async.queue(function (task, cb) {
    var log = task.log;
    var command = task.command;
    var args = task.args;

    getClient(function (err, client) {
      if (err) { return cb(err); }
      client._available = false;
      var fn = client[command];
      log.debug('Sending request...', { command: command, args: args });
      fn.apply(client, args.concat(function (err, data) {
        client._available = true;
        cb(err, data);
      }));
    });
  }, settings.maxConcurrency);

  q.drain = function () {
    log.debug('No requests left in queue');
    clients.forEach(function (client) {
      if (!client._curReq) {
        //client.end();
      }
    });
  };

  var requests = 0;

  function queueRequest() {
    var args = Array.prototype.slice.call(arguments, 0)
    var cb = args.pop();
    var command = args.shift();
    var reqId = requests++;
    var childLog = log.child({ request: reqId });

    process.nextTick(function () {
      childLog.debug('Queuing command...', { command: command, args: args });
      q.push({
        command: command,
        args: args,
        log: childLog
      }, cb);
    });
  }


  var fsync = {};


  fsync.status = function (cb) {
    queueRequest('status', cb);
  };

  fsync.system = function (cb) {
    queueRequest('system', cb);
  };

  fsync.ls = function (path, cb) {
    if (arguments.length === 1) {
      cb = path;
      path = '/';
    }
    queueRequest('list', path || '/', cb);
  };

  fsync.push = function () {};

  fsync.pull = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var cb = args.pop();
    var src = args.shift() || settings.remoteDir;
    var dest = path.resolve(args.shift() || settings.localDir);

    mkdirp.sync(dest);

    function download(obj, cb) {
      //console.log(obj.name);
      var nameParts = obj.name.split('/');
      var fname = nameParts.pop();
      var dir = path.join(dest, nameParts.join('/'));
      var absPath = path.join(dir, fname);

      mkdirp.sync(dir);

      if (obj.type === 'd') {
        fsync.pull(obj.name, dir, cb);
      } else if (obj.type === '-') {
        queueRequest('get', obj.name, function (err, stream) {
          if (err) { return cb(err); }
          stream
            .pipe(fs.createWriteStream(absPath))
            .on('error', cb)
            .on('finish', cb);
        });
      } else if (obj.type === 'l') {
        console.log('HANDLE SYMLINKS!!!');
      }
    }

    fsync.ls(src, function (err, data) {
      if (err) { return cb(err); }
      var list = data.filter(function (obj) {
        return [ '.', '..' ].indexOf(obj.name) === -1;
      });
      async.each(list, download, cb);
    });
  };

  return fsync;

};

