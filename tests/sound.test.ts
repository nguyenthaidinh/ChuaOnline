import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundEngine } from '../src/services/soundEngine.ts';

class FakeAudio {
  src = ''; loop = false; preload = ''; volume = 1; paused = true; plays = 0; loads = 0;
  next: Promise<void> | null = null;
  play() { this.plays++; this.paused=false; const promise=this.next??Promise.resolve(); this.next=null; return promise; }
  pause() { this.paused=true; }
  load() { this.loads++; }
  removeAttribute() { this.src=''; }
}
function setup() {
  let created = 0;
  const audio = new FakeAudio();
  const gain = { gain:{value:1}, connect:()=>{}, disconnect:()=>{} };
  const context = { state:'running', createGain:()=>gain, destination:{}, resume:async()=>{}, close:async()=>{} };
  const engine=new SoundEngine({createAudio:()=>{created++;return audio as unknown as HTMLAudioElement;},createContext:()=>context as unknown as AudioContext});
  return {engine,audio,gain,created:()=>created};
}
test('music stays lazy and changing tracks reuses one audio player',async()=>{
  const {engine,audio,created}=setup();
  assert.equal(created(),0);
  await engine.startMusic('bamboo');
  assert.match(audio.src,/music1\.mp3$/);
  await engine.startMusic('morning');
  assert.match(audio.src,/music2\.mp3$/);
  assert.equal(created(),1);assert.equal(audio.plays,2);assert.equal(audio.loop,true);
  engine.stopMusic();assert.equal(audio.paused,true);
  engine.dispose();
});
test('volume affects both music and the master gain, including immediate mute',async()=>{
  const {engine,audio,gain}=setup();
  await engine.unlock();await engine.startMusic();engine.setVolume(0);
  assert.equal(audio.volume,0);assert.equal(gain.gain.value,0);
  engine.setVolume(4);assert.equal(audio.volume,1);assert.equal(gain.gain.value,1);
  engine.dispose();
});

test('music calls play during the click even when Web Audio cannot resume',async()=>{
  const audio=new FakeAudio();let contexts=0;
  const engine=new SoundEngine({createAudio:()=>audio as unknown as HTMLAudioElement,createContext:()=>{contexts++;throw new Error('unavailable');}});
  const pending=engine.startMusic('bamboo');
  assert.equal(audio.plays,1);assert.equal(contexts,0);
  assert.equal(await pending,true);
  engine.dispose();
});
test('an older pending play cannot pause the newer selected track',async()=>{
  const {engine,audio}=setup();
  let finish:()=>void=()=>{};
  audio.next=new Promise<void>(resolve=>{finish=resolve;});
  const old=engine.startMusic('bamboo');
  await Promise.resolve();
  const current=engine.startMusic('morning');
  assert.equal(await current,true);
  finish();assert.equal(await old,false);
  assert.equal(audio.paused,false);assert.match(audio.src,/music2\.mp3$/);
  engine.dispose();
});
test('autoplay rejection can be retried and stopping cancels a pending play',async()=>{
  const {engine,audio}=setup();
  audio.next=Promise.reject(new Error('blocked'));
  await assert.rejects(engine.startMusic());
  assert.equal(await engine.startMusic(),true);
  let finish:()=>void=()=>{};
  audio.next=new Promise<void>(resolve=>{finish=resolve;});
  const pending=engine.startMusic();await Promise.resolve();engine.stopMusic();finish();
  assert.equal(await pending,false);assert.equal(audio.paused,true);
  engine.dispose();
});
