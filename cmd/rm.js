exports.fn = function (name, cb) {

  var app = this;
  var sites = app.config.get('sites') || {};

  if (!sites[name]) {
    return cb(new Error('Server "' + name + '" does not exist'));
  }

  delete sites[name];
  app.config.set('sites', sites);
  cb();

};

exports.description = 'Remove ftp site.';
exports.args = [
  { name: 'name' }
];
