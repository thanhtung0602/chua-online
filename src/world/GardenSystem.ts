/**
 * GardenSystem.ts - Hệ thống Khu Vườn An Lạc (Zen Garden)
 * Trồng hoa sen, tưới nước, búp non lớn lên và thu hoạch đóa sen cúng Phật
 */

import * as THREE from "three";
import { zenAudio } from "../utils/audio";

export type PlotStage = "empty" | "sprout" | "bud" | "bloom";

export interface GardenPlot {
  id: number;
  x: number;
  z: number;
  stage: PlotStage;
  plantGroup: THREE.Group;
  soilMesh: THREE.Mesh;
  plantedAt?: number;
  lastWateredAt?: number;
}

export class GardenSystem {
  private scene: THREE.Scene;
  public plots: GardenPlot[] = [];
  public gardenMeshGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.gardenMeshGroup = new THREE.Group();
    this.scene.add(this.gardenMeshGroup);
    this.buildGarden();
  }

  private buildGarden() {
    // Vườn An Lạc nằm ở khoảng sân bên phải gần Cổng Tam Quan, trước Hồ Sen (x = 7..22, z = 10..22.5)
    const plotCoords = [
      { id: 1, x: 13.0, z: 18.5 },
      { id: 2, x: 16.5, z: 18.5 },
      { id: 3, x: 13.0, z: 21.0 },
      { id: 4, x: 16.5, z: 21.0 },
    ];

    // Hàng rào trúc bao quanh khu vực luống hoa
    this.createGardenFence();

    // Biển gỗ nghệ thuật chạm khắc "🪷 VƯỜN AN LẠC 🌿"
    this.createGardenSign();

    // Tạo các ô đất
    plotCoords.forEach((coord) => {
      this.createPlot(coord.id, coord.x, coord.z);
    });

    // Mặc định trồng sẵn 1 đóa sen nở và 1 búp non để khung cảnh sinh động
    this.plantSeed(1);
    this.waterPlot(1);
    this.setPlotStage(1, "bloom");

    this.plantSeed(2);
    this.setPlotStage(2, "bud");
  }

  private createGardenFence() {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8a623a, roughness: 0.8 });
    // Hàng rào gỗ thấp bao quanh khu luống hoa Vườn An Lạc
    // 1. Phía Nam (giáp viền cỏ sau, z = 22.2)
    const fenceSouth = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.45, 0.1), fenceMat);
    fenceSouth.position.set(14.8, 0.22, 22.2);
    fenceSouth.castShadow = true;
    this.gardenMeshGroup.add(fenceSouth);

    // 2. Phía Đông (x = 18.2)
    const fenceEast = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 4.8), fenceMat);
    fenceEast.position.set(18.2, 0.22, 19.8);
    fenceEast.castShadow = true;
    this.gardenMeshGroup.add(fenceEast);

    // 3. Phía Tây (x = 11.2)
    const fenceWest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 4.8), fenceMat);
    fenceWest.position.set(11.2, 0.22, 19.8);
    fenceWest.castShadow = true;
    this.gardenMeshGroup.add(fenceWest);
  }

  private createGardenSign() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.7 });

    // 2 cột trụ gỗ đỡ biển hiệu
    [-0.55, 0.55].forEach((offset) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.35, 10), woodMat);
      post.position.set(6.4, 0.65, 17.0 + offset);
      post.castShadow = true;
      this.gardenMeshGroup.add(post);
    });

    // Mái ngói nhỏ che mưa nắng cho biển hiệu
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a382b, roughness: 0.6 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.22, 4), roofMat);
    roof.position.set(6.4, 1.32, 17.0);
    roof.rotation.y = Math.PI / 4;
    this.gardenMeshGroup.add(roof);

    // Bảng hiệu vẽ Canvas Texture sắc nét
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#1e130a";
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 176, 16);
    ctx.fill();

    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = "rgba(250, 204, 21, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(14, 14, 484, 164);

    ctx.textAlign = "center";
    ctx.fillStyle = "#fef08a";
    ctx.font = "bold 44px 'Be Vietnam Pro', sans-serif";
    ctx.fillText("🪷 VƯỜN AN LẠC 🌿", 256, 82);

    ctx.fillStyle = "#86efac";
    ctx.font = "bold 24px 'Be Vietnam Pro', sans-serif";
    ctx.fillText("Khu Vực Trồng Sen & Chấp Tác", 256, 136);

    const tex = new THREE.CanvasTexture(canvas);
    const signMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 1.25), signMat);
    board.position.set(6.4, 1.05, 17.0);
    board.castShadow = true;
    this.gardenMeshGroup.add(board);
  }

  private createPlot(id: number, x: number, z: number) {
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x4a3728, // Đất mùn sẫm
      roughness: 0.95,
    });

    // Ụ đất tròn
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.12, 12), soilMat);
    soil.position.set(x, 0.06, z);
    soil.receiveShadow = true;
    this.gardenMeshGroup.add(soil);

    // Viền sỏi trắng bao quanh ụ đất
    const stoneRingMat = new THREE.MeshStandardMaterial({ color: 0xd4d0c8, roughness: 0.9 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 6, 16), stoneRingMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.03, z);
    this.gardenMeshGroup.add(ring);

    const plantGroup = new THREE.Group();
    plantGroup.position.set(x, 0.12, z);
    this.gardenMeshGroup.add(plantGroup);

    this.plots.push({
      id,
      x,
      z,
      stage: "empty",
      plantGroup,
      soilMesh: soil,
    });
  }

  public plantSeed(plotId: number): boolean {
    const plot = this.plots.find((p) => p.id === plotId);
    if (!plot || plot.stage !== "empty") return false;

    plot.stage = "sprout";
    plot.plantedAt = Date.now();
    this.rebuildPlantMesh(plot);
    zenAudio.playLotusSound();
    return true;
  }

  public waterPlot(plotId: number): boolean {
    const plot = this.plots.find((p) => p.id === plotId);
    if (!plot || plot.stage === "empty") return false;

    plot.lastWateredAt = Date.now();
    // Đất chuyển sang màu ẩm ướt
    (plot.soilMesh.material as THREE.MeshStandardMaterial).color.setHex(0x2d1f15);

    if (plot.stage === "sprout") {
      plot.stage = "bud";
    } else if (plot.stage === "bud") {
      plot.stage = "bloom";
    }
    this.rebuildPlantMesh(plot);
    zenAudio.playLotusSound();
    return true;
  }

  public harvestPlot(plotId: number): boolean {
    const plot = this.plots.find((p) => p.id === plotId);
    if (!plot || plot.stage !== "bloom") return false;

    plot.stage = "empty";
    (plot.soilMesh.material as THREE.MeshStandardMaterial).color.setHex(0x4a3728);
    this.rebuildPlantMesh(plot);
    zenAudio.playLotusSound();
    return true;
  }

  public setPlotStage(plotId: number, stage: PlotStage) {
    const plot = this.plots.find((p) => p.id === plotId);
    if (plot) {
      plot.stage = stage;
      this.rebuildPlantMesh(plot);
    }
  }

  private rebuildPlantMesh(plot: GardenPlot) {
    // Xóa mesh cũ
    while (plot.plantGroup.children.length > 0) {
      const obj = plot.plantGroup.children[0];
      plot.plantGroup.remove(obj);
    }

    if (plot.stage === "empty") return;

    const greenMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.7 });
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xf06292,
      emissive: 0xad1457,
      emissiveIntensity: 0.15,
      roughness: 0.5,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      emissive: 0xd4ac0d,
      emissiveIntensity: 0.3,
    });

    if (plot.stage === "sprout") {
      // Mầm sen xanh nhỏ nhú lên
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.15, 6), greenMat);
      stem.position.y = 0.075;
      plot.plantGroup.add(stem);

      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), greenMat);
      leaf.scale.set(1, 0.3, 1.2);
      leaf.position.y = 0.15;
      plot.plantGroup.add(leaf);
    } else if (plot.stage === "bud") {
      // Búp sen vươn cao
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.35, 6), greenMat);
      stem.position.y = 0.175;
      plot.plantGroup.add(stem);

      // Lá sen xòe bên cạnh
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.2, 8), greenMat);
      leaf.rotation.x = -Math.PI / 2;
      leaf.position.set(-0.2, 0.12, 0.1);
      plot.plantGroup.add(leaf);

      // Búp hoa sen hồng e ấp
      const bud = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 8), petalMat);
      bud.position.y = 0.42;
      plot.plantGroup.add(bud);
    } else if (plot.stage === "bloom") {
      // Hoa sen nở rực rỡ
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.42, 8), greenMat);
      stem.position.y = 0.21;
      plot.plantGroup.add(stem);

      // 2 Lá sen tròn to
      [-0.25, 0.25].forEach((lx) => {
        const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.26, 10), greenMat);
        leaf.rotation.x = -Math.PI / 2;
        leaf.position.set(lx, 0.15, 0);
        plot.plantGroup.add(leaf);
      });

      // Cánh sen nở xòe nhiều lớp
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), petalMat);
        petal.position.set(Math.cos(angle) * 0.12, 0.46, Math.sin(angle) * 0.12);
        petal.scale.set(1, 0.4, 1.6);
        plot.plantGroup.add(petal);
      }

      // Nhụy sen vàng tỏa sáng nhẹ
      const pistil = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), goldMat);
      pistil.position.y = 0.48;
      plot.plantGroup.add(pistil);

      // Điểm sáng lung linh
      const light = new THREE.PointLight(0xf48fb1, 0.4, 2);
      light.position.y = 0.55;
      plot.plantGroup.add(light);
    }
  }

  /**
   * Tìm ô đất gần vị trí người chơi nhất
   */
  public getNearbyPlot(x: number, z: number, maxDist = 2.4): GardenPlot | null {
    let closest: GardenPlot | null = null;
    let minDist = maxDist;

    for (const plot of this.plots) {
      const dist = Math.hypot(plot.x - x, plot.z - z);
      if (dist < minDist) {
        minDist = dist;
        closest = plot;
      }
    }
    return closest;
  }
}
