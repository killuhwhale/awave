#!/bin/bash

echo "Removed derived data"
rm -r /Users/$USER/Library/Developer/Xcode/DerivedData/

echo "\n"
bash build.sh ios
echo "\n"

echo "Building app"
bash build.sh ios && eas build -p ios --local

echo "Build step done..."
echo "Upload .ipa via Transporter App"
echo "Wait for upload and Accept Compliance under: https://appstoreconnect.apple.com/apps/<id>/testflight/ios"