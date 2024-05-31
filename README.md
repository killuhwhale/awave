# AWave
```bash
# Quick Copy
cd ~/ws_node/awave/src/fileServer/src && go run cmdServer 127.0.0.1:4000
cd ~/ws_node/awave/src/mobile/awave && yarn web
cd ~/ws_node/awave && npm run dev
```

#  TODO()
1. Remote start - wssClient tracking PID of python browser client
2. Browser Client - Needs to go fullscreen and close Browser Dialog "This is being controlled by automation"
3. [Security] Check TURN server with credentials; need to lock down.
4. [Performance_Testing] Test Large Setlist 5k songs? and playing for 5 hours straight
5. Add fixIconScout.sh to build steps
6. System for Global Types and configs
    - Top lvl config and type.d.ts files to copy to each dir/ project
    - Commands, RTC message and WSSTypes all in one spot and shared.
    - Remove hardcoded values like 420, player, controller

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



# Generate SSL
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Build Android
cd src/mobile/awave
bash build.sh android &&  JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  eas build --platform android --local
## Output => build-1716313595711.aab

## Build APK from AAB
java -jar ~/Downloads/bundletool-all-1.16.0.jar build-apks --bundle=/home/killuh/ws_node/awave/src/mobile/awave/build-1716313595711.aab --output=awave.apks --mode=universal

## Extract APK from .apks created from bundletool and ADB install

## Run android locally
cd ~/ws_node/awave/src/mobile/awave && bash build.sh android && JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  npx expo run:android

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

