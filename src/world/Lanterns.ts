/**
 * Lanterns.ts - Hệ thống hoa đăng trôi trên hồ sen
 * Mỗi hoa đăng có mesh búp sen + ánh sáng ấm + nhấp nhô trên mặt nước
 */

import * as THREE from "three";

export interface LanternEntity {
  id: string;
  author: string;
  wishText: string;
  rejoices: number;
  group: THREE.Group;
  light: THREE.PointLight;
  rippleMesh: THREE.Mesh;
  baseY: number;
  phaseOffset: number;
}

export class LanternSystem {
  private scene: THREE.Scene;
  private lanterns: Map<string, LanternEntity> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public addLantern(
    id: string, author: string, wishText: string,
    x: number, z: number, rejoices = 0
  ): LanternEntity {
    if (this.lanterns.has(id)) return this.lanterns.get(id)!;

    const group = new THREE.Group();
    const baseY = -0.155;

    // Đế hoa đăng — cánh sen hồng mở rộng
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xec407a,
      roughness: 0.5,
      emissive: 0x880e4f,
      emissiveIntensity: 0.15,
    });
    // Đĩa sen dưới
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.08, 10), petalMat);
    base.position.y = 0;
    group.add(base);

    // Cánh hoa xung quanh
    for (let i = 0; i < 6; i++) {
      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 4),
        new THREE.MeshStandardMaterial({
          color: 0xf48fb1,
          roughness: 0.5,
          emissive: 0xf48fb1,
          emissiveIntensity: 0.1,
        })
      );
      const a = (i / 6) * Math.PI * 2;
      petal.position.set(Math.cos(a) * 0.28, 0.05, Math.sin(a) * 0.28);
      petal.scale.set(1.2, 0.5, 1.5);
      group.add(petal);
    }

    // Ngọn nến lung linh
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffd54f,
      emissive: 0xff9800,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.95,
    });
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), flameMat);
    flame.position.set(0, 0.22, 0);
    flame.scale.set(1, 1.8, 1);
    group.add(flame);

    // Quầng sáng ấm
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xfff59d,
        transparent: true,
        opacity: 0.25,
      })
    );
    glow.position.set(0, 0.2, 0);
    group.add(glow);

    // Đèn hoa đăng sử dụng vật liệu phát quang emissive và quầng sáng glow, tắt PointLight để bảo toàn 60 FPS
    const light = new THREE.PointLight(0xffb74d, 0, 0);
    light.visible = false;

    // Vòng gợn sóng nước & phản quang hoa đăng trên mặt hồ
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0xffd54f,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const rippleMesh = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.58, 24), rippleMat);
    rippleMesh.rotation.x = -Math.PI / 2;
    rippleMesh.position.y = -0.01;
    group.add(rippleMesh);

    group.position.set(x, baseY, z);
    this.scene.add(group);

    const entity: LanternEntity = {
      id,
      author,
      wishText,
      rejoices,
      group,
      light,
      rippleMesh,
      baseY,
      phaseOffset: Math.random() * Math.PI * 2,
    };

    this.lanterns.set(id, entity);
    return entity;
  }

  public removeLantern(id: string) {
    const entity = this.lanterns.get(id);
    if (entity) {
      this.scene.remove(entity.group);
      this.lanterns.delete(id);
    }
  }

  public getLantern(id: string): LanternEntity | undefined {
    return this.lanterns.get(id);
  }

  public getAllLanterns(): LanternEntity[] {
    return Array.from(this.lanterns.values());
  }

  /**
   * Nhấp nhô lên xuống và lắc nhẹ theo gợn sóng hồ
   */
  public update(time: number) {
    this.lanterns.forEach((entity) => {
      const t = time + entity.phaseOffset;
      // Nhấp nhô trên nước
      entity.group.position.y = entity.baseY + Math.sin(t * 0.8) * 0.04 + Math.cos(t * 1.3) * 0.02;
      // Lắc nhẹ xoay
      entity.group.rotation.y = Math.sin(t * 0.3) * 0.1;
      entity.group.rotation.z = Math.sin(t * 0.5) * 0.04;

      // Ánh nến nhấp nháy
      entity.light.intensity = 0.6 + Math.sin(t * 3) * 0.2 + Math.random() * 0.1;

      // Vòng gợn sóng nước co giãn lan tỏa
      if (entity.rippleMesh) {
        const rippleScale = 1.0 + Math.sin(t * 1.4) * 0.14;
        entity.rippleMesh.scale.set(rippleScale, rippleScale, 1.0);
        (entity.rippleMesh.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(t * 1.4) * 0.08;
      }
    });
  }
}
