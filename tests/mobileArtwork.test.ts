import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MOBILE_ARTWORK } from '../src/room/mobileArtworkManifest.ts';
import { mobileArtworkUrl } from '../src/room/mobileArtwork.ts';
import { SpritePainter } from '../src/room/spritePainter.ts';
import { updateStyles, updateData } from '../src/room/domUpdates.ts';

test('mobile atlases are intact, quarter the decoded pixel budget and preserve deployment prefixes', () => {
  let originalPixels = 0, mobilePixels = 0;
  assert.equal(Object.keys(MOBILE_ARTWORK).length, 23);
  for (const [source, asset] of Object.entries(MOBILE_ARTWORK)) {
    const hash = (path: string) => createHash('sha256').update(readFileSync('public/' + path)).digest('hex');
    assert.equal(hash(source), asset.sourceSha256);
    assert.equal(hash(asset.image), asset.sha256);
    assert.equal(asset.width * 2, asset.sourceWidth);
    assert.equal(asset.height * 2, asset.sourceHeight);
    originalPixels += asset.sourceWidth * asset.sourceHeight;
    mobilePixels += asset.width * asset.height;
    for (const prefix of ['/', './', '/dichua/']) {
      assert.equal(mobileArtworkUrl(prefix + source, true), prefix + asset.image);
      assert.equal(mobileArtworkUrl(prefix + source, false), prefix + source);
    }
  }
  assert.equal(mobilePixels, originalPixels / 4);
  assert.ok(mobilePixels * 4 < 30 * 1024 * 1024);
  assert.equal(mobileArtworkUrl('/dichua/assets/visual-v2/hall-mobile.webp', true), '/dichua/assets/visual-v2/hall-mobile.webp');
});

test('half-resolution atlas crops the same logical cell and retains visible art until ready', () => {
  const draws: unknown[][] = [];
  const staging = {width:192,height:256,getContext:()=>({clearRect(){},drawImage(...args:unknown[]){draws.push(args);}})};
  const visible = {width:192,height:256,getContext:()=>({drawImage(){},globalCompositeOperation:'source-over'})};
  const painter = new SpritePainter(()=>staging as unknown as HTMLCanvasElement);
  const canvas=visible as unknown as HTMLCanvasElement;
  const frame={image:'mobile.webp',columns:4,rows:4,atlasCell:5};
  assert.ok(painter.paint(canvas,{width:384,height:512} as ImageBitmap,frame,384,512));
  assert.deepEqual(draws[0].slice(1),[96,128,96,128,0,0,192,256]);
  assert.equal(painter.paint(canvas,undefined,{...frame,atlasCell:6},384,512),false);
  assert.equal(draws.length,1);
});

test('unchanged sampled pose properties do not write DOM styles or data again', () => {
  let writes=0;
  const track=()=>new Proxy({} as Record<string,string>,{set(target,key,value){writes++;Reflect.set(target,key,value);return true;}});
  const element={style:track(),dataset:track()} as unknown as HTMLElement;
  updateStyles(element,{left:'20%',height:'10%'});updateData(element,{frame:'2'});
  assert.equal(writes,3);
  updateStyles(element,{left:'20%',height:'10%'});updateData(element,{frame:'2'});
  assert.equal(writes,3);
  updateStyles(element,{left:'21%'});assert.equal(writes,4);
});
