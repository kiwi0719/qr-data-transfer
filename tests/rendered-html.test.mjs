import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("..", import.meta.url));
let server;
let baseUrl;

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`next start exited with code ${server.exitCode}`);
    }
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
}

before(async () => {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { cwd: root, stdio: "ignore", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } },
  );
  await waitForServer(baseUrl);
});

after(() => {
  server?.kill();
});

function render(pathname) {
  return fetch(`${baseUrl}${pathname}`, { headers: { accept: "text/html" } });
}

test("server-renders the sender product surface", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Send a file · QRFerry<\/title>/i);
  assert.match(html, /Move a file/);
  assert.match(html, /Choose a file/);
  assert.match(html, /Start QR stream/);
  assert.match(html, /Brotli-11 \+ gzip-9/);
  assert.match(html, /RaptorQ FEC/);
  assert.match(html, /dual modes alternate two stable lanes/i);
  assert.match(html, /Turbo 30/);
  assert.match(html, /1 Mbps/);
  assert.doesNotMatch(html, /codex-preview|loading skeleton/i);
});

test("server-renders the mobile scanner surface", async () => {
  const response = await render("/scan");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>Scan a transfer · QRFerry<\/title>/i);
  assert.match(html, /Point\. Hold\. Receive\./);
  assert.match(html, /Start camera/);
  assert.match(html, /File recovery progress/);
  assert.match(html, /Effective file rate/);
  assert.match(html, /Dual lane/);
  assert.match(html, /decode p50 \/ p95/i);
  assert.match(html, /one raw-binary QR per exposure|Dual-lane scanning/);
});

test("serves the ZXing reader WebAssembly binary", async () => {
  const response = await fetch(`${baseUrl}/zxing/zxing_reader.wasm`);
  assert.equal(response.status, 200);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.deepEqual([...bytes.subarray(0, 4)], [0x00, 0x61, 0x73, 0x6d]);
});
