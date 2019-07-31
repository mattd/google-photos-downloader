const test = require('ava');

const { getUniqueFilePath } = require('../lib/download-media');

test(
    `getUniqueFilePath returns an incremented file path`,
    t => {
        const origFilePath = '/path/to/file.jpg';
        t.is(getUniqueFilePath(origFilePath), '/path/to/file (1).jpg');
    }
);

test(
    `getUniqueFilePath increments a file path that was already incremented`,
    t => {
        const origFilePath = '/path/to/file (1).jpg';
        t.is(getUniqueFilePath(origFilePath), '/path/to/file (2).jpg');
    }
);
