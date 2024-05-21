# AWave
## WSS Server (Go)

```bash
cd ~/ws_node/awave/src/fileServer/src && go run cmdServer 127.0.0.1:4000
```

## Controller Client (React Native)

```bash
cd ~/ws_node/awave/src/mobile/awave && yarn web
```

## Music Client (NextJs)

```bash
cd ~/ws_node/awave && npm run dev
```

```bash
# Quick Copy
cd ~/ws_node/awave/src/fileServer/src && go run cmdServer 127.0.0.1:4000
cd ~/ws_node/awave/src/mobile/awave && yarn web
cd ~/ws_node/awave && npm run dev
```

openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Build Android
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  eas build --platform android --local

## Run android locally
cd ~/ws_node/awave/src/mobile/awave && JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  npx expo run:android

## PM2 ts wss
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

## fixIconScout.sh
iconScount icons do not come with index.d.ts
Run to populate file in node_modules.

## TODO()
1. Configure config to fold GO host address (WSURL)
2. Create a global setlist based on real library for allsongs.
3. Get a real library and test from ext SSD
4. Create Python Server to do TTS (GCP voice)
5. Create UI to play voice on mobile controller

6. Stream voice

### Another Player to play voice messages
Main Component can play a file

### AI Generate playlists
?

