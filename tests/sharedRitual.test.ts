import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleEntry,sampleSharedRitual,sharedRitualDurationMs,entryDurationMs,interactionTime} from '../src/room/ritual.ts';
import {LAM_MANIFEST,sampleClip} from '../src/room/animationManifest.ts';
import {TempleRoom,RoomError,MAX_OFFERINGS,OFFERING_TTL_MS} from '../server/room.ts';
import {actionMovement,entryRoute,ritualRoute,sampleRoute} from '../src/room/motion.ts';
import {InteractionCueGate} from '../src/room/interactionCue.ts';
import {offeringCandidates,visibleOfferings} from '../src/room/placedOfferings.ts';
import {RoomClock} from '../src/room/clock.ts';
import {shrineEffectCandidates,SHRINE_EFFECT_MS} from '../src/room/shrineTimeline.ts';
import type {SharedAction,OfferingKind} from '../src/room/protocol.ts';

test('shrine effects share the exact contact time, deduplicate SSE and include bell without leaving a fake offering',()=>{
 let now=1000;const room=new TempleRoom(()=>now);
 const guests=(['incense','lotus','petal','bell'] as const).map((kind,i)=>{const guest=room.join(`A${i}`,'man');room.action(guest.token,kind,`shrine-${kind}`);return guest;});
 const pending=shrineEffectCandidates(room.snapshot());
 assert.equal(pending.length,4);assert.equal(new Set(pending.map(item=>item.kind)).size,4);
 for(const person of room.snapshot().people)assert.equal(pending.find(item=>item.id===person.action!.id)?.at,interactionTime(person.action!));
 now=Math.max(...pending.map(item=>item.at))+1;room.sweep();
 assert.equal(room.snapshot().offerings.some(item=>item.kind==='bell'),false);
 assert.deepEqual(shrineEffectCandidates(room.snapshot()),pending);
 const late=room.join('Late','woman');assert.deepEqual(shrineEffectCandidates(late.room),pending);
 now=Math.max(...pending.map(item=>item.at))+SHRINE_EFFECT_MS;room.sweep();
 assert.deepEqual(shrineEffectCandidates(room.snapshot()),[]);
 guests.forEach(guest=>room.leave(guest.token));
});

test('entry reaches its own fixed seat before sitting; manifest provides front and rear walking',()=>{
 for(const seat of [0,5,12,23]) {
  const end=entryDurationMs(seat),clips=new Set<string>();
  for(let t=0;t<end;t+=25) {const pose=sampleEntry(0,t,seat);clips.add(pose.clip);const frame=sampleClip(LAM_MANIFEST,pose.clip,pose.clipTime,pose.clip.startsWith('walk')?pose.distance:undefined);assert.ok(frame.cell>=0&&frame.cell<LAM_MANIFEST.frameCount);}
  assert.deepEqual([...clips],['walkRear','sitDown']);
  assert.equal(sampleEntry(0,end,seat).clip,'seated');
 }
 assert.equal(LAM_MANIFEST.clips.walkFront.facing,'front');
 assert.equal(LAM_MANIFEST.clips.walkRear.facing,'rear');
});

test('three visible floor bows and the counter use the same absolute timeline',()=>{
 const movement=actionMovement(0,0),action:SharedAction={id:'bow',actorId:'actor',kind:'bow',bowCount:3,slot:0,startedAt:1000,endsAt:1000+sharedRitualDurationMs('bow',movement),movement};
 const phases=new Set<string>(),counts=new Set<number>();let floorVisits=0,last='';
 for(let now=action.startedAt;now<=action.endsAt+30;now+=20) {
  const pose=sampleSharedRitual(action,now);phases.add(pose.phase);counts.add(pose.completedBows);
  if(pose.clip==='bowHold'&&last!=='bowHold')floorVisits++;last=pose.clip;
  if(pose.clip==='bowHold')assert.equal(sampleClip(LAM_MANIFEST,pose.clip,pose.clipTime).cell,8);
 }
 assert.equal(floorVisits,3);assert.deepEqual([...counts],[0,1,2,3]);
 assert.deepEqual([...phases],['standing','moving','settling','performing','rising','returning','seating','complete']);
 assert.equal(sampleSharedRitual(action,action.endsAt).clip,'seated');
 const middle=sampleSharedRitual(action,action.startedAt+6500);sampleSharedRitual(action,action.endsAt+500);
 assert.deepEqual(sampleSharedRitual(action,action.startedAt+6500),middle);
});

test('four offering commands reserve distinct stations and share authoritative movement times',()=>{
 let now=1000;const room=new TempleRoom(()=>now);
 for(const[index,kind]of(['incense','lotus','petal','bell'] as OfferingKind[]).entries()) {
  const guest=room.join(`Guest ${index}`,'man');room.action(guest.token,kind,`offering-${index}`);
  const action=room.snapshot().people.find(p=>p.id===guest.selfId)!.action!;
  assert.equal(action.offering,kind);assert.equal(action.movement?.seat,index);assert.equal(action.slot,index);
  assert.ok(action.startedAt>=now+entryDurationMs(index));
  const mark=interactionTime(action)!;
  assert.equal(sampleSharedRitual(action,mark-1).propInHand,true);
  assert.equal(sampleSharedRitual(action,mark).propInHand,kind==='bell');
  assert.ok(mark>action.startedAt&&mark<action.endsAt);
 }
 const overflow=room.join('Wait','woman');assert.throws(()=>room.action(overflow.token,'lotus','overflow-action'),(e:unknown)=>e instanceof RoomError&&e.status===409);
 assert.throws(()=>room.action(overflow.token,'coins','invalid-action'),(e:unknown)=>e instanceof RoomError&&e.status===400);
 now=Math.max(...room.snapshot().people.map(p=>p.action?.endsAt??0))+1;room.sweep();
 assert.ok(room.snapshot().people.every(p=>p.action===null));
 assert.deepEqual(room.snapshot().people.slice(0,4).map(p=>p.completed?.offering),['incense','lotus','petal','bell']);
});

test('placing is applied once, survives leaving/rejoining and expires without recreation',()=>{
 let now=1000;const room=new TempleRoom(()=>now),guest=room.join('A','man');room.action(guest.token,'incense','place-once');
 const action=room.snapshot().people[0].action!,mark=interactionTime(action)!;
 now=mark-1;room.sweep();assert.equal(room.snapshot().offerings.length,0);
 now=mark;room.sweep();const item=room.snapshot().offerings[0];assert.equal(item.actionId,action.id);
 const revision=room.snapshot().revision;for(let i=0;i<20;i++)room.sweep();assert.equal(room.snapshot().revision,revision);assert.equal(room.snapshot().offerings.length,1);
 const late=room.join('Late','woman');assert.deepEqual(late.room.offerings,[item]);
 assert.deepEqual(sampleSharedRitual(late.room.people[0].action!,now),sampleSharedRitual(action,now));
 room.leave(guest.token);assert.equal(room.snapshot().offerings.length,1);
 now=mark+OFFERING_TTL_MS;room.sweep();assert.equal(room.snapshot().offerings.length,0);room.sweep();assert.equal(room.snapshot().offerings.length,0);
});

test('placed gifts have a bounded room lifetime and the cap is enforced',()=>{
 let now=0;const room=new TempleRoom(()=>now);const guests=Array.from({length:4},(_,i)=>room.join(`A${i}`,'man'));
 for(let round=0;round<5;round++) {
  guests.forEach((g,i)=>room.action(g.token,'incense',`round-${round}-${i}`));
  now=Math.max(...room.snapshot().people.map(p=>p.action?.endsAt??0))+1;room.sweep();
  assert.ok(room.snapshot().offerings.length<=MAX_OFFERINGS);
 }
 assert.equal(room.snapshot().offerings.length,MAX_OFFERINGS);
 now+=OFFERING_TTL_MS+1;room.sweep();assert.equal(room.snapshot().offerings.length,0);
});

test('routes use distance for speed and remain independent of viewport and late sampling',()=>{
 for(const seat of [0,11,23])for(let slot=0;slot<4;slot++) {
  const route=ritualRoute(seat,slot),move=actionMovement(seat,slot);let previous=sampleRoute(route,0);
  for(let i=1;i<=100;i++) {const next=sampleRoute(route,i/100);assert.ok(Math.abs(next.distance-previous.distance-route.length/100)<1e-7);previous=next;}
  assert.deepEqual(sampleRoute(route,1).point,route.points.at(-1));
  assert.ok(Math.abs(route.length/(move.outboundMs/1000)-1.45)<.002);
  assert.deepEqual(sampleRoute(entryRoute(seat),.4),sampleRoute(entryRoute(seat),.4));
 }
});

test('clock calibration accounts for round-trip latency and delayed SSE does not move it backwards',()=>{
 const clock=new RoomClock();clock.observe(2000,1100,1000);assert.equal(clock.offset,950);
 clock.observe(2050,1600);assert.equal(clock.offset,950);
 clock.observe(2100,1200,1100);assert.equal(clock.offset,950);
 clock.observe(99999,20000,0);assert.equal(clock.offset,950);
});

test('bell cue fires once at contact and never replays after hidden time or reconnect',()=>{
 const movement=actionMovement(0,0),action:SharedAction={id:'bell-once',actorId:'actor',kind:'incense',offering:'bell',bowCount:3,slot:0,startedAt:1000,endsAt:20000,movement};
 const at=interactionTime(action)!,gate=new InteractionCueGate();
 assert.equal(gate.poll(action,at-1,true),false);assert.equal(gate.poll(action,at,true),true);assert.equal(gate.poll({...action},at+10,true),false);
 const hidden=new InteractionCueGate();assert.equal(hidden.poll(action,at,false),false);assert.equal(hidden.poll(action,at+100,true),false);
 assert.equal(new InteractionCueGate().poll(action,at+1000,true),false);
});

test('snapshot reconstruction deduplicates placement across render, resize and reconnect snapshots',()=>{
 let now=1000;const room=new TempleRoom(()=>now),guest=room.join('A','man');room.action(guest.token,'incense','reconstruct-place');
 const before=room.snapshot(),predicted=offeringCandidates(before);assert.equal(predicted.length,1);
 const action=before.people[0].action!;now=interactionTime(action)!;room.sweep();
 const after=room.snapshot();assert.equal(after.offerings.length,1);
 assert.deepEqual(offeringCandidates(after),predicted);
 for(let i=0;i<10;i++)assert.deepEqual(offeringCandidates(JSON.parse(JSON.stringify(after))),predicted);
 room.action(room.join('Other','woman').token,'bow','parallel-bow');assert.equal(offeringCandidates(room.snapshot()).length,1);
});

test('future placement does not evict gifts early or briefly exceed the per-station cap before SSE',()=>{
 const items=Array.from({length:12},(_,i)=>({id:`gift-${i}`,actionId:`action-${i}`,kind:'incense' as const,slot:Math.floor(i/3),placedAt:1000+i,expiresAt:61000+i}));
 const future={id:'future',actionId:'future-action',kind:'incense' as const,slot:0,placedAt:5000,expiresAt:65000};
 const candidates=[...items,future];
 assert.deepEqual(visibleOfferings(candidates,4999),items);
 const placed=visibleOfferings(candidates,5000);assert.equal(placed.length,12);assert.equal(placed.filter(x=>x.slot===0).length,3);assert.ok(!placed.some(x=>x.id==='gift-0'));assert.ok(placed.some(x=>x.id==='future'));
});
