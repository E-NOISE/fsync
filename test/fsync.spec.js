var assert = require('assert');
var fsync = require('../');


describe('fsync', function () {

  it('should ...', function () {
    var client = fsync({
      host: 'ftp.ch.freebsd.org'
    });
    console.log(client.ls('/'));
  });

});

