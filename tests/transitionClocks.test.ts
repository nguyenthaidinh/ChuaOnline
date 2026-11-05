import test from 'node:test';
import assert from 'node:assert/strict';
import { TempleRoom } from '../server/room.ts';
import { actionMovement, entryRoute, routeDurationMs } from '../src/room/motion.ts';
import { sampleCharacter, FALLBACK_ARTWORK } from '../src/room/characterAnimation.ts';
import { entryAnimationVersion, entryDurationMs, interactionTime, sampleEntry, sampleSharedRitual, sharedRitualDurationMs } from '../src/room/ritual.ts';
import { ritualSchedule, type RitualTimelineVersion } from '../src/shared/ritualSchedule.ts';
import { characterManifest, sampleScheduledClip } from '../src/room/animationManifest.ts';
import type { Appearance, OfferingKind, RoomMember, SharedAction } from '../src/room/protocol.ts';

const APPEARANCES:Appearance[]=['man','woman','granny'];
function command(version:RitualTimelineVersion,offering:OfferingKind='lotus'):SharedAction {
  const movement=actionMovement(23,3,false,3),startedAt=100000;
  return {id:'clock-fixture',actorId:'visitor',kind:'incense',bowCount:3,offering,slot:3,movement,
    startedAt,timelineVersion:version,endsAt:startedAt+sharedRitualDurationMs('incense',movement,offering,version)};
}

test('entry4 allocates the complete sit transition while entry3 and missing-version snapshots stay stable',()=>{
  for(let seat=0;seat<24;seat++){
    const walk=routeDurationMs(entryRoute(seat));
    assert.equal(entryDurationMs(seat),entryDurationMs(seat,3));
    assert.equal(entryDurationMs(seat,4)-walk,ritualSchedule(3).clips.sitDown);
    assert.equal(sampleEntry(0,entryDurationMs(seat,3),seat,3).phase,'idle');
    assert.equal(sampleEntry(0,entryDurationMs(seat,3),seat,4).phase,'seating');
    for(const version of [undefined,3,4] as const){
      const end=entryDurationMs(seat,version);
      const before=sampleEntry(0,end-.001,seat,version),after=sampleEntry(0,end,seat,version);
      assert.equal(before.phase,'seating');assert.equal(after.phase,'idle');
      assert.deepEqual(before.point,after.point);
    }
    for(const time of [0,100,walk*.5,walk-.001]){
      assert.deepEqual(sampleEntry(0,time,seat,3),sampleEntry(0,time,seat,4));
    }
  }
});

test('queued action versions cannot shorten or retime their entry transition',()=>{
  for(const appearance of APPEARANCES)for(const entryVersion of [undefined,3,4,5] as const){
    const joinedAt=1000,seat=23,end=joinedAt+entryDurationMs(seat,entryVersion);
    const person:RoomMember={id:'visitor',name:'Fixture',appearance,seat,joinedAt,entryVersion,action:null,completed:null};
    for(const version of [1,2,3,4] as const){
      const action={...command(version),startedAt:end,endsAt:end+sharedRitualDurationMs('incense',actionMovement(seat,3,false,3),'lotus',version)};
      for(const now of [joinedAt,end-500,end-.001]){
        const idle=sampleCharacter(person,now,false,FALLBACK_ARTWORK);
        const queued=sampleCharacter({...person,action},now,false,FALLBACK_ARTWORK);
        assert.deepEqual(queued.frame,idle.frame);assert.deepEqual(queued.point,idle.point);
        assert.equal(queued.held,false);assert.equal(queued.entering,true);
      }
      assert.equal(entryAnimationVersion(entryVersion),entryVersion===4||entryVersion===5?3:1);
    }
  }
});

test('transition clock extends stand, return turn and sit while preserving each performance contact and old snapshots',()=>{
  for(const offering of ['lotus','petal','bell'] as const){
    const old=command(1,offering),modern=command(3,offering),saved=structuredClone(old);
    const first=ritualSchedule(1),third=ritualSchedule(3);
    const standDelta=third.clips.standUp-first.clips.standUp;
    const sitDelta=third.clips.sitDown-first.clips.sitDown;
    assert.equal(modern.endsAt-old.endsAt,standDelta+sitDelta+third.returnTurnMs-first.returnTurnMs);
    assert.equal(interactionTime(modern)!-interactionTime(old)!,standDelta);
    for(const offset of [-1,0,1]){
      const before=sampleSharedRitual(old,interactionTime(old)!+offset);
      const after=sampleSharedRitual(modern,interactionTime(modern)!+offset);
      assert.equal(after.clip,before.clip);assert.equal(after.clipTime,before.clipTime);
    }
    assert.deepEqual(old,saved);
    assert.equal(sampleSharedRitual(modern,modern.endsAt).phase,'complete');
  }
});

test('new server queues all appearances after entry5 and publishes their complete authoritative duration',()=>{
  for(const appearance of APPEARANCES)for(const offering of ['incense','lotus','petal','bell','bow'] as const){
    let now=1000;const room=new TempleRoom(()=>now),joined=room.join('Clock review',appearance);
    const guest=joined.room.people[0];
    room.action(joined.token,offering,`clock-${appearance}-${offering}`);
    const action=room.snapshot().people[0].action!;
    assert.equal(guest.entryVersion,5);
    assert.equal(action.startedAt,guest.joinedAt+entryDurationMs(guest.seat,guest.entryVersion));
    assert.equal(action.timelineVersion,offering==='incense'?4:3);
    assert.equal(action.endsAt,action.startedAt+sharedRitualDurationMs(action.kind,action.movement,action.offering,action.timelineVersion));
    now=action.endsAt;room.sweep();assert.equal(room.snapshot().people[0].action,null);
  }
});

test('fallback artwork still releases at the published marker with the longer transition clock',()=>{
  for(const appearance of APPEARANCES){
    const manifest=characterManifest(appearance),contact=ritualSchedule(3).contacts.lotus;
    assert.notEqual(sampleScheduledClip(manifest,'offerPlace',contact-.001,undefined,3).cell,
      sampleScheduledClip(manifest,'offerPlace',contact,undefined,3).cell);
    const action=command(3),marker=interactionTime(action)!;
    assert.equal(sampleSharedRitual(action,marker-1).propInHand,true);
    assert.equal(sampleSharedRitual(action,marker).propInHand,false);
  }
});

test('incense4 preserves the complete v2 contact performance and extends only the turn back',()=>{
  const old=command(2,'incense'),modern=command(4,'incense');
  assert.equal(interactionTime(old),interactionTime(modern));
  assert.equal(modern.endsAt-old.endsAt,ritualSchedule(4).returnTurnMs-ritualSchedule(2).returnTurnMs);
  const marker=interactionTime(old)!;
  for(const offset of [-1200,-1,0,1,800]){
    assert.deepEqual(sampleSharedRitual(old,marker+offset),sampleSharedRitual(modern,marker+offset));
  }
  assert.equal(sampleSharedRitual(old,old.endsAt).phase,'complete');
  assert.equal(sampleSharedRitual(modern,old.endsAt).phase,'seating');
  assert.equal(sampleSharedRitual(modern,modern.endsAt).phase,'complete');
});
