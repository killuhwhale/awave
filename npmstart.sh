#!/bin/bash

# $! contains the process ID of the most recently executed background pipeline

## Start Servers in background and get PID
# Start the Music server in the background and get its PID
node src/fileServer/src/server.js &
SERVER_PID=$!

# node src/fileServer/src/serverSetlist.js &
# SETLIST_SERVER_PID=$!



# cp config.json ./src/mobile/awave

# PWD=$(pwd)
# cd ~/ws_node/awave/src/mobile/awave && yarn web &
# MOBILE_CLIENT=$!
# cd ${PWD}

# Function to kill the background server process
cleanup() {
    echo "Stopping the servers..."
    kill $SERVER_PID
    # kill $MOBILE_CLIENT
}

# Trap commands to catch script termination and call the cleanup function
trap cleanup EXIT SIGINT SIGTERM

next build

# Start the second server in the foreground
next start