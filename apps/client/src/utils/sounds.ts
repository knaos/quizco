import { useEffect } from "react";

// Simple AudioContext based sound synthesis for offline usage (no file loading required!)
class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  constructor() {
    // Only initialize when needed to respect browser autoplay policies
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public enable(val: boolean) {
    this.enabled = val;
  }

  public playCorrect() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Play a nice C major chord arpeggio
    this.playTone(523.25, t, 0.1); // C5
    this.playTone(659.25, t + 0.1, 0.1); // E5
    this.playTone(783.99, t + 0.2, 0.2); // G5
    this.playTone(1046.5, t + 0.3, 0.4); // C6
  }

  public playIncorrect() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Low, descending buzz
    this.playTone(150, t, 0.2, "sawtooth");
    this.playTone(120, t + 0.2, 0.4, "sawtooth");
  }

  public playTimeWarning() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    this.playTone(440, t, 0.1, "square"); // A4 tick
  }

  private playTone(
    freq: number,
    time: number,
    duration: number,
    type: OscillatorType = "sine",
  ) {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
  }
}

export const sounds = new SoundManager();

export function useSounds() {
  // Utility hook if we need it in components
  return sounds;
}
