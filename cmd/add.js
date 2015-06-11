var url = require('url');

exports.fn = function (name, uri, cb) {
  var app = this;
  var sites = app.config.get('sites') || {};
  var urlObj = url.parse(uri);
  var authParts = (urlObj.auth || '').split(':');

  if (sites[name]) {
    return cb(new Error('Server "' + name + '" already exists'));
  }

  if (['ftp:' ].indexOf(urlObj.protocol) === -1 || !urlObj.host || !urlObj.path) {
    return cb(new Error('Invalid URL'));
  }

  var site = {
    host: urlObj.hostname,
    port: urlObj.port || 21
  };

  if (authParts.length > 1) {
    site.user = authParts[0];
    site.password = authParts.slice(1).join(':');
  }

  sites[name] = site;
  app.config.set('sites', sites);
  cb();
};

exports.description = 'Add new ftp site.';
exports.args = [
  {
    name: 'name',
    required: true,
    description: 'Arbitrary name used to identify FTP server.'
  },
  {
    name: 'url',
    required: true,
    description: 'FTP server URL: "<protocol>://<user>:<pass>@<host>:<port><path>".'
  }
];

