var mkdirp = require('mkdirp');
var Fsync = require('../');

exports.fn = function (name, remote, local, cb) {

  var app = this;
  var sites = app.config.get('sites') || {};
  var active = app.config.get('active');

  if (!local && active) {
    local = remote;
    remote = name;
    name = active;
  }

  var site = sites[name];
  if (!site) {
    return cb(new Error('Server "' + name + '" doesn\'t exists'));
  }

  Fsync(site).pull(remote, local, cb);

};

exports.description = 'Pull files from remote.';
exports.args = [
  {
    name: 'name'
  },
  {
    name: 'remote-path',
    required: true
  },
  {
    name: 'local-path',
    required: true
  }
];

