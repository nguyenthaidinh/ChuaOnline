import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { ImageQueue } from '../src/room/imageLoader.ts';
import { ArtworkSessions } from '../src/room/artworkSessions.ts';
import { FALLBACK_ARTWORK } from '../src/room/characterAnimation.ts';
import { essentialAssets } from '../src/room/layout.ts';
import { nextOfferingDraw, visibleOfferingIds } from '../src/room/placedOfferings.ts';
import type { RoomMember, PlacedOffering } from '../src/room/protocol.ts';

test('image queue shares requests and bounds concurrent decode work', async () => {
  let active = 0, peak = 0;
  const started: string[] = [];
  const releases: Array<() => void> = [];
  const queue = new ImageQueue(async url => {
    started.push(url); active++; peak = Math.max(peak, active);
    await new Promise<void>(resolve => releases.push(resolve));
    active--;
  }, 2);
  const a = queue.request('a'), b = queue.request('b'), c = queue.request('c');
  assert.equal(queue.request('a'), a);
  assert.deepEqual(started, ['a', 'b']);
  releases.shift()!(); await a;
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(started, ['a', 'b', 'c']);
  releases.splice(0).forEach(release => release());
  await Promise.all([b, c]);
  assert.equal(peak, 2);
  await queue.request('a');
  assert.equal(started.length, 3);
});

test('actor and offering keep the same artwork throughout a shared action', () => {
  const sessions = new ArtworkSessions();
  const person: RoomMember = { id: 'a', name: 'A', appearance: 'woman', seat: 0, joinedAt: 0,
    action: { id: 'ritual', actorId: 'a', kind: 'incense', bowCount: 3, slot: 0, startedAt: 100000, endsAt: 140000 }, completed: null };
  const upgraded = { ...FALLBACK_ARTWORK, movement: true, incense: { man: true, woman: true, granny: true } };
  assert.equal(sessions.forPerson(person, 110000, FALLBACK_ARTWORK), FALLBACK_ARTWORK);
  assert.equal(sessions.forPerson(person, 120000, upgraded), FALLBACK_ARTWORK);
  assert.equal(sessions.forAction('ritual', upgraded), FALLBACK_ARTWORK);
  assert.equal(sessions.forPerson({ ...person, action: { ...person.action!, id: 'next' } }, 150000, upgraded), upgraded);
  sessions.retain(new Set(['next']));
  assert.equal(sessions.forAction('ritual', upgraded), upgraded);
});

test('undecoded remote character does not lock an unusable atlas', () => {
  const sessions = new ArtworkSessions();
  const person: RoomMember = { id: 'a', name: 'A', appearance: 'man', seat: 0, joinedAt: 100000, entryVersion: 5, action: null, completed: null };
  const pending = { ...FALLBACK_ARTWORK, baseActors: { man: false, woman: false, granny: false } };
  assert.equal(sessions.forPerson(person, 100001, pending), pending);
  assert.equal(sessions.forPerson(person, 100002, FALLBACK_ARTWORK), FALLBACK_ARTWORK);
});

test('initial scene excludes movement atlases and stays below 550 KB of images', () => {
  for (const layout of ['desktop', 'mobile'] as const) {
    const assets = essentialAssets(layout);
    assert.ok(assets.every(url => !url.includes('atlas') && !url.includes('animation-v3')));
    assert.ok(assets.reduce((sum, url) => sum + statSync(`public${url}`).size, 0) < 550000);
  }
});

test('static offerings sleep until visibility or fade deadlines; moving effects keep drawing', () => {
  const lotus: PlacedOffering = { id: '1', actionId: 'a', kind: 'lotus', slot: 0, placedAt: 10000, expiresAt: 70000 };
  const items = [lotus];
  assert.equal(nextOfferingDraw(lotus, items, 9000, false), 10000);
  assert.equal(nextOfferingDraw(lotus, items, 20000, false), 68800);
  assert.equal(nextOfferingDraw(lotus, items, 69000, false), true);
  assert.equal(nextOfferingDraw(lotus, items, 70000, false), false);
  assert.equal(nextOfferingDraw({ ...lotus, kind: 'incense' }, items, 20000, false), true);
  assert.equal(nextOfferingDraw({ ...lotus, kind: 'incense' }, items, 20000, true), 68800);
  assert.equal(visibleOfferingIds(items, 20000), visibleOfferingIds(items, 20000));
});
