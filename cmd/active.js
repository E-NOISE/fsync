exports.fn = function (name, cb) {

  var app = this;
  var config = app.config;
  var active = config.get('active');

  if (!name) {
    console.log(active || 'none');
    return cb();
  }

  var sites = config.get('sites') || {};
  if (!sites[name]) {
    return cb(new Error('Server "' + name + '" doesn\'t exists'));
  }

  config.set('active', name);
  cb();

};

exports.description = 'Get/set active ftp site.';
exports.args = [
  { name: 'name', description: 'The FTP server name.' }
];

