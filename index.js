const authorize = require('./lib/authorize');
const credentials = require('./secrets/credentials');
const download = require('./lib/download');

authorize(credentials, download);