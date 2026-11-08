/**
 * zenBackgroundMusic.ts - Hệ Thống Nhạc Nền Thiền Tịnh Tâm (Zen Meditation Background Music)
 * Phát trực tiếp file nhạc nền chính thức MP3 "NHẠC THIỀN - TĨNH TÂM - AN NHIÊN TỰ TẠI"
 * - HTML5 Streaming Audio từ /audio/zen-bgm.mp3
 * - Tự động phát khi người dùng tương tác lần đầu (tuân thủ Autoplay Policy)
 * - Tự động giảm âm lượng (ducking) khi tụng kinh / đọc chú
 * - Điều chỉnh âm lượng thanh trượt mượt mà (0% - 100%)
 */

export type ZenMusicTheme = "peace";

export interface ZenMusicInfo {
  id: ZenMusicTheme;
  title: string;
  description: string;
  icon: string;
}

export const ZEN_MUSIC_THEMES: ZenMusicInfo[] = [
  {
    id: "peace",
    title: "Nhạc Thiền An Nhiên Tự Tại (Bản Chính)",
    description: "Nhạc thiền tĩnh tâm an nhiên tự tại MP3 thư giãn sâu",
    icon: "🪷",
  },
];

export class ZenBackgroundMusic {
  private static instance: ZenBackgroundMusic;
  private isEnabled: boolean = true;
  private isPlaying: boolean = false;
  private isDucked: boolean = false;
  private volume: number = 0.38; // Âm lượng êm dịu, thanh tịnh
  private bgmAudio: HTMLAudioElement | null = null;
  private hasUnlockedAudio: boolean = false;
  private onStateChangeCallbacks: Array<(isPlaying: boolean, theme: ZenMusicTheme, volume: number) => void> = [];

  private constructor() {
    try {
      const savedEnabled = localStorage.getItem("chua_an_lac_music_enabled");
      if (savedEnabled !== null) {
        this.isEnabled = savedEnabled === "true";
      }
      const savedVol = localStorage.getItem("chua_an_lac_music_volume");
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) {
          this.volume = v;
        }
      }
    } catch (e) {
      console.warn("Could not load music settings", e);
    }

    this.registerAutoplayUnlock();
  }

  public static getInstance(): ZenBackgroundMusic {
    if (!ZenBackgroundMusic.instance) {
      ZenBackgroundMusic.instance = new ZenBackgroundMusic();
    }
    return ZenBackgroundMusic.instance;
  }

  private getOrCreateBgmAudio(): HTMLAudioElement | null {
    if (typeof Audio === "undefined") return null;
    if (!this.bgmAudio) {
      this.bgmAudio = new Audio("/audio/zen-bgm.mp3");
      this.bgmAudio.loop = true;
      this.bgmAudio.preload = "auto";
      const targetVol = this.isDucked ? this.volume * 0.35 : this.volume;
      this.bgmAudio.volume = targetVol;
    }
    return this.bgmAudio;
  }

  private registerAutoplayUnlock() {
    const unlockHandler = () => {
      if (this.hasUnlockedAudio) return;
      this.hasUnlockedAudio = true;
      if (this.isEnabled) {
        this.start();
      }
      window.removeEventListener("pointerdown", unlockHandler);
      window.removeEventListener("keydown", unlockHandler);
      window.removeEventListener("touchstart", unlockHandler);
    };

    window.addEventListener("pointerdown", unlockHandler, { passive: true });
    window.addEventListener("keydown", unlockHandler, { passive: true });
    window.addEventListener("touchstart", unlockHandler, { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        if (this.isPlaying && this.bgmAudio && this.bgmAudio.paused) {
          this.bgmAudio.play().catch(() => {});
        }
      }
    });
  }

  public start() {
    this.isEnabled = true;
    try {
      localStorage.setItem("chua_an_lac_music_enabled", "true");
    } catch {}

    const audio = this.getOrCreateBgmAudio();
    if (audio) {
      const targetVol = this.isDucked ? this.volume * 0.35 : this.volume;
      audio.volume = targetVol;
      audio.play().then(() => {
        this.isPlaying = true;
        this.notifyStateChange();
      }).catch((err) => {
        console.log("Audio play postponed until user interaction:", err);
      });
    }
  }

  public stop() {
    this.isEnabled = false;
    try {
      localStorage.setItem("chua_an_lac_music_enabled", "false");
    } catch {}

    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
    this.isPlaying = false;
    this.notifyStateChange();
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem("chua_an_lac_music_volume", this.volume.toString());
    } catch {}

    const targetVol = this.isDucked ? this.volume * 0.35 : this.volume;
    if (this.bgmAudio) {
      this.bgmAudio.volume = targetVol;
    }
    this.notifyStateChange();
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTheme(): ZenMusicTheme {
    return "peace";
  }

  public setTheme(_theme: ZenMusicTheme) {
    // Luôn giữ bản MP3 chính thức làm nhạc nền duy nhất
    if (!this.isPlaying && this.isEnabled) {
      this.start();
    }
  }

  public setDucked(ducked: boolean) {
    if (this.isDucked === ducked) return;
    this.isDucked = ducked;

    const targetVol = ducked ? this.volume * 0.35 : this.volume;
    if (this.bgmAudio) {
      this.bgmAudio.volume = targetVol;
    }
  }

  public onStateChange(callback: (isPlaying: boolean, theme: ZenMusicTheme, volume: number) => void) {
    this.onStateChangeCallbacks.push(callback);
    callback(this.isPlaying, "peace", this.volume);
  }

  private notifyStateChange() {
    this.onStateChangeCallbacks.forEach((cb) => cb(this.isPlaying, "peace", this.volume));
  }
}

export const zenBackgroundMusic = ZenBackgroundMusic.getInstance();
