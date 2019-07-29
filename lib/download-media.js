const fs = require('fs');
const path = require('path');

const download = require('download');
const moment = require('moment');
const mkdirp = require('mkdirp');
const request = require('request-promise');

const MEDIA_ITEMS_ROOT = "/Users/mattdawson/Google\ Drive/Google\ Photos";

const getUniqueFilePath = filePath => {
    const parsedFilePath = path.parse(filePath);
    const name = parsedFilePath.name;
    const incrementMatch = name.match(/(?<=\()[^)]+(?=\))/);

    if (incrementMatch) {
        parsedFilePath.name = name.replace(
            /((?<=\()[^)]+(?=\)))/,
            parseInt(incrementMatch) + 1
        );
    } else {
        parsedFilePath.name += ' (0)';
    }
    parsedFilePath.base = parsedFilePath.name + parsedFilePath.ext;
    return path.format(parsedFilePath);
};

const downloadMediaItem = (mediaItem, directory) => {
    const parameter = mediaItem.mediaMetadata.video ? '=dv' : '=d';

    download(mediaItem.baseUrl + parameter).then(data => {
        let filePath = `${directory}/${mediaItem.filename}`;

        if (fs.existsSync(filePath)) {
            filePath = getUniqueFilePath(filePath);
            console.log('AFTER:', filePath);
        }
        try {
            fs.writeFileSync(filePath, data);
            console.log('Successfully dowloaded', filePath);
        } catch (err) {
            console.error(err);
        }
    });
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

const processMediaItemsPageResponse = (auth, response) => {
    const { mediaItems, nextPageToken } = JSON.parse(response);

    mediaItems.forEach(processMediaItem);

    if (nextPageToken) {
        getMediaItemsPage(auth, nextPageToken);
    }
};

const getMediaItemsPage = (auth, pageToken) => {
    let mediaItemsUri = 'https://photoslibrary.googleapis.com/v1/mediaItems';

    if (pageToken) {
        mediaItemsUri += `?pageToken=${pageToken}`;
    }

    request.get(mediaItemsUri, {
        auth: {
            bearer: auth.credentials.access_token
        }
    }).then(
        processMediaItemsPageResponse.bind(null, auth)
    ).catch(err => {
        console.log(err);
    });
};

const downloadMedia = auth => {
    getMediaItemsPage(auth);
};

module.exports = downloadMedia;