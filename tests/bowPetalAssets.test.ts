import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { RITUAL_EXTENSION, BOW_EXTENSION_CLIPS, PETAL_EXTENSION_CLIPS } from '../src/room/bowPetalGeometry.ts';
import { CLIP_MS, ritualSchedule } from '../src/shared/ritualSchedule.ts';

type Point = { x:number; y:number };
type SourceFrame = {
  id:string; cell:number; source:string; sha256:string; sourceSize:[number,number];
  sourcePivot:[number,number]; scale:number; bounds:[number,number,number,number];
};
type Annotation = {
  sourceSha256:string; hand?:[number,number]; handMask?:[number,number][];
  support?:{point:[number,number];landmark:string;reference:string}; review:string;
  floorPose?:{reviewed:boolean;headLowerEdge:[number,number];nearPalm:[number,number];upperHip:[number,number];sampleRgba:Record<string,number[]>};
};
const directory='artwork/animation-v3/bow-petal-v1/';
const appearances=['man','woman','granny'] as const;
const bytes=(path:string)=>readFileSync(new URL('../'+path,import.meta.url));
const sha=(path:string)=>createHash('sha256').update(bytes(path)).digest('hex');
const json=(path:string)=>JSON.parse(bytes(path).toString('utf8'));
const definition=json(directory+'sequences.json');
const selected:Record<string,string>=json(directory+'selection.json');
const annotations:{appearances:Record<string,Record<string,Annotation>>}=json(directory+'annotations.json');
const neutral={man:'artwork/animation-v3/transitions-v1/00-stand-angled.png',
  woman:'artwork/animation-v3/variants-v1/woman/00-neutral.png',
  granny:'artwork/animation-v3/variants-v1/granny/00-neutral.png'};

function png(path:string):[number,number]{
  const data=bytes(path);
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(data[25],6,'Each real source retains RGBA alpha.');
  return [data.readUInt32BE(16),data.readUInt32BE(20)];
}
function webp(path:string):[number,number]{
  const data=bytes(path);
  assert.equal(data.subarray(0,4).toString(),'RIFF');assert.equal(data.subarray(8,12).toString(),'WEBP');
  assert.equal(data.subarray(12,16).toString(),'VP8X');assert.ok(data[20]&0x10,'Atlas must keep alpha.');
  return [data.readUIntLE(24,3)+1,data.readUIntLE(27,3)+1];
}
function normalize(raw:[number,number],source:SourceFrame):Point{
  return Object.fromEntries((['x','y'] as const).map((axis,index)=>[axis,
    Math.round((raw[index]*source.scale+Math.round([192,468][index]-source.sourcePivot[index]*source.scale))*1000)/1000])) as unknown as Point;
}

test('three bow/petal atlases contain 24 real own sources and keep the existing neutral identity bridge',()=>{
  let decoded=0;
  for(const appearance of appearances){
    const review=json(directory+appearance+'/review.json'),bank=RITUAL_EXTENSION[appearance];
    const frames=review.frames as SourceFrame[];
    assert.equal(review.status,'compiled');assert.equal(frames.length,24);
    assert.deepEqual(frames.map(frame=>frame.id),definition.ids);
    assert.equal(new Set(frames.map(frame=>frame.sha256)).size,24);
    assert.deepEqual(review.canvas,[384,512]);assert.deepEqual(review.groundPivot,[192,468]);
    for(const source of frames){
      const name=selected[appearance+'/'+source.id]??appearance+'/'+source.id+'.png';
      assert.equal(source.source,directory+name);assert.ok(name.startsWith(appearance+'/'));
      assert.ok(!name.includes('..')&&!name.includes(':'));
      assert.equal(sha(source.source),source.sha256);
      assert.deepEqual(png(source.source),source.sourceSize);
      assert.equal(source.sourceSize[0],source.sourceSize[1]);
      const frame=bank.frames[source.id];assert.equal(frame.cell,source.cell);assert.equal(frame.top,source.bounds[1]);
      assert.ok(source.bounds[0]>0&&source.bounds[1]>0&&source.bounds[2]<384&&source.bounds[3]<512);
    }
    assert.equal(frames[0].sha256,sha(neutral[appearance]));
    assert.deepEqual(bank.asset,review.production);assert.deepEqual(bank.frames,review.geometry);
    assert.equal(bank.asset.sha256,sha('public/'+bank.asset.image));
    assert.ok(bank.asset.image.endsWith(bank.asset.sha256.slice(0,12)+'.webp'));
    assert.deepEqual(webp('public/'+bank.asset.image),[576,1152]);
    assert.deepEqual([bank.asset.columns,bank.asset.rows,bank.asset.cellWidth,bank.asset.cellHeight],[4,6,144,192]);
    assert.equal(bank.asset.width/bank.asset.columns,bank.asset.cellWidth);
    assert.equal(bank.asset.height/bank.asset.rows,bank.asset.cellHeight);
    assert.equal(review.masterSha256,sha(directory+appearance+'/'+review.master));
    assert.deepEqual(webp(directory+appearance+'/'+review.master),[1536,3072]);
    decoded+=bank.asset.width*bank.asset.height*4;
  }
  assert.ok(decoded<=8*1024*1024,'New artwork must respect the agreed decoded-pixel budget.');
});

test('hands and floor-contact corrections are measured from the selected source of each identity',()=>{
  for(const appearance of appearances){
    const review=json(directory+appearance+'/review.json'),bank=RITUAL_EXTENSION[appearance];
    const sources=Object.fromEntries((review.frames as SourceFrame[]).map(frame=>[frame.id,frame]));
    const own=annotations.appearances[appearance];let hands=0,supports=0;
    assert.equal(review.annotationsSha256,sha(directory+'annotations.json'));
    assert.equal(review.selectionSha256,sha(directory+'selection.json'));
    for(const [id,annotation] of Object.entries(own)){
      const source=sources[id],frame=bank.frames[id];
      assert.equal(annotation.sourceSha256,source.sha256);
      assert.ok(annotation.review.length>20);
      if(annotation.hand){
        assert.deepEqual(frame.hand,normalize(annotation.hand,source));
        assert.ok(annotation.handMask&&annotation.handMask.length>=3);
        assert.deepEqual(frame.handMask,annotation.handMask.map(point=>normalize(point,source)));
        assert.equal(frame.rootOffset,undefined,'Held petal props and the painted hand must share the same unshifted canvas.');
        hands++;
      }
      if(annotation.support){
        const reference=own[annotation.support.reference];
        assert.ok(reference.support);assert.equal(reference.support.landmark,annotation.support.landmark);
        const current=normalize(annotation.support.point,source);
        const target=normalize(reference.support.point,sources[annotation.support.reference]);
        const offset=frame.rootOffset!;assert.ok(offset);
        for(const axis of ['x','y'] as const){
          assert.ok(Math.abs(current[axis]+offset[axis]-target[axis])<=.0011);
          assert.ok(Math.abs(offset[axis])<=20);
        }
        assert.ok(source.bounds[0]+offset.x>0&&source.bounds[2]+offset.x<384);
        assert.ok(source.bounds[1]+offset.y>0&&source.bounds[3]+offset.y<512);
        supports++;
      }
    }
    assert.equal(hands,7);assert.equal(supports,15);
    assert.deepEqual(bank.frames['18-petal-pre-release'].hand,bank.frames['19-petal-release'].hand,
      'The last closed cup and first open release keep the same measured release point.');
    const bottom=own['08-prostrate'],floor=bottom.floorPose;
    assert.ok(floor?.reviewed,'The bottom pose requires an explicit native floor-contact review.');
    assert.ok(floor.headLowerEdge[1]>floor.upperHip[1]+60,'The folded head must be lower than the upper hip.');
    assert.ok(Math.abs(floor.headLowerEdge[1]-floor.nearPalm[1])<=50,'Head and palm must reach the same projected floor band.');
    const floorDepth=bottom.support!.point[1]-floor.nearPalm[1];
    assert.ok(floorDepth>=70&&floorDepth<=160,'Palms must be on the forward floor plane, not raised near the face.');
    for(const sample of Object.values(floor.sampleRgba))assert.ok(sample[3]>=200);
  }
});

test('authored bow and petal keys preserve public durations, repeated prayer endpoints and release ownership',()=>{
  for(const [clip,keys] of Object.entries({...BOW_EXTENSION_CLIPS,...PETAL_EXTENSION_CLIPS})){
    assert.equal(keys.reduce((sum,key)=>sum+key.durationMs,0),CLIP_MS[clip as keyof typeof CLIP_MS]);
    for(const key of keys)for(const appearance of appearances)assert.ok(RITUAL_EXTENSION[appearance].frames[key.id]);
  }
  assert.deepEqual(BOW_EXTENSION_CLIPS,definition.bow);assert.deepEqual(PETAL_EXTENSION_CLIPS,definition.petal);
  assert.equal(BOW_EXTENSION_CLIPS.bowUp.at(-1)?.id,BOW_EXTENSION_CLIPS.bowDown[0].id);
  assert.equal(BOW_EXTENSION_CLIPS.kneelDown.at(-1)?.id,BOW_EXTENSION_CLIPS.bowDown[0].id);
  assert.equal(BOW_EXTENSION_CLIPS.rise.at(-1)?.id,'00-neutral');
  assert.equal(BOW_EXTENSION_CLIPS.rise.slice(0,-1).reduce((sum,key)=>sum+key.durationMs,0),500);
  assert.equal(BOW_EXTENSION_CLIPS.rise.at(-1)?.durationMs,260);
  let contact=0;
  for(const key of PETAL_EXTENSION_CLIPS.petalRelease){if(key.id==='19-petal-release')break;contact+=key.durationMs;}
  assert.equal(contact,ritualSchedule(3).contacts.petal);assert.equal(contact,350);
  for(const appearance of appearances){
    const frames=RITUAL_EXTENSION[appearance].frames;
    assert.equal(frames['18-petal-pre-release'].holdsOffering,true);
    for(const id of ['19-petal-release','20-petal-follow','21-petal-return','23-petal-arms-low','00-neutral'])assert.equal(frames[id].holdsOffering,false);
  }
});

test('selected refinements retain originals, exact generation provenance and timeline hashes',()=>{
  const manifests=['generation.json','pilot-generation.json','pilot-bow-refinement.json','man-generation.json',
    'rise-refinement-generation.json','petal-refinement-generation.json','rise-foot-refinement-generation.json',
    'variant-pilot-generation.json','variant-generation.json','floor-contact-refinement-generation.json'];
  const jobs=manifests.flatMap(path=>{const manifest=json(directory+path);assert.equal(manifest.tool,'built-in image_gen');return manifest.jobs;});
  const provenance=json(directory+'provenance.json');
  assert.equal(provenance.generator,'built-in image_gen');assert.equal(provenance.selectedPoses,72);
  assert.equal(provenance.generatedSelected,69);assert.equal(provenance.generatedOutputs,jobs.length);
  for(const item of provenance.jobs){
    const job=jobs.find((candidate:{output:string})=>candidate.output===item.output);assert.ok(job);
    assert.equal(item.sha256,sha(directory+item.output));
    assert.equal(item.promptSha256,createHash('sha256').update(job.prompt).digest('hex'));
    for(const reference of item.references)assert.equal(reference.sha256,sha(reference.source));
  }
  for(const [id,path] of Object.entries(selected)){
    assert.ok(path.startsWith(id.split('/')[0]+'/')&&!path.includes('..')&&!path.includes(':'));
    const job=jobs.find((candidate:{output:string})=>candidate.output===path);assert.ok(job,path);
    assert.ok(job.prompt.length>100&&job.references.length>=1);
    assert.notEqual(sha(directory+path),sha(directory+id+'.png'));
  }
  for(const appearance of appearances)assert.equal(json(directory+appearance+'/review.json').timelineSha256,sha(directory+'sequences.json'));
});
