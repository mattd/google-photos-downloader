const request = require('request-promise');

const download = auth => {
    request.get('https://photoslibrary.googleapis.com/v1/mediaItems', {
        auth: {
            bearer: auth.credentials.access_token
        }
    }).then(response => {
        console.log(response);
    }).catch(err => {
        console.log(err);
    });
};

module.exports = download;