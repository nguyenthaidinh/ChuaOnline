import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { VARIANT_GAITS } from '../src/room/variantGaitGeometry.ts';
import { STOP_CLOSES } from '../src/room/stopCloseGeometry.ts';
import { RITUAL_EXTENSION } from '../src/room/bowPetalGeometry.ts';
import { INCENSE_ARTWORK } from '../src/room/incenseGeometry.ts';
import { INCENSE_VARIANTS } from '../src/room/variantIncenseGeometry.ts';
import { MOVEMENT_ARTWORK, WALK_ARTWORK } from '../src/room/modernMovementGeometry.ts';
import { DIRECTIONAL_ARTWORK } from '../src/room/directionalMovementGeometry.ts';
import { EXPANDED_DIRECTION_ARTWORK } from '../src/room/expandedDirectionGeometry.ts';
import { VARIANT_MOVEMENT } from '../src/room/variantMovementGeometry.ts';
import { RITUAL_ARTWORK } from '../src/room/ritualPoseGeometry.ts';
import { HEADING_ORDER } from '../src/room/locomotion.ts';

const bytes=(path:string)=>readFileSync(new URL('../'+path,import.meta.url));
const json=(path:string)=>JSON.parse(bytes(path).toString('utf8'));
const sha=(path:string)=>createHash('sha256').update(bytes(path)).digest('hex');
type Source={id:string;cell:number;source:string;sha256:string;sourceSize:[number,number];sourcePivot:[number,number];scale:number;bounds:number[]};
const normal=(point:number[],source:Source)=>point.map((value,index)=>value*source.scale+Math.round([192,468][index]-source.sourcePivot[index]*source.scale));
const kind=(value:string)=>/heel/i.test(value)?'heel':'plantar';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.002,`${a} != ${b}`);
function checkAsset(asset:{image:string;sha256:string;width:number;height:number;columns:number;rows:number;cellWidth?:number;cellHeight?:number}) {
  const image=bytes('public/'+asset.image);
  assert.equal(sha('public/'+asset.image),asset.sha256);assert.ok(asset.image.endsWith(asset.sha256.slice(0,12)+'.webp'));
  assert.equal(image.toString('ascii',12,16),'VP8X');assert.ok(image[20]&0x10);
  assert.equal(image.readUIntLE(24,3)+1,asset.width);assert.equal(image.readUIntLE(27,3)+1,asset.height);
  assert.deepEqual([asset.width/asset.columns,asset.height/asset.rows],[asset.cellWidth??192,asset.cellHeight??256]);
}
function checkSource(source:Source) {
  assert.equal(sha(source.source),source.sha256);
  const png=bytes(source.source);assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png[25],6,'Real RGBA source required.');
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],source.sourceSize);
  assert.ok(source.bounds[0]>0&&source.bounds[1]>0&&source.bounds[2]<384&&source.bounds[3]<512);
}

test('female gait banks retain72 real own sources, eight independent views and an exact existing-neutral bridge',()=>{
  for(const appearance of ['woman','granny'] as const){
    const directory='artwork/animation-v3/variant-gaits-v1/'+appearance+'/';
    const review=json(directory+'review-compiled.json'),selected=json(directory+'selection.json');
    const frames=review.frames as Source[],bank=VARIANT_GAITS[appearance];
    assert.equal(frames.length,72);assert.equal(new Set(frames.map(f=>f.sha256)).size,72);
    assert.deepEqual(review.canvas,[384,512]);assert.deepEqual(review.groundPivot,[192,468]);
    assert.deepEqual(review.production,bank.asset);checkAsset(bank.asset);
    assert.deepEqual([bank.asset.width,bank.asset.height,bank.asset.columns,bank.asset.rows],[1152,1728,8,9]);
    for(const source of frames){
      checkSource(source);assert.equal(source.source,directory+(selected[source.id]??source.id+'.png'));
      assert.ok(source.source.startsWith(directory),'No cross-identity pixels.');
    }
    assert.equal(frames.find(f=>f.id==='rearRight/stand')!.sha256,
      sha('artwork/animation-v3/variants-v1/'+appearance+'/00-neutral.png'));
    for(const heading of HEADING_ORDER){
      assert.equal(bank.walks[heading].length,8);assert.ok(bank.stands[heading]);
      const cells=bank.walks[heading].map(glyph=>glyph.cell);assert.equal(new Set(cells).size,8);
    }
  }
});

test('all96 stopping poses pin measured own-source landmarks to the same foot of their neutral',()=>{
  const directory='artwork/animation-v3/stop-closes-v1/';
  const contacts=json(directory+'support-contacts.json').appearances;
  for(const appearance of ['man','woman','granny'] as const){
    const review=json(directory+appearance+'/review-compiled.json'),audit=json(directory+appearance+'/support-review-compiled.json');
    const frames=review.frames as Source[],bank=STOP_CLOSES[appearance];
    assert.equal(frames.length,appearance==='man'?48:32);assert.equal(Object.keys(contacts[appearance].frames).length,32);
    assert.equal(audit.supportManifestSha256,sha(directory+'support-contacts.json'));
    assert.deepEqual(bank.asset,review.production);checkAsset(bank.asset);
    for(const source of frames)checkSource(source);
    for(const heading of HEADING_ORDER)for(const lead of ['right','left'] as const){
      const sequence=bank.headings[heading][lead],reference=audit.references[heading];
      const neutralSource=reference.neutral;
      assert.equal(sha(neutralSource.source),neutralSource.sourceSha256);
      const width=bytes(neutralSource.source).readUInt32BE(16),scale=.33*1280/width;
      const pivot=[628,1235].map(value=>value*width/1280);
      const target=neutralSource.points[lead].map((value:number,index:number)=>value*scale+Math.round([192,468][index]-pivot[index]*scale));
      near(sequence.referenceContact.x,target[0]);near(sequence.referenceContact.y,target[1]);
      const neutralKind=kind((neutralSource.landmarks??neutralSource.landmark)[lead]);
      const passing=reference.passing[lead];assert.equal(kind(passing.landmark),neutralKind);
      assert.equal(sha(passing.source),passing.sourceSha256);
      for(const [index,phase] of ['gather','close'].entries()){
        const id=heading+'/'+lead+'-'+phase,source=frames.find(f=>f.id===id)!,annotation=contacts[appearance].frames[id];
        assert.equal(annotation.reviewed,true);assert.equal(annotation.supportFoot,lead);
        assert.equal(annotation.source,source.source);assert.equal(annotation.sourceSha256,source.sha256);
        assert.equal(kind(annotation.landmark),neutralKind);
        const point=normal(annotation.point,source),glyph=sequence.frames[index];
        assert.equal(glyph.cell,source.cell);
        near(glyph.supportContact.x,point[0]);near(glyph.supportContact.y,point[1]);
        near(point[0]+glyph.rootOffset.x,target[0]);near(point[1]+glyph.rootOffset.y,target[1]);
        assert.ok(Math.abs(glyph.rootOffset.x)<=45&&Math.abs(glyph.rootOffset.y)<=45);
        assert.ok(source.bounds[0]+glyph.rootOffset.x>0&&source.bounds[2]+glyph.rootOffset.x<384);
        assert.ok(source.bounds[1]+glyph.rootOffset.y>0&&source.bounds[3]+glyph.rootOffset.y<512);
      }
    }
  }
});

test('the20 optional production textures keep total decoded pixels under80MiB and exclude source masters',()=>{
  const old=[INCENSE_ARTWORK,MOVEMENT_ARTWORK,WALK_ARTWORK,DIRECTIONAL_ARTWORK,EXPANDED_DIRECTION_ARTWORK,
    ...Object.values(VARIANT_MOVEMENT).map(value=>value.asset),...Object.values(INCENSE_VARIANTS).map(value=>value.asset),
    ...Object.values(RITUAL_ARTWORK).map(value=>value.asset)];
  const added=[...Object.values(VARIANT_GAITS),...Object.values(STOP_CLOSES),...Object.values(RITUAL_EXTENSION)].map(value=>value.asset);
  const assets=[...old,...added];assert.equal(assets.length,20);assert.equal(new Set(assets.map(a=>a.image)).size,20);
  for(const asset of assets){checkAsset(asset);assert.ok(!asset.image.includes('master'));}
  const decoded=assets.reduce((sum,asset)=>sum+asset.width*asset.height*4,0);
  assert.ok(decoded<=80*1024*1024,`${decoded/1024/1024}MiB decoded-pixel estimate exceeds budget.`);
});
