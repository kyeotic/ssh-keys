# SSH Keys Server

A Deno Deploy server for managing and syncing SSH public keys across homelab machines.

## Quick Start

Run the following command to install the sync script and set up hourly cron:

```sh
# As root:
curl -fsSL https://ssh-keys.kye.dev/install | sh

# Or with sudo:
curl -fsSL https://ssh-keys.kye.dev/install | sudo sh
```

This will:
1. Download `sync.sh` to `/usr/local/bin/sync-ssh-keys`
2. Make it executable
3. Add a cron job to run hourly
4. Run an initial sync

## Overview

This server provides a managed subset of SSH keys that can be synced to `~/.ssh/authorized_keys` on target machines. Pre-existing keys are preserved, while managed keys (between marker comments) are kept in sync with this server.

## How It Works

The sync script manages a section of your `~/.ssh/authorized_keys` file between markers based on the server host:

```
# BEGIN SSH-KEYS.KYE.DEV MANAGED KEYS
# Auto-synced from https://ssh-keys.kye.dev
# Last updated: ...
ssh-ed25519 AAAA... user@host
# END SSH-KEYS.KYE.DEV MANAGED KEYS
```

Any keys outside these markers are preserved and unaffected by syncs.

## Adding/Removing Keys

1. Add `.pub` files to the `keys/` directory
2. Deploy the server

All machines will pick up the changes on their next hourly sync.

## Endpoints

| Endpoint           | Description                                        |
| ------------------ | -------------------------------------------------- |
| `/authorized_keys` | Returns all public keys from the `keys/` directory |
| `/sync.sh`         | Returns the sync script                            |
| `/install`      | Returns an installer script for initial setup      |

### Manual Sync

To manually trigger a sync without installing:

```sh
curl -fsSL https://ssh-keys.kye.dev/sync.sh | sh
```

### View Current Keys

```sh
curl https://ssh-keys.kye.dev/authorized_keys
```

## Development

```sh
deno task dev
```

## Deployment

```sh
deno task deploy
```
