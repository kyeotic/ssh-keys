#!/bin/bash
# SSH Keys Sync Installer
# Run with: curl -fsSL https://ssh-keys.kye.dev/initialize | sudo bash

set -e

SERVER_URL="__SERVER_URL__"
INSTALL_DIR="/usr/local/bin"
SCRIPT_NAME="sync-ssh-keys"
SCRIPT_PATH="${INSTALL_DIR}/${SCRIPT_NAME}"

echo "Installing SSH key sync script..."

# Download the sync script
curl -fsSL "${SERVER_URL}/sync.sh" -o "${SCRIPT_PATH}"
chmod +x "${SCRIPT_PATH}"

echo "Script installed to ${SCRIPT_PATH}"

# Add cron job to run hourly (if not already present)
CRON_JOB="0 * * * * ${SCRIPT_PATH}"
CRON_USER="${SUDO_USER:-${USER}}"

# Check if cron job already exists for this user
if ! crontab -u "${CRON_USER}" -l 2>/dev/null | grep -qF "${SCRIPT_NAME}"; then
  (crontab -u "${CRON_USER}" -l 2>/dev/null || true; echo "${CRON_JOB}") | crontab -u "${CRON_USER}" -
  echo "Cron job added for user ${CRON_USER} to run hourly"
else
  echo "Cron job already exists for user ${CRON_USER}"
fi

# Run initial sync
echo "Running initial sync..."
sudo -u "${CRON_USER}" "${SCRIPT_PATH}"

echo "Done! SSH keys will sync hourly."
