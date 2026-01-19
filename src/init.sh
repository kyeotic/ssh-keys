#!/bin/sh
# SSH Keys Sync Installer
# Run with: curl -fsSL https://ssh-keys.kye.dev/install | sh
# (use sudo if not running as root)

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

# Determine target user for cron and sync
# If run via sudo, use the original user; otherwise use current user
CRON_USER="${SUDO_USER:-${USER}}"

# Add cron job to run hourly (if not already present)
CRON_JOB="0 * * * * ${SCRIPT_PATH}"

if ! crontab -u "${CRON_USER}" -l 2>/dev/null | grep -qF "${SCRIPT_NAME}"; then
  (crontab -u "${CRON_USER}" -l 2>/dev/null || true; echo "${CRON_JOB}") | crontab -u "${CRON_USER}" -
  echo "Cron job added for user ${CRON_USER} to run hourly"
else
  echo "Cron job already exists for user ${CRON_USER}"
fi

# Run initial sync
echo "Running initial sync..."
if [ -n "${SUDO_USER}" ] && command -v sudo > /dev/null 2>&1; then
  sudo -u "${CRON_USER}" "${SCRIPT_PATH}"
else
  "${SCRIPT_PATH}"
fi

echo "Done! SSH keys will sync hourly."
