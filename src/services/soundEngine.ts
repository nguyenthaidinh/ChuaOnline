import { MUSIC_TRACKS, type MusicTrackId } from '../config/templeAssets.ts';

export type NarrationOwner = 'blessing' | 'ritual';
export type NarrationResult = 'ended' | 'cancelled' | 'muted';
interface NarrationRequest {
  owner: NarrationOwner;
  controller: AbortController;
  source: AudioBufferSourceNode | null;
  finish: (result: NarrationResult) => void;
  timer: ReturnType<typeof setTimeout> | null;
}

export class SoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: HTMLAudioElement | null = null;
  private voices: OscillatorNode[] = [];
  private volume = 0.4;
  private generation = 0;
  private wanted = false;
  private track: MusicTrackId | null = null;
  private narration: NarrationRequest | null = null;
  private narrationGeneration = 0;
  private recordings = new Map<string, AudioBuffer>();
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
    // Call play directly inside the user's gesture. Music does not need Web Audio;
    // awaiting a context resume first can lose activation on mobile browsers.
    this.music ??= this.createAudio();
    const audio = this.music;
    audio.loop = true; audio.preload = 'none'; this.applyMusicVolume();
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
    this.applyMusicVolume();
    if (this.master) this.master.gain.value = this.volume;
    if (this.volume === 0) this.stopNarration();
  }
  private applyMusicVolume() {
    if (this.music) this.music.volume = this.volume * (this.narration?.source ? .22 : 1);
  }
  get narrationActive() { return this.narration !== null; }

  stopNarration(owner?: NarrationOwner) {
    if (owner && this.narration?.owner !== owner) return;
    this.narrationGeneration++;
    const current = this.narration;
    this.narration = null;
    if (current) {
      current.controller.abort();
      if (current.timer !== null) clearTimeout(current.timer);
      if (current.source) {
        current.source.onended = null;
        try { current.source.stop(); } catch { /* The context may have closed before start. */ }
        current.source.disconnect();
      }
      current.finish('cancelled');
    }
    this.applyMusicVolume();
  }
  /** One voice channel; a cancelled download/ended callback cannot interrupt its replacement. */
  async playNarration(url: string, owner: NarrationOwner, onStart?: () => void): Promise<NarrationResult> {
    this.stopNarration();
    if (this.volume === 0) return 'muted';
    const generation = this.narrationGeneration;
    let finish!: (result: NarrationResult) => void;
    let fail!: (error: Error) => void;
    const completed = new Promise<NarrationResult>((resolve, reject) => { finish = resolve; fail = reject; });
    const request: NarrationRequest = { owner, controller: new AbortController(), source: null, finish, timer: null };
    this.narration = request;
    const timeout = () => { fail(new Error('voice-timeout')); request.controller.abort(); };
    request.timer = setTimeout(timeout, 10000);
    try {
      const start = async (): Promise<NarrationResult> => {
        // Resume synchronously from the click; fetching/decoding may finish after user activation expires.
        await this.unlock();
        const context = this.context!;
        let buffer = this.recordings.get(url);
        if (!buffer) {
          const response = await fetch(url, { signal: request.controller.signal });
          if (!response.ok) throw new Error('voice-unavailable');
          buffer = await context.decodeAudioData(await response.arrayBuffer());
          if (generation !== this.narrationGeneration) return 'cancelled';
          if (this.recordings.size >= 25) this.recordings.delete(this.recordings.keys().next().value!);
          this.recordings.set(url, buffer);
        }
        if (generation !== this.narrationGeneration) return 'cancelled';
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.master!);
        request.source = source;
        source.onended = () => {
          source.disconnect();
          if (this.narration !== request) return;
          this.narration = null;
          this.applyMusicVolume();
          finish('ended');
          if (request.timer !== null) clearTimeout(request.timer);
        };
        source.start();
        this.applyMusicVolume();
        onStart?.();
        clearTimeout(request.timer!);
        request.timer = setTimeout(timeout, (buffer.duration + 2) * 1000);
        return await completed;
      };
      return await Promise.race([start(), completed]);
    } catch (error) {
      if (generation !== this.narrationGeneration) return 'cancelled';
      this.stopNarration();
      throw error;
    }
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
  async ringBell(soft = false) {
    await this.unlock();
    this.stopVoices();
    for (const [frequency, weight] of [[220, 0.45], [440.8, 0.216], [615, 0.09]]) this.tone(frequency, weight * (soft ? .3 : 1), 5);
  }
  async playMok() { await this.unlock(); this.tone(860, 0.35, 0.12, 'triangle', 430); }
  async playOfferingTone() {
    await this.unlock();
    this.stopVoices();
    // A short, quiet singing-bowl chord, kept below the spoken wish.
    for (const [frequency, weight] of [[392, .15], [588, .06], [784, .025]]) this.tone(frequency, weight, 2.4);
  }
  private stopVoices() { for (const voice of this.voices) voice.stop(); this.voices = []; }
  dispose() {
    this.stopNarration(); this.recordings.clear();
    this.stopMusic(); this.stopVoices(); this.track = null;
    if (this.music) { this.music.removeAttribute('src'); this.music.load(); this.music = null; }
    const context = this.context; this.context = null;
    this.master?.disconnect(); this.master = null;
    if (context) void context.close().catch(() => {});
  }
}
export const soundEngine = new SoundEngine();
