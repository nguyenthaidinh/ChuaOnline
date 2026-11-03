import { MUSIC_TRACKS, type MusicTrackId } from '../config/templeAssets.ts';

export class SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: HTMLAudioElement | null = null;
  private voices: OscillatorNode[] = [];
  private volume = 0.18;
  private generation = 0;
  private wanted = false;
  private track: MusicTrackId | null = null;
  private createAudio: () => HTMLAudioElement;
  private createContext: () => AudioContext;

  constructor(options: { createAudio?: () => HTMLAudioElement; createContext?: () => AudioContext } = {}) {
    this.createAudio = options.createAudio ?? (() => new Audio());
    this.createContext = options.createContext ?? (() => new AudioContext());
  }
  async unlock() {
    if (!this.context) {
      this.context = this.createContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    if (this.context.state !== 'running') throw new Error('audio-blocked');
  }
  async startMusic(track: MusicTrackId = 'bamboo') {
    const request = ++this.generation;
    this.wanted = true;
    await this.unlock();
    if (request !== this.generation) return false;
    this.music ??= this.createAudio();
    const audio = this.music;
    audio.loop = true; audio.preload = 'none'; audio.volume = this.volume;
    if (this.track !== track) {
      audio.pause();
      audio.src = MUSIC_TRACKS.find(item => item.id === track)!.url;
      this.track = track;
      audio.load();
    }
    try { await audio.play(); }
    catch (error) { if (request === this.generation) this.wanted = false; throw error; }
    if (request !== this.generation) { if (!this.wanted) audio.pause(); return false; }
    return true;
  }
  stopMusic() { this.wanted = false; this.generation++; this.music?.pause(); }
  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.music) this.music.volume = this.volume;
    if (this.master) this.master.gain.value = this.volume;
  }
  private tone(frequency: number, weight: number, seconds: number, type: OscillatorType = 'sine', endFrequency = frequency) {
    const context = this.context!;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + seconds);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(weight, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    oscillator.connect(gain).connect(this.master!);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices = this.voices.filter(voice => voice !== oscillator); };
    if (this.voices.length >= 12) this.voices.shift()?.stop();
    this.voices.push(oscillator);
    oscillator.start(now); oscillator.stop(now + seconds + 0.02);
  }
  async ringBell() {
    await this.unlock();
    this.stopVoices();
    for (const [frequency, weight] of [[220, 0.45], [440.8, 0.216], [615, 0.09]]) this.tone(frequency, weight, 5);
  }
  async playMok() { await this.unlock(); this.tone(860, 0.35, 0.12, 'triangle', 430); }
  private stopVoices() { for (const voice of this.voices) voice.stop(); this.voices = []; }
  dispose() {
    this.stopMusic(); this.stopVoices(); this.track = null;
    if (this.music) { this.music.removeAttribute('src'); this.music.load(); this.music = null; }
    const context = this.context; this.context = null;
    this.master?.disconnect(); this.master = null;
    if (context) void context.close().catch(() => {});
  }
}
export const soundEngine = new SoundEngine();
