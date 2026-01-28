#!/bin/sh
# SSH Keys Sync Script Updater
# Run with: curl -fsSL https://ssh-keys.kye.dev/reinstall | sh
# (use sudo if not running as root)

SERVER_URL="__SERVER_URL__"
INSTALL_DIR="/usr/local/bin"
SCRIPT_NAME="sync-ssh-keys"
SCRIPT_PATH="${INSTALL_DIR}/${SCRIPT_NAME}"
TEMP_FILE=$(mktemp)

SCRIPT_UPDATED=0
CRON_UPDATED=0

# Download the latest sync script
if ! curl -sf "${SERVER_URL}/sync.sh" -o "$TEMP_FILE"; then
  rm -f "$TEMP_FILE"
  echo "error"
  exit 1
fi

# Check if script exists and compare
if [ -f "$SCRIPT_PATH" ]; then
  if ! cmp -s "$TEMP_FILE" "$SCRIPT_PATH"; then
    mv "$TEMP_FILE" "$SCRIPT_PATH"
    chmod +x "$SCRIPT_PATH"
    SCRIPT_UPDATED=1
  else
    rm -f "$TEMP_FILE"
  fi
else
  mv "$TEMP_FILE" "$SCRIPT_PATH"
  chmod +x "$SCRIPT_PATH"
  SCRIPT_UPDATED=1
fi

# Check and update crontab if needed
# Determine target user for cron
CRON_USER="${SUDO_USER:-${USER}}"

# Expected cron job format (suppress output unless error)
EXPECTED_CRON_JOB="0 * * * * OUTPUT=\$(${SCRIPT_PATH} 2>&1) || echo \"\$OUTPUT\""

# Get current crontab and check for sync-ssh-keys entry
CURRENT_CRONTAB=$(crontab -u "${CRON_USER}" -l 2>/dev/null || true)
CURRENT_CRON_JOB=$(echo "$CURRENT_CRONTAB" | grep -F "${SCRIPT_NAME}" || true)

if [ -n "$CURRENT_CRON_JOB" ]; then
  # Entry exists, check if it matches expected format
  if [ "$CURRENT_CRON_JOB" != "$EXPECTED_CRON_JOB" ]; then
    # Update the cron entry
    NEW_CRONTAB=$(echo "$CURRENT_CRONTAB" | grep -vF "${SCRIPT_NAME}")
    if [ -n "$NEW_CRONTAB" ]; then
      echo "$NEW_CRONTAB
$EXPECTED_CRON_JOB" | crontab -u "${CRON_USER}" -
    else
      echo "$EXPECTED_CRON_JOB" | crontab -u "${CRON_USER}" -
    fi
    CRON_UPDATED=1
  fi
else
  # No entry exists, add one
  (echo "$CURRENT_CRONTAB"; echo "$EXPECTED_CRON_JOB") | crontab -u "${CRON_USER}" -
  CRON_UPDATED=1
fi

# Report status
if [ $SCRIPT_UPDATED -eq 1 ] && [ $CRON_UPDATED -eq 1 ]; then
  echo "updated script and cron"
elif [ $SCRIPT_UPDATED -eq 1 ]; then
  echo "updated script"
elif [ $CRON_UPDATED -eq 1 ]; then
  echo "updated cron"
else
  echo "unchanged"
fi
