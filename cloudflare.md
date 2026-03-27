# Cloudflare Workers Migration

Migrating from Deno Deploy to Cloudflare Workers.

When finishing work update this document with progress and changes.

## What Needs to Change

| Deno Deploy                              | Cloudflare Equivalent                                                      | Scope                             |
| ---------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- |
| `Deno.serve(handler)`                    | `export default { fetch(req, env, ctx) }`                                  | `server.ts`                       |
| `Deno.readDir()` / `Deno.readTextFile()` | Text module imports via `[[rules]]` + pre-build step for keys              | `server.ts`, `wrangler.toml`      |
| `@kyeotic/server`                        | Removed — not needed                                                       | `server.ts`                       |
| `import.meta.main` guard                 | Removed — not needed                                                       | `server.ts`                       |
| Shell scripts read at runtime            | Imported as text modules via wrangler `[[rules]]`                          | `wrangler.toml`, `src/worker.ts`  |
| Key files read from `keys/` at runtime   | Build script generates `src/keys-generated.ts`                             | `scripts/build-keys.js`           |
| `deno.json` deploy task (`deployctl`)    | `wrangler.toml` + updated `deno.json` tasks using `npx wrangler`           | project root                      |
| `infra/` — AWS Route53 via Deno module   | Cloudflare DNS via Terraform Cloudflare provider                           | `infra/`                          |
| GitHub Actions `denoland/deployctl@v1`   | Cloudflare Git integration (no GitHub Actions needed)                      | Cloudflare dashboard              |

---

## Phase 1: Cloudflare Project Setup

- [x] Create `wrangler.toml` with worker name, compatibility date, and text module rules
- [x] Update `deno.json` tasks: `dev`, `deploy`, `push-secrets`
- [x] Write `scripts/build-keys.js` (Node.js — Deno not used)
- [ ] Set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in `.env` (for local `wrangler dev` only)

**`wrangler.toml` key sections:**
```toml
name = "kye-ssh-keys"
main = "src/worker.ts"
compatibility_date = "2025-01-01"

[[rules]]
type = "Text"
globs = ["**/*.sh"]

[build]
command = "node scripts/build-keys.js"
```

**`deno.json` tasks:**
```json
{
  "dev": "node scripts/build-keys.js && npx wrangler dev",
  "deploy": "npx wrangler deploy",
  "push-secrets": ""
}
```

No secrets are needed for this worker — it serves public key data with no authentication.

**Note:** For local dev, wrangler reads `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` from environment. For production deploys, use **Cloudflare Git integration** (Workers & Pages → Create → Import a Git repository) — no GitHub secrets needed. The `[build]` command in `wrangler.toml` runs automatically on each deploy.

---

## Phase 2: Code Migration

- [x] Write `scripts/build-keys.js` — reads all `keys/*.pub` files, writes `src/keys-generated.ts`
- [x] Write `src/worker.ts` — CF Worker entry point replacing `server.ts`
- [x] Remove `@kyeotic/server` from `deno.json` imports (deno.json removed entirely)

### Build Step: `scripts/build-keys.js`

Reads all `.pub` files from `keys/` and generates a TypeScript module exporting their concatenated content as a string. Run before `wrangler dev` or `wrangler deploy` via the `[build]` command.

**Output (`src/keys-generated.ts`):**
```ts
// AUTO-GENERATED — do not edit. Run `deno task build-keys` to regenerate.
export const authorizedKeys = `ssh-ed25519 AAAA... macbook-2026\nssh-ed25519 AAAA... wsl-2026\n`
```

Add `src/keys-generated.ts` to `.gitignore` (regenerated on each build).

### New Entry Point: `src/worker.ts`

Shell scripts (`sync.sh`, `init.sh`, `reinstall.sh`) are imported as text using the `[[rules]]` config in `wrangler.toml`. The handler logic is identical to the current `server.ts` — only the file-reading and entry-point patterns change:

```ts
import syncScript from './sync.sh'
import initScript from './init.sh'
import reinstallScript from './reinstall.sh'
import { authorizedKeys } from './keys-generated'

export default {
  async fetch(req: Request): Promise<Response> {
    // same routing logic as current handler()
  }
}
```

No `Deno.*` APIs remain. Cache variables (`cachedSyncScript`, etc.) can be kept as module-level constants since the text is now inlined at build time — they become simple re-exports and the caching logic can be removed entirely.

### `deno.json` changes

- Remove `@kyeotic/server` from `imports`
- Remove `deploy` section (replaced by `wrangler.toml`)
- Remove `deno.ns` / `deno.unstable` from `compilerOptions.lib`
- Update `dev` and `deploy` tasks

---

## Phase 3: DNS Migration

The current `infra/` uses `github.com/kyeotic/tf-deno-domain-aws` to create Route53 records for Deno's ACME challenge and CNAME. Cloudflare Workers custom domains require the zone to be on Cloudflare's nameservers.

- [ ] Move `kye.dev` nameservers to Cloudflare (done in Cloudflare dashboard — add site, get NS records, update registrar)
- [x] Replace `infra/dns.tf` and `infra/main.tf` with Cloudflare provider
- [x] Remove `infra/vars.tf` `deno_deploy_acme` variable
- [x] Configure custom domain `ssh-keys.kye.dev` in `wrangler.toml`

**New `wrangler.toml` routes:**
```toml
routes = [
  { pattern = "ssh-keys.kye.dev/*", zone_name = "kye.dev" }
]
```

**New `infra/main.tf`:**
```hcl
terraform {
  backend "s3" {}
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.0.10"
}

provider "cloudflare" {
  # uses CLOUDFLARE_API_TOKEN from environment
}
```

**New `infra/dns.tf`:**
```hcl
data "cloudflare_zone" "kye_dev" {
  name = "kye.dev"
}

resource "cloudflare_record" "ssh_keys" {
  zone_id = data.cloudflare_zone.kye_dev.id
  name    = "ssh-keys"
  type    = "CNAME"
  value   = "ssh-keys.workers.dev"
  proxied = true
}
```

**Updated `infra/vars.tf`:** Remove `deno_deploy_acme` variable. Keep `domain_name` and `zone_name`.

**Updated `infra/deploy`:** Remove AWS account ID lookup; add `CLOUDFLARE_API_TOKEN` to the expected env vars.

**Note:** The S3 backend can remain for Terraform state storage — AWS is only used for that, not for DNS after this migration.

---

## Phase 4: CI/CD Update

Using **Cloudflare Git integration** instead of GitHub Actions — no API tokens stored in GitHub.

- [ ] Connect repo in Cloudflare dashboard: Workers & Pages → Create → Import a Git repository
- [ ] Set build command to `node scripts/build-keys.js` (or leave blank — `wrangler.toml` `[build]` runs automatically)
- [ ] Delete or disable `.github/workflows/deploy.yml` (no longer needed)

---

## Phase 5: Deploy & Cutover

- [ ] Run `npx wrangler deploy` (or push to main to trigger Cloudflare Git integration)
- [ ] Verify all endpoints: `/`, `/health`, `/authorized_keys`, `/sync.sh`, `/install`, `/reinstall`
- [ ] Verify placeholder replacement (`__SERVER_URL__`, `__MARKER_ID__`) works with the new domain
- [ ] Decommission Deno Deploy project (`kyeotic-ssh-keys`)
- [ ] Remove `deno_deploy_acme` DNS record from Route53 (after NS cutover to Cloudflare)

---

## Key Notes

- **No secrets needed** — the worker serves public data only; no env vars are required at runtime
- **File reading** — CF Workers have no filesystem access; shell scripts become text module imports via `[[rules]]`, key files require a pre-build step since the directory listing is dynamic
- **`keys-generated.ts` in `.gitignore`** — regenerated by the build step; committing it would cause drift
- **Zone must be on Cloudflare** for custom domain routing (`ssh-keys.kye.dev`); if the zone stays on Route53, the worker can only be accessed via `*.workers.dev`
- **S3 backend** — can be kept for Terraform state even after removing the AWS DNS dependency; only needs `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in the deploy env
- **wrangler text rules** — `[[rules]]` with `type = "Text"` lets you `import script from './script.sh'` and get a `string`; wrangler/esbuild handles the inlining at bundle time
- **Test compatibility** — `server_test.ts` imports and calls `handler()` directly; after migration, update it to import the fetch handler from `worker.ts` instead
