const path = require("path");
const fs = require("fs");
const readline = require("readline");

const { google } = require("googleapis");

const TOKEN_PATH = path.join(__dirname, "../secrets/token.json");

const getAccessToken = (oAuth2Client, callback) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: "https://www.googleapis.com/auth/photoslibrary.readonly"
    });
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("Authorize this app by visiting this url:", authUrl);

    rl.question("Enter the code from that page here:", code => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) {
                return console.error("Error retrieving access token", err);
            }
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
                if (err) {
                    return console.error(err);
                }
                console.log("Token stored to:", TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
};

const authorize = (credentials, callback) => {
    const { CLIENT_SECRET, CLIENT_ID, REDIRECT_URIS } = credentials.INSTALLED;
    const oAuth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URIS[0]
    );

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) {
            return getAccessToken(oAuth2Client, callback);
        }
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
};

module.exports = { authorize };
