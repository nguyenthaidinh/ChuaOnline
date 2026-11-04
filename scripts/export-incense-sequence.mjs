import { writeFileSync } from 'node:fs';
import { incenseKeyTimes, isIncenseClip, sampleIncenseClip } from '../src/room/incenseAnimation.ts';
import { sampleSharedRitual, sharedRitualDurationMs } from '../src/room/ritual.ts';
import { actionMovement } from '../src/room/motion.ts';
import { ritualSchedule } from '../src/shared/ritualSchedule.ts';
const movement=actionMovement(0,0);
const action={id:'source-study',actorId:'source-study',kind:'incense',offering:'incense',bowCount:3,
  slot:0,startedAt:0,timelineVersion:2,movement,endsAt:sharedRitualDurationMs('incense',movement,'incense',2)};
const start=ritualSchedule(2).clips.standUp+movement.outboundMs;
const frames=incenseKeyTimes(2).slice(0,-1).map(timeMs=>{
  const pose=sampleSharedRitual(action,start+timeMs);
  if(!isIncenseClip(pose.clip))throw new Error('Unexpected study phase');
  const frame=sampleIncenseClip(pose.clip,pose.clipTime,2);
  return {timeMs,clip:pose.clip,id:frame.sourceId,hand:frame.hand,holds:frame.holdsIncense};
});
writeFileSync('artwork/animation-v3/incense-v1/sequence.json',JSON.stringify({durationMs:5000,frames},null,2)+'\n');
console.log(JSON.stringify({keys:frames.length,durationMs:5000}));
