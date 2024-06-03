#!/bin/bash

echo "Build for $1 from $(pwd)"

# Check if an argument is provided
if [ -z "$1" ]; then
  echo "Usage: $0 [web|android]"
  exit 1
fi

# Determine which file to copy based on the argument
if [ "$1" = "web" ]; then
  cp ./src/utils/utils.web ./src/utils/utils.js
  echo "Copied utils.web to utils.js"
elif [ "$1" = "android" ]; then
  cp ./src/utils/utils.android ./src/utils/utils.js
  echo "Copied utils.android to utils.js"
elif [ "$1" = "ios" ]; then
  cp ./src/utils/utils.ios ./src/utils/utils.js
  echo "Copied utils.ios to utils.js"
else
  echo "Invalid argument. Use 'web' 'ios' or 'android'."
  exit 1
fi