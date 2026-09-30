# viewbox-ext

Chrome extension: new-episode tracking, autoplay, "Are you still watching?" and an optional TV interface, on the streaming sites you choose.

## Install (download)
1. Download `viewbox-ext-<version>.zip` from Releases and unzip it.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, pick the unzipped folder.
3. Settings opens: add the site(s) to run on under **Sites** and accept Chrome's permission prompt. Optionally add a TMDB API key.

## Develop
- Load this folder unpacked. `tv/main.js` is the prebuilt Viewbox TV interface bundle.
- Tests: `node scan.test.mjs`, `node tmdb.test.mjs`.
- Package: `./package.sh` → `viewbox-ext-<version>.zip` (upload as-is to the Chrome Web Store).
