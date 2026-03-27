import { test, expect, vi, beforeAll } from 'vitest'

vi.mock('./keys-generated', () => ({
  authorizedKeys: 'ssh-ed25519 AAAAtest test-key\n',
  syncScript:
    '#!/bin/sh\nSERVER_URL="__SERVER_URL__"\nSTART_MARKER="# BEGIN __MARKER_ID__ MANAGED KEYS"\nEND_MARKER="# END __MARKER_ID__ MANAGED KEYS"\necho "error"\necho "unchanged"\necho "updated"\n',
  initScript:
    '#!/bin/sh\nSERVER_URL="__SERVER_URL__"\nSCRIPT_NAME="sync-ssh-keys"\ncrontab -u "${CRON_USER}" -\n',
  reinstallScript:
    '#!/bin/sh\nSERVER_URL="__SERVER_URL__"\ncrontab -u "${CRON_USER}" -\necho "error"\necho "unchanged"\necho "updated script and cron"\necho "updated script"\necho "updated cron"\n',
}))

const { handler } = await import('./worker')

const BASE_URL = 'https://ssh-keys.kye.dev'

test('GET / returns server name', async () => {
  const res = await handler(new Request(`${BASE_URL}/`))
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
  expect(await res.text()).toBe('SSH Keys Server\n')
})

test('GET /health returns server name', async () => {
  const res = await handler(new Request(`${BASE_URL}/health`))
  expect(res.status).toBe(200)
  expect(await res.text()).toBe('SSH Keys Server\n')
})

test('GET /authorized_keys returns public keys', async () => {
  const res = await handler(new Request(`${BASE_URL}/authorized_keys`))
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
  expect(await res.text()).toContain('ssh-')
})

test('GET /sync.sh returns sync script with replaced URL and marker', async () => {
  const res = await handler(new Request(`${BASE_URL}/sync.sh`))
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
  const body = await res.text()
  expect(body).toContain('#!/bin/sh')
  expect(body).toContain(`SERVER_URL="${BASE_URL}"`)
  expect(body).toContain('SSH-KEYS.KYE.DEV MANAGED KEYS')
  expect(body).toContain('echo "error"')
  expect(body).toContain('echo "unchanged"')
  expect(body).toContain('echo "updated"')
})

test('GET /install returns init script with replaced URL', async () => {
  const res = await handler(new Request(`${BASE_URL}/install`))
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
  const body = await res.text()
  expect(body).toContain('#!/bin/sh')
  expect(body).toContain(`SERVER_URL="${BASE_URL}"`)
  expect(body).toContain('sync-ssh-keys')
  expect(body).toContain('crontab')
})

test('GET /reinstall returns reinstall script with replaced URL and status outputs', async () => {
  const res = await handler(new Request(`${BASE_URL}/reinstall`))
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
  const body = await res.text()
  expect(body).toContain('#!/bin/sh')
  expect(body).toContain(`SERVER_URL="${BASE_URL}"`)
  expect(body).toContain('echo "error"')
  expect(body).toContain('echo "unchanged"')
  expect(body).toContain('echo "updated script and cron"')
  expect(body).toContain('echo "updated script"')
  expect(body).toContain('echo "updated cron"')
  expect(body).toContain('crontab')
})

test('GET /unknown returns 404', async () => {
  const res = await handler(new Request(`${BASE_URL}/unknown`))
  expect(res.status).toBe(404)
  expect(await res.text()).toBe('Not Found\n')
})

test('URL and marker replacement uses request host', async () => {
  const customHost = 'https://custom.example.com'
  const res = await handler(new Request(`${customHost}/sync.sh`))
  const body = await res.text()
  expect(body).toContain(`SERVER_URL="${customHost}"`)
  expect(body).toContain('CUSTOM.EXAMPLE.COM MANAGED KEYS')
})
