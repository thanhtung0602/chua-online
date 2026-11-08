/**
 * DayNightSystem.ts - Hệ thống chu kỳ thời gian & Ánh sáng ngày/đêm
 * Bình minh (Dawn), Ban ngày (Day), Hoàng hôn (Sunset), Đêm rằm (Night)
 * Đèn lồng & đèn đá tự bật sáng ban đêm, bầu trời ngàn sao và đom đóm bờ hồ
 */

import * as THREE from "three";

export type TimeOfDay = "dawn" | "day" | "sunset" | "night";

/**
 * Tự động xác định thời khắc Ngày / Đêm theo giờ thực tế của người dùng:
 * - 18h00 tối -> 05h59 sáng: Ban Đêm (Night)
 * - 06h00 sáng -> 17h59 chiều: Ban Ngày (Day)
 * Hệ thống vận hành hoàn toàn tự động theo thời gian thực tế, không để người dùng tự bấm tránh gây rối loạn.
 */
export function detectInitialTimeOfDay(): TimeOfDay {
  const now = new Date();
  const hour = now.getHours();
  // Giờ đêm: từ 18h tối đến trước 6h sáng
  if (hour >= 18 || hour < 6) {
    return "night";
  }
  return "day";
}

interface LightingPreset {
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: THREE.Vector3;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  ambientColor: number;
  ambientIntensity: number;
  lanternsLit: boolean;
  lanternIntensity: number;
  showStars: boolean;
  showFireflies: boolean;
}

export class DayNightSystem {
  private scene: THREE.Scene;

  // Lights
  public sunLight!: THREE.DirectionalLight;
  public hemiLight!: THREE.HemisphereLight;
  public ambientLight!: THREE.AmbientLight;

  // Starfield & Fireflies
  private stars!: THREE.Points;
  private fireflies!: THREE.Points;
  private fireflyVelocities!: Float32Array;
  private fireflyCount = 60;

  // Stone lamps point lights
  public stoneLampLights: THREE.PointLight[] = [];

  // Current State
  public currentTime: TimeOfDay = "day";

  private presets: Record<TimeOfDay, LightingPreset> = {
    dawn: {
      skyColor: 0xf39c6b,
      fogColor: 0xe8a87c,
      fogDensity: 0.015,
      sunColor: 0xffaa5e,
      sunIntensity: 0.75,
      sunPosition: new THREE.Vector3(30, 15, 25),
      hemiSkyColor: 0xffcaa5,
      hemiGroundColor: 0x4a6b52,
      hemiIntensity: 0.55,
      ambientColor: 0xffd1b3,
      ambientIntensity: 0.4,
      lanternsLit: false,
      lanternIntensity: 0.0,
      showStars: false,
      showFireflies: false,
    },
    day: {
      skyColor: 0x87ceeb,
      fogColor: 0xa8c8b0,
      fogDensity: 0.012,
      sunColor: 0xfff5e1,
      sunIntensity: 1.15,
      sunPosition: new THREE.Vector3(25, 38, 20),
      hemiSkyColor: 0x87ceeb,
      hemiGroundColor: 0x4a7c59,
      hemiIntensity: 0.65,
      ambientColor: 0xffffff,
      ambientIntensity: 0.38,
      lanternsLit: false,
      lanternIntensity: 0.0,
      showStars: false,
      showFireflies: false,
    },
    sunset: {
      skyColor: 0xd35400,
      fogColor: 0xb84a28,
      fogDensity: 0.014,
      sunColor: 0xff6b4a,
      sunIntensity: 0.9,
      sunPosition: new THREE.Vector3(-35, 12, 20),
      hemiSkyColor: 0xe67e22,
      hemiGroundColor: 0x2c3e50,
      hemiIntensity: 0.5,
      ambientColor: 0xffaa77,
      ambientIntensity: 0.35,
      lanternsLit: false,
      lanternIntensity: 0.0,
      showStars: false,
      showFireflies: false,
    },
    night: {
      skyColor: 0x090e17,
      fogColor: 0x0b1320,
      fogDensity: 0.009,
      sunColor: 0x9ebae8, // Ánh trăng rằm mát dịu soi sáng quang đãng sân chùa
      sunIntensity: 0.85, // Sáng rõ thanh tịnh, tôn vinh kiến trúc chùa và ánh đèn vàng
      sunPosition: new THREE.Vector3(-15, 38, -25),
      hemiSkyColor: 0x273b5c, // Bầu trời đêm lam sẫm
      hemiGroundColor: 0x182820, // Mặt đất xanh rêu đêm
      hemiIntensity: 0.65,
      ambientColor: 0x546e8e, // Ánh sáng môi trường dịu êm rõ nét
      ambientIntensity: 0.48,
      lanternsLit: false,
      lanternIntensity: 0.0,
      showStars: true,
      showFireflies: false,
    },
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createLights();
    this.createStarField();
    this.createFireflies();
    const initTime = detectInitialTimeOfDay();
    this.setTime(initTime);

    // Tự động kiểm tra và chuyển thời khắc ngày/đêm theo đồng hồ thực tế mỗi 30 giây
    setInterval(() => {
      const realTime = detectInitialTimeOfDay();
      if (this.currentTime !== realTime) {
        this.setTime(realTime);
      }
    }, 30000);
  }

  private createLights() {
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c59, 0.65);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.38);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e1, 1.15);
    this.sunLight.position.set(25, 38, 20);
    this.sunLight.castShadow = true;
    // Tối ưu shadow map: 1024x1024 trên Desktop, 512x512 trên Mobile để đảm bảo 60 FPS mượt mà
    const isMobile =
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth <= 960;
    const shadowRes = isMobile ? 512 : 1024;
    this.sunLight.shadow.mapSize.width = shadowRes;
    this.sunLight.shadow.mapSize.height = shadowRes;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 95;
    this.sunLight.shadow.camera.left = -30;
    this.sunLight.shadow.camera.right = 30;
    this.sunLight.shadow.camera.top = 30;
    this.sunLight.shadow.camera.bottom = -30;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);
  }

  private createStarField() {
    const starCount = 350;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Vòm cầu sao trên bầu trời
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 90 + Math.random() * 20;

      const sinPhi = Math.sin(phi);
      positions[i * 3] = r * sinPhi * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 15; // Nửa cầu trên
      positions[i * 3 + 2] = r * sinPhi * Math.sin(theta);
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.45,
      transparent: true,
      opacity: 0.0,
      sizeAttenuation: true,
    });

    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  private createFireflies() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.fireflyCount * 3);
    this.fireflyVelocities = new Float32Array(this.fireflyCount * 3);

    for (let i = 0; i < this.fireflyCount; i++) {
      // Tập trung quanh hồ sen (x: -12..12, z: -5..7) và rặng cây
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = 0.4 + Math.random() * 2.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;

      this.fireflyVelocities[i * 3] = (Math.random() - 0.5) * 0.4;
      this.fireflyVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
      this.fireflyVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Texture tròn phát sáng đom đóm
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(8, 8, 1, 8, 8, 8);
    grad.addColorStop(0, "rgba(180, 255, 120, 1)");
    grad.addColorStop(0.5, "rgba(100, 240, 80, 0.6)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.PointsMaterial({
      map: tex,
      size: 0.45,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.fireflies = new THREE.Points(geo, mat);
    this.scene.add(this.fireflies);
  }

  public registerStoneLamp(light: THREE.PointLight) {
    this.stoneLampLights.push(light);
    const p = this.presets[this.currentTime];
    light.visible = p.lanternsLit;
    if (p.lanternsLit) {
      light.intensity = p.lanternIntensity;
      light.distance = 6.5;
    }
  }

  /**
   * Đổi thời gian trong ngày với chuyển cảnh mượt
   */
  public setTime(time: TimeOfDay) {
    this.currentTime = time;
    const p = this.presets[time];

    // Background & Fog
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.setHex(p.skyColor);
    } else {
      this.scene.background = new THREE.Color(p.skyColor);
    }

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(p.fogColor);
      this.scene.fog.density = p.fogDensity;
    }

    // Directional Sun/Moon Light
    this.sunLight.color.setHex(p.sunColor);
    this.sunLight.intensity = p.sunIntensity;
    this.sunLight.position.copy(p.sunPosition);

    // Hemisphere Light
    this.hemiLight.color.setHex(p.hemiSkyColor);
    this.hemiLight.groundColor.setHex(p.hemiGroundColor);
    this.hemiLight.intensity = p.hemiIntensity;

    // Ambient Light
    this.ambientLight.color.setHex(p.ambientColor);
    this.ambientLight.intensity = p.ambientIntensity;

    // Stone Lamp Lights (Bật/Tắt hoàn toàn để giải phóng WebGL fragment shader)
    this.stoneLampLights.forEach((l) => {
      l.visible = p.lanternsLit;
      if (p.lanternsLit) {
        l.intensity = p.lanternIntensity;
        l.distance = 6.5;
      }
    });

    // Stars & Fireflies visibility
    const starMat = this.stars.material as THREE.PointsMaterial;
    starMat.opacity = p.showStars ? 0.95 : 0.0;

    const fireflyMat = this.fireflies.material as THREE.PointsMaterial;
    fireflyMat.opacity = p.showFireflies ? 0.85 : 0.0;
  }

  /**
   * Cập nhật đom đóm bay lượn & sao lấp lánh mỗi frame
   */
  public update(dt: number, time: number) {
    if (this.currentTime === "night" || this.currentTime === "sunset") {
      const pos = this.fireflies.geometry.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < this.fireflyCount; i++) {
        let x = pos.getX(i) + (this.fireflyVelocities[i * 3] + Math.sin(time + i) * 0.2) * dt;
        let y = pos.getY(i) + (this.fireflyVelocities[i * 3 + 1] + Math.cos(time * 1.5 + i) * 0.15) * dt;
        let z = pos.getZ(i) + (this.fireflyVelocities[i * 3 + 2] + Math.cos(time + i) * 0.2) * dt;

        // Giữ trong tầm hồ sen
        if (y < 0.2) y = 0.3;
        if (y > 3.2) y = 3.0;
        if (Math.abs(x) > 16) x = -x * 0.8;
        if (Math.abs(z) > 14) z = -z * 0.8;

        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;

      // Đom đóm nhấp nháy phát sáng nhẹ
      const mat = this.fireflies.material as THREE.PointsMaterial;
      mat.size = 0.4 + Math.sin(time * 3.5) * 0.08;
    }
  }
}
