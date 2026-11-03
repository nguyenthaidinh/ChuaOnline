import { templeAssets } from '../config/templeAssets';

// No listeners, network requests or audio are created during module import.
class SoundEngine {
  private context: AudioContext | null = null;
  private music: HTMLAudioElement | null = null;
  private bellVoices: OscillatorNode[] = [];
  private volume = 0.18;
  private generation = 0;

  async unlock() {
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') await this.context.resume();
    if (this.context.state !== 'running') throw new Error('audio-blocked');
  }

  async startMusic() {
    const generation = ++this.generation;
    await this.unlock();
    if (generation !== this.generation) return false;
    if (!this.music) {
      this.music = new Audio(templeAssets.music);
      this.music.loop = true;
      this.music.preload = 'none';
    }
    this.music.volume = this.volume;
    await this.music.play();
    if (generation !== this.generation) {
      this.music.pause();
      return false;
    }
    return true;
  }

  stopMusic() {
    this.generation++;
    this.music?.pause();
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.music) this.music.volume = this.volume;
  }

  async ringBell() {
    await this.unlock();
    const context = this.context!;
    this.stopBell();
    const now = context.currentTime;
    // Local synthesized bell: no downloaded recording or TTS service.
    for (const [frequency, weight] of [[220, 1], [440.8, 0.48], [615, 0.2]]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(this.volume * weight * 0.45, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 5);
      oscillator.connect(gain).connect(context.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        this.bellVoices = this.bellVoices.filter((voice) => voice !== oscillator);
      };
      oscillator.start(now);
      oscillator.stop(now + 5.1);
      this.bellVoices.push(oscillator);
    }
  }

  private stopBell() {
    for (const voice of this.bellVoices) voice.stop();
    this.bellVoices = [];
  }

  dispose() {
    this.stopMusic();
    this.stopBell();
    if (this.music) {
      this.music.removeAttribute('src');
      this.music.load();
      this.music = null;
    }
    const context = this.context;
    this.context = null;
    if (context) void context.close().catch(() => {});
  }
}

export const soundEngine = new SoundEngine();
