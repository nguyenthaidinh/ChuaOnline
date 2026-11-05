import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createTempleServer } from '../server/index.ts';

test('production assets support fonts, validators, compression and audio ranges', async () => {
  const dist = await mkdtemp(join(tmpdir(), 'chua-static-'));
  const server = createTempleServer({ dist });
  try {
    await writeFile(join(dist, 'font.woff2'), 'font-fixture');
    await writeFile(join(dist, 'music.mp3'), '0123456789');
    await writeFile(join(dist, 'app.js'), 'const example = 1;\n'.repeat(100));
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    const font = await fetch(base + '/font.woff2');
    assert.equal(font.status, 200);
    assert.equal(font.headers.get('content-type'), 'font/woff2');
    assert.equal(await font.text(), 'font-fixture');
    const cached = await fetch(base + '/font.woff2', { headers: { 'If-None-Match': font.headers.get('etag')! } });
    assert.equal(cached.status, 304);
    const js = await fetch(base + '/app.js', { headers: { 'Accept-Encoding': 'gzip' } });
    assert.equal(js.headers.get('content-encoding'), 'gzip');
    assert.equal(await js.text(), 'const example = 1;\n'.repeat(100));
    const plain = await fetch(base + '/app.js', { headers: { 'Accept-Encoding': 'gzip;q=0' } });
    assert.equal(plain.headers.get('content-encoding'), null);
    await plain.arrayBuffer();
    for (const [range, expected] of [['bytes=2-5', '2345'], ['bytes=-3', '789'], ['bytes=8-', '89']]) {
      const response = await fetch(base + '/music.mp3', { headers: { Range: range } });
      assert.equal(response.status, 206);
      assert.equal(await response.text(), expected);
    }
    const invalid = await fetch(base + '/music.mp3', { headers: { Range: 'bytes=99-' } });
    assert.equal(invalid.status, 416);
    assert.equal(invalid.headers.get('content-range'), 'bytes */10');
    const stale = await fetch(base + '/music.mp3', { headers: { Range: 'bytes=2-5', 'If-Range': 'Thu, 01 Jan 1970 00:00:00 GMT' } });
    assert.equal(stale.status, 200);
    assert.equal(await stale.text(), '0123456789');
    const head = await fetch(base + '/music.mp3', { method: 'HEAD' });
    assert.equal(head.headers.get('content-length'), '10');
    assert.equal(await head.text(), '');
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(dist, { recursive: true, force: true });
  }
});
