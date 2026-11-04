import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ritualContact, ritualPropGeometry } from '../src/room/ritualContacts.ts';
import { RITUAL_CONTACT_GEOMETRY } from '../src/room/ritualContactGeometry.ts';
import type { Appearance, OfferingKind } from '../src/room/protocol.ts';
import type { HandAnchor } from '../src/room/animationManifest.ts';

const appearances: Appearance[] = ['man', 'woman', 'granny'];
const kinds: OfferingKind[] = ['incense', 'lotus', 'petal', 'bell'];

function contains(points: HandAnchor[], point: HandAnchor) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > point.y) !== (b.y > point.y) &&
      point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

test('ritual contacts match the actual atlas and remain inside each native canvas', () => {
  for (const appearance of appearances) {
    const atlas = RITUAL_CONTACT_GEOMETRY[appearance];
    const bytes = readFileSync(new URL('../public/' + atlas.atlas, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), atlas.sha256);
    assert.deepEqual(Object.keys(atlas.frames).map(Number), [9, 10, 11, 12, 13]);
    assert.equal(ritualContact(appearance, 0), undefined);
    for (const frame of Object.values(atlas.frames)) {
      for (const point of [frame.hand, frame.leftHand, frame.rightHand, ...frame.handMask]) {
        assert.ok(point.x > 0 && point.x < atlas.canvasWidth);
        assert.ok(point.y > 0 && point.y < atlas.canvasHeight);
      }
      assert.ok(contains(frame.handMask, frame.hand));
      assert.ok(contains(frame.handMask, frame.rightHand));
      if (frame.activeHands === 'both') assert.ok(contains(frame.handMask, frame.leftHand));
    }
  }
});

test('variant contacts are independent measurements rather than male coordinates halved', () => {
  for (const appearance of ['woman', 'granny'] as const) {
    const atlas = RITUAL_CONTACT_GEOMETRY[appearance], male = RITUAL_CONTACT_GEOMETRY.man;
    let independentlyMeasured = 0;
    for (const cell of Object.keys(atlas.frames).map(Number)) {
      const point = atlas.frames[cell].hand, reference = male.frames[cell].hand;
      const dx = point.x / atlas.canvasWidth - reference.x / male.canvasWidth;
      const dy = point.y / atlas.canvasHeight - reference.y / male.canvasHeight;
      if (Math.hypot(dx, dy) > 0.001) independentlyMeasured++;
    }
    assert.ok(independentlyMeasured >= 4);
    assert.equal(ritualContact(appearance, 13)?.gripType, 'release');
    assert.equal(ritualContact(appearance, 13)?.activeHands, 'right');
  }
});

test('prop geometry fits native canvases while retaining the same world proportions', () => {
  for (const kind of kinds) {
    const male = ritualPropGeometry('man', kind);
    for (const appearance of appearances) {
      const prop = ritualPropGeometry(appearance, kind);
      assert.ok(prop.height > 0 && prop.height < prop.canvasHeight);
      assert.ok(prop.gripFraction > 0 && prop.gripFraction < 1);
      assert.equal(prop.height / prop.canvasHeight, male.height / male.canvasHeight);
      assert.ok(Number.isFinite(prop.rotationDeg));
    }
  }
});
