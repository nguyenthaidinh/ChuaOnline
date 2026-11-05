import test from 'node:test';
import assert from 'node:assert/strict';
import { TempleRoom } from '../server/room.ts';
import { actionMovement, entryRoute, makeRoute, ritualRoute, routeDurationMs } from '../src/room/motion.ts';
import { sampleArrivalLocomotion, sampleLocomotion } from '../src/room/locomotion.ts';
import { entryDurationMs, sampleEntry, sharedRitualDurationMs, interactionTime, sampleSharedRitual } from '../src/room/ritual.ts';
import { offeringCandidates } from '../src/room/placedOfferings.ts';
import { ARRIVAL_CLOSE_MS } from '../src/shared/movementSchedule.ts';
import type { RoomActionKind } from '../src/room/protocol.ts';

const routes=Array.from({length:24},(_,seat)=>[entryRoute(seat),
  ...[0,1,2,3].flatMap(slot=>[false,true].flatMap(back=>[false,true].map(bow=>ritualRoute(seat,slot,back,bow))))]).flat();

test('movement4 closes at a fixed endpoint and aligns its last supporting foot on all408 routes',()=>{
  assert.equal(routes.length,408);
  for(const route of routes){
    const walk=routeDurationMs(route),duration=walk+420;
    for(const ratio of [0,.25,.5,.9]){
      const old=sampleLocomotion(route,walk*ratio,walk),fresh=sampleArrivalLocomotion(route,walk*ratio,duration);
      assert.deepEqual(fresh.point,old.point);assert.equal(fresh.distance,old.distance);
      assert.deepEqual(fresh.tangent,old.tangent);
    }
    const at=sampleArrivalLocomotion(route,walk,duration),end=sampleArrivalLocomotion(route,duration,duration);
    assert.equal(at.stage,'close');assert.equal(at.stageProgress,0);
    assert.equal(end.stageProgress,1);assert.equal(end.distance,route.length);
    assert.equal(at.gaitPhase,at.supportFoot==='right'?.25:.75);
    assert.deepEqual(sampleArrivalLocomotion(structuredClone(route),walk+213,duration),
      sampleArrivalLocomotion(route,walk+213,duration));
    for(const time of [walk,walk+60,walk+170,walk+300,duration,duration+10000]){
      const sample=sampleArrivalLocomotion(route,time,duration);
      assert.deepEqual(sample.point,route.points.at(-1));
      assert.deepEqual(sample.tangent,at.tangent);assert.equal(sample.gaitPhase,at.gaitPhase);
    }
    const before=sampleArrivalLocomotion(route,walk-.001,duration).gaitPhase!;
    const gap=Math.abs(before-at.gaitPhase!);
    assert.ok(Math.min(gap,1-gap)<.00001,'gait support must not snap at close boundary');
  }
});

test('arrival motion handles zero/short routes and rejects truncated or non-finite public durations',()=>{
  const still=makeRoute([{x:2,z:3},{x:2,z:3}]);
  const first=sampleArrivalLocomotion(still,0,420);
  assert.equal(first.stage,'close');assert.equal(first.gaitPhase,.25);
  assert.deepEqual(first.point,{x:2,z:3});
  const short=makeRoute([{x:0,z:0},{x:.01,z:0}]),duration=routeDurationMs(short)+420;
  assert.deepEqual(sampleArrivalLocomotion(short,NaN,duration),sampleArrivalLocomotion(short,0,duration));
  assert.deepEqual(sampleArrivalLocomotion(short,Infinity,duration),sampleArrivalLocomotion(short,duration,duration));
  for(const invalid of [-1,0,419,NaN,Infinity])assert.throws(()=>sampleArrivalLocomotion(short,0,invalid),/closing duration/);
});

test('entry5 adds only the fixed closing interval, preserving entry3/4 clocks and exact seated endpoints',()=>{
  for(let seat=0;seat<24;seat++){
    const walk=routeDurationMs(entryRoute(seat));
    assert.equal(entryDurationMs(seat,5)-entryDurationMs(seat,4),420);
    assert.equal(entryDurationMs(seat,4)-entryDurationMs(seat,3),640);
    assert.equal(sampleEntry(0,walk,seat,4).phase,'seating');
    const closing=sampleEntry(0,walk,seat,5);
    assert.equal(closing.phase,'entering');assert.equal('locomotion' in closing&&closing.locomotion?.stage,'close');
    for(const elapsed of [0,200,419])assert.deepEqual(sampleEntry(0,walk+elapsed,seat,5).point,entryRoute(seat).points.at(-1));
    assert.equal(sampleEntry(0,walk+420,seat,5).phase,'seating');
    assert.equal(sampleEntry(0,entryDurationMs(seat,5),seat,5).phase,'idle');
  }
});

test('new commands add two closing intervals without altering performance markers or legacy snapshots',()=>{
  const rites:RoomActionKind[]=['incense','lotus','petal','bell','bow'];
  for(const appearance of ['man','woman','granny'] as const)for(const rite of rites){
    let now=1000;const room=new TempleRoom(()=>now),joined=room.join('Arrival review',appearance),guest=joined.room.people[0];
    room.action(joined.token,rite,`arrival-${appearance}-${rite}`);
    const action=room.snapshot().people[0].action!,movement=action.movement!;
    assert.equal(guest.entryVersion,5);assert.equal(movement.version,4);
    assert.equal(action.startedAt,guest.joinedAt+entryDurationMs(guest.seat,5));
    const prior=actionMovement(guest.seat,action.slot,rite==='bow',3);
    const old={...action,movement:prior,endsAt:action.startedAt+sharedRitualDurationMs(action.kind,prior,action.offering,action.timelineVersion)};
    const snapshot=structuredClone(old);
    assert.equal(action.endsAt-old.endsAt,2*ARRIVAL_CLOSE_MS);
    const at=interactionTime(action),before=interactionTime(old);
    if(at!==null){
      assert.equal(at-before!,ARRIVAL_CLOSE_MS);
      const candidate=offeringCandidates({...room.snapshot(),now:at}).find(item=>item.actionId===action.id);
      if(rite!=='bell'){assert.equal(candidate?.artworkVersion,4);assert.equal(candidate?.appearance,appearance);}
      now=at;room.sweep();
      if(rite!=='bell')assert.equal(room.snapshot().offerings[0].artworkVersion,4);
    }
    assert.equal(sampleSharedRitual(action,action.endsAt).phase,'complete');
    assert.equal(sampleSharedRitual(old,old.endsAt).phase,'complete');
    assert.deepEqual(old,snapshot);
  }
});
