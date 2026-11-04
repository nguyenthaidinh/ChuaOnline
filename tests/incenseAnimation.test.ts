import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { INCENSE_CLIPS, incenseBase, incenseOwnership, incenseAcquisitionTime, sampleIncenseClip, sampleStaticIncense, incenseKeyTimes, isIncenseClip } from '../src/room/incenseAnimation.ts';
import { INCENSE_ARTWORK, INCENSE_GEOMETRY } from '../src/room/incenseGeometry.ts';
import { MOVEMENT_ARTWORK, WALK_ARTWORK } from '../src/room/modernMovementGeometry.ts';
import { ritualSchedule } from '../src/shared/ritualSchedule.ts';
import { actionMovement, logicalAltar } from '../src/room/motion.ts';
import { actorMetrics, projectFloor, stationAnchor, incenseWorldSize } from '../src/room/layout.ts';
import { interactionTime, sampleSharedRitual, sharedRitualDurationMs } from '../src/room/ritual.ts';
import { offeringCandidates, visibleOfferings } from '../src/room/placedOfferings.ts';
import type { SharedAction, RoomSnapshot } from '../src/room/protocol.ts';

function action(seat=0,slot=0,version:1|2=2):SharedAction {
  const movement=actionMovement(seat,slot);
  return {id:'incense-contact',actorId:'visitor',kind:'incense',offering:'incense',bowCount:3,
    timelineVersion:version,startedAt:1000,endsAt:1000+sharedRitualDurationMs('incense',movement,'incense',version),slot,movement};
}

test('all seats and stations transfer one shared object at contact, including late reconstruction',()=>{
  for(let seat=0;seat<24;seat++)for(let slot=0;slot<4;slot++)for(const version of [1,2] as const){
    const command=action(seat,slot,version),at=interactionTime(command)!;
    const room:RoomSnapshot={revision:1,now:at,capacity:24,offerings:[],people:[{
      id:'visitor',name:'Fixture',appearance:'man',seat,joinedAt:0,action:command,completed:null,
    }]};
    const pending=offeringCandidates(room);
    assert.equal(incenseOwnership(command,incenseAcquisitionTime(command)-0.001),'source');
    assert.equal(incenseOwnership(command,incenseAcquisitionTime(command)),'hand');
    assert.equal(incenseOwnership(command,at-0.001),'hand');
    assert.equal(incenseOwnership(command,at),'urn');
    assert.equal(visibleOfferings(pending,at-0.001).length,0);
    assert.equal(visibleOfferings(pending,at).length,1);
    const persisted={...room,offerings:[pending[0]]};
    assert.equal(offeringCandidates(persisted).length,1);
    assert.equal(offeringCandidates(structuredClone(persisted))[0].placedAt,at);
    assert.equal(sampleSharedRitual(command,command.endsAt).phase,'complete');
  }
});

test('artwork retiming cannot move the shared release or keep the hand closed at contact',()=>{
  for(const version of [1,2] as const){
    const command=action(23,3,version),at=interactionTime(command)!,end=command.endsAt;
    const first=INCENSE_CLIPS.offerPlace[0],original=first.durationMs;
    try{
      first.durationMs*=3;
      const contact=ritualSchedule(version).contacts.incense;
      assert.equal(sampleIncenseClip('offerPlace',contact-0.001,version).sourceId,'12-contact-closed');
      const released=sampleIncenseClip('offerPlace',contact,version);
      assert.equal(released.sourceId,'13-release');
      assert.equal(released.holdsIncense,false);
      assert.equal(interactionTime(command),at);
      assert.equal(command.endsAt,end);
    }finally{first.durationMs=original;}
  }
});

test('held base and placed base coincide in every station and both projections',()=>{
  const hand=sampleIncenseClip('offerPlace',ritualSchedule(2).contacts.incense-0.001,2).hand!;
  const base=incenseBase(hand);
  for(const layout of ['desktop','mobile'] as const)for(let slot=0;slot<4;slot++){
    const point=logicalAltar(slot),floor=projectFloor(point,layout),size=actorMetrics(point,layout);
    const target=stationAnchor(slot,layout,'incense'),placed=incenseWorldSize(slot,layout);
    assert.ok(Math.abs(floor.x+(base.x-192)/384*size.canvasWidth-target.x)<1e-9);
    assert.ok(Math.abs(floor.y+(base.y-468)/512*size.canvasHeight-target.y-placed.insertion)<1e-9);
  }
});

test('reduced motion preserves the source hand urn ownership without an invisible interval',()=>{
  const command=action(),at=interactionTime(command)!;
  for(const time of [command.startedAt,incenseAcquisitionTime(command),at-1,at,at+500]){
    const owner=incenseOwnership(command,time),frame=sampleStaticIncense(owner);
    assert.equal(Boolean(frame.holdsIncense),owner==='hand');
    if(owner==='hand')assert.ok(frame.hand&&frame.handMask?.length);
  }
});

test('stepping each key boundary selects every authored pose in both shared clocks',()=>{
  const expected=Object.values(INCENSE_CLIPS).flat().map(key=>key.id);
  for(const version of [1,2] as const){
    const command=action(23,3,version),schedule=ritualSchedule(version);
    const start=command.startedAt+schedule.clips.standUp+command.movement!.outboundMs;
    const actual=incenseKeyTimes(version).slice(0,-1).map(time=>{
      const pose=sampleSharedRitual(command,start+time);
      assert.ok(isIncenseClip(pose.clip));
      return sampleIncenseClip(pose.clip,pose.clipTime,version).sourceId;
    });
    assert.deepEqual(actual,expected);
  }
});

test('held poses have measured two-hand masks and production textures match immutable versions',()=>{
  for(const frame of INCENSE_GEOMETRY.filter(frame=>frame.holdsIncense)){
    assert.ok(frame.grip&&frame.leftHand&&frame.rightHand&&frame.handMask&&frame.handMask.length>=3,frame.id);
    assert.ok(Math.hypot(frame.grip.x-frame.leftHand.x,frame.grip.y-frame.leftHand.y)<40,frame.id);
    assert.ok(Math.hypot(frame.grip.x-frame.rightHand.x,frame.grip.y-frame.rightHand.y)<40,frame.id);
  }
  let decodedBytes=0;
  for(const asset of [INCENSE_ARTWORK,MOVEMENT_ARTWORK,WALK_ARTWORK]){
    const image=readFileSync(new URL('../public/'+asset.image,import.meta.url));
    assert.equal(createHash('sha256').update(image).digest('hex'),asset.sha256);
    assert.equal(image.toString('ascii',12,16),'VP8X');
    assert.equal(image.readUIntLE(24,3)+1,asset.width);
    assert.equal(image.readUIntLE(27,3)+1,asset.height);
    assert.equal(asset.width/asset.columns,192);assert.equal(asset.height/asset.rows,256);
    decodedBytes+=asset.width*asset.height*4;
  }
  assert.ok(decodedBytes<=12*1024*1024);
});
