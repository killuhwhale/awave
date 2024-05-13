#!/bin/bash

# $! contains the process ID of the most recently executed background pipeline

## Start Servers in background and get PID
# Start the first server in the background and get its PID
node src/fileServer/src/server.js &
SERVER_PID=$!

node src/fileServer/src/serverSetlist.js &
SETLIST_SERVER_PID=$!


# CUR_DIR=$(pwd)
# cd ./src/fileServer/src
# go build cmdServer.go &
# go run cmdServer &
# GO_CMD_SERVER_PID=$!
# cd $CUR_DIR



# cp config.json ./src/mobile/awave

# PWD=$(pwd)
# cd ~/ws_node/awave/src/mobile/awave && yarn web &
# MOBILE_CLIENT=$!
# cd ${PWD}

# Function to kill the background server process
cleanup() {
    echo "Stopping the servers..."
    kill $SERVER_PID
    kill $SETLIST_SERVER_PID
    kill $GO_CMD_SERVER_PID
    # kill $MOBILE_CLIENT
}

# Trap commands to catch script termination and call the cleanup function
trap cleanup EXIT SIGINT SIGTERM

# Start the second server in the foreground
next dev



# Host locally to check on other devices.
# HOST=192.168.1.229 next dev

# The script will proceed to here if the 'next dev' command exits
# The cleanup function will be called automatically due to the trap