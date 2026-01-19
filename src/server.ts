const KEYS_DIR = new URL('../keys/', import.meta.url)
const SYNC_SCRIPT_PATH = new URL('./sync.sh', import.meta.url)
const INIT_SCRIPT_PATH = new URL('./init.sh', import.meta.url)
const SERVER_URL_PLACEHOLDER = '__SERVER_URL__'

// Cached file contents (lazy-loaded)
let cachedAuthorizedKeys: string | null = null
let cachedSyncScript: string | null = null
let cachedInitScript: string | null = null

function getServerUrl(req: Request): string {
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}`
}

async function getAuthorizedKeys(): Promise<string> {
  if (cachedAuthorizedKeys === null) {
    const keys: string[] = []
    for await (const entry of Deno.readDir(KEYS_DIR)) {
      if (entry.isFile && entry.name.endsWith('.pub')) {
        const content = await Deno.readTextFile(new URL(entry.name, KEYS_DIR))
        keys.push(content.trim())
      }
    }
    cachedAuthorizedKeys = keys.join('\n') + '\n'
  }
  return cachedAuthorizedKeys
}

async function getSyncScript(): Promise<string> {
  if (cachedSyncScript === null) {
    cachedSyncScript = await Deno.readTextFile(SYNC_SCRIPT_PATH)
  }
  return cachedSyncScript
}

async function getInitializeScript(): Promise<string> {
  if (cachedInitScript === null) {
    cachedInitScript = await Deno.readTextFile(INIT_SCRIPT_PATH)
  }
  return cachedInitScript
}

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname

  const serverUrl = getServerUrl(req)

  if (path === '/sync.sh') {
    const script = (await getSyncScript()).replaceAll(
      SERVER_URL_PLACEHOLDER,
      serverUrl,
    )
    return new Response(script, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (path === '/authorized_keys') {
    const keys = await getAuthorizedKeys()
    return new Response(keys, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (path === '/initialize') {
    const script = (await getInitializeScript()).replaceAll(
      SERVER_URL_PLACEHOLDER,
      serverUrl,
    )
    return new Response(script, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (path === '/' || path === '/health') {
    return new Response('SSH Keys Server\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  return new Response('Not Found\n', { status: 404 })
}

if (import.meta.main) {
  Deno.serve(handler)
}
