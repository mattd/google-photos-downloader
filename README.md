# Google Photos Downloader

Downloads photos from Google Photos.

## Install

This is the easy part.

`npm install`

## Setup Your Google APIs Project

This is the harder part.

This downloader uses the Google Photos API to access your Google Photos library.
In order to use the downloader, you have to enable access to that API via
Google's developer console.

Follow these instructions to setup access.

https://support.google.com/googleapi/answer/6158849?hl=en&ref_topic=7013279

Some notes on these instuctions:

* After initially creating a project, you'll need to enable access to the
  Photos API for that project. Click "Enable APIs and Services", search for
  "Photos API", and click the "Enable" button.

* When creating your OAuth Client ID, you'll be asked what kind of application
  type you want to use. Choose "Other".

## Setup Your Google API Project Credentials

Next, you'll need to download the credentials that you setup when you followed
Google's setup instructions in the link above.

Click "Credentials" from the dashboard, find your project in the list, and
click the Download JSON icon on the far right of the screen. Next, copy the
values from that file into the
[credentials.js.example file in this repo](https://github.com/mattd/google-photos-downloader/blob/master/secrets/credentials.js.example)
and rename the file to credentials.js.

## Setup Downloader Config

Then, open the [config.js.example file in this repo](https://github.com/mattd/google-photos-downloader/blob/master/config.js.example)
and fill in the full path to the directory where you want to download your
Photos library. You'll also need to fill in the main API endpoint you want to
use for downloads - but 99.9% of the time, this will just be https://photoslibrary.googleapis.com/v1/mediaItems.

## Run The Download

Finally, run the downloader.

`npm start`