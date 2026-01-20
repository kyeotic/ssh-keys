#!/bin/sh
# SSH Keys Sync Script Updater
# Run with: curl -fsSL https://ssh-keys.kye.dev/reinstall | sh
# (use sudo if not running as root)

SERVER_URL="__SERVER_URL__"
INSTALL_DIR="/usr/local/bin"
SCRIPT_NAME="sync-ssh-keys"
SCRIPT_PATH="${INSTALL_DIR}/${SCRIPT_NAME}"
TEMP_FILE=$(mktemp)

# Download the latest sync script
if ! curl -sf "${SERVER_URL}/sync.sh" -o "$TEMP_FILE"; then
  rm -f "$TEMP_FILE"
  echo "error"
  exit 1
fi

# Check if script exists and compare
if [ -f "$SCRIPT_PATH" ]; then
  if cmp -s "$TEMP_FILE" "$SCRIPT_PATH"; then
    rm -f "$TEMP_FILE"
    echo "unchanged"
    exit 0
  fi
fi

# Install the new script
mv "$TEMP_FILE" "$SCRIPT_PATH"
chmod +x "$SCRIPT_PATH"

echo "updated"
