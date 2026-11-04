import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPANDED_DIRECTION_ARTWORK, EXPANDED_DIRECTION_STANDS, EXPANDED_DIRECTION_WALKS,
  type ExpandedHeading, type ExpandedStandHeading } from '../src/room/expandedDirectionGeometry.ts';

interface SourceFrame {
  cell: number; id: string; kind: 'walk' | 'stand'; source: string; sha256: string;
  sourceSize: [number, number]; bounds: [number, number, number, number];
}
interface Review {
  canvas: [number, number]; groundPivot: [number, number];
  master: string; masterSha256: string; frames: SourceFrame[];
  production: typeof EXPANDED_DIRECTION_ARTWORK;
}
const group = 'artwork/animation-v3/directions-v2/';
const review: Review = JSON.parse(readFileSync(new URL('../' + group + 'review.json', import.meta.url), 'utf8'));
const headings: ExpandedHeading[] = ['rear', 'rearLeft', 'frontLeft', 'front', 'frontRight'];
const standHeadings: ExpandedStandHeading[] = [...headings, 'left', 'right'];
const phases = ['00-contact', '01-loading', '02-passing', '03-swing', '04-opposite-contact',
  '05-opposite-loading', '06-opposite-passing', '07-opposite-swing'];

test('five complete gaits and seven neutral views use distinct reviewed sources in the correct heading folders', () => {
  const cells = new Set<number>(), hashes = new Set<string>();
  const check = (heading: ExpandedStandHeading, glyph: { cell: number; id: string; top: number }, kind: 'walk' | 'stand') => {
    const frame = review.frames.find(frame => frame.cell === glyph.cell);
    assert.ok(frame);
    assert.equal(frame.kind, kind); assert.equal(frame.id, glyph.id); assert.equal(frame.bounds[1], glyph.top);
    assert.ok(frame.source.startsWith(group + heading + '/'));
    assert.ok(frame.source.endsWith('.png'));
    assert.ok(!cells.has(glyph.cell), 'different headings and neutral poses need dedicated cells');
    assert.ok(!hashes.has(frame.sha256), 'a neutral pose must not reuse a walking image');
    cells.add(glyph.cell); hashes.add(frame.sha256);
    const png = readFileSync(new URL('../' + frame.source, import.meta.url));
    assert.equal(createHash('sha256').update(png).digest('hex'), frame.sha256);
    assert.equal(png.toString('ascii', 1, 4), 'PNG'); assert.equal(png[25], 6);
    assert.equal(png.readUInt32BE(16), frame.sourceSize[0]);
    assert.equal(png.readUInt32BE(20), frame.sourceSize[1]);
    assert.equal(frame.sourceSize[0], frame.sourceSize[1], 'non-square drafts must stay out of the selected atlas');
    assert.ok(frame.bounds[0] > 0 && frame.bounds[1] > 0);
    assert.ok(frame.bounds[2] < review.canvas[0] && frame.bounds[3] < review.canvas[1]);
  };
  for (const heading of headings) {
    const walk = EXPANDED_DIRECTION_WALKS[heading];
    assert.equal(walk.length, phases.length);
    for (const [index, frame] of walk.entries()) {
      assert.equal(frame.id, heading + '-' + phases[index]); check(heading, frame, 'walk');
    }
    const tops = walk.map(frame => frame.top);
    assert.ok(Math.max(...tops) - Math.min(...tops) <= 8, 'same-heading head height must not jump with canvas fitting');
  }
  assert.deepEqual(Object.keys(EXPANDED_DIRECTION_STANDS).sort(), [...standHeadings].sort());
  for (const heading of standHeadings) {
    const stand = EXPANDED_DIRECTION_STANDS[heading];
    assert.equal(stand.id, heading + '-stand'); check(heading, stand, 'stand');
  }
  assert.equal(cells.size, 47); assert.equal(review.frames.length, 47);
});

test('expanded textures retain the fixed logical canvas and real hashed dimensions with calculated row capacity', () => {
  const asset = EXPANDED_DIRECTION_ARTWORK;
  assert.ok(asset.image.startsWith('assets/animation-v3/'));
  const texture = readFileSync(new URL('../public/' + asset.image, import.meta.url));
  assert.equal(createHash('sha256').update(texture).digest('hex'), asset.sha256);
  assert.ok(asset.image.includes(asset.sha256.slice(0, 12)));
  assert.equal(texture.toString('ascii', 12, 16), 'VP8X');
  assert.equal(texture.readUIntLE(24, 3) + 1, asset.width);
  assert.equal(texture.readUIntLE(27, 3) + 1, asset.height);
  assert.equal(asset.width / asset.columns, asset.cellWidth);
  assert.equal(asset.height / asset.rows, asset.cellHeight);
  assert.equal(asset.rows, Math.ceil(review.frames.length / asset.columns));
  assert.equal(asset.columns * asset.rows - review.frames.length, 1);
  assert.deepEqual(review.canvas, [384, 512]); assert.deepEqual(review.groundPivot, [192, 468]);
  assert.deepEqual([asset.cellWidth * 2, asset.cellHeight * 2], review.canvas);
  assert.deepEqual(review.production, asset);
  const master = readFileSync(new URL('../' + group + review.master, import.meta.url));
  assert.equal(createHash('sha256').update(master).digest('hex'), review.masterSha256);
  assert.equal(master.readUIntLE(24, 3) + 1, review.canvas[0] * asset.columns);
  assert.equal(master.readUIntLE(27, 3) + 1, review.canvas[1] * asset.rows);
  assert.ok(asset.width * asset.height * 4 <= 9 * 1024 * 1024);
});

test('selected refinement references stay within the image group and retain known pose keys', () => {
  const selection: Record<string, string> = JSON.parse(readFileSync(new URL('../' + group + 'selection.json', import.meta.url), 'utf8'));
  const sourceRoot = fileURLToPath(new URL('../' + group, import.meta.url));
  const known = new Set<string>(headings.flatMap(heading => phases.map(phase => heading + '/' + phase)));
  for (const heading of standHeadings) known.add(heading + '/stand');
  for (const [pose, selected] of Object.entries(selection)) {
    assert.ok(known.has(pose));
    const path = resolve(sourceRoot, selected);
    assert.ok(path.startsWith(sourceRoot.endsWith(sep) ? sourceRoot : sourceRoot + sep));
    assert.equal(extname(path).toLowerCase(), '.png');
    assert.ok(review.frames.some(frame => fileURLToPath(new URL('../' + frame.source, import.meta.url)) === path));
  }
});
