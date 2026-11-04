import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DIRECTIONAL_ARTWORK, DIRECTIONAL_WALKS } from '../src/room/directionalMovementGeometry.ts';

interface SourceFrame {
  cell: number;
  id: string;
  source: string;
  sourceSize: [number, number];
  bounds: [number, number, number, number];
  sha256: string;
}
interface Review {
  canvas: [number, number];
  groundPivot: [number, number];
  frames: SourceFrame[];
  production: typeof DIRECTIONAL_ARTWORK;
}
const review: Review = JSON.parse(readFileSync(new URL('../artwork/animation-v3/directions-v1/review.json', import.meta.url), 'utf8'));

test('lateral headings have separate complete gait cells tied to reviewed source images', () => {
  const cells = new Set<number>(), sources = new Set<string>();
  for (const direction of ['left', 'right'] as const) {
    assert.equal(DIRECTIONAL_WALKS[direction].length, 8);
    for (const frame of DIRECTIONAL_WALKS[direction]) {
      const source = review.frames.find(candidate => candidate.cell === frame.cell);
      assert.ok(source);
      assert.equal(source.id, frame.id);
      assert.ok(frame.id.startsWith(direction + '-'));
      assert.ok(source.source.includes('/' + direction + '/'));
      assert.equal(frame.top, source.bounds[1]);
      assert.ok(!cells.has(frame.cell), 'headings must not reuse one set of mirrored cells');
      assert.ok(!sources.has(source.sha256), 'each selected pose must have its own source');
      cells.add(frame.cell); sources.add(source.sha256);
      const png = readFileSync(new URL('../' + source.source, import.meta.url));
      assert.equal(createHash('sha256').update(png).digest('hex'), source.sha256);
      assert.equal(png.toString('ascii', 1, 4), 'PNG');
      assert.equal(png.readUInt32BE(16), source.sourceSize[0]);
      assert.equal(png.readUInt32BE(20), source.sourceSize[1]);
      assert.equal(png[25], 6, 'masters must retain RGBA rather than a flattened backdrop');
    }
  }
  assert.equal(cells.size, 16);
  const tops = review.frames.map(frame => frame.bounds[1]);
  assert.ok(Math.max(...tops) - Math.min(...tops) <= 3, 'fixed-camera head height should remain stable');
});

test('lateral texture matches immutable hash, actual dimensions and shared logical canvas', () => {
  const asset = DIRECTIONAL_ARTWORK;
  const image = readFileSync(new URL('../public/' + asset.image, import.meta.url));
  assert.equal(createHash('sha256').update(image).digest('hex'), asset.sha256);
  assert.ok(asset.image.includes(asset.sha256.slice(0, 12)));
  assert.equal(image.toString('ascii', 12, 16), 'VP8X');
  assert.equal(image.readUIntLE(24, 3) + 1, asset.width);
  assert.equal(image.readUIntLE(27, 3) + 1, asset.height);
  assert.equal(asset.width / asset.columns, asset.cellWidth);
  assert.equal(asset.height / asset.rows, asset.cellHeight);
  assert.equal(asset.columns * asset.rows, review.frames.length);
  assert.deepEqual(review.production, asset);
  assert.deepEqual(review.canvas, [asset.cellWidth * 2, asset.cellHeight * 2]);
  assert.deepEqual(review.groundPivot, [review.canvas[0] / 2, 468]);
  for (const frame of review.frames) {
    assert.ok(frame.bounds[0] > 0 && frame.bounds[1] > 0);
    assert.ok(frame.bounds[2] < review.canvas[0] && frame.bounds[3] < review.canvas[1]);
  }
  assert.ok(asset.width * asset.height * 4 <= 3 * 1024 * 1024);
});
