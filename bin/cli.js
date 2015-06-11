#! /usr/bin/env node

var path = require('path');
var Clive = require('clive');

var app = Clive({
  appdir: path.join(__dirname, '../')
});

app.run();
