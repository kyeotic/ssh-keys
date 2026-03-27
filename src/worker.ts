import { authorizedKeys, syncScript, initScript, reinstallScript } from './keys-generated'

const SERVER_URL_PLACEHOLDER = '__SERVER_URL__'
const MARKER_ID_PLACEHOLDER = '__MARKER_ID__'

function getServerUrl(req: Request): string {
  const url = new URL(req.url)
  return `${url.protocol}//${url.host}`
}

function getMarkerId(req: Request): string {
  const url = new URL(req.url)
  return url.host.toUpperCase()
}

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname

  const serverUrl = getServerUrl(req)
  const markerId = getMarkerId(req)

  if (path === '/sync.sh') {
    const script = syncScript
      .replaceAll(SERVER_URL_PLACEHOLDER, serverUrl)
      .replaceAll(MARKER_ID_PLACEHOLDER, markerId)
    return new Response(script, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (path === '/authorized_keys') {
    return new Response(authorizedKeys, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (path === '/install') {
    const script = initScript.replaceAll(SERVER_URL_PLACEHOLDER, serverUrl)
    return new Response(script, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (path === '/reinstall') {
    const script = reinstallScript.replaceAll(SERVER_URL_PLACEHOLDER, serverUrl)
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

export default {
  fetch: handler,
}
