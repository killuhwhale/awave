#!/bin/bash
# Executing this file will write this content to a service file. This will start the Django server when the machine turns on which allows the automation program to communicate with the host.
CONFIG="../../config.json"
USERNAME=$(jq -r '.username' "$CONFIG")

# cat << EOF > /etc/systemd/system/wssMusicClient.service
mkdir -p /home/$USERNAME/.config/systemd/user

cat << EOF > /home/$USERNAME/.config/systemd/user/wssMusicClient.service
[Unit]
Description=wssClient Service that will start a python script and manage its PID to keep it alive
After=network.target

[Service]
WorkingDirectory=/home/$USERNAME/ws_node/awave/src/appControlCenter
ExecStart=/home/$USERNAME/ws_node/awave/src/appControlCenter/bin/python3 /home/$USERNAME/ws_node/awave/src/appControlCenter/wssClient.py
Restart=always

[Install]
WantedBy=default.target
EOF