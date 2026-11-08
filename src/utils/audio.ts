/**
 * ZenAudioEngine - Bộ phát âm thanh thiền bằng Web Audio API
 * Tự động tổng hợp âm thanh chuông đại hồng chung, tiếng mõ gia trì, chuông xoay không cần tải file MP3 nặng
 */

import { zenBackgroundMusic } from "./zenBackgroundMusic";

export class ZenAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext sẽ được khởi tạo khi người dùng click chuột/tương tác lần đầu
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      zenBackgroundMusic.stop();
    } else {
      zenBackgroundMusic.start();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      zenBackgroundMusic.stop();
    } else {
      zenBackgroundMusic.start();
    }
    return this.isMuted;
  }

  /**
   * Thỉnh Đại Hồng Chung (Chuông chùa trầm ấm, ngân dài 5-7 giây)
   */
  public playTempleBell(frequency = 196) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Bội âm kim khí (Harmonics) tạo độ vang dày đặc trưng của chuông đồng cổ truyền
    const harmonics = [1, 1.414, 2.08, 2.76, 3.42];
    const amplitudes = [0.45, 0.25, 0.15, 0.08, 0.04];
    const decays = [6.0, 4.5, 3.5, 2.5, 1.8];

    harmonics.forEach((ratio, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = index === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(frequency * ratio, now);

      gain.gain.setValueAtTime(amplitudes[index], now);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + decays[index]);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + decays[index]);
    });
  }

  /**
   * Gõ Mõ Gỗ (Tiếng mõ gia trì trầm giòn, âm mộc tự nhiên, vang vọng)
   */
  public playWoodenFish(frequency = 640) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Dao động nhẹ cao độ ngẫu nhiên tự nhiên như gõ thật
    const randPitch = frequency + (Math.random() * 16 - 8);

    // Layer 1: Tiếng chạm dùi gõ đanh giòn (Attack knock)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(randPitch, now);
    osc1.frequency.exponentialRampToValueAtTime(randPitch * 0.45, now + 0.055);

    gain1.gain.setValueAtTime(0.85, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Layer 2: Âm vang bọng gỗ mít trầm ấm (Resonant hollow cavity)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(randPitch * 0.55, now);
    osc2.frequency.exponentialRampToValueAtTime(randPitch * 0.38, now + 0.11);

    gain2.gain.setValueAtTime(0.40, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.13);
  }

  /**
   * Chuông Bát Nhã nhỏ (Singing Bowl / Chuông bo)
   */
  public playSingingBowl(frequency = 432) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 4.0);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 4.0);
  }

  /**
   * Âm thanh tùy hỷ công đức / nhặt hoa sen nhẹ nhàng
   */
  public playLotusSound() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // Đô - Mi - Sol - Đô cao
    notes.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + i * 0.08;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  }

  /**
   * Âm thanh lắc ống xăm tre (Bamboo Rattle / Lách cách thẻ xăm)
   */
  public playBambooRattle() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 7; i++) {
      const t = now + i * 0.07 + (Math.random() * 0.02 - 0.01);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      const freq = 1200 + Math.random() * 400;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.04);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    }
  }

  /**
   * Đại Hồng Chung Lầu Chuông (Tiếng chuông cực trầm, ngân xa vang dội 8 giây)
   */
  public playGrandBell() {
    this.playTempleBell(108); // 108Hz biểu trưng cho 108 phiền não được xua tan
  }
}

export const zenAudio = new ZenAudioEngine();
