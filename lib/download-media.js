const fs = require("fs");
const path = require("path");
const url = require("url");

const filecompare = require("filecompare");
const download = require("download");
const moment = require("moment");
const mkdirp = require("mkdirp");
const axios = require("axios");

const { MEDIA_ITEMS_URI, MEDIA_ITEMS_ROOT } = require("../config");

const getUniqueFilePath = filePath => {
    const parsedFilePath = path.parse(filePath);
    // Matches for filenames with a macOS style incrementer attached, capturing
    // the contents of the parens.
    // e.g. "foobar (1).jpg" is captured as "1"
    const parenContentRegEx = /(?<=\()[^)]+(?=\))/;
    const incrementMatch = parsedFilePath.name.match(parenContentRegEx);

    if (incrementMatch) {
        parsedFilePath.name = parsedFilePath.name.replace(
            parenContentRegEx,
            parseInt(incrementMatch) + 1
        );
    } else {
        parsedFilePath.name += " (1)";
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
                console.log("Removed duplicate file", newFilePath);
            }
        });
    } else {
        fs.writeFileSync(filePath, data);
        console.log("Successfully wrote file", filePath);
    }
};

const downloadMediaItem = (mediaItem, directory) => {
    const parameter = mediaItem.mediaMetadata.video ? "=dv" : "=d";

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
    const year = creationTime.format("YYYY");
    const month = creationTime.format("MM");
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
    const { mediaItems, nextPageToken } = response.data;
    const firstPage = !url.parse(response.request.path).query;
    let firstItem = true;

    for (const mediaItem of mediaItems) {
        if (mediaItem.id === global.STOP_AT) {
            console.log("No new items to download", mediaItem.id);
            process.exit();
        }
        if (firstPage && firstItem) {
            fs.writeFileSync(global.SYNC_STOP_PATH, mediaItem.id);
            console.log(mediaItem.id, "marked as sync stop");
        }
        
        // in case the download job fails or the access token expires
        // you can fast forward through the items already downloaded
        // and then resume the download where the previous run left off
        if (!global.START_AT) {
            // if there is no sync_start.txt, then process normally
            await processMediaItem(mediaItem);
        } else {  
            // if there is a sync_start.txt, then keep looping until the last item
            // from the previous run is found
            if (mediaItem.id === global.START_AT) {
                // once it is found, loop one more time to resume download on next item
                console.log("Previous last downloaded item found");
                global.lastItemFound = true;
            } else if (global.lastItemFound) {
                // download will now resume
                await processMediaItem(mediaItem);
            } else {
                console.log("Previous last item not found, skipping...")
            }
        }

        firstItem = false;
        fs.writeFileSync(global.SYNC_START_PATH, mediaItem.id);
    }

    if (nextPageToken) {
        getMediaItemsPage(auth, nextPageToken);
    }
};

const getMediaItemsPage = (auth, pageToken) => {
    let mediaItemsUri = MEDIA_ITEMS_URI;

    if (pageToken) {
        mediaItemsUri += `?pageToken=${pageToken}`;
    }

    console.log("Requesting", mediaItemsUri);
    axios
        .get(mediaItemsUri, {
            headers: {
                Authorization: `Bearer ${auth.credentials.access_token}`
            }
        })
        .then(processMediaItemsPageResponse.bind(null, auth))
        .catch(err => {
            console.error(
                "Photos API request failed with message:",
                err.response.data.error.message
            );
        });
};

const setSyncStop = () => {
    global.SYNC_STOP_PATH = path.resolve(__dirname, "../sync-stop.txt");

    try {
        global.STOP_AT = fs.readFileSync(global.SYNC_STOP_PATH).toString();
    } catch (err) {
        console.log("Did not find sync-stop.txt. Continuing...");
    }
};

const setSyncStart = () => {
    global.SYNC_START_PATH = path.resolve(__dirname, "../sync-start.txt");

    try {
        global.START_AT = fs.readFileSync(global.SYNC_START_PATH).toString();
    } catch (err) {
        console.log("Did not find sync-start.txt. Continuing...");
    }
};

const downloadMedia = auth => {
    global.lastItemFound = false;
    setSyncStop();
    setSyncStart();
    getMediaItemsPage(auth);
};

module.exports = { downloadMedia, getUniqueFilePath };
