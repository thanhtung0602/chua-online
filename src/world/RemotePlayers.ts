/**
 * RemotePlayers.ts - Quản lý nhân vật người chơi khác trên mạng
 * Đồng bộ khuôn mặt sắc nét, áo tràng xòe, tóc anime và animation khớp xương
 */

import * as THREE from "three";
import type { PlayerAction } from "./Player";
import { createSculptedAnimeBangsGeometry, createExpressiveFaceTexture } from "./chibiAvatarUtils";

export interface RemotePlayerEntity {
  id: string;
  name: string;
  group: THREE.Group;
  nameTag: THREE.Sprite;
  targetPos: THREE.Vector3;
  action: PlayerAction;

  pelvis: THREE.Group;
  torso: THREE.Group;
  skirt: THREE.Group;
  head: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  aura: THREE.Mesh;

  walkClock: number;
  breathClock: number;
}

export class RemotePlayersManager {
  private scene: THREE.Scene;
  private players: Map<string, RemotePlayerEntity> = new Map();
  public currentAbbotName: string = "";
  public seniorMonksMap: Map<string, number> = new Map(); // name -> rank (2..13)

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public setAbbotName(name: string) {
    this.currentAbbotName = name;
    this.refreshAllPlayerTags();
  }

  public setLeaderboardRanks(abbotName: string, seniorMonksMap: Map<string, number>) {
    this.currentAbbotName = abbotName;
    this.seniorMonksMap = seniorMonksMap;
    this.refreshAllPlayerTags();
  }

  private refreshAllPlayerTags() {
    this.players.forEach((p) => {
      const isAbbot = p.name === this.currentAbbotName;
      const seniorRank = this.seniorMonksMap.get(p.name) || 0;
      p.group.remove(p.nameTag);
      p.nameTag = this.createNameTag(p.name, isAbbot, seniorRank);
      p.group.add(p.nameTag);
      if (isAbbot) {
        (p.aura.material as THREE.MeshBasicMaterial).opacity = 0.65;
        (p.aura.material as THREE.MeshBasicMaterial).color.setHex(0xffd700);
      } else if (seniorRank >= 2 && seniorRank <= 13) {
        (p.aura.material as THREE.MeshBasicMaterial).opacity = 0.50;
        (p.aura.material as THREE.MeshBasicMaterial).color.setHex(0xf39c12);
      } else {
        (p.aura.material as THREE.MeshBasicMaterial).opacity = 0.0;
      }
    });
  }

  public addPlayer(id: string, name: string, avatar: string, x: number, z: number): RemotePlayerEntity {
    if (this.players.has(id)) return this.players.get(id)!;

    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const isFemale = avatar === "female" || avatar === "chibi_female" || avatar.includes("female");
    const isMonk = avatar === "monk" || avatar === "chibi_monk" || avatar.includes("monk") || name.startsWith("Thích ");

    let robeColor = isFemale ? 0xc45c7b : 0x8b5a2b; // Nữ: hồng sen tịnh độ / Nam: áo nâu sồng hoặc lam
    if (avatar === "chibi_gray" || avatar === "chibi_blue") robeColor = 0x5b7aa6;
    else if (isMonk) robeColor = 0xd97706; // Vàng nghệ Cà Sa trang nghiêm cho Tăng Ni xuất gia

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe8d6, roughness: 0.65 });
    const robeMat = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.55 });
    const darkRobeMat = new THREE.MeshStandardMaterial({ color: 0x3d2714, roughness: 0.6 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x221a18, roughness: 0.32, metalness: 0.06 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xc0392b });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.6 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf48fb1, roughness: 0.4 });
    const leafGreenMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.5 });
    const pearlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.3 });

    // 1. Pelvis
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.42, 0);
    group.add(pelvis);

    // 2. Chân
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.13, 0, 0);
    pelvis.add(leftLeg);
    const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.38, 10), robeMat);
    lp.position.set(0, -0.19, 0);
    lp.castShadow = true;
    leftLeg.add(lp);
    const ls = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.2), darkRobeMat);
    ls.position.set(0, -0.37, 0.04);
    leftLeg.add(ls);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.13, 0, 0);
    pelvis.add(rightLeg);
    const rp = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.38, 10), robeMat);
    rp.position.set(0, -0.19, 0);
    rp.castShadow = true;
    rightLeg.add(rp);
    const rs = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.2), darkRobeMat);
    rs.position.set(0, -0.37, 0.04);
    rightLeg.add(rs);

    // 3. Vạt áo tràng xòe
    const skirt = new THREE.Group();
    pelvis.add(skirt);
    const skirtMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.36, 0.42, 16, 1, true),
      robeMat
    );
    skirtMesh.position.set(0, -0.16, 0);
    skirtMesh.castShadow = true;
    skirt.add(skirtMesh);

    // 4. Thân trên
    const torso = new THREE.Group();
    pelvis.add(torso);
    const upperRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.45, 14), robeMat);
    upperRobe.position.set(0, 0.24, 0);
    upperRobe.castShadow = true;
    torso.add(upperRobe);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.09, 14), darkRobeMat);
    belt.position.set(0, 0.06, 0);
    torso.add(belt);

    if (isFemale) {
      const lotusBrooch = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.02, 8), pinkMat);
      lotusBrooch.rotation.x = Math.PI / 2;
      lotusBrooch.position.set(0, 0.06, 0.285);
      torso.add(lotusBrooch);
    }

    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.15), whiteMat);
    collar.position.set(0, 0.44, 0.12);
    collar.rotation.x = 0.3;
    torso.add(collar);

    if (isMonk) {
      const kasayaSash = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.27, 0.44, 14, 1, false, 0, Math.PI * 0.95),
        darkRobeMat
      );
      kasayaSash.position.set(0, 0.24, 0.01);
      kasayaSash.rotation.y = -Math.PI * 0.25;
      torso.add(kasayaSash);

      const kasayaBuckle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 16), goldMat);
      kasayaBuckle.position.set(-0.16, 0.38, 0.16);
      kasayaBuckle.rotation.y = 0.4;
      torso.add(kasayaBuckle);
    }

    // 5. Tay
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.28, 0.42, 0);
    torso.add(leftArm);
    const la = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.4, 8), robeMat);
    la.position.set(0, -0.2, 0);
    leftArm.add(la);
    const lh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMat);
    lh.position.set(0, -0.38, 0);
    leftArm.add(lh);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.28, 0.42, 0);
    torso.add(rightArm);
    const ra = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.4, 8), robeMat);
    ra.position.set(0, -0.2, 0);
    rightArm.add(ra);
    const rh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMat);
    rh.position.set(0, -0.38, 0);
    rightArm.add(rh);

    // 6. Đầu & Khuôn Mặt Sắc Nét
    const head = new THREE.Group();
    head.position.set(0, 0.52, 0);
    torso.add(head);

    const faceTex = this.createFaceTexture(isFemale ? "female" : "male");
    const headMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.6,
      metalness: 0.04,
    });
    const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 24), headMat);
    headSphere.position.set(0, 0.34, 0);
    headSphere.castShadow = true;
    head.add(headSphere);

    // Tai chibi
    [-0.32, 0.32].forEach((tx) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), skinMat);
      ear.position.set(tx, 0.33, 0.02);
      ear.scale.set(0.45, 0.9, 0.7);
      head.add(ear);
    });

    // Mái tóc hoặc Đầu Cạo Xuất Gia
    if (!isMonk) {
      // Mái tóc Điêu Khắc Anime Chibi
      const hairGroup = new THREE.Group();
    hairGroup.position.set(0, 0.34, 0);
    head.add(hairGroup);

    // Vòm tóc đỉnh đầu
    const topCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.342, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.30),
      hairMat
    );
    topCap.castShadow = true;
    hairGroup.add(topCap);

    // Vòm tóc sau gáy & hai bên thái dương
    const backShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.342, 32, 18, Math.PI * 0.80, Math.PI * 1.40, Math.PI * 0.26, Math.PI * 0.46),
      hairMat
    );
    backShell.castShadow = true;
    hairGroup.add(backShell);

    // Vòm tóc gáy ôm cổ
    const hairNape = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.22, 0.22, 24, 1, false, Math.PI * 0.72, Math.PI * 1.56),
      hairMat
    );
    hairNape.position.set(0, -0.12, -0.09);
    hairNape.rotation.x = 0.24;
    hairNape.castShadow = true;
    hairGroup.add(hairNape);

    // Tóc mái 3D điêu khắc nguyên khối ôm trán
    const bangsMesh = new THREE.Mesh(
      createSculptedAnimeBangsGeometry(isFemale),
      hairMat
    );
    bangsMesh.castShadow = true;
    hairGroup.add(bangsMesh);

    if (isFemale) {
      // Tín Nữ: Song Hoàn Kế & Trâm Cài Hoa Sen Hồng
      [-0.20, 0.20].forEach((bx) => {
        const bunRoot = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.052, 0.08, 16), hairMat);
        bunRoot.position.set(bx, 0.25, 0.02);
        bunRoot.rotation.z = bx > 0 ? -0.48 : 0.48;
        hairGroup.add(bunRoot);

        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), hairMat);
        bun.position.set(bx * 1.16, 0.30, 0.02);
        bun.scale.set(1.10, 0.94, 1.05);
        bun.castShadow = true;
        hairGroup.add(bun);

        const ribbonWrap = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.018, 10, 24), redMat);
        ribbonWrap.position.set(bx * 1.08, 0.26, 0.02);
        ribbonWrap.rotation.x = Math.PI / 2;
        ribbonWrap.rotation.y = bx > 0 ? -0.48 : 0.48;
        hairGroup.add(ribbonWrap);

        const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), redMat);
        bowKnot.position.set(bx * 1.18, 0.26, -0.06);
        hairGroup.add(bowKnot);

        [-0.012, 0.012].forEach((dx) => {
          const streamer = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.22, 0.008), redMat);
          streamer.position.set(bx * 1.18 + dx, 0.14, -0.08);
          streamer.rotation.set(0.24, 0, (bx > 0 ? 0.18 : -0.18) + dx * 2);
          hairGroup.add(streamer);
        });
      });

      // Lọn tóc vai trước ngực
      [-0.20, 0.20].forEach((tx) => {
        const tress = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.010, 0.30, 8), hairMat);
        tress.position.set(tx, -0.18, 0.14);
        tress.rotation.set(0.22, 0, tx > 0 ? -0.10 : 0.10);
        hairGroup.add(tress);
      });

      // Trâm cài hoa sen hồng ngọc bích
      const hairpinGroup = new THREE.Group();
      hairpinGroup.position.set(-0.25, 0.35, 0.08);
      hairpinGroup.rotation.set(0.2, -0.3, -0.4);
      hairGroup.add(hairpinGroup);

      const pinStick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.16, 8), goldMat);
      pinStick.position.set(0, 0, -0.04);
      pinStick.rotation.x = Math.PI / 2;
      hairpinGroup.add(pinStick);

      for (let i = 0; i < 6; i++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), pinkMat);
        petal.scale.set(0.65, 1.25, 0.32);
        const angle = (i * Math.PI * 2) / 6;
        petal.position.set(Math.cos(angle) * 0.032, Math.sin(angle) * 0.032, 0.015);
        petal.rotation.z = angle - Math.PI / 2;
        hairpinGroup.add(petal);
      }

      const pinCore = new THREE.Mesh(new THREE.SphereGeometry(0.020, 8, 8), goldMat);
      pinCore.position.set(0, 0, 0.032);
      hairpinGroup.add(pinCore);

      [-0.4, 0.4].forEach((la) => {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.018, 0.01), leafGreenMat);
        leaf.position.set(Math.cos(la) * 0.040, Math.sin(la) * 0.040, 0.01);
        leaf.rotation.z = la;
        hairpinGroup.add(leaf);
      });

      // Hoa tai ngọc trai
      [-0.32, 0.32].forEach((ex) => {
        const earringHook = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.024, 6), goldMat);
        earringHook.position.set(ex, -0.06, 0.02);
        hairGroup.add(earringHook);

        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), pearlMat);
        pearl.position.set(ex, -0.09, 0.02);
        hairGroup.add(pearl);
      });

    } else {
      // Thiện Nam: Búi Đạo Đồng
      const topknotBase = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.052, 0.08, 14), hairMat);
      topknotBase.position.set(0, 0.31, 0.01);
      hairGroup.add(topknotBase);

      const topknot = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 14), hairMat);
      topknot.position.set(0, 0.38, 0.01);
      topknot.scale.set(0.96, 1.12, 0.96);
      topknot.castShadow = true;
      hairGroup.add(topknot);

      const hairRibbon = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.018, 8, 20), redMat);
      hairRibbon.position.set(0, 0.33, 0.01);
      hairRibbon.rotation.x = Math.PI / 2;
      hairGroup.add(hairRibbon);

      const hairpinStick = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.25, 8), goldMat);
      hairpinStick.position.set(0, 0.38, 0.01);
      hairpinStick.rotation.z = Math.PI / 2;
      hairGroup.add(hairpinStick);

      [-0.13, 0.13].forEach((px) => {
        const pinKnob = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), goldMat);
        pinKnob.position.set(px, 0.38, 0.01);
        hairGroup.add(pinKnob);
      });

      [-0.035, 0.035].forEach((rx) => {
        const streamer = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.24, 0.010), redMat);
        streamer.position.set(rx, 0.23, -0.12);
        streamer.rotation.set(0.35, 0, rx > 0 ? 0.18 : -0.18);
        hairGroup.add(streamer);
      });
    }
  } else {
    // Tăng Ni Xuất Gia: Đầu Cạo Trọc Thanh Khiết & 6 Chấm Giới Hương
    const monkHeadGroup = new THREE.Group();
    monkHeadGroup.position.set(0, 0.34, 0);
    head.add(monkHeadGroup);

    const markMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffd700,
      emissiveIntensity: 1.5,
    });

    const markRows = [-0.042, 0.042];
    const markCols = [0.065, 0, -0.065];
    markRows.forEach((mx) => {
      markCols.forEach((mz) => {
        const mark = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), markMat);
        mark.position.set(mx, 0.328, mz);
        monkHeadGroup.add(mark);
      });
    });
  }

  // Hào quang
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xf1c40f,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });
    const aura = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.045, 10, 24), auraMat);
    aura.position.set(0, 0.45, 0);
    aura.rotation.x = Math.PI / 2;
    group.add(aura);

    // Nametag
    const isAbbot = name === this.currentAbbotName;
    const seniorRank = this.seniorMonksMap.get(name) || 0;
    const nameTag = this.createNameTag(name, isAbbot, seniorRank);
    if (isAbbot) {
      auraMat.opacity = 0.65;
      auraMat.color.setHex(0xffd700);
    } else if (seniorRank >= 2 && seniorRank <= 13) {
      auraMat.opacity = 0.50;
      auraMat.color.setHex(0xf39c12);
    }
    group.add(nameTag);

    this.scene.add(group);

    const entity: RemotePlayerEntity = {
      id,
      name,
      group,
      nameTag,
      targetPos: new THREE.Vector3(x, 0, z),
      action: "idle",
      pelvis,
      torso,
      skirt,
      head,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      aura,
      walkClock: 0,
      breathClock: 0,
    };

    this.players.set(id, entity);
    return entity;
  }

  private createFaceTexture(gender: "male" | "female" = "male"): THREE.CanvasTexture {
    return createExpressiveFaceTexture(gender);
  }

  public setPlayerGender(id: string, gender: "male" | "female") {
    const existing = this.players.get(id);
    if (!existing) return;
    const currentPos = existing.group.position.clone();
    const currentName = existing.name;
    this.removePlayer(id);
    const newEntity = this.addPlayer(id, currentName, gender, currentPos.x, currentPos.z);
    newEntity.targetPos.copy(currentPos);
  }

  public setPlayerMonk(id: string, dharmaName: string, _robeColor?: number) {
    const p = this.players.get(id);
    if (!p) return;
    const currentPos = p.group.position.clone();
    this.removePlayer(id);
    const newEntity = this.addPlayer(id, dharmaName, "chibi_monk", currentPos.x, currentPos.z);
    newEntity.targetPos.copy(currentPos);
  }

  public setPlayerName(id: string, newName: string) {
    const p = this.players.get(id);
    if (p) {
      const oldName = p.name;
      p.name = newName;
      p.group.remove(p.nameTag);

      // Nếu người chơi này đang là Trụ Trì hoặc Cao Tăng, chuyển danh hiệu sang tên mới
      if (this.currentAbbotName === oldName) {
        this.currentAbbotName = newName;
      }
      if (this.seniorMonksMap.has(oldName)) {
        const rank = this.seniorMonksMap.get(oldName)!;
        this.seniorMonksMap.delete(oldName);
        this.seniorMonksMap.set(newName, rank);
      }

      const isAbbot = newName === this.currentAbbotName;
      const seniorRank = this.seniorMonksMap.get(newName) || 0;
      p.nameTag = this.createNameTag(newName, isAbbot, seniorRank);
      p.group.add(p.nameTag);
    }
  }

  public removePlayer(id: string) {
    const p = this.players.get(id);
    if (p) {
      this.scene.remove(p.group);
      this.players.delete(id);
    }
  }

  public setTarget(id: string, x: number, z: number, action: string) {
    const p = this.players.get(id);
    if (p) {
      p.targetPos.set(x, 0, z);
      p.action = action as PlayerAction;
    }
  }

  public setAction(id: string, action: string) {
    const p = this.players.get(id);
    if (p) {
      p.action = action as PlayerAction;
    }
  }

  private getGroundHeight(x: number, z: number): number {
    // 1. Pháp Tòa Hòa Thượng Trụ Trì (Bệ cao nhất trung tâm: cao 2.00m so với mặt đất)
    if (Math.abs(x) <= 2.25 && z <= -31.9 && z >= -35.1) {
      return 2.00;
    }
    // Bậc tam cấp dẫn lên Pháp Tòa Trụ Trì
    if (Math.abs(x) <= 1.2 && z > -31.9 && z <= -30.9) {
      const progress = (-30.9 - z) / 1.0;
      return 0.65 + Math.max(0, Math.min(1.35, progress * 1.35));
    }

    // 2. Tòa Cao Tăng Chư Tôn Đức Tả Ban & Hữu Ban (Bệ cao 1.50m)
    // Tả Ban (Bên trái)
    if (x >= -10.2 && x <= -6.8 && z <= -30.8 && z >= -36.2) {
      return 1.50;
    }
    if (x >= -9.5 && x <= -7.5 && z > -30.8 && z <= -29.8) {
      const progress = (-29.8 - z) / 1.0;
      return 0.65 + Math.max(0, Math.min(0.85, progress * 0.85));
    }
    // Hữu Ban (Bên phải)
    if (x >= 6.8 && x <= 10.2 && z <= -30.8 && z >= -36.2) {
      return 1.50;
    }
    if (x >= 7.5 && x <= 9.5 && z > -30.8 && z <= -29.8) {
      const progress = (-29.8 - z) / 1.0;
      return 0.65 + Math.max(0, Math.min(0.85, progress * 0.85));
    }

    // 3. Sàn Đại Hùng Bảo Điện Mở Rộng (Walk-in floor y = 0.65m, rộng 39m, sâu tới z = -48.5m)
    if (z <= -13.0 && z >= -48.5 && Math.abs(x) <= 19.5) {
      return 0.65;
    }

    // 4. Bậc ngũ cấp trước cửa chính điện (chuyển tiếp nhịp nhàng từ 0 lên 0.65, rộng 16m)
    if (z > -13.0 && z <= -11.0 && Math.abs(x) <= 8.2) {
      const progress = (-11.0 - z) / 2.0;
      return Math.max(0, Math.min(0.65, progress * 0.65));
    }

    // 5. Cầu gỗ bắc qua hồ sen
    if (z >= -4.8 && z <= 6.8 && Math.abs(x) <= 1.4) {
      return 0.22;
    }

    // 6. Bờ kè đá hoa cương bao quanh hồ sen
    if (
      (Math.abs(x) >= 12.3 && Math.abs(x) <= 13.5 && z >= -5.3 && z <= 7.3) ||
      (Math.abs(x) <= 13.5 && ((z >= -5.3 && z <= -4.3) || (z >= 6.3 && z <= 7.3)))
    ) {
      return 0.18;
    }

    // 7. Bệ đá Cổng Tam Quan 2 bên cánh
    if (Math.abs(x) >= 1.6 && Math.abs(x) <= 7.6 && z >= 23.5 && z <= 27.5) {
      return 0.18;
    }

    return 0;
  }

  public update(dt: number) {
    this.players.forEach((p) => {
      p.breathClock += dt;

      const prevX = p.group.position.x;
      const prevZ = p.group.position.z;

      p.group.position.x = THREE.MathUtils.lerp(p.group.position.x, p.targetPos.x, 0.12);
      p.group.position.z = THREE.MathUtils.lerp(p.group.position.z, p.targetPos.z, 0.12);
      const targetY = this.getGroundHeight(p.group.position.x, p.group.position.z);
      p.group.position.y = THREE.MathUtils.lerp(p.group.position.y, targetY, 0.2);

      const dx = p.group.position.x - prevX;
      const dz = p.group.position.z - prevZ;
      const speed = Math.sqrt(dx * dx + dz * dz) / dt;

      if (speed > 0.4) {
        p.action = "walk";
        const angle = Math.atan2(dx, dz);
        p.group.rotation.y = THREE.MathUtils.lerp(p.group.rotation.y, angle, 0.15);
      } else if (p.action === "walk") {
        p.action = "idle";
      }

      const auraMat = p.aura.material as THREE.MeshBasicMaterial;

      if (p.action === "walk") {
        p.walkClock += dt * 9.2;
        const t = p.walkClock;

        p.leftLeg.rotation.x = Math.sin(t) * 0.75;
        p.rightLeg.rotation.x = -Math.sin(t) * 0.75;
        p.leftArm.rotation.x = -Math.sin(t) * 0.65;
        p.rightArm.rotation.x = Math.sin(t) * 0.65;
        p.pelvis.position.y = 0.42 + Math.abs(Math.sin(t)) * 0.06;
        p.torso.rotation.x = 0.12;
        p.torso.rotation.z = Math.sin(t) * 0.05;
        p.skirt.rotation.x = -Math.sin(t) * 0.15;

        auraMat.opacity *= 0.85;
      } else if (p.action === "meditate") {
        p.pelvis.position.y = THREE.MathUtils.lerp(p.pelvis.position.y, 0.18, 0.1);
        p.leftLeg.rotation.set(-Math.PI / 2 + 0.1, 0.4, 0.28);
        p.rightLeg.rotation.set(-Math.PI / 2 + 0.1, -0.4, -0.28);
        p.leftArm.rotation.set(0.7, 0.45, -0.42);
        p.rightArm.rotation.set(0.7, -0.45, 0.42);
        p.head.rotation.set(0.18, 0, 0);

        auraMat.opacity = THREE.MathUtils.lerp(auraMat.opacity, 0.7, 0.05);
        p.aura.rotation.z += 0.008;
      } else if (p.action === "pray") {
        p.pelvis.position.y = 0.42;
        p.leftLeg.rotation.set(0, 0, 0);
        p.rightLeg.rotation.set(0, 0, 0);
        p.leftArm.rotation.set(-1.15, 0.55, 0.32);
        p.rightArm.rotation.set(-1.15, -0.55, -0.32);
        const bow = Math.sin(p.breathClock * 2.5) * 0.22 + 0.16;
        p.torso.rotation.x = Math.max(0, bow);
        auraMat.opacity *= 0.85;
      } else if (p.action === "wooden_fish") {
        // Người chơi từ xa ngồi gõ mõ trên bồ đoàn
        p.pelvis.position.y = THREE.MathUtils.lerp(p.pelvis.position.y, 0.18, 0.15);
        p.leftLeg.rotation.set(-Math.PI / 2 + 0.1, 0.4, 0.28);
        p.rightLeg.rotation.set(-Math.PI / 2 + 0.1, -0.4, -0.28);
        p.torso.rotation.set(0.04, 0, 0);
        p.leftArm.rotation.set(-0.72, 0.38, 0.12);
        const tap = Math.sin(p.breathClock * 14) * 0.32;
        p.rightArm.rotation.set(-0.76 + tap, -0.26, -0.12);
        auraMat.opacity = THREE.MathUtils.lerp(auraMat.opacity, 0.45, 0.05);
      } else {
        p.leftLeg.rotation.x = THREE.MathUtils.lerp(p.leftLeg.rotation.x, 0, 0.15);
        p.leftLeg.rotation.y = THREE.MathUtils.lerp(p.leftLeg.rotation.y, 0, 0.15);
        p.leftLeg.rotation.z = THREE.MathUtils.lerp(p.leftLeg.rotation.z, 0, 0.15);

        p.rightLeg.rotation.x = THREE.MathUtils.lerp(p.rightLeg.rotation.x, 0, 0.15);
        p.rightLeg.rotation.y = THREE.MathUtils.lerp(p.rightLeg.rotation.y, 0, 0.15);
        p.rightLeg.rotation.z = THREE.MathUtils.lerp(p.rightLeg.rotation.z, 0, 0.15);
        p.leftArm.rotation.set(0, 0, 0.06);
        p.rightArm.rotation.set(0, 0, -0.06);
        p.torso.rotation.set(0, 0, 0);
        p.head.rotation.set(0, 0, 0);
        p.skirt.rotation.set(0, 0, 0);
        p.pelvis.position.y = 0.42 + Math.sin(p.breathClock * 2.2) * 0.018;
        auraMat.opacity *= 0.85;
      }
    });
  }

  private createNameTag(name: string, isAbbot = false, seniorRank = 0): THREE.Sprite {
    const isSenior = !isAbbot && seniorRank >= 2 && seniorRank <= 13;
    const isMonkTag = !isAbbot && !isSenior && name.startsWith("Thích ");
    const isDoubleLine = isAbbot || isSenior || isMonkTag;

    const canvas = document.createElement("canvas");
    // Tăng gấp đôi độ phân giải (Supersampling 2x) cho texture chữ sắc nét trên màn hình Retina / iPhone / Android
    const scaleFactor = 2;
    canvas.width = 380 * scaleFactor;
    canvas.height = (isDoubleLine ? 96 : 64) * scaleFactor;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scaleFactor, scaleFactor);

    if (isAbbot) {
      ctx.fillStyle = "rgba(18, 14, 8, 0.95)";
      ctx.beginPath();
      ctx.roundRect(4, 4, 372, 88, 18);
      ctx.fill();

      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 235, 150, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(8, 8, 364, 80);

      ctx.font = "bold 20px 'Be Vietnam Pro', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd700";
      ctx.fillText("👑 HÒA THƯỢNG TRỤ TRÌ", 190, 34);

      ctx.font = "bold 26px 'Be Vietnam Pro', sans-serif";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#000000";
      ctx.strokeText(name, 190, 72);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(name, 190, 72);
    } else if (isSenior) {
      ctx.fillStyle = "rgba(26, 16, 8, 0.95)";
      ctx.beginPath();
      ctx.roundRect(4, 4, 372, 88, 18);
      ctx.fill();

      ctx.strokeStyle = "#f39c12";
      ctx.lineWidth = 3.2;
      ctx.stroke();

      ctx.strokeStyle = "rgba(254, 215, 120, 0.55)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(8, 8, 364, 80);

      const seniorTitle =
        seniorRank === 2
          ? "🪷 ĐỆ NHẤT CAO TĂNG"
          : seniorRank === 3
            ? "🪷 ĐỆ NHỊ CAO TĂNG"
            : seniorRank === 4
              ? "🪷 ĐỆ TAM CAO TĂNG"
              : `🪷 CAO TĂNG HẠNG #${seniorRank}`;

      ctx.font = "bold 19px 'Be Vietnam Pro', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#f6ad55";
      ctx.fillText(seniorTitle, 190, 34);

      ctx.font = "bold 26px 'Be Vietnam Pro', sans-serif";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#000000";
      ctx.strokeText(name, 190, 72);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(name, 190, 72);
    } else if (isMonkTag) {
      ctx.fillStyle = "rgba(28, 18, 6, 0.95)";
      ctx.beginPath();
      ctx.roundRect(4, 4, 372, 88, 18);
      ctx.fill();

      ctx.strokeStyle = "#e67e22";
      ctx.lineWidth = 3.2;
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 215, 0, 0.55)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(8, 8, 364, 80);

      ctx.font = "bold 19px 'Be Vietnam Pro', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd54f";
      ctx.fillText("🪷 TĂNG ĐOÀN XUẤT GIA", 190, 34);

      ctx.font = "bold 26px 'Be Vietnam Pro', sans-serif";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#000000";
      ctx.strokeText(name, 190, 72);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(name, 190, 72);
    } else {
      ctx.fillStyle = "rgba(10, 18, 14, 0.94)";
      ctx.beginPath();
      ctx.roundRect(4, 4, 372, 56, 16);
      ctx.fill();

      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.font = "bold 28px 'Be Vietnam Pro', -apple-system, 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.lineJoin = "round";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
      ctx.strokeText(name, 190, 42);

      ctx.fillStyle = "#ffffff";
      ctx.fillText(name, 190, 42);
    }

    const tex = new THREE.CanvasTexture(canvas);
    // Tắt Mipmaps để Three.js không làm mờ nhòe chữ khi camera ở xa hoặc góc nghiêng
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(0, isDoubleLine ? 2.45 : 2.35, 0);
    sprite.scale.set(isDoubleLine ? 2.05 : 1.8, isDoubleLine ? 0.52 : 0.36, 1);
    return sprite;
  }

  public getPlayer(id: string): RemotePlayerEntity | undefined {
    return this.players.get(id);
  }
}
