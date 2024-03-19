#!/bin/bash

# Start the first server in the background and get its PID
node src/fileServer/src/server.js &
SERVER_PID=$!

node src/fileServer/src/serverSetlist.js &
SETLIST_SERVER_PID=$!

# Function to kill the background server process
cleanup() {
    echo "Stopping the server..."
    kill $SERVER_PID
    kill $SETLIST_SERVER_PID
}

# Trap commands to catch script termination and call the cleanup function
trap cleanup EXIT SIGINT SIGTERM

# Start the second server in the foreground
# next dev

# Host locally to check on other devices.
HOST=192.168.1.229 next dev

# The script will proceed to here if the 'next dev' command exits
# The cleanup function will be called automatically due to the trap