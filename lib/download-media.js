const fs = require('fs');
const path = require('path');

const filecompare = require('filecompare');
const download = require('download');
const moment = require('moment');
const mkdirp = require('mkdirp');
const request = require('request-promise');

const { MEDIA_ITEMS_URI, MEDIA_ITEMS_ROOT } = require('../config');
const SYNC_STOP_PATH = path.resolve(__dirname, '../sync-stop.txt');

let STOP_AT;

try {
    STOP_AT = fs.readFileSync(SYNC_STOP_PATH).toString();
} catch (err) {
    console.log('Did not find sync-stop.txt. Continuing...');
}

const getUniqueFilePath = filePath => {
    const parsedFilePath = path.parse(filePath);
    const name = parsedFilePath.name;
    // Matches for filenames with a macOS style incrementer attached,
    // e.g. 'foobar (1).jpg'.
    const incrementMatch = name.match(/(?<=\()[^)]+(?=\))/);

    if (incrementMatch) {
        parsedFilePath.name = name.replace(
            // Matches the contents of the parens in a macOS style incrementer
            // and replaces it.
            // e.g. 'foobar (1).jpg' becomes 'foobar (2).jpg'
            /((?<=\()[^)]+(?=\)))/,
            parseInt(incrementMatch) + 1
        );
    } else {
        parsedFilePath.name += ' (1)';
    }
    parsedFilePath.base = parsedFilePath.name + parsedFilePath.ext;
    return path.format(parsedFilePath);
};

const writeFileSyncSafely = (filePath, data) => {
    let newFilePath;

    if (fs.existsSync(filePath)) {
        newFilePath = getUniqueFilePath(filePath);
        writeFileSyncSafely(newFilePath, data);
        filecompare(filePath, newFilePath, isEqual => {
            if (isEqual) {
                fs.unlinkSync(newFilePath);
                console.log('Removed duplicate file', newFilePath);
            }
        });
    } else {
        fs.writeFileSync(filePath, data);
        console.log('Successfully wrote file', filePath);
    }
};

const downloadMediaItem = (mediaItem, directory) => {
    const parameter = mediaItem.mediaMetadata.video ? '=dv' : '=d';

    return download(mediaItem.baseUrl + parameter).then(data => {
        const filePath = `${directory}/${mediaItem.filename}`;

        try {
            writeFileSyncSafely(filePath, data);
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

    try {
        mkdirp.sync(directory);
        try {
            return downloadMediaItem(mediaItem, directory);
        } catch (err) {
            console.error(err);
        }
    } catch (err) {
        console.error(err);
    }
};

const processMediaItemsPageResponse = async (auth, response) => {
    const { mediaItems, nextPageToken } = JSON.parse(response.body);
    const firstPage = !response.request.uri.query;
    let firstItem = true;

    for (const mediaItem of mediaItems) {
        if (mediaItem.id === STOP_AT) {
            console.log('Reached end of download job at', mediaItem.id);
            process.exit();
        }
        if (firstPage && firstItem) {
            fs.writeFileSync(SYNC_STOP_PATH, mediaItem.id);
            console.log(mediaItem.id, 'marked as sync stop')
        }
        await processMediaItem(mediaItem);
        firstItem = false;
    }

    if (nextPageToken) {
        getMediaItemsPage(auth, nextPageToken);
    }
}

const getMediaItemsPage = (auth, pageToken) => {
    let mediaItemsUri = MEDIA_ITEMS_URI;

    if (pageToken) {
        mediaItemsUri += `?pageToken=${pageToken}`;
    }

    console.log('Requesting', mediaItemsUri);
    request.get(mediaItemsUri, {
        auth: {
            bearer: auth.credentials.access_token
        },
        resolveWithFullResponse: true
    }).then(
        processMediaItemsPageResponse.bind(null, auth)
    ).catch(err => {
        console.error(
            'Photos API request failed with message:',
            JSON.parse(err.response.body).error.message
        );
    });
};

const downloadMedia = auth => {
    getMediaItemsPage(auth);
};

module.exports = { downloadMedia, getUniqueFilePath };