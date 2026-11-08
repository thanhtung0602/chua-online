/**
 * QuestZoneSystem.ts - Hệ Thống Khu Vực Thực Hiện Nhiệm Vụ 3D & Chỉ Dẫn Người Chơi
 * 
 * - Tạo khu vực trực quan trong không gian 3D tương ứng với từng nhiệm vụ (VD: đống lá rụng dưới gốc cây bồ đề)
 * - Vòng tròn hào quang chỉ dẫn phát sáng xoay tròn (3D Beacon & Glowing Ring)
 * - Bảng tên 3D lơ lửng (Floating 3D Pin / Billboard) nhấp nhô nhẹ trên đầu khu vực
 * - Kiểm tra khoảng cách người chơi đến khu vực nhiệm vụ và kích hoạt thông báo tương tác
 */

import * as THREE from "three";
import type { TempleQuest } from "../utils/templeQuestSystem";

export class QuestZoneSystem {
  public group: THREE.Group;
  private scene: THREE.Scene;

  // Cụm lá rụng trang trí dưới gốc cây sân chùa
  private courtyardLeavesGroup: THREE.Group;

  // Nhóm đèn báo / Beacon của nhiệm vụ đang làm
  private activeBeaconGroup: THREE.Group;
  private beaconRing: THREE.Mesh;
  private beaconInnerRing: THREE.Mesh;
  private beaconBeam: THREE.Mesh;
  private floatingPinSprite: THREE.Sprite;
  private floatingPinTexCtx!: CanvasRenderingContext2D;
  private floatingPinTexCanvas!: HTMLCanvasElement;
  private floatingPinTexture!: THREE.CanvasTexture;

  private currentQuest: TempleQuest | null = null;
  private isWorkDone: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // 1. Tạo đống lá rụng dưới gốc cây bồ đề sân chùa (-8.5, 0, 16.5)
    this.courtyardLeavesGroup = this.createCourtyardLeaves(-8.5, 16.5);
    this.group.add(this.courtyardLeavesGroup);

    // 2. Tạo cụm Beacon vòng sáng & Cột hào quang nhiệm vụ
    this.activeBeaconGroup = new THREE.Group();
    this.activeBeaconGroup.visible = false;
    this.group.add(this.activeBeaconGroup);

    // Vòng tròn hào quang ngoài cùng
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    this.beaconRing = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.85, 32), ringMat);
    this.beaconRing.rotation.x = -Math.PI / 2;
    this.beaconRing.position.y = 0.05;
    this.activeBeaconGroup.add(this.beaconRing);

    // Vòng tròn hoa văn bên trong
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    this.beaconInnerRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.95, 24), innerRingMat);
    this.beaconInnerRing.rotation.x = -Math.PI / 2;
    this.beaconInnerRing.position.y = 0.055;
    this.activeBeaconGroup.add(this.beaconInnerRing);

    // Cột sáng hào quang hướng lên trời
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.beaconBeam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 2.8, 18, 1, true), beamMat);
    this.beaconBeam.position.y = 1.4;
    this.activeBeaconGroup.add(this.beaconBeam);

    // 3. Floating 3D Billboard Pin
    this.floatingPinSprite = this.createFloatingPinSprite();
    this.floatingPinSprite.position.set(0, 2.2, 0);
    this.activeBeaconGroup.add(this.floatingPinSprite);
  }

  /**
   * Tạo cụm lá rụng thu gom dưới gốc cây sân chùa
   */
  private createCourtyardLeaves(cx: number, cz: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(cx, 0.015, cz);

    const leafColors = [0xb45309, 0xd97706, 0xf59e0b, 0x92400e, 0x78350f, 0xa16207];
    const leafGeo = new THREE.CircleGeometry(0.12, 5);

    // Rải ~35 chiếc lá rụng tự nhiên quanh gốc cây trong bán kính 2.2m
    for (let i = 0; i < 36; i++) {
      const col = leafColors[i % leafColors.length];
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.85,
        side: THREE.DoubleSide,
      });

      const leaf = new THREE.Mesh(leafGeo, mat);
      const angle = (i / 36) * Math.PI * 2 + (i % 3) * 0.3;
      const dist = 0.4 + (Math.sin(i * 1.7) * 0.5 + 0.5) * 1.8;

      leaf.position.set(
        Math.cos(angle) * dist,
        0.005 + (i % 5) * 0.003,
        Math.sin(angle) * dist
      );
      leaf.rotation.x = -Math.PI / 2 + (Math.sin(i) * 0.08);
      leaf.rotation.z = i * 0.65;
      leaf.scale.set(1.0 + (i % 4) * 0.15, 1.4 + (i % 3) * 0.2, 1);
      group.add(leaf);
    }

    // Một đống lá gom gọn lại ở một góc
    const pileMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });
    const pile = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.18, 8), pileMat);
    pile.position.set(0.65, 0.09, -0.4);
    pile.scale.set(1.2, 1, 1.5);
    group.add(pile);

    return group;
  }

  /**
   * Tạo Sprite Canvas 3D lơ lửng chỉ dẫn vị trí làm nhiệm vụ
   */
  private createFloatingPinSprite(): THREE.Sprite {
    this.floatingPinTexCanvas = document.createElement("canvas");
    this.floatingPinTexCanvas.width = 512;
    this.floatingPinTexCanvas.height = 160;
    this.floatingPinTexCtx = this.floatingPinTexCanvas.getContext("2d")!;

    this.floatingPinTexture = new THREE.CanvasTexture(this.floatingPinTexCanvas);
    this.updatePinTexture("🧹", "Khu Vực Quét Sân Chùa", "Đến gần để thực hiện (10s)");

    const mat = new THREE.SpriteMaterial({
      map: this.floatingPinTexture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3.2, 1.0, 1.0);
    return sprite;
  }

  /**
   * Cập nhật nội dung hiển thị trên bảng 3D Marker
   */
  public updatePinTexture(icon: string, title: string, subtitle: string, isDone = false) {
    const ctx = this.floatingPinTexCtx;
    const canvas = this.floatingPinTexCanvas;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Bo góc nền bảng hiển thị
    ctx.fillStyle = isDone ? "rgba(22, 101, 52, 0.95)" : "rgba(18, 30, 22, 0.92)";
    ctx.beginPath();
    ctx.roundRect(16, 12, 480, 136, 22);
    ctx.fill();

    // Viền vàng kim / xanh ngọc tỏa sáng
    ctx.strokeStyle = isDone ? "#4ade80" : "#fbbf24";
    ctx.lineWidth = 5;
    ctx.stroke();

    // Biểu tượng Icon nhiệm vụ
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(icon, 72, 80);

    // Tiêu đề nhiệm vụ
    ctx.textAlign = "left";
    ctx.fillStyle = isDone ? "#bbf7d0" : "#fef08a";
    ctx.font = "bold 32px 'Be Vietnam Pro', sans-serif";
    ctx.fillText(title, 120, 60);

    // Hướng dẫn phụ
    ctx.fillStyle = isDone ? "#ffffff" : "#94a3b8";
    ctx.font = "bold 22px 'Be Vietnam Pro', sans-serif";
    ctx.fillText(subtitle, 120, 104);

    this.floatingPinTexture.needsUpdate = true;
  }

  /**
   * Cập nhật nhiệm vụ đang kích hoạt để dời Beacon đến đúng tọa độ
   */
  public updateActiveQuest(quest: TempleQuest | null, isWorkDone: boolean) {
    this.currentQuest = quest;
    this.isWorkDone = isWorkDone;

    if (!quest) {
      this.activeBeaconGroup.visible = false;
      return;
    }

    this.activeBeaconGroup.visible = true;

    // Xác định cao độ Y phù hợp với vị trí (Chính điện / Vườn / Cầu / Sân)
    let y = 0.05;
    if (quest.id === "clean_altar" || quest.id === "tidy_cushions") {
      y = 0.65; // Sàn chính điện
    } else if (quest.id === "clean_pond") {
      y = 0.22; // Cầu gỗ hồ sen
    }

    this.activeBeaconGroup.position.set(quest.targetCoords.x, y, quest.targetCoords.z);

    // Cập nhật màu sắc & nội dung bảng chỉ dẫn
    if (isWorkDone) {
      (this.beaconRing.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
      (this.beaconInnerRing.material as THREE.MeshBasicMaterial).color.setHex(0x4ade80);
      (this.beaconBeam.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
      this.updatePinTexture("✨", `${quest.title}`, "✓ Đã làm xong! Bấm để Nhận Thưởng", true);
    } else {
      (this.beaconRing.material as THREE.MeshBasicMaterial).color.setHex(0xf59e0b);
      (this.beaconInnerRing.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
      (this.beaconBeam.material as THREE.MeshBasicMaterial).color.setHex(0xfbbf24);
      this.updatePinTexture(quest.icon, `${quest.actionLabel}`, "Đến gần để thực hiện công quả (10s)", false);
    }
  }

  /**
   * Cập nhật hoạt ảnh xoay beacon và kiểm tra khoảng cách đến nhân vật
   */
  public update(
    delta: number,
    time: number,
    playerX: number,
    playerZ: number
  ): { inZone: boolean; distance: number; quest: TempleQuest | null; isWorkDone: boolean } {
    if (!this.currentQuest || !this.activeBeaconGroup.visible) {
      return { inZone: false, distance: 999, quest: null, isWorkDone: false };
    }

    // 1. Hoạt ảnh xoay vòng hào quang
    this.beaconRing.rotation.z += delta * 0.8;
    this.beaconInnerRing.rotation.z -= delta * 1.4;

    // 2. Hoạt ảnh nhấp nhô lơ lửng của bảng 3D pin
    const bob = Math.sin(time * 2.8) * 0.12;
    this.floatingPinSprite.position.y = 2.1 + bob;

    // 3. Hoạt ảnh nhịp thở của cột sáng beam
    const pulse = Math.sin(time * 3.5) * 0.06 + 0.18;
    (this.beaconBeam.material as THREE.MeshBasicMaterial).opacity = pulse;

    // 4. Kiểm tra khoảng cách người chơi đến tâm khu vực nhiệm vụ
    const dist = Math.hypot(
      playerX - this.currentQuest.targetCoords.x,
      playerZ - this.currentQuest.targetCoords.z
    );

    const inZone = dist <= this.currentQuest.targetRadius;

    return {
      inZone,
      distance: dist,
      quest: this.currentQuest,
      isWorkDone: this.isWorkDone,
    };
  }

  public getTargetCoords(): { x: number; z: number } | null {
    if (!this.currentQuest) return null;
    return this.currentQuest.targetCoords;
  }
}
