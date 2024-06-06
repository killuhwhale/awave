#!/bin/bash
# Executing this file will write this content to a service file. This will start the Django server when the machine turns on which allows the automation program to communicate with the host.
CONFIG="../../config.json"
USERNAME=$(jq -r '.username' "$CONFIG")

# cat << EOF > /etc/systemd/system/wssMusicClient.service
mkdir -p /home/$USERNAME/.config/systemd/user

cat << EOF > /home/$USERNAME/.config/systemd/user/musicPlayer.service
[Unit]
Description=Start Music Player server
After=network.target

[Service]
WorkingDirectory=/home/$USERNAME/ws_node/awave
ExecStart=bash /home/$USERNAME/ws_node/awave/npmdev.sh
Restart=always

[Install]
WantedBy=default.target
EOF