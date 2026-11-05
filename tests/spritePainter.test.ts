import test from 'node:test';
import assert from 'node:assert/strict';
import { SpritePainter } from '../src/room/spritePainter.ts';

function canvas() {
  const draws: unknown[][] = [];
  let clears = 0;
  const context = { globalCompositeOperation: 'source-over',
    clearRect: () => { clears++; },
    drawImage: (...args: unknown[]) => { draws.push(args); },
  };
  return { element: { width: 300, height: 150, getContext: () => context } as unknown as HTMLCanvasElement,
    draws, context, clears: () => clears };
}
const source = { complete: true, naturalWidth: 768, naturalHeight: 1024 } as HTMLImageElement;
const frame = { image: 'walk.webp', columns: 4, rows: 4, atlasCell: 5 };

test('atlas switches commit decoded pixels without reallocating the visible surface', () => {
  const staging = canvas(), visible = canvas();
  const painter = new SpritePainter(() => staging.element);
  assert.equal(painter.paint(visible.element, source, frame, 384, 512), true);
  assert.deepEqual(staging.draws[0].slice(1), [192, 256, 192, 256, 0, 0, 192, 256]);
  assert.equal(visible.element.width, 192);
  assert.equal(visible.element.height, 256);
  assert.equal(visible.clears(), 0);
  assert.equal(visible.draws.length, 1);
  assert.equal(painter.paint(visible.element, source, frame, 384, 512), true);
  assert.equal(visible.draws.length, 1, 'identical frame is not repainted');
  assert.equal(painter.paint(visible.element, source, { ...frame, image: 'passing.webp', atlasCell: 7 }, 384, 512), true);
  assert.equal(visible.draws.length, 2);
  const bitmap = { width: 1152, height: 1152 } as ImageBitmap;
  assert.equal(painter.paint(visible.element, bitmap, { image: 'closes.webp', columns: 8, rows: 6, atlasCell: 32 }, 384, 512), true);
  assert.equal(visible.element.width, 192);
  assert.equal(visible.element.height, 256);
  assert.equal(visible.context.globalCompositeOperation, 'source-over');
});

test('missing, invalid or undrawable next frame leaves the previous visible bitmap intact', () => {
  const staging = canvas(), visible = canvas();
  const painter = new SpritePainter(() => staging.element);
  painter.paint(visible.element, source, frame, 384, 512);
  const dimensions = [visible.element.width, visible.element.height];
  assert.equal(painter.paint(visible.element, undefined, { ...frame, atlasCell: 6 }, 384, 512), false);
  assert.equal(painter.paint(visible.element, source, { ...frame, atlasCell: 999 }, 384, 512), false);
  staging.context.drawImage = () => { throw new Error('unavailable surface'); };
  assert.equal(painter.paint(visible.element, source, { ...frame, atlasCell: 6 }, 384, 512), false);
  assert.equal(visible.draws.length, 1);
  assert.equal(visible.clears(), 0);
  assert.deepEqual([visible.element.width, visible.element.height], dimensions);
});
