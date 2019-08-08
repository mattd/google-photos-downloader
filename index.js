const { authorize } = require("./lib/authorize");
const credentials = require("./secrets/credentials");
const { downloadMedia } = require("./lib/download-media");

authorize(credentials, downloadMedia);
