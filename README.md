# AWave
```bash
# Quick Copy
cd ~/ws_node/awave/src/fileServer/src && go run cmdServer 127.0.0.1:4000
cd ~/ws_node/awave/src/mobile/awave && yarn web
cd ~/ws_node/awave && npm run dev
```

# Notes
Mobile Controller must be set to the host device name that it should control since it will pull music from Firebase according to this name.


#  TODO()
1. [Security] Check TURN server with credentials; need to lock down.
2. [Performance_Testing] Test Large Setlist 5k songs? and playing for 5 hours straight
3. [Order_Songs] Create a tool to print list of songs from each set list so I can give it to chat gpt witha prompt to get a good order
4.   Then the tools should also take a new order of songs and upload to firebase
        Possibly add to the createSetlist where we use a textArea to transfer state of song list, we need to just keep fileNames
        This way, I can paste a new list and it will update the list of songs in the setlist, the I just press upload like normal.
        Also, the drag and drop would also change the same list so again the text area is just a reflection of state, whatever is on the the line represents a fileName (file path from rootDir root music dir)

5.  Get songs from setlists on Mobile
    Render SongList Search for each setlist and allow send play to play from setlist.

# Host Device Setup
- Disable Gestures https://extensions.gnome.org/extension/4049/disable-gestures-2021/
- In Chrome Settings Turn off Swipe between pages Settings > Accessibility > Swipe between pages
- npm install -g pm2
  - pm2 start npm --name "awave" -- start
  - pm2 save
  - pm2 startup
  - pm2 unstartup systemd
  - pm2 delete awave

# Setup Music Client (Chromebook)
git clone
Place Music in dir according to config
config.json in ./awave/src
cd ./awave && npm install
cd ./awave/src/fileServer && npm install

# Setup wssClient (Chromebook)
 cd ~/ws_node/awave/src/appControlCenter$
 bash wssMusicClient.sh
 systemctl --user enable wssMusicClient.service
 systemctl --user start wssMusicClient.service
 systemctl --user stop wssMusicClient.service

# Song System
All songs are under root dir: config['musicDir']
We will write to a file so that on start up and refreshes, it doesnt take time to index all songs
  - call node indexSongs.js
  - Writes to config['songFile']

FileServer then will read this file and return results as list of relative file paths.

Then we will also store this data in Firebase by Device Name
Firebase => /music/{deviceName}/songs/songObject


## Data Contraints
52,000+ songs
47,604 -- 4.6mb

379 -- 23kb

1. Limit on number of reads per 24 hours
2. Firebase documents can only be max 1Mb

We need to store songs as stringified json in chunks.
Each song is roughly ~


## How to update
Update music files at config['musicDir]
Write to file at config['songFile'] from parsing music dir // node indexSongs.js
Start fileserver
Device name reflects storage device aka songs in config['musicDir']
Send request to save file created in step 1 at firebase via music/{deviceName}/songs/* (reads from config['songFile'])
Send request to clear collection at firebase via music/{deviceName}/songs/*

node indexSongs.js
node src/fileServer/src/server.js
Change device name in ../../config.js
curl http://localhost:3001/clear
curl http://localhost:3001/save



# Generate SSL
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Build ios

bash build.sh ios && eas build -p ios
Download .ipa and upload via Transporter app.

# Build Android
npx expo run:android --device aPixel2XL_4GB

## Android Sqlite DB
 /data/data/com.killuhwhale.awave/databases/songs.db


## Previous Failures
###
 - https://github.com/expo/expo/issues/28632
I Solved it by editing node_modules/expo-asset/expo-module.config to
{
  "platforms": ["ios", "android"]
}

cd src/mobile/awave
bash build.sh android &&  JAVA_HOME=/usr/lib/jvm/openjdk-17  eas build --platform android --local
JAVA_HOME=/usr/lib/jvm/openjdk-17  ./gradlew clean

## Output => build-1716313595711.aab

## Build APK from AAB
java -jar ~/Downloads/bundletool-all-1.16.0.jar build-apks --bundle=/home/killuh/ws_node/awave/src/mobile/awave/*.aab --output=awave.apks --mode=universal
unzip awave.apks -d .

## Extract APK from .apks created from bundletool and ADB install

## Run android locally
cd ~/ws_node/awave/src/mobile/awave && bash build.sh android && JAVA_HOME=/usr/lib/jvm/openjdk-17  npx expo run:android

# PM2 ts_wss
# Install PM2 globally
npm install pm2 -g

# Install project dependencies
npm install

# Build the TypeScript project
npm run build

# Start the application with PM2
pm2 start dist/index.js --name my-websocket-server

# Save the PM2 process list and setup startup script
pm2 save
pm2 startup

# fixIconScout.sh
iconScount icons do not come with index.d.ts
Run to populate file in node_modules.

# AI Generate playlists
?

