import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { VARIANT_MOVEMENT } from '../src/room/variantMovementGeometry.ts';

type Point = { x: number; y: number };
type SourceFrame = {
  id: string; index: number; selected: boolean; source: string; sha256: string;
  sourceSize: [number, number]; sourcePivot: [number, number]; scale: number;
  bounds: [number, number, number, number]; rightFoot?: Point;
  rightHeelSource?: [number, number];
};
type SourceStep = {
  frameId: string; index: number; startMs: number; endMs: number;
  bank: string; rightFootReference?: string;
};

const directory = 'artwork/animation-v3/variant-transitions-v1/';
const appearances = ['woman', 'granny'] as const;
const clips = ['standUp', 'sitDown'] as const;
const bytes = (path: string) => readFileSync(new URL('../' + path, import.meta.url));
const sha = (path: string) => createHash('sha256').update(bytes(path)).digest('hex');
const json = (path: string) => JSON.parse(bytes(path).toString('utf8'));
const definitions = json('artwork/animation-v3/transitions-v2/review.json');
const timeline = json('artwork/animation-v3/transitions-v2/sequences.json');
const selection: Record<string, string> = json(directory + 'selection.json');
const contacts = json(directory + 'contacts.json');
const review = (appearance: string) => json(directory + appearance + '/review.json');

function pngSize(path: string): [number, number] {
  const data = bytes(path);
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(data.subarray(12, 16).toString(), 'IHDR');
  assert.equal(data[25], 6, 'Selected source must retain RGBA alpha.');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

function webpSize(path: string): [number, number] {
  const data = bytes(path);
  assert.equal(data.subarray(0, 4).toString(), 'RIFF');
  assert.equal(data.subarray(8, 12).toString(), 'WEBP');
  assert.equal(data.subarray(12, 16).toString(), 'VP8X');
  assert.ok(data[20] & 0x10, 'Runtime atlas must preserve alpha.');
  return [data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1];
}

test('both movement atlases use 24 real selected identity sources and immutable image hashes', () => {
  let decodedBytes = 0;
  for (const appearance of appearances) {
    const source = review(appearance), atlas = VARIANT_MOVEMENT[appearance];
    assert.equal(source.status, 'compiled');
    assert.deepEqual(source.canvas, [384, 512]);
    assert.deepEqual(source.groundPivot, [192, 468]);
    assert.equal(source.frames.length, 24);
    assert.equal(new Set(source.frames.map((frame: SourceFrame) => frame.sha256)).size, 24);
    assert.deepEqual(source.frames.map((frame: SourceFrame) => frame.id),
      definitions.frames.map((frame: SourceFrame) => frame.id));
    for (const frame of source.frames as SourceFrame[]) {
      const selected = selection[appearance + '/' + frame.id] ?? appearance + '/' + frame.id + '.png';
      assert.equal(frame.selected, true);
      assert.equal(frame.source, directory + selected);
      assert.ok(frame.source.startsWith(directory + appearance + '/'));
      assert.equal(frame.sha256, sha(frame.source));
      assert.deepEqual(frame.sourceSize, pngSize(frame.source));
      const [left, top, right, bottom] = frame.bounds;
      assert.ok(left > 0 && top > 0 && right < 384 && bottom < 512);
    }
    assert.equal(source.frames[0].sha256,
      sha('artwork/animation-v3/variants-v1/' + appearance + '/00-neutral.png'));
    assert.deepEqual(atlas.asset, source.production);
    assert.equal(atlas.asset.sha256, sha('public/' + atlas.asset.image));
    assert.ok(atlas.asset.image.endsWith(atlas.asset.sha256.slice(0, 12) + '.webp'));
    assert.deepEqual(webpSize('public/' + atlas.asset.image), [768, 1536]);
    assert.deepEqual([atlas.asset.columns, atlas.asset.rows, atlas.asset.cellWidth, atlas.asset.cellHeight],
      [4, 6, 192, 256]);
    assert.equal(source.masterSha256, sha(directory + appearance + '/' + source.master));
    assert.deepEqual(webpSize(directory + appearance + '/' + source.master), [1536, 3072]);
    decodedBytes += atlas.asset.width * atlas.asset.height * 4;
  }
  assert.ok(decodedBytes <= 10 * 1024 * 1024);
  assert.notEqual(VARIANT_MOVEMENT.woman.asset.sha256, VARIANT_MOVEMENT.granny.asset.sha256);
});

test('variant clips retain the reviewed transition timing, geometry and seated endpoints', () => {
  for (const appearance of appearances) {
    const source = review(appearance), atlas = VARIANT_MOVEMENT[appearance];
    assert.equal(source.sourceManifestSha256, sha('artwork/animation-v3/transitions-v2/review.json'));
    assert.equal(source.sourceTimelineSha256, sha('artwork/animation-v3/transitions-v2/sequences.json'));
    assert.equal(source.selectionManifestSha256, sha(directory + 'selection.json'));
    assert.equal(source.contactsManifestSha256, sha(directory + 'contacts.json'));
    for (const name of clips) {
      const authored = timeline.clips[name].steps as SourceStep[];
      assert.equal(atlas.clips[name].length, authored.length);
      assert.deepEqual(atlas.clips[name], source.clips[name]);
      atlas.clips[name].forEach((step, index) => {
        const definition = authored[index];
        const frame = source.frames[step.index] as SourceFrame;
        assert.equal(step.id, definition.frameId);
        assert.equal(step.index, definition.index);
        assert.equal(step.bank, definition.bank);
        assert.equal(step.startMs, definition.startMs);
        assert.equal(step.endMs, definition.endMs);
        assert.equal(step.top, frame.bounds[1]);
        assert.ok(frame.bounds[0] + step.rootOffset.x > 0);
        assert.ok(frame.bounds[1] + step.rootOffset.y > 0);
        assert.ok(frame.bounds[2] + step.rootOffset.x < 384);
        assert.ok(frame.bounds[3] + step.rootOffset.y < 512);
      });
    }
    assert.equal(atlas.clips.standUp.at(-1)?.endMs, 1160);
    assert.equal(atlas.clips.sitDown.at(-1)?.endMs, 1500);
    assert.equal(atlas.clips.standUp[0].id, atlas.idle.id);
    assert.equal(atlas.clips.sitDown.at(-1)?.id, atlas.idle.id);
    assert.deepEqual(atlas.idle, { id: '10-seated-rear', index: 10, top: source.frames[10].bounds[1] });
    assert.equal(atlas.clips.standUp.at(-1)?.id, '00-stand-angled');
    assert.equal(atlas.clips.sitDown[0].id, '00-stand-angled');
  }
});

test('each rise pins its own measured source heel to its own support pose', () => {
  for (const appearance of appearances) {
    const source = review(appearance), atlas = VARIANT_MOVEMENT[appearance];
    const own = contacts.appearances[appearance];
    const frames = source.frames as SourceFrame[];
    assert.equal(frames.filter(frame => frame.rightFoot).length, 5);
    let pinned = 0;
    for (const name of clips) {
      atlas.clips[name].forEach((step, index) => {
        const definition = timeline.clips[name].steps[index] as SourceStep;
        if (!definition.rightFootReference) {
          assert.deepEqual(step.rootOffset, { x: 0, y: 0 });
          return;
        }
        const frame = frames[step.index];
        const reference = frames.find(frame => frame.id === definition.rightFootReference)!;
        const annotation = own[step.id];
        assert.equal(annotation.sourceSha256, frame.sha256);
        assert.deepEqual(annotation.rightHeel, frame.rightHeelSource);
        for (const [axis, coordinate] of [['x', 0], ['y', 1]] as const) {
          const offset = Math.round(source.groundPivot[coordinate] - frame.sourcePivot[coordinate] * frame.scale);
          const measured = annotation.rightHeel[coordinate] * frame.scale + offset;
          assert.ok(Math.abs(measured - frame.rightFoot![axis]) <= 0.0006);
          assert.ok(Math.abs(frame.rightFoot![axis] + step.rootOffset[axis] - reference.rightFoot![axis]) <= 0.0011);
        }
        pinned++;
      });
    }
    assert.equal(pinned, 5);
  }
});

test('selected head refinements preserve originals and record exact candidate provenance', () => {
  const provenance = json(directory + 'refinement-generation.json');
  assert.equal(provenance.tool, 'built-in image_gen');
  for (const [id, path] of Object.entries(selection)) {
    const candidate = provenance.records.find((record: { candidate: string; selected: boolean }) =>
      record.candidate === path && record.selected);
    assert.ok(candidate, 'Selection needs an accepted visual review: ' + id);
    assert.equal(candidate.id, id);
    assert.equal(candidate.candidateSha256, sha(directory + path));
    assert.ok(candidate.prompt.length > 100 && candidate.review.length > 20);
    assert.ok(candidate.references.length >= 2);
    assert.equal(candidate.references.length, candidate.referencedImagePaths.length);
    candidate.references.forEach((reference: { path: string; repositoryPath: string; sha256: string }, index: number) => {
      assert.equal(reference.path, candidate.referencedImagePaths[index]);
      assert.equal(reference.sha256, sha(reference.repositoryPath));
    });
    assert.notEqual(candidate.candidateSha256, sha(directory + id + '.png'));
  }
});
