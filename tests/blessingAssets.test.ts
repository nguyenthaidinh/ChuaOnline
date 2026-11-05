import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { BLESSING_CARDS,RITUAL_WISHES } from '../src/data/blessingCatalog.ts';
const bytes=(path:string)=>readFileSync(new URL('../'+path,import.meta.url));
const json=(path:string)=>JSON.parse(bytes(path).toString('utf8').replace(/^\uFEFF/,''));
const hash=(path:string)=>createHash('sha256').update(bytes(path)).digest('hex');

test('all twenty blessings and five ritual wishes have matching prerecorded Vietnamese audio',()=>{
  const manifest=json('artwork/audio-voice-v1/manifest.json');
  assert.equal(manifest.culture,'vi-VN');assert.equal(manifest.entries.length,25);
  const expected=new Map<string,string>([...BLESSING_CARDS.map(card=>[card.id,`${card.title}. ${card.text}`] as [string,string]),...Object.entries(RITUAL_WISHES)]);
  for(const entry of manifest.entries){
    assert.equal(entry.text,expected.get(entry.id));assert.equal(entry.text.normalize('NFC'),entry.text);
    const directory=entry.kind==='blessing'?'blessings':'rituals';
    assert.equal(entry.file,`public/assets/audio/${directory}/${entry.id}.mp3`);
    assert.equal(hash(entry.file),entry.sha256);assert.equal(bytes(entry.file).length,entry.bytes);
    assert.ok(entry.durationSeconds>2&&entry.durationSeconds<12);assert.equal(entry.sampleRate,24000);assert.equal(entry.channels,1);
    assert.equal(hash(entry.master),entry.masterSha256);expected.delete(entry.id);
  }
  assert.equal(expected.size,0);
  const signals=json('artwork/audio-voice-v1/signal-verification.json');assert.equal(signals.entries.length,25);
  for(const entry of signals.entries){assert.equal(entry.sha256Verified,true);assert.ok(entry.rmsDbfs>-25&&entry.rmsDbfs<-15);assert.ok(entry.peakDbfs<0);}
});
test('the self-hosted Vietnamese font retains licensed glyphs and mark-positioning tables',()=>{
  const manifest=json('artwork/fonts-v1/manifest.json'),font=bytes(manifest.output.file);
  assert.equal(font.subarray(0,4).toString(),'wOF2');assert.equal(hash(manifest.output.file),manifest.output.sha256);
  assert.deepEqual(manifest.validation.missingGlyphs,[]);assert.deepEqual(manifest.validation.missingVietnamesePrecomposedGlyphs,[]);
  assert.ok(manifest.validation.gposFeatures.includes('mark'));assert.ok(manifest.validation.gposFeatures.includes('mkmk'));
  assert.match(bytes('public/assets/fonts/OFL.txt').toString(),/SIL OPEN FONT LICENSE/i);
});
