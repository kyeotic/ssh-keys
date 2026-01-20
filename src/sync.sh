#!/bin/sh
# sync-ssh-keys.sh

SERVER_URL="__SERVER_URL__"
AUTHORIZED_KEYS="$HOME/.ssh/authorized_keys"
TEMP_FILE=$(mktemp)
KEYS_FILE=$(mktemp)

# Marker comments
START_MARKER="# BEGIN __MARKER_ID__ MANAGED KEYS"
END_MARKER="# END __MARKER_ID__ MANAGED KEYS"

# Create authorized_keys if it doesn't exist
mkdir -p ~/.ssh
touch "$AUTHORIZED_KEYS"
chmod 600 "$AUTHORIZED_KEYS"

# Download keys first to check for errors
if ! curl -sf "$SERVER_URL/authorized_keys" > "$KEYS_FILE"; then
  rm -f "$TEMP_FILE" "$KEYS_FILE"
  echo "error"
  exit 1
fi

# Extract current managed keys (just the keys, not the markers or metadata)
CURRENT_KEYS=$(sed -n "/^${START_MARKER}\$/,/^${END_MARKER}\$/p" "$AUTHORIZED_KEYS" | \
  grep -v "^#" | sort)
NEW_KEYS=$(cat "$KEYS_FILE" | sort)

# Check if keys have changed
if [ "$CURRENT_KEYS" = "$NEW_KEYS" ]; then
  rm -f "$TEMP_FILE" "$KEYS_FILE"
  echo "unchanged"
  exit 0
fi

# Extract non-managed keys (everything outside markers)
sed -n "1,/^${START_MARKER}/p; /^${END_MARKER}/,\$p" "$AUTHORIZED_KEYS" | \
  grep -v "^${START_MARKER}\$" | grep -v "^${END_MARKER}\$" > "$TEMP_FILE"

# Add managed section
echo "$START_MARKER" >> "$TEMP_FILE"
echo "# Auto-synced from $SERVER_URL" >> "$TEMP_FILE"
echo "# Last updated: $(date)" >> "$TEMP_FILE"
cat "$KEYS_FILE" >> "$TEMP_FILE"
echo "$END_MARKER" >> "$TEMP_FILE"

# Replace authorized_keys
mv "$TEMP_FILE" "$AUTHORIZED_KEYS"
chmod 600 "$AUTHORIZED_KEYS"

# Clean up
rm -f "$KEYS_FILE"

echo "updated"