import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleModernMovement, type MovementArtworkQuery } from '../src/room/modernMovement.ts';
import { sampleCharacter, FALLBACK_ARTWORK, type ArtworkAvailability } from '../src/room/characterAnimation.ts';
import { HEADING_ORDER, headingForDirection } from '../src/room/locomotion.ts';
import { ritualRoute, sampleRoute, actionMovement } from '../src/room/motion.ts';
import { sharedRitualDurationMs, sampleSharedRitual, interactionTime } from '../src/room/ritual.ts';
import { ritualSchedule } from '../src/shared/ritualSchedule.ts';
import { VARIANT_MOVEMENT } from '../src/room/variantMovementGeometry.ts';
import { EXPANDED_DIRECTION_ARTWORK } from '../src/room/expandedDirectionGeometry.ts';
import type { RoomMember, Appearance, SharedAction } from '../src/room/protocol.ts';

const full:ArtworkAvailability={movement:true,directions:true,expandedDirections:true,
  variantMovement:{woman:true,granny:true},incense:{man:true,woman:true,granny:true},rituals:{man:true,woman:true,granny:true}};
const query=(overrides:Partial<MovementArtworkQuery>={}):MovementArtworkQuery=>({appearance:'man',clip:'walkRear',
  timeMs:400,distance:.4,tangent:{x:0,z:-1},version:3,ready:{base:true,lateral:true,expanded:true},...overrides});
function fixture(appearance:Appearance,offering:NonNullable<SharedAction['offering']>='incense',seat=0,slot=0):RoomMember{
  const movement=actionMovement(seat,slot,false,3),version=offering==='incense'?4:3;
  const action:SharedAction={id:'rite',actorId:'visitor',kind:'incense',offering,bowCount:3,slot,
    startedAt:10000,timelineVersion:version,movement,endsAt:10000+sharedRitualDurationMs('incense',movement,offering,version)};
  return {id:'visitor',name:'Fixture',appearance,seat,entryVersion:4,joinedAt:-100000,action,completed:null};
}

test('eight male travel headings select actual directional sources without mirroring',()=>{
  const sources=new Set<string>();
  for(const [index,heading] of HEADING_ORDER.entries()){
    const angle=index*Math.PI/4,tangent={x:Math.sin(angle),z:-Math.cos(angle)};
    const frame=sampleModernMovement(query({tangent}));
    assert.ok(frame,heading);
    assert.equal(frame.heading,heading);
    sources.add(frame.image+'#'+frame.atlasCell);
    assert.ok(frame.sourceId);
    if(!['rearRight','left','right'].includes(heading))assert.equal(frame.image,EXPANDED_DIRECTION_ARTWORK.image);
  }
  assert.equal(sources.size,8,'headings must select eight distinct authored poses');
  for(let seat=0;seat<24;seat++)for(let slot=0;slot<4;slot++){
    const person=fixture('man','incense',seat,slot),action=person.action!;
    for(let now=action.startedAt;now<action.endsAt;now+=71){
      assert.equal(sampleCharacter(person,now,false,full).flip,false,`${seat}/${slot}/${now}`);
    }
  }
});

test('movement atlas failures stay independent across identities and heading banks',()=>{
  assert.ok(sampleModernMovement(query({tangent:{x:1,z:0},ready:{base:false,lateral:true,expanded:false}})));
  assert.ok(sampleModernMovement(query({ready:{base:false,lateral:false,expanded:true}})));
  assert.equal(sampleModernMovement(query({tangent:{x:1,z:-1},ready:{base:false,lateral:true,expanded:true}})),null);
  assert.ok(sampleModernMovement(query({appearance:'woman',clip:'standUp',ready:{base:false,lateral:false,variants:{woman:true,granny:false}}})));
  assert.equal(sampleModernMovement(query({appearance:'granny',clip:'standUp',ready:{base:true,lateral:true,variants:{woman:true,granny:false}}})),null);
  assert.equal(sampleModernMovement(query({appearance:'woman',ready:{base:true,lateral:true,expanded:true,variants:{woman:true,granny:true}}})),null,
    'a female gait must not silently borrow male directional pixels');
});

test('female and brown transitions use every selected own pose on the complete public clock',()=>{
  for(const appearance of ['woman','granny'] as const){
    const person=fixture(appearance),action=person.action!,schedule=ritualSchedule(4),variant=VARIANT_MOVEMENT[appearance];
    for(const clip of ['standUp','sitDown'] as const){
      const base=clip==='standUp'?action.startedAt:action.endsAt-schedule.clips.sitDown;
      for(const step of variant.clips[clip]){
        const frame=sampleCharacter(person,base+(step.startMs+step.endMs)/2,false,full).frame;
        assert.equal(frame.sourceId,step.id,appearance+'/'+clip+'/'+step.id);
        assert.equal(frame.image,variant.asset.image);
        assert.deepEqual(frame.rootOffset,step.rootOffset);
      }
    }
    const idle=sampleCharacter(person,action.endsAt,false,full);
    assert.equal(idle.frame.image,variant.asset.image);assert.equal(idle.frame.sourceId,'10-seated-rear');
    const failed=sampleCharacter(person,action.startedAt+450,false,{...full,variantMovement:{woman:false,granny:false}});
    assert.equal(failed.frame.modernKind,undefined);assert.equal(failed.phase,'standing');
  }
});

test('new male pivot reaches each route heading and returns directly into a rear-facing sit',()=>{
  for(let seat=0;seat<24;seat++)for(let slot=0;slot<4;slot++){
    const person=fixture('man','incense',seat,slot),action=person.action!,schedule=ritualSchedule(4);
    const depart=headingForDirection(sampleRoute(ritualRoute(seat,slot),0).tangent);
    assert.equal(sampleCharacter(person,action.startedAt+schedule.clips.standUp-.001,false,full).heading,depart);
    const returnHeading=headingForDirection(sampleRoute(ritualRoute(seat,slot,true),0).tangent);
    const returnAt=action.endsAt-schedule.clips.sitDown-action.movement!.returnMs;
    const pivot=sampleCharacter(person,returnAt-.001,false,full);
    assert.equal(pivot.phase,'rising');assert.equal(pivot.heading,returnHeading);
    const sit=sampleCharacter(person,action.endsAt-schedule.clips.sitDown,false,full);
    assert.equal(sit.frame.sourceId,'02-stand-rear');assert.equal(sit.flip,false);
    const complete=sampleCharacter(person,action.endsAt,false,full);
    assert.equal(complete.frame.sourceId,'10-seated-rear');assert.equal(complete.heading,'rear');
    assert.deepEqual(complete.point,sampleSharedRitual(action,action.endsAt).point);
  }
});

test('all movement fallbacks preserve new contact and completion timestamps',()=>{
  for(const appearance of ['man','woman','granny'] as const)for(const offering of ['incense','lotus','petal','bell'] as const){
    const person=fixture(appearance,offering,23,3),action=person.action!,contact=interactionTime(action)!;
    const variants:ArtworkAvailability[]=[full,FALLBACK_ARTWORK,{...full,movement:false,expandedDirections:false},
      {...full,variantMovement:{woman:false,granny:false}}];
    for(const availability of variants){
      assert.equal(sampleCharacter(person,contact-.001,false,availability).phase,'performing');
      assert.equal(sampleCharacter(person,contact,false,availability).phase,'performing');
      assert.equal(sampleCharacter(person,action.endsAt-.001,false,availability).phase,'seating');
      assert.equal(sampleCharacter(person,action.endsAt,false,availability).phase,'complete');
      assert.equal(sampleCharacter(person,action.endsAt,true,availability).active,false);
    }
  }
});

test('the new bow clock keeps three complete bows and pivots only after rising to stand',()=>{
  for(const appearance of ['man','woman','granny'] as const){
    const person=fixture(appearance),movement=actionMovement(0,0,true,3),schedule=ritualSchedule(3);
    const action:SharedAction={...person.action!,kind:'bow',offering:undefined,movement,timelineVersion:3,
      endsAt:person.action!.startedAt+sharedRitualDurationMs('bow',movement,'incense',3)};
    person.action=action;
    const performAt=action.startedAt+schedule.clips.standUp+movement.outboundMs+schedule.clips.kneelDown;
    const cycle=schedule.clips.bowDown+schedule.clips.bowHold+schedule.clips.bowUp;
    for(let bow=0;bow<3;bow++){
      const sample=sampleCharacter(person,performAt+bow*cycle+1,false,full);
      assert.equal(sample.clip,'bowDown');assert.equal(sample.completedBows,bow);
    }
    const riseAt=performAt+3*cycle;
    assert.equal(sampleCharacter(person,riseAt,false,full).completedBows,3);
    assert.equal(sampleCharacter(person,riseAt+499,false,full).frame.modernKind,undefined,
      'the standing pivot must not replace the kneeling-to-standing part of the bow');
    if(appearance==='man'){
      assert.equal(sampleCharacter(person,riseAt+500,false,full).frame.modernKind,'movement');
      const heading=headingForDirection(sampleRoute(ritualRoute(0,0,true,true),0).tangent);
      assert.equal(sampleCharacter(person,riseAt+schedule.clips.rise-.001,false,full).heading,heading);
    }
    const done=sampleCharacter(person,action.endsAt,false,full);
    assert.equal(done.phase,'complete');assert.equal(done.completedBows,3);assert.equal(done.active,false);
  }
});
