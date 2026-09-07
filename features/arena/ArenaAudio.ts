import type { MatchEvent } from '@/features/engine';

/** Tiny procedural spectator SFX layer. It consumes public events only. */
export class ArenaAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;

  async enable() {
    if (typeof window === 'undefined') return;
    if (!this.context) {
      const AudioContextCtor = window.AudioContext;
      this.context = new AudioContextCtor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  play(event: MatchEvent) {
    const context = this.context;
    const master = this.master;
    if (!context || !master || context.state !== 'running') return;

    const now = context.currentTime;
    const tone = (frequency: number, duration: number, gain: number, type: OscillatorType = 'sine', endFrequency?: number) => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(gain, now + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    };

    switch (event.type) {
      case 'hit':
        tone(155, 0.09, 0.42, 'square', 78);
        break;
      case 'weapon-pickup':
        tone(520, 0.11, 0.22, 'sine', 780);
        break;
      case 'weapon-use':
        tone(event.detail.toLowerCase().includes('bomb') ? 95 : 280, 0.18, 0.36, 'sawtooth', 58);
        break;
      case 'stock-lost':
        tone(120, 0.3, 0.45, 'sawtooth', 42);
        break;
      case 'eliminated':
        tone(180, 0.42, 0.48, 'square', 38);
        tone(72, 0.48, 0.32, 'sine', 34);
        break;
      case 'chaos':
        tone(240, 0.34, 0.2, 'triangle', 92);
        break;
      case 'win':
        tone(440, 0.16, 0.26, 'sine', 660);
        window.setTimeout(() => tone(660, 0.22, 0.28, 'sine', 880), 120);
        break;
      default:
        break;
    }
  }

  dispose() {
    void this.context?.close();
    this.context = null;
    this.master = null;
  }
}
