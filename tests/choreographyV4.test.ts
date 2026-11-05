import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleCharacter, FALLBACK_ARTWORK, type ArtworkAvailability } from '../src/room/characterAnimation.ts';
import { sampleRitualExtension, petalEmissionPoint, PETAL_PROP } from '../src/room/ritualExtensionAnimation.ts';
import { BOW_EXTENSION_CLIPS, PETAL_EXTENSION_CLIPS, RITUAL_EXTENSION } from '../src/room/bowPetalGeometry.ts';
import { VARIANT_GAITS } from '../src/room/variantGaitGeometry.ts';
import { STOP_CLOSES } from '../src/room/stopCloseGeometry.ts';
import { directionalNeutral, arrivalGaitFrame, closingFrame } from '../src/room/directionalArtwork.ts';
import { HEADING_ORDER, headingForDirection } from '../src/room/locomotion.ts';
import { actionMovement, logicalAltar, ritualRoute, sampleRoute } from '../src/room/motion.ts';
import { interactionTime, sharedRitualDurationMs } from '../src/room/ritual.ts';
import { ritualSchedule } from '../src/shared/ritualSchedule.ts';
import { actorMetrics, petalEmissionAnchor, projectFloor, stationAnchor } from '../src/room/layout.ts';
import { characterManifest, sampleScheduledClip } from '../src/room/animationManifest.ts';
import { ritualPropGeometry } from '../src/room/ritualContacts.ts';
import type { Appearance, RoomMember, RoomActionKind, SharedAction } from '../src/room/protocol.ts';

const appearances=['man','woman','granny'] as const;
const full:ArtworkAvailability={movement:true,directions:true,expandedDirections:true,
  variantMovement:{woman:true,granny:true},variantGaits:{woman:true,granny:true},
  closingSteps:{man:true,woman:true,granny:true},ritualExtension:{man:true,woman:true,granny:true},
  incense:{man:true,woman:true,granny:true},rituals:{man:true,woman:true,granny:true}};
const ready={base:true,lateral:true,expanded:true,variants:full.variantMovement,gaits:full.variantGaits,closes:full.closingSteps};
function visitor(appearance:Appearance,rite:RoomActionKind='petal',seat=0,slot=0,movementVersion:3|4=4):RoomMember {
  const movement=actionMovement(seat,slot,rite==='bow',movementVersion),version=rite==='incense'?4:3;
  const kind=rite==='bow'?'bow':'incense',offering=rite==='bow'?undefined:rite,startedAt=10000;
  const action:SharedAction={id:'fixture-action',actorId:'fixture',kind,offering,bowCount:3,slot,startedAt,
    timelineVersion:version,movement,endsAt:startedAt+sharedRitualDurationMs(kind,movement,offering,version)};
  return {id:'fixture',name:'Fixture',appearance,seat,entryVersion:5,joinedAt:-100000,action,completed:null};
}
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.0011,`${a} != ${b}`);

test('both female identities select eight distinct real gait phases per physical heading',()=>{
  for(const appearance of ['woman','granny'] as const)for(const heading of HEADING_ORDER){
    const used=new Set<string>();
    for(let phase=0;phase<8;phase++){
      const frame=arrivalGaitFrame(appearance,heading,(phase+.1)/8,
        {stage:'cruise',stageProgress:.5,heading,gaitPhase:(phase+.1)/8},ready)!;
      assert.ok(frame);assert.equal(frame.heading,heading);
      assert.equal(frame.image,VARIANT_GAITS[appearance].asset.image);
      used.add(frame.image+'#'+frame.atlasCell);
    }
    assert.equal(used.size,8,appearance+'/'+heading);
  }
});

test('either planted foot stays fixed through all eight close directions and ends in its own neutral',()=>{
  for(const appearance of appearances)for(const heading of HEADING_ORDER)for(const supportFoot of ['right','left'] as const){
    const bank=STOP_CLOSES[appearance],sequence=bank.headings[heading][supportFoot];
    for(const [ms,index] of [[80,0],[220,1]] as const){
      const frame=closingFrame(appearance,heading,{stage:'close',stageProgress:ms/420,heading,supportFoot},ready)!;
      assert.equal(frame.image,bank.asset.image);assert.equal(frame.atlasCell,sequence.frames[index].cell);
      const source=sequence.frames[index].supportContact;
      near(source.x+frame.rootOffset!.x,sequence.referenceContact.x);
      near(source.y+frame.rootOffset!.y,sequence.referenceContact.y);
    }
    const passing=closingFrame(appearance,heading,{stage:'close',stageProgress:0,heading,supportFoot},ready)!;
    near(sequence.passingContact.x+passing.rootOffset!.x,sequence.referenceContact.x);
    near(sequence.passingContact.y+passing.rootOffset!.y,sequence.referenceContact.y);
    const neutral=directionalNeutral(appearance,heading,ready);
    assert.deepEqual(closingFrame(appearance,heading,{stage:'close',stageProgress:1,heading,supportFoot},ready),neutral);
    assert.deepEqual(closingFrame(appearance,heading,{stage:'close',stageProgress:.5,heading,supportFoot},
      {...ready,closes:{man:false,woman:false,granny:false}}),neutral);
  }
});

test('three bows use real prostration and push-up sources, then finish rising before the return pivot',()=>{
  const schedule=ritualSchedule(3),cycle=schedule.clips.bowDown+schedule.clips.bowHold+schedule.clips.bowUp;
  for(const appearance of appearances){
    const person=visitor(appearance,'bow'),action=person.action!;
    const performance=action.startedAt+schedule.clips.standUp+action.movement!.outboundMs+schedule.clips.kneelDown;
    for(let bow=0;bow<3;bow++){
      const held=sampleCharacter(person,performance+bow*cycle+schedule.clips.bowDown+1,false,full);
      assert.equal(held.frame.sourceId,'08-prostrate');assert.equal(held.completedBows,bow);
      assert.equal(held.frame.image,RITUAL_EXTENSION[appearance].asset.image);
      const up=sampleCharacter(person,performance+bow*cycle+schedule.clips.bowDown+schedule.clips.bowHold+460,false,full);
      assert.equal(up.frame.sourceId,'10-push-up');
    }
    const rise=performance+cycle*3;
    const extending=sampleCharacter(person,rise+499,false,full);
    assert.equal(extending.frame.sourceId,'14-rise-extend');assert.equal(extending.completedBows,3);
    const turning=sampleCharacter(person,rise+500,false,full);
    assert.equal(turning.frame.modernKind,'movement');
    const heading=headingForDirection(sampleRoute(ritualRoute(person.seat,action.slot,true,true),0).tangent);
    assert.equal(sampleCharacter(person,rise+schedule.clips.rise-.001,false,full).heading,heading);
    assert.equal(sampleCharacter(person,action.endsAt,false,full).active,false);
    const historical=visitor(appearance,'bow',0,0,3);
    const oldPerformance=historical.action!.startedAt+schedule.clips.standUp+historical.action!.movement!.outboundMs+schedule.clips.kneelDown;
    assert.notEqual(sampleCharacter(historical,oldPerformance+schedule.clips.bowDown,false,full).frame.image,
      RITUAL_EXTENSION[appearance].asset.image,'Recorded movement-v3 bows keep the original artwork.');
  }
});

test('the last neutral part of the approach faces the next ritual without moving the shared endpoint',()=>{
  for(const appearance of appearances)for(const rite of ['bow','petal'] as const){
    const person=visitor(appearance,rite),action=person.action!;
    const at=action.startedAt+ritualSchedule(3).clips.standUp+action.movement!.outboundMs;
    const closing=sampleCharacter(person,at-.001,false,full),performing=sampleCharacter(person,at,false,full);
    assert.equal(closing.locomotion?.stage,'close');assert.equal(closing.heading,'rearRight');
    assert.equal(performing.heading,'rearRight');assert.deepEqual(closing.point,performing.point);
  }
});

test('petals leave the measured held center exactly at the shared release, including reduced motion and fallback',()=>{
  for(const appearance of appearances){
    const person=visitor(appearance),at=interactionTime(person.action!)!;
    for(const reduced of [false,true]){
      const before=sampleCharacter(person,at-.001,reduced,full),after=sampleCharacter(person,at,reduced,full);
      assert.equal(before.held,true);assert.equal(after.held,false);
      assert.equal(before.frame.sourceId,'18-petal-pre-release');assert.equal(after.frame.sourceId,'19-petal-release');
      assert.deepEqual(before.frame.hand,after.frame.hand);
    }
    const hand=sampleCharacter(person,at-.001,false,full).frame.hand!,center=petalEmissionPoint(appearance);
    near(center.x,hand.x);near(center.y,hand.y+PETAL_PROP.height*(.5-PETAL_PROP.gripFraction));
    for(const layout of ['desktop','mobile'] as const)for(let slot=0;slot<4;slot++){
      const floor=projectFloor(logicalAltar(slot),layout),size=actorMetrics(logicalAltar(slot),layout);
      const anchor=stationAnchor(slot,layout,'petal',appearance,4);
      near(anchor.x,floor.x+(center.x-192)/384*size.canvasWidth);
      near(anchor.y,floor.y+(center.y-468)/512*size.canvasHeight);
      assert.deepEqual(petalEmissionAnchor(slot,layout,appearance,true),anchor);
      const fallback=petalEmissionAnchor(slot,layout,appearance,false),manifest=characterManifest(appearance);
      const frame=sampleScheduledClip(manifest,'petalRelease',349.999,undefined,3),prop=ritualPropGeometry(appearance,'petal');
      near(fallback.x,floor.x+(frame.hand!.x-manifest.groundPivot.x)/manifest.frameWidth*size.canvasWidth);
      near(fallback.y,floor.y+(frame.hand!.y+prop.height*(.5-prop.gripFraction)-manifest.groundPivot.y)/manifest.frameHeight*size.canvasHeight);
    }
  }
});

test('artwork timing edits cannot move the petal release or change the shared action',()=>{
  const keys=PETAL_EXTENSION_CLIPS.petalRelease,first=keys[0],old=first.durationMs;
  try{
    first.durationMs*=3;
    for(const appearance of appearances){
      assert.equal(sampleRitualExtension(appearance,'petal','petalRelease',349.999,3)!.holdsOffering,true);
      assert.equal(sampleRitualExtension(appearance,'petal','petalRelease',350,3)!.sourceId,'19-petal-release');
    }
  }finally{first.durationMs=old;}
  assert.equal(BOW_EXTENSION_CLIPS.rise.at(-1)!.durationMs,260);
});

test('independent optional-image failures preserve every action position, contact and completion',()=>{
  const failures:ArtworkAvailability[]=[FALLBACK_ARTWORK,
    {...full,variantGaits:{woman:false,granny:false}},
    {...full,closingSteps:{man:false,woman:false,granny:false}},
    {...full,ritualExtension:{man:false,woman:false,granny:false}}];
  for(const appearance of appearances)for(const rite of ['incense','lotus','petal','bell','bow'] as const){
    const person=visitor(appearance,rite,23,3),action=person.action!,at=interactionTime(action);
    const times=[action.startedAt+400,action.endsAt-1700,action.endsAt-.001,action.endsAt];
    if(at!==null)times.push(at-.001,at,at+500);
    const snapshot=structuredClone(person);
    for(const now of times){
      const expected=sampleCharacter(person,now,false,full);
      for(const artwork of failures){
        const result=sampleCharacter(person,now,false,artwork);
        assert.deepEqual(result.point,expected.point);assert.equal(result.phase,expected.phase);
        assert.equal(result.completedBows,expected.completedBows);assert.equal(result.active,expected.active);
        assert.ok(result.frame.atlasCell>=0&&result.frame.atlasCell<result.frame.columns*result.frame.rows);
      }
    }
    assert.deepEqual(person,snapshot);
  }
});
