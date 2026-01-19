import { assertEquals, assertStringIncludes } from "@std/assert";
import { handler } from "./server.ts";

const BASE_URL = "https://ssh-keys.kye.dev";

Deno.test("GET / returns server name", async () => {
  const req = new Request(`${BASE_URL}/`);
  const res = await handler(req);

  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "text/plain; charset=utf-8");
  assertEquals(await res.text(), "SSH Keys Server\n");
});

Deno.test("GET /health returns server name", async () => {
  const req = new Request(`${BASE_URL}/health`);
  const res = await handler(req);

  assertEquals(res.status, 200);
  assertEquals(await res.text(), "SSH Keys Server\n");
});

Deno.test("GET /authorized_keys returns public keys", async () => {
  const req = new Request(`${BASE_URL}/authorized_keys`);
  const res = await handler(req);

  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "text/plain; charset=utf-8");

  const body = await res.text();
  assertStringIncludes(body, "ssh-");
});

Deno.test("GET /sync.sh returns sync script with replaced URL and marker", async () => {
  const req = new Request(`${BASE_URL}/sync.sh`);
  const res = await handler(req);

  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "text/plain; charset=utf-8");

  const body = await res.text();
  assertStringIncludes(body, "#!/bin/sh");
  assertStringIncludes(body, `SERVER_URL="${BASE_URL}"`);
  assertStringIncludes(body, "SSH-KEYS.KYE.DEV MANAGED KEYS");
});

Deno.test("GET /install returns init script with replaced URL", async () => {
  const req = new Request(`${BASE_URL}/install`);
  const res = await handler(req);

  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "text/plain; charset=utf-8");

  const body = await res.text();
  assertStringIncludes(body, "#!/bin/sh");
  assertStringIncludes(body, `SERVER_URL="${BASE_URL}"`);
  assertStringIncludes(body, "sync-ssh-keys");
  assertStringIncludes(body, "crontab");
});

Deno.test("GET /unknown returns 404", async () => {
  const req = new Request(`${BASE_URL}/unknown`);
  const res = await handler(req);

  assertEquals(res.status, 404);
  assertEquals(await res.text(), "Not Found\n");
});

Deno.test("URL and marker replacement uses request host", async () => {
  const customHost = "https://custom.example.com";
  const req = new Request(`${customHost}/sync.sh`);
  const res = await handler(req);

  const body = await res.text();
  assertStringIncludes(body, `SERVER_URL="${customHost}"`);
  assertStringIncludes(body, "CUSTOM.EXAMPLE.COM MANAGED KEYS");
});
