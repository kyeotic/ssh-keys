#!/bin/bash
# sync-ssh-keys.sh

SERVER_URL="__SERVER_URL__"
AUTHORIZED_KEYS="$HOME/.ssh/authorized_keys"
TEMP_FILE=$(mktemp)

# Marker comments
START_MARKER="# BEGIN KYEOTIC MANAGED KEYS"
END_MARKER="# END KYEOTIC MANAGED KEYS"

# Create authorized_keys if it doesn't exist
mkdir -p ~/.ssh
touch "$AUTHORIZED_KEYS"
chmod 600 "$AUTHORIZED_KEYS"

# Extract non-managed keys (everything outside markers)
sed -n "1,/^${START_MARKER}/p; /^${END_MARKER}/,\$p" "$AUTHORIZED_KEYS" | \
  grep -v "^${START_MARKER}\$" | grep -v "^${END_MARKER}\$" > "$TEMP_FILE"

# Add managed section
echo "$START_MARKER" >> "$TEMP_FILE"
echo "# Auto-synced from $SERVER_URL" >> "$TEMP_FILE"
echo "# Last updated: $(date)" >> "$TEMP_FILE"

# Download all managed keys
curl -sf "$SERVER_URL/authorized_keys" >> "$TEMP_FILE"

echo "$END_MARKER" >> "$TEMP_FILE"

# Replace authorized_keys
mv "$TEMP_FILE" "$AUTHORIZED_KEYS"
chmod 600 "$AUTHORIZED_KEYS"