const downloadFile = require('download-file');
const moment = require('moment');
const mkdirp = require('mkdirp');
const request = require('request-promise');

const MEDIA_ITEMS_ROOT = "/Users/mattdawson/Google\ Drive/Google\ Photos";

const downloadMediaItem = (mediaItem, directory) => {
    const parameter = mediaItem.mediaMetadata.video ? '=dv' : '=d';
    downloadFile(
        mediaItem.baseUrl + parameter,
        {
            directory,
            filename: mediaItem.filename
        },
        err => {
            if (err) {
                console.log(err);
            } else {
                console.log(
                    'Successfully downloaded',
                    `${directory}/${mediaItem.filename}`
                );
            }
        }
    );
};

const processMediaItem = mediaItem => {
    const creationTime = moment(mediaItem.mediaMetadata.creationTime);
    const year = creationTime.format('YYYY');
    const month = creationTime.format('MM');
    const directory = `${MEDIA_ITEMS_ROOT}/${year}/${month}`;

    mkdirp(directory, err => {
        if (err) {
            console.error(err);
        } else {
            downloadMediaItem(mediaItem, directory);
        }
    });
};

const processMediaItemsPageResponse = response => {
    const { mediaItems, nextPageToken } = JSON.parse(response);

    mediaItems.forEach(processMediaItem);
};

const getMediaItemsPage = auth => {
    request.get('https://photoslibrary.googleapis.com/v1/mediaItems', {
        auth: {
            bearer: auth.credentials.access_token
        }
    }).then(
        processMediaItemsPageResponse
    ).catch(err => {
        console.log(err);
    });
};

const download = auth => {
    getMediaItemsPage(auth);
};

module.exports = download;