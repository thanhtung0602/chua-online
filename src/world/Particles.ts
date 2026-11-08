/**
 * Particles.ts - Hệ thống hiệu ứng hạt:
 * 1. LeafParticles: Cánh lá bồ đề vàng bay là là trong gió
 * 2. IncenseSmoke: Làn khói trầm hương uốn lượn bay lên từ lư hương đồng
 */

import * as THREE from "three";

export class LeafParticles {
  public points: THREE.Points;
  private velocities: Float32Array;
  private count: number;
  private boundSize: number;

  constructor(scene: THREE.Scene, count = 120, boundSize = 50) {
    this.count = count;
    this.boundSize = boundSize;

    const positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * boundSize;
      positions[i * 3 + 1] = Math.random() * 12 + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * boundSize;

      this.velocities[i * 3] = (Math.random() - 0.3) * 0.4;
      this.velocities[i * 3 + 1] = -0.2 - Math.random() * 0.3;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#d4ac0d";
    ctx.beginPath();
    ctx.ellipse(8, 8, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9a7d0a";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(3, 8);
    ctx.lineTo(13, 8);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    const material = new THREE.PointsMaterial({
      map: tex,
      size: 0.35,
      transparent: true,
      opacity: 0.8,
      alphaTest: 0.1,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geometry, material);
    scene.add(this.points);
  }

  public update(dt: number) {
    const positions = this.points.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < this.count; i++) {
      let x = positions.getX(i) + this.velocities[i * 3] * dt;
      let y = positions.getY(i) + this.velocities[i * 3 + 1] * dt;
      let z = positions.getZ(i) + this.velocities[i * 3 + 2] * dt;

      x += Math.sin(y * 0.5 + x * 0.3) * 0.01;

      if (y < 0 || Math.abs(x) > this.boundSize / 2 || Math.abs(z) > this.boundSize / 2) {
        x = (Math.random() - 0.5) * this.boundSize;
        y = 10 + Math.random() * 5;
        z = (Math.random() - 0.5) * this.boundSize;
      }

      positions.setXYZ(i, x, y, z);
    }

    positions.needsUpdate = true;
  }
}

/**
 * Làn khói trầm hương nghi ngút bay lên từ đỉnh đồng trước Chính Điện
 */
export class IncenseSmoke {
  public points: THREE.Points;
  private count = 45;
  private lifeTimes: Float32Array;
  private maxLife = 4.0;
  private origin = new THREE.Vector3(0, 1.35, -13.2);

  constructor(
    scene: THREE.Scene,
    origin?: THREE.Vector3,
    maxLife = 4.0,
    count = 45
  ) {
    if (origin) this.origin = origin.clone();
    this.maxLife = maxLife;
    this.count = count;

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    this.lifeTimes = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      this.lifeTimes[i] = Math.random() * this.maxLife;
      positions[i * 3] = this.origin.x;
      positions[i * 3 + 1] = this.origin.y + (this.lifeTimes[i] / this.maxLife) * 2.8;
      positions[i * 3 + 2] = this.origin.z;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Texture tròn mờ cho khói
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
    grad.addColorStop(0, "rgba(220, 225, 230, 0.7)");
    grad.addColorStop(0.5, "rgba(180, 190, 200, 0.3)");
    grad.addColorStop(1, "rgba(200, 200, 200, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.PointsMaterial({
      map: tex,
      size: 0.5,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geo, mat);
    scene.add(this.points);
  }

  public update(dt: number, time: number) {
    const pos = this.points.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < this.count; i++) {
      this.lifeTimes[i] += dt;
      if (this.lifeTimes[i] > this.maxLife) {
        this.lifeTimes[i] = 0;
      }

      const progress = this.lifeTimes[i] / this.maxLife;
      const y = this.origin.y + progress * 2.8;

      // Khói uốn lượn hình sin bay lên
      const wave = Math.sin(progress * 8.0 + time * 1.5 + i) * 0.12 * progress;
      const x = this.origin.x + wave;
      const z = this.origin.z + Math.cos(progress * 6.0 + time + i) * 0.08 * progress;

      pos.setXYZ(i, x, y, z);
    }

    pos.needsUpdate = true;
  }
}
