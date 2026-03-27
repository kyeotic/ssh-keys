// AUTO-RUN before wrangler dev/deploy — generates src/keys-generated.ts
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const keysDir = resolve(import.meta.dirname, '../keys')
const srcDir = resolve(import.meta.dirname, '../src')
const outFile = resolve(import.meta.dirname, '../src/keys-generated.ts')

const files = (await readdir(keysDir))
  .filter((f) => f.endsWith('.pub'))
  .sort()

const keys = await Promise.all(
  files.map((f) => readFile(join(keysDir, f), 'utf8'))
)

const scripts = await Promise.all(
  ['sync.sh', 'init.sh', 'reinstall.sh'].map(async (name) => {
    const content = await readFile(join(srcDir, name), 'utf8')
    return [name.replace('.sh', ''), Buffer.from(content).toString('base64')]
  })
)

const scriptExports = scripts
  .map(([name, b64]) => `export const ${name}Script = atob('${b64}')`)
  .join('\n')

const keysContent = keys.map((k) => k.trimEnd()).join('\n') + '\n'

const content =
  `// AUTO-GENERATED — do not edit. Run \`node scripts/build-keys.js\` to regenerate.\n` +
  `export const authorizedKeys = \`${keysContent.replace(/`/g, '\\`')}\`\n` +
  scriptExports + '\n'

await writeFile(outFile, content)
console.log(`Wrote ${files.length} key(s) and ${scripts.length} script(s) to src/keys-generated.ts`)
