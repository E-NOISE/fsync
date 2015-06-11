var table = require('text-table');
var Fsync = require('../');

exports.fn = function (name, path, cb) {

  var app = this;
  var config = app.config;
  var sites = config.get('sites') || {};
  var active = config.get('active');

  if (name && !path) {
    path = name;
    name = active;
  }

  if (!name && !path) {
    var results = Object.keys(sites).sort().reduce(function (memo, key) {
      var site = sites[key];
      var act = (key === active) ? '*' : '';
      memo.push([ key, act, site.host, site.port, site.user ]);
      return memo;
    }, [ [ 'NAME', 'ACTIVE', 'HOST', 'PORT', 'USER' ] ]);
    console.log(table(results));
    return cb();
  }

  if (!name) {
    return cb(new Error('No server selected'));
  }

  var site = sites[name];
  if (!site) {
    return cb(new Error('Server "' + name + '" doesn\'t exists'));
  }

  var perms = {
    'rwx' : 'rwx',
    'rw'  : 'rw-',
    'rx'  : 'r-x',
    'wx'  : '-wx',
    'r'   : 'r--',
    'w'   : '-w-',
    'x'   : '--x',
    ''    : '---'
  };

  Fsync(site).ls(path, function (err, data) {
    if (err) { return cb(err); }
    var results = data.reduce(function (memo, obj) {
      var r = obj.rights;
      var d = obj.date;
      var rights = perms[r.user] + perms[r.group] + perms[r.other];
      var modified = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
      var name = obj.name;
      if (obj.type === 'd') {
        name = name.cyan.bold;
      } else if (obj.type === 'l') {
        name = name.magenta;
      }
      memo.push([ rights, obj.owner, obj.group, obj.size, modified, name ]);
      return memo;
    }, [ [ 'RIGHTS', 'OWNER', 'GROUP', 'SIZE', 'MODIFIED', 'NAME' ] ]);
    console.log(table(results));
    cb();
  });

};

exports.description = 'List ftp sites.';
exports.args = [
  { name: 'name' },
  { name: 'path' }
];

