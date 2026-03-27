// AUTO-RUN before wrangler dev/deploy — generates src/keys-generated.ts
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const keysDir = resolve(import.meta.dirname, '../keys')
const outFile = resolve(import.meta.dirname, '../src/keys-generated.ts')

const files = (await readdir(keysDir))
  .filter((f) => f.endsWith('.pub'))
  .sort()

const keys = await Promise.all(
  files.map((f) => readFile(join(keysDir, f), 'utf8'))
)

const content =
  `// AUTO-GENERATED — do not edit. Run \`node scripts/build-keys.js\` to regenerate.\n` +
  `export const authorizedKeys = \`${keys.join('').replace(/`/g, '\\`')}\`\n`

await writeFile(outFile, content)
console.log(`Wrote ${files.length} key(s) to src/keys-generated.ts`)
