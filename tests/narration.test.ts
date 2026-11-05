import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundEngine } from '../src/services/soundEngine.ts';
import { InteractionCueGate } from '../src/room/interactionCue.ts';
import { actionMovement } from '../src/room/motion.ts';
import { interactionTime,performanceMs,sharedRitualDurationMs } from '../src/room/ritual.ts';
import { ritualSchedule } from '../src/shared/ritualSchedule.ts';
import type { SharedAction } from '../src/room/protocol.ts';

class VoiceSource {
  buffer:AudioBuffer|null=null;onended:(()=>void)|null=null;started=false;stopped=false;
  connect(){} disconnect(){} start(){this.started=true;} stop(){this.stopped=true;} finish(){this.onended?.();}
}
function setup(){
  const sources:VoiceSource[]=[];
  const music={src:'',loop:false,preload:'',volume:1,play:async()=>{},pause(){},load(){},removeAttribute(){}};
  const gain={gain:{value:1},connect(){},disconnect(){}};
  const voiceGain={gain:{value:1},connect(){},disconnect(){}};
  let gainCount=0;
  const context={state:'running',destination:{},resume:async()=>{},close:async()=>{},createGain:()=>gainCount++ === 0 ? gain : voiceGain,
    decodeAudioData:async()=>({duration:6}),createBufferSource:()=>{const source=new VoiceSource();sources.push(source);return source;}};
  const engine=new SoundEngine({createAudio:()=>music as unknown as HTMLAudioElement,createContext:()=>context as unknown as AudioContext});
  return{engine,music,gain,voiceGain,sources};
}
test('one recording ducks existing music, follows volume and restores music after its actual end',{timeout:2000},async t=>{
  t.mock.method(globalThis,'fetch',async()=>new Response(new Uint8Array([1])));
  const{engine,music,gain,voiceGain,sources}=setup();t.after(()=>engine.dispose());await engine.startMusic();
  let started!:()=>void;const ready=new Promise<void>(resolve=>{started=resolve;});
  const reading=engine.playNarration('/voice.mp3','blessing',started);await ready;
  assert.equal(sources.length,1);assert.equal(sources[0].started,true);assert.equal(music.volume,.4*.22);
  assert.equal(gain.gain.value,.4);
  assert.ok(Math.abs(voiceGain.gain.value-.6)<1e-10);
  engine.setVolume(.8);assert.equal(music.volume,.8*.22);
  assert.equal(gain.gain.value,.8);assert.equal(voiceGain.gain.value,1);
  engine.stopNarration('ritual');assert.equal(sources[0].stopped,false);
  sources[0].finish();assert.equal(await reading,'ended');assert.equal(music.volume,.8);assert.equal(engine.narrationActive,false);
});
test('switching rapidly cancels an old download without letting it start or stop the replacement',{timeout:2000},async t=>{
  let oldResponse!:(response:Response)=>void;
  t.mock.method(globalThis,'fetch',(url:string)=>url==='/old.mp3'?new Promise<Response>(resolve=>{oldResponse=resolve;}):Promise.resolve(new Response(new Uint8Array([1]))));
  const{engine,sources}=setup();t.after(()=>engine.dispose());
  const old=engine.playNarration('/old.mp3','blessing');await new Promise(resolve=>setImmediate(resolve));
  let started!:()=>void;const ready=new Promise<void>(resolve=>{started=resolve;});
  const current=engine.playNarration('/new.mp3','blessing',started);await ready;
  assert.equal(await old,'cancelled');oldResponse(new Response(new Uint8Array([1])));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(sources.length,1);assert.equal(sources[0].stopped,false);
  engine.stopNarration('blessing');assert.equal(await current,'cancelled');assert.equal(sources[0].stopped,true);
});
test('missing recordings fail cleanly, and mute cancels or prevents narration',{timeout:2000},async t=>{
  const request=t.mock.method(globalThis,'fetch',async()=>new Response('',{status:404}));
  const{engine,music,gain}=setup();t.after(()=>engine.dispose());await engine.startMusic();
  await assert.rejects(engine.playNarration('/missing.mp3','blessing'));assert.equal(engine.narrationActive,false);assert.equal(music.volume,.4);
  engine.setVolume(0);assert.equal(await engine.playNarration('/muted.mp3','blessing'),'muted');assert.equal(request.mock.callCount(),1);assert.equal(gain.gain.value,0);
});
test('closing a voice request also works while the browser is still waiting for audio permission',{timeout:2000},async t=>{
  const request=t.mock.method(globalThis,'fetch',async()=>new Response(new Uint8Array([1])));
  const context={state:'suspended',destination:{},createGain:()=>({gain:{value:1},connect(){},disconnect(){}}),
    resume:()=>new Promise<void>(()=>{}),close:async()=>{}};
  const engine=new SoundEngine({createContext:()=>context as unknown as AudioContext});t.after(()=>engine.dispose());
  const pending=engine.playNarration('/voice.mp3','blessing');engine.stopNarration();
  assert.equal(await pending,'cancelled');assert.equal(request.mock.callCount(),0);assert.equal(engine.narrationActive,false);
});
test('muting immediately stops an active voice and music together',{timeout:2000},async t=>{
  t.mock.method(globalThis,'fetch',async()=>new Response(new Uint8Array([1])));
  const{engine,music,gain,sources}=setup();t.after(()=>engine.dispose());await engine.startMusic();
  let start!:()=>void;const ready=new Promise<void>(resolve=>{start=resolve;});
  const playing=engine.playNarration('/voice.mp3','blessing',start);await ready;engine.setVolume(0);
  assert.equal(await playing,'cancelled');assert.equal(sources[0].stopped,true);assert.equal(gain.gain.value,0);assert.equal(music.volume,0);
});
test('all ritual cues fire once at their public marker, and hidden or stale actions stay silent',()=>{
  for(const kind of ['incense','lotus','petal','bell','bow'] as const){
    const movement=actionMovement(0,0,kind==='bow',4),version=kind==='incense'?4:3;
    const action:SharedAction={id:kind,actorId:'self',kind:kind==='bow'?'bow':'incense',offering:kind==='bow'?undefined:kind,
      startedAt:1000,slot:0,bowCount:3,movement,timelineVersion:version,endsAt:1000+sharedRitualDurationMs(kind==='bow'?'bow':'incense',movement,kind==='bow'?undefined:kind,version)};
    const clips=ritualSchedule(version).clips;
    const at=kind==='bow'?1000+clips.standUp+movement.outboundMs+clips.kneelDown+performanceMs('bow',undefined,version):interactionTime(action)!;
    const gate=new InteractionCueGate(true);
    assert.equal(gate.poll(action,at-1,true),false);assert.equal(gate.poll(action,at,true),true);assert.equal(gate.poll({...action},at+1,true),false);
    assert.equal(new InteractionCueGate(true).poll(action,at+1000,true),false);
    const hidden=new InteractionCueGate(true);hidden.discard(action);assert.equal(hidden.poll(action,at,true),false);
    const background=new InteractionCueGate(true);assert.equal(background.poll(action,at,false),false);assert.equal(background.poll(action,at+100,true),false);
  }
});
