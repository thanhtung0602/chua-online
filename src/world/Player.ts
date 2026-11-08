/**
 * Player.ts - Nhân vật Chibi 3D Thiết Kế Cao Cấp (High-Quality Stylized 3D Chibi)
 * - Mặt vẽ Canvas 512x512 sắc nét: mắt to tròn anime long lanh, má hồng đào, môi cười duyên
 * - Tóc tạo kiểu Chibi nhiều lớp (mái vòm, tóc mai, búi củ tỏi có dây buộc đỏ, nón lá tùy chọn)
 * - Y phục áo tràng giao lĩnh: cổ chéo 2 lớp, tà áo xòe tha thướt qua gối, ống tay áo thụng buông rủ
 * - Thắt lưng lụa có nơ và dải rủ, tràng hạt đeo cổ mạ vàng
 * - Khung xương phân cấp linh hoạt, animations sải bước, nhún người, thở nhẹ, thiền kiết già, bái Phật
 */

import * as THREE from "three";
import { createSculptedAnimeBangsGeometry, createExpressiveFaceTexture } from "./chibiAvatarUtils";
import { authService } from "../services/authService";

export type PlayerAction = "idle" | "walk" | "meditate" | "pray" | "wave" | "bell" | "wooden_fish" | "sweep";
export type PlayerGender = "male" | "female";

export class Player {
  public group: THREE.Group;
  public avatarMeshRoot: THREE.Group;
  public action: PlayerAction = "idle";
  public direction: "left" | "right" = "right";
  public gender: PlayerGender = "male";

  // Thông tin Xuất Gia Thụ Giới & Pháp Danh
  public isMonk: boolean = false;
  public dharmaName: string = "";

  // Vị trí thế giới
  public worldX: number;
  public worldY: number = 0;
  public worldZ: number;

  // Điều khiển di chuyển
  public isMoving = false;
  public isNavigatingToTarget = false;
  public targetX: number;
  public targetY: number = 0;
  public targetZ: number;
  public moveSpeed = 6.2;
  public facingAngle = 0;

  // Kiểm tra vật cản & tường bao (Collision System)
  public collisionChecker?: (x: number, z: number) => boolean;

  // Khung xương phân cấp
  private pelvisGroup!: THREE.Group;
  private torsoGroup!: THREE.Group;
  private skirtGroup!: THREE.Group;
  private headGroup!: THREE.Group;
  private leftLegGroup!: THREE.Group;
  private rightLegGroup!: THREE.Group;
  private leftArmGroup!: THREE.Group;
  private rightArmGroup!: THREE.Group;
  private broomGroup!: THREE.Group;
  private auraRing!: THREE.Mesh;
  private robeMat!: THREE.MeshStandardMaterial;
  private darkRobeMat!: THREE.MeshStandardMaterial;

  // Biến đếm animation
  private walkClock = 0;
  private breathClock = 0;
  private actionClock = 0;

  private robeColor: number;
  private nameTag!: THREE.Sprite;

  constructor(
    startX = 0, startZ = 22,
    name = "Đạo Hữu An Nhiên",
    robeColor = 0x5b7aa6 // Màu lam thanh nhã
  ) {
    this.worldX = startX;
    this.worldZ = startZ;
    this.targetX = startX;
    this.targetZ = startZ;
    this.worldY = this.getGroundHeight(startX, startZ);
    this.targetY = this.worldY;

    // Tự động kiểm tra trạng thái đăng nhập:
    // Nếu chưa đăng nhập: mỗi lần F5 hoặc vào lại web sẽ tự động làm mới nhân vật
    const isLoggedIn = authService.isLoggedIn();
    if (!isLoggedIn) {
      // Khách chưa đăng nhập: Tự động đổi giới tính và màu y phục ngẫu nhiên, không giữ trạng thái cũ
      this.gender = Math.random() > 0.5 ? "female" : "male";
      this.isMonk = false;
      this.dharmaName = "";
      const LAY_COLORS = [0x5b7aa6, 0x78716c, 0x78350f, 0x1e3a8a, 0x475569];
      robeColor = LAY_COLORS[Math.floor(Math.random() * LAY_COLORS.length)];
    } else {
      // Đã đăng nhập: Khôi phục trọn vẹn thông tin tài khoản đã xác thực
      try {
        const savedGender = localStorage.getItem("chua_an_lac_gender") as PlayerGender | null;
        if (savedGender === "male" || savedGender === "female") {
          this.gender = savedGender;
        }
        this.isMonk = authService.isMonk();
        if (this.isMonk) {
          const dName = authService.getDharmaName();
          if (dName) {
            this.dharmaName = dName;
            name = dName;
          }
          const userRobe = authService.getCurrentUser()?.robeColor;
          robeColor = userRobe || 0xd97706;
        } else {
          const savedRobe = localStorage.getItem("chua_an_lac_robe_color");
          if (savedRobe) {
            const parsed = parseInt(savedRobe, 16);
            if (!isNaN(parsed)) robeColor = parsed;
          }
        }
      } catch (e) {
        console.warn("Could not read auth preferences", e);
      }
    }
    this.robeColor = robeColor;

    this.group = new THREE.Group();
    this.group.position.set(startX, this.worldY, startZ);

    this.avatarMeshRoot = new THREE.Group();
    this.group.add(this.avatarMeshRoot);

    this.buildHighQualityChibi();
    this.createNameTag(name);
    this.createAura();
  }

  public setGender(gender: PlayerGender) {
    if (this.gender === gender) return;
    this.gender = gender;
    try {
      localStorage.setItem("chua_an_lac_gender", gender);
    } catch (e) {
      console.warn("Could not save gender to localStorage", e);
    }
    this.rebuildAvatar();
  }

  public rebuildAvatar() {
    while (this.avatarMeshRoot.children.length > 0) {
      const child = this.avatarMeshRoot.children[0];
      this.avatarMeshRoot.remove(child);
    }
    this.buildHighQualityChibi();
    this.resetPose();
  }

  /**
   * Tính toán cao độ mặt đất theo từng khu vực trong khuôn viên Chùa
   * Đảm bảo KHÔNG BAO GIỜ bị lún nửa thân dưới vào sàn Chính Điện hoặc cầu
   */
  public getGroundHeight(x: number, z: number): number {
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

    // 8. Mặt sân đất / gạch mặc định
    return 0;
  }

  // ─────────────────────────────────────────────
  // XÂY DỰNG NHÂN VẬT CHIBI CHẤT LƯỢNG CAO
  // ─────────────────────────────────────────────
  private buildHighQualityChibi() {
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffe8d6,
      roughness: 0.65,
      metalness: 0.05,
    });

    this.robeMat = new THREE.MeshStandardMaterial({
      color: this.robeColor,
      roughness: 0.55,
      metalness: 0.08,
    });
    const robeMat = this.robeMat;

    this.darkRobeMat = new THREE.MeshStandardMaterial({
      color: 0x3d5373,
      roughness: 0.6,
    });
    const darkRobeMat = this.darkRobeMat;

    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
    });

    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x2b1e16,
      roughness: 0.7,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x221a18, // Nâu đen hạt dẻ tự nhiên, bóng mượt phong cách Anime cao cấp
      roughness: 0.32,
      metalness: 0.06,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.75,
    });

    const redMat = new THREE.MeshStandardMaterial({
      color: 0xc0392b,
      roughness: 0.45,
    });

    const pinkMat = new THREE.MeshStandardMaterial({
      color: 0xf48fb1,
      roughness: 0.35,
    });

    const leafGreenMat = new THREE.MeshStandardMaterial({
      color: 0x43a047,
      roughness: 0.45,
    });

    const pearlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.35,
    });

    // ==========================================
    // 1. KHỚP HÔNG (Pelvis Group) - Neo tại y = 0.42
    // ==========================================
    this.pelvisGroup = new THREE.Group();
    this.pelvisGroup.position.set(0, 0.42, 0);
    this.avatarMeshRoot.add(this.pelvisGroup);

    // ==========================================
    // 2. CHÂN & BƯỚC ĐI (Legs & Shoes)
    // ==========================================
    // Chân trái
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.13, 0, 0);
    this.pelvisGroup.add(this.leftLegGroup);

    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.38, 12), robeMat);
    leftLeg.position.set(0, -0.19, 0);
    leftLeg.castShadow = true;
    this.leftLegGroup.add(leftLeg);

    // Giày vải Phật tử có viền trắng
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.2), shoeMat);
    leftShoe.position.set(0, -0.37, 0.04);
    leftShoe.castShadow = true;
    this.leftLegGroup.add(leftShoe);

    const leftShoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.126, 0.025, 0.206), whiteMat);
    leftShoeSole.position.set(0, -0.41, 0.04);
    this.leftLegGroup.add(leftShoeSole);

    // Chân phải
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.13, 0, 0);
    this.pelvisGroup.add(this.rightLegGroup);

    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.38, 12), robeMat);
    rightLeg.position.set(0, -0.19, 0);
    rightLeg.castShadow = true;
    this.rightLegGroup.add(rightLeg);

    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.2), shoeMat);
    rightShoe.position.set(0, -0.37, 0.04);
    rightShoe.castShadow = true;
    this.rightLegGroup.add(rightShoe);

    const rightShoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.126, 0.025, 0.206), whiteMat);
    rightShoeSole.position.set(0, -0.41, 0.04);
    this.rightLegGroup.add(rightShoeSole);

    // ==========================================
    // 3. VẠT ÁO TRÀNG XÒE (Robe Skirt) - Buông qua gối
    // ==========================================
    this.skirtGroup = new THREE.Group();
    this.pelvisGroup.add(this.skirtGroup);

    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.36, 0.42, 16, 1, true),
      robeMat
    );
    skirt.position.set(0, -0.16, 0);
    skirt.castShadow = true;
    this.skirtGroup.add(skirt);

    // ==========================================
    // 4. THÂN TRÊN (Torso Group)
    // ==========================================
    this.torsoGroup = new THREE.Group();
    this.pelvisGroup.add(this.torsoGroup);

    // Áo tràng trên
    const upperRobe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.25, 0.45, 16),
      robeMat
    );
    upperRobe.position.set(0, 0.24, 0);
    upperRobe.castShadow = true;
    this.torsoGroup.add(upperRobe);

    // Thắt lưng dải lụa ngang eo
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.09, 16), darkRobeMat);
    belt.position.set(0, 0.06, 0);
    this.torsoGroup.add(belt);

    // Nơ thắt lưng & Dải lụa rủ phía trước
    const sashKnot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), darkRobeMat);
    sashKnot.position.set(0, 0.06, 0.26);
    this.torsoGroup.add(sashKnot);

    if (this.gender === "female") {
      // Đóa sen hồng ngọc cài thắt lưng y phục Tín Nữ
      const lotusBrooch = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.02, 8), pinkMat);
      lotusBrooch.rotation.x = Math.PI / 2;
      lotusBrooch.position.set(0, 0.06, 0.285);
      this.torsoGroup.add(lotusBrooch);

      const broochCore = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), goldMat);
      broochCore.position.set(0, 0.06, 0.298);
      this.torsoGroup.add(broochCore);
    }

    const sashRibbon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.02), darkRobeMat);
    sashRibbon.position.set(0, -0.08, 0.26);
    sashRibbon.rotation.z = 0.08;
    this.torsoGroup.add(sashRibbon);

    // Cổ áo giao lĩnh xếp chéo (Cross Collar V-neck)
    const innerCollar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.15), whiteMat);
    innerCollar.position.set(0, 0.44, 0.12);
    innerCollar.rotation.x = 0.3;
    this.torsoGroup.add(innerCollar);

    const outerCollarLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.03), darkRobeMat);
    outerCollarLeft.position.set(-0.08, 0.35, 0.21);
    outerCollarLeft.rotation.z = -0.55;
    this.torsoGroup.add(outerCollarLeft);

    const outerCollarRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.03), darkRobeMat);
    outerCollarRight.position.set(0.08, 0.35, 0.21);
    outerCollarRight.rotation.z = 0.55;
    this.torsoGroup.add(outerCollarRight);

    // Chuỗi tràng hạt bồ đề đeo cổ
    const mala = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.022, 8, 24),
      goldMat
    );
    mala.position.set(0, 0.36, 0.12);
    mala.rotation.x = Math.PI / 3.2;
    this.torsoGroup.add(mala);

    // Y Phục Cà Sa Cho Người Xuất Gia Đi Tu (Kṣāya monastic robe sash)
    if (this.isMonk) {
      const kasayaSash = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.27, 0.44, 16, 1, false, 0, Math.PI * 0.95),
        darkRobeMat
      );
      kasayaSash.position.set(0, 0.24, 0.01);
      kasayaSash.rotation.y = -Math.PI * 0.25;
      this.torsoGroup.add(kasayaSash);

      // Móc kim thoa đính ngọc giữ y cà sa ở vai trái
      const kasayaBuckle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 16), goldMat);
      kasayaBuckle.position.set(-0.16, 0.38, 0.16);
      kasayaBuckle.rotation.y = 0.4;
      this.torsoGroup.add(kasayaBuckle);
    }

    // ==========================================
    // 5. CÁNH TAY ÁO THỤNG & BÀN TAY (Arms & Hands)
    // ==========================================
    // Tay trái (Pivot vai tại x=-0.28, y=0.42)
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.28, 0.42, 0);
    this.torsoGroup.add(this.leftArmGroup);

    // Ống tay áo thụng buông rủ
    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.22, 10), robeMat);
    leftUpperArm.position.set(0, -0.1, 0);
    leftUpperArm.castShadow = true;
    this.leftArmGroup.add(leftUpperArm);

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.22, 10), robeMat);
    leftForearm.position.set(0, -0.25, 0);
    leftForearm.castShadow = true;
    this.leftArmGroup.add(leftForearm);

    // Bàn tay chibi xinh xắn
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), skinMat);
    leftHand.position.set(0, -0.38, 0);
    this.leftArmGroup.add(leftHand);

    // Tay phải (Pivot vai tại x=0.28, y=0.42)
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.28, 0.42, 0);
    this.torsoGroup.add(this.rightArmGroup);

    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.22, 10), robeMat);
    rightUpperArm.position.set(0, -0.1, 0);
    rightUpperArm.castShadow = true;
    this.rightArmGroup.add(rightUpperArm);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.22, 10), robeMat);
    rightForearm.position.set(0, -0.25, 0);
    rightForearm.castShadow = true;
    this.rightArmGroup.add(rightForearm);

    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), skinMat);
    rightHand.position.set(0, -0.38, 0);
    this.rightArmGroup.add(rightHand);

    // Dụng cụ chổi tre quét lá sân chùa (Hiện lên khi làm động tác quét chùa)
    this.broomGroup = new THREE.Group();
    this.broomGroup.position.set(0, -0.05, 0.32);
    this.broomGroup.rotation.set(-0.45, 0, 0);

    const broomHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.95, 8),
      new THREE.MeshStandardMaterial({ color: 0xba8c63, roughness: 0.6 })
    );
    broomHandle.castShadow = true;
    this.broomGroup.add(broomHandle);

    const broomHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.30, 12),
      new THREE.MeshStandardMaterial({ color: 0xdec18c, roughness: 0.85 })
    );
    broomHead.position.set(0, -0.45, 0);
    broomHead.castShadow = true;
    this.broomGroup.add(broomHead);

    const broomCord = new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.008, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.8 })
    );
    broomCord.rotation.x = Math.PI / 2;
    broomCord.position.set(0, -0.34, 0);
    this.broomGroup.add(broomCord);

    this.broomGroup.visible = false;
    this.torsoGroup.add(this.broomGroup);

    // ==========================================
    // 6. ĐẦU & KHUÔN MẶT ANIME CHIBI SẮC NÉT (Head & Anime Face)
    // ==========================================
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.52, 0);
    this.torsoGroup.add(this.headGroup);

    // Cổ áo
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 12), skinMat);
    neck.position.set(0, 0.05, 0);
    this.headGroup.add(neck);

    // Texture vẽ mặt Chibi 1024x1024 siêu sắc nét, ánh sáng long lanh, má đào, nụ cười an lạc
    const faceTexture = this.createExpressiveFaceTexture();
    const headMat = new THREE.MeshStandardMaterial({
      map: faceTexture,
      roughness: 0.6,
      metalness: 0.04,
    });

    // Khối đầu tròn đáng yêu với texture mặt được map trực tiếp - KHÔNG BAO GIỜ BỊ CLIPPING!
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 24), headMat);
    head.position.set(0, 0.34, 0);
    head.castShadow = true;
    this.headGroup.add(head);

    // TAI CHIBI (2 tai tròn nhỏ nhắn 2 bên má)
    [-0.32, 0.32].forEach((tx) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), skinMat);
      ear.position.set(tx, 0.33, 0.02);
      ear.scale.set(0.45, 0.9, 0.7);
      this.headGroup.add(ear);
    });

    // ==========================================
    // 7. MÁI TÓC HOẶC ĐẦU CẠO XUẤT GIA THỤ GIỚI
    // ==========================================
    if (!this.isMonk) {
      // 7A. CƯ SĨ / PHẬT TỬ: MÁI TÓC ĐIÊU KHẮC CHIBI ANIME CAO CẤP (Sculpted Anime Chibi Hair)
      const hairGroup = new THREE.Group();
      hairGroup.position.set(0, 0.34, 0);
      this.headGroup.add(hairGroup);

      // 7.1. Vòm tóc đỉnh đầu (Crown Top Cap - che nửa trên đỉnh đầu từ theta = 0 đến 0.30 PI)
      const topCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.342, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.30),
        hairMat
      );
      topCap.castShadow = true;
      hairGroup.add(topCap);

      // 7.2. Vòm tóc sau gáy & hai bên thái dương (Back & Sides Shell)
      // Bao bọc từ 144 độ quanh sau gáy đến 36 độ, chừa trọn vẹn 120 độ mặt tiền thanh thoát
      const backShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.342, 32, 18, Math.PI * 0.80, Math.PI * 1.40, Math.PI * 0.26, Math.PI * 0.46),
        hairMat
      );
      backShell.castShadow = true;
      hairGroup.add(backShell);

      // 7.3. Vòm tóc gáy ôm cổ mềm mại (Lower Nape Volume)
      const hairNape = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.22, 0.22, 24, 1, false, Math.PI * 0.72, Math.PI * 1.56),
        hairMat
      );
      hairNape.position.set(0, -0.12, -0.09);
      hairNape.rotation.x = 0.24;
      hairNape.castShadow = true;
      hairGroup.add(hairNape);

      // 7.4. Tóc Mái 3D Điêu Khắc Nguyên Khối Ôm Trán (Procedural Sculpted Anime Bangs)
      const bangsMesh = new THREE.Mesh(
        createSculptedAnimeBangsGeometry(this.gender === "female"),
        hairMat
      );
      bangsMesh.castShadow = true;
      hairGroup.add(bangsMesh);

      if (this.gender === "female") {
        // TÍN NỮ: SONG HOÀN KẾ & TRÂM CÀI SEN HỒNG
        [-0.20, 0.20].forEach((bx) => {
          const bunRoot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.082, 0.052, 0.08, 16),
            hairMat
          );
          bunRoot.position.set(bx, 0.25, 0.02);
          bunRoot.rotation.z = bx > 0 ? -0.48 : 0.48;
          hairGroup.add(bunRoot);

          const bun = new THREE.Mesh(
            new THREE.SphereGeometry(0.115, 20, 16),
            hairMat
          );
          bun.position.set(bx * 1.16, 0.30, 0.02);
          bun.scale.set(1.10, 0.94, 1.05);
          bun.castShadow = true;
          hairGroup.add(bun);

          const ribbonWrap = new THREE.Mesh(
            new THREE.TorusGeometry(0.076, 0.018, 10, 24),
            redMat
          );
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

        // Lọn tóc dài tha thướt buông trước ngực
        [-0.20, 0.20].forEach((tx) => {
          const tress = new THREE.Mesh(
            new THREE.CylinderGeometry(0.028, 0.010, 0.30, 8),
            hairMat
          );
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
          const hairpinLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.018, 0.01), leafGreenMat);
          hairpinLeaf.position.set(Math.cos(la) * 0.040, Math.sin(la) * 0.040, 0.01);
          hairpinLeaf.rotation.z = la;
          hairpinGroup.add(hairpinLeaf);
        });

        [-0.32, 0.32].forEach((ex) => {
          const earringHook = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.024, 6), goldMat);
          earringHook.position.set(ex, -0.06, 0.02);
          hairGroup.add(earringHook);

          const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), pearlMat);
          pearl.position.set(ex, -0.09, 0.02);
          hairGroup.add(pearl);
        });
      } else {
        // THIỆN NAM: ĐẠO ĐỒNG / THƯ SINH
        const topknotBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.085, 0.052, 0.08, 14),
          hairMat
        );
        topknotBase.position.set(0, 0.31, 0.01);
        hairGroup.add(topknotBase);

        const topknot = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 14), hairMat);
        topknot.position.set(0, 0.38, 0.01);
        topknot.scale.set(0.96, 1.12, 0.96);
        topknot.castShadow = true;
        hairGroup.add(topknot);

        const hairRibbon = new THREE.Mesh(
          new THREE.TorusGeometry(0.078, 0.018, 8, 20),
          redMat
        );
        hairRibbon.position.set(0, 0.33, 0.01);
        hairRibbon.rotation.x = Math.PI / 2;
        hairGroup.add(hairRibbon);

        const hairpinStick = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.007, 0.25, 8),
          goldMat
        );
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
      // 7B. TĂNG ĐOÀN ĐÃ XUỐNG TÓC ĐI TU (Monastic Ordained Head - CẠO ĐẦU HOÀN TOÀN)
      // Nhân vật mất tóc, đầu tròn thanh tịnh & có 6 chấm hương giới điệp thiêng liêng
      const monkHeadGroup = new THREE.Group();
      monkHeadGroup.position.set(0, 0.34, 0);
      this.headGroup.add(monkHeadGroup);

      const markMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffd700,
        emissiveIntensity: 1.5,
      });

      // 6 Chấm hương giới điệp trên đỉnh đầu (2 hàng x 3 cột)
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

    // ==========================================
    // 8. BÓNG ĐỔ MẶT ĐẤT
    // ==========================================
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 });
    const groundShadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), shadowMat);
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.position.y = 0.02;
    this.avatarMeshRoot.add(groundShadow);
  }

  /**
   * Tạo Texture Khuôn Mặt Chibi 2048x1024 Sắc Nét, Lấp Lánh & Đáng Yêu
   */
  private createExpressiveFaceTexture(gender: PlayerGender = this.gender): THREE.CanvasTexture {
    return createExpressiveFaceTexture(gender);
  }

  // ─────────────────────────────────────────────
  // NAMETAG & HÀO QUANG THIỀN ĐỊNH
  // ─────────────────────────────────────────────
  public isAbbot: boolean = false;
  public seniorRank: number = 0; // 2 -> 13: 12 Vị Cao Tăng
  public playerName: string = "Đạo Hữu An Nhiên";

  public get name(): string {
    return this.playerName;
  }

  public ordainAsMonk(dharmaName: string, robeColor: number = 0xd97706) {
    this.isMonk = true;
    this.dharmaName = dharmaName;
    this.playerName = dharmaName;
    this.robeColor = robeColor;
    try {
      localStorage.setItem("chua_an_lac_is_monk", "true");
      localStorage.setItem("chua_an_lac_dharma_name", dharmaName);
      localStorage.setItem("chua_an_lac_name", dharmaName);
      localStorage.setItem("chua_an_lac_robe_color", robeColor.toString(16));
    } catch (e) {
      console.warn("Could not save ordination info", e);
    }
    this.rebuildAvatar();
    this.createNameTag(dharmaName);
  }

  public setIsAbbot(isAbbot: boolean) {
    if (this.isAbbot === isAbbot) return;
    this.isAbbot = isAbbot;
    this.createNameTag(this.playerName);
    if (this.auraRing) {
      if (this.isAbbot) {
        (this.auraRing.material as THREE.MeshBasicMaterial).opacity = 0.65;
        (this.auraRing.material as THREE.MeshBasicMaterial).color.setHex(0xffd700);
      } else if (this.seniorRank >= 2 && this.seniorRank <= 13) {
        (this.auraRing.material as THREE.MeshBasicMaterial).opacity = 0.50;
        (this.auraRing.material as THREE.MeshBasicMaterial).color.setHex(0xf39c12);
      } else if (this.action === "idle") {
        (this.auraRing.material as THREE.MeshBasicMaterial).opacity = 0.0;
      }
    }
  }

  public setSeniorRank(rank: number) {
    if (this.seniorRank === rank) return;
    this.seniorRank = rank;
    this.createNameTag(this.playerName);
    if (this.auraRing && !this.isAbbot) {
      if (this.seniorRank >= 2 && this.seniorRank <= 13) {
        (this.auraRing.material as THREE.MeshBasicMaterial).opacity = 0.50;
        (this.auraRing.material as THREE.MeshBasicMaterial).color.setHex(0xf39c12);
      } else if (this.action === "idle") {
        (this.auraRing.material as THREE.MeshBasicMaterial).opacity = 0.0;
      }
    }
  }

  public createNameTag(name: string) {
    this.playerName = name;
    if (this.nameTag) {
      this.group.remove(this.nameTag);
    }

    const isSenior = !this.isAbbot && this.seniorRank >= 2 && this.seniorRank <= 13;
    const isMonkTag = !this.isAbbot && !isSenior && (this.isMonk || name.startsWith("Thích "));
    const isDoubleLine = this.isAbbot || isSenior || isMonkTag;

    const canvas = document.createElement("canvas");
    // Tăng gấp đôi độ phân giải (Supersampling 2x) để chữ sắc nét tuyệt đối trên màn hình Retina / iPhone / Android
    const scaleFactor = 2;
    canvas.width = 380 * scaleFactor;
    canvas.height = (isDoubleLine ? 96 : 64) * scaleFactor;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scaleFactor, scaleFactor);

    if (this.isAbbot) {
      // 1. Nền vàng kim hoàng gia trang nghiêm cho Trụ Trì
      ctx.fillStyle = "rgba(18, 14, 8, 0.95)";
      ctx.beginPath();
      ctx.roundRect(4, 4, 372, 88, 18);
      ctx.fill();

      // Viền kép ánh kim
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 235, 150, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(8, 8, 364, 80);

      // Danh hiệu Trụ Trì
      ctx.font = "bold 20px 'Be Vietnam Pro', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd700";
      ctx.fillText("👑 HÒA THƯỢNG TRỤ TRÌ", 190, 34);

      // Tên đạo hữu
      ctx.font = "bold 26px 'Be Vietnam Pro', sans-serif";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#000000";
      ctx.strokeText(name, 190, 72);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(name, 190, 72);
    } else if (isSenior) {
      // 2. Nền hổ phách sa-môn trang nhã cho 12 Vị Cao Tăng
      ctx.fillStyle = "rgba(26, 16, 8, 0.95)";
      ctx.beginPath();
      ctx.roundRect(4, 4, 372, 88, 18);
      ctx.fill();

      // Viền hổ phách viền vàng cam
      ctx.strokeStyle = "#f39c12";
      ctx.lineWidth = 3.2;
      ctx.stroke();

      ctx.strokeStyle = "rgba(254, 215, 120, 0.55)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(8, 8, 364, 80);

      // Danh hiệu Cao Tăng
      const seniorTitle =
        this.seniorRank === 2
          ? "🪷 ĐỆ NHẤT CAO TĂNG"
          : this.seniorRank === 3
            ? "🪷 ĐỆ NHỊ CAO TĂNG"
            : this.seniorRank === 4
              ? "🪷 ĐỆ TAM CAO TĂNG"
              : `🪷 CAO TĂNG HẠNG #${this.seniorRank}`;

      ctx.font = "bold 19px 'Be Vietnam Pro', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#f6ad55";
      ctx.fillText(seniorTitle, 190, 34);

      // Tên đạo hữu
      ctx.font = "bold 26px 'Be Vietnam Pro', sans-serif";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#000000";
      ctx.strokeText(name, 190, 72);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(name, 190, 72);
    } else if (isMonkTag) {
      // 2.5 Nền sa-môn hoàng y cho Tăng Ni Xuất Gia
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
      // 3. Nền tối thanh tịnh cho Phật Tử
      ctx.fillStyle = "rgba(10, 18, 14, 0.94)";
      ctx.beginPath();
      ctx.roundRect(4, 4, 372, 56, 16);
      ctx.fill();

      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.font = "bold 28px 'Be Vietnam Pro', sans-serif";
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
    this.nameTag = new THREE.Sprite(mat);
    this.nameTag.position.set(0, isDoubleLine ? 2.45 : 2.35, 0);
    this.nameTag.scale.set(isDoubleLine ? 2.05 : 1.8, isDoubleLine ? 0.52 : 0.36, 1);
    this.group.add(this.nameTag);
  }

  private createAura() {
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xf1c40f,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });
    this.auraRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.045, 12, 36), auraMat);
    this.auraRing.position.set(0, 0.45, 0);
    this.auraRing.rotation.x = Math.PI / 2;
    this.group.add(this.auraRing);
  }

  // ─────────────────────────────────────────────
  // CƠ CHẾ KIỂM TRA VA CHẠM & TRƯỢT VÁCH (COLLISION & SLIDING)
  // ─────────────────────────────────────────────
  public setCollisionChecker(checker: (x: number, z: number) => boolean) {
    this.collisionChecker = checker;
  }

  public tryMove(targetX: number, targetZ: number): boolean {
    if (!this.collisionChecker) {
      this.worldX = targetX;
      this.worldZ = targetZ;
      return true;
    }

    // 1. Thử đi thẳng cả X và Z
    if (!this.collisionChecker(targetX, targetZ)) {
      this.worldX = targetX;
      this.worldZ = targetZ;
      return true;
    }

    // 2. Trượt theo vách tường (Wall sliding): thử riêng trục X (giữ nguyên Z)
    const canMoveX = !this.collisionChecker(targetX, this.worldZ);
    // Thử riêng trục Z (giữ nguyên X)
    const canMoveZ = !this.collisionChecker(this.worldX, targetZ);

    if (canMoveX && !canMoveZ) {
      this.worldX = targetX;
      return true;
    } else if (!canMoveX && canMoveZ) {
      this.worldZ = targetZ;
      return true;
    } else if (canMoveX && canMoveZ) {
      // Cả 2 trục đều trượt được: ưu tiên trục có độ dịch chuyển lớn hơn
      const dx = Math.abs(targetX - this.worldX);
      const dz = Math.abs(targetZ - this.worldZ);
      if (dx >= dz) {
        this.worldX = targetX;
      } else {
        this.worldZ = targetZ;
      }
      return true;
    }

    // Bị chặn hoàn toàn
    return false;
  }

  // ─────────────────────────────────────────────
  // CẬP NHẬT MỖI FRAME (ANIMATION & PHYSICS)
  // ─────────────────────────────────────────────
  public update(dt: number) {
    this.breathClock += dt;
    this.actionClock += dt;

    // 1. Xử lý di chuyển tới điểm đích (Click-to-Move)
    if (this.isNavigatingToTarget) {
      const dx = this.targetX - this.worldX;
      const dz = this.targetZ - this.worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.15) {
        this.worldX = this.targetX;
        this.worldZ = this.targetZ;
        this.isNavigatingToTarget = false;
        this.isMoving = false;
        this.action = "idle";
      } else {
        const step = Math.min(this.moveSpeed * dt, dist);
        const nextX = this.worldX + (dx / dist) * step;
        const nextZ = this.worldZ + (dz / dist) * step;

        const moved = this.tryMove(nextX, nextZ);
        if (!moved) {
          // Gặp vách tường hoặc vật cản không thể đi tiếp: dừng lại an toàn
          this.stopMoving();
        } else {
          this.facingAngle = Math.atan2(dx, dz);
          this.isMoving = true;
          this.action = "walk";
        }
      }
    }

    // Giảm tốc độ quay hướng của nhân vật: chậm rãi, từ tốn, uyển chuyển chốn thiền môn
    let rotDiff = (this.facingAngle - this.group.rotation.y) % (Math.PI * 2);
    if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;

    const turnRate = this.isMoving
      ? Math.min(1.0, dt * 2.0)
      : Math.min(1.0, dt * 1.4);
    this.group.rotation.y += rotDiff * turnRate;

    // Cập nhật cao độ mặt đất mượt mà (tránh giật cục khi bước lên bậc tam cấp hoặc sàn chính điện)
    const groundH = this.getGroundHeight(this.worldX, this.worldZ);
    const effectiveTargetY = Math.max(groundH, this.targetY);
    this.worldY = THREE.MathUtils.lerp(this.worldY, effectiveTargetY, 0.22);

    // Cập nhật tọa độ thế giới (bao gồm cả cao độ Y chính xác)
    this.group.position.set(this.worldX, this.worldY, this.worldZ);

    // 2. Chạy Animation theo trạng thái
    this.runAnimations(dt);
  }

  private runAnimations(dt: number) {
    switch (this.action) {
      case "walk":
        this.animateWalk(dt);
        break;
      case "meditate":
        this.animateMeditate();
        break;
      case "pray":
        this.animatePray();
        break;
      case "wave":
        this.animateWave(dt);
        break;
      case "bell":
        this.animateRingBell(dt);
        break;
      case "wooden_fish":
        this.animateWoodenFish(dt);
        break;
      case "sweep":
        this.animateSweep(dt);
        break;
      case "idle":
      default:
        this.animateIdle();
        break;
    }
  }

  // ─────────────────────────────────────────────
  // ĐỘNG TÁC ĐI BỘ (SẢI BƯỚC + NHÚN + VẠT ÁO BAY)
  // ─────────────────────────────────────────────
  private animateWalk(dt: number) {
    this.walkClock += dt * 9.2;
    const t = this.walkClock;

    (this.auraRing.material as THREE.MeshBasicMaterial).opacity *= 0.85;

    // 1. Chân sải bước rộng dứt khoát
    const legSwing = Math.sin(t) * 0.75;
    this.leftLegGroup.rotation.set(legSwing, 0, 0);
    this.rightLegGroup.rotation.set(-legSwing, 0, 0);

    // 2. Tay vung tự nhiên đối xứng chân
    const armSwing = Math.sin(t) * 0.65;
    this.leftArmGroup.rotation.x = -armSwing;
    this.leftArmGroup.rotation.z = 0.08;
    this.rightArmGroup.rotation.x = armSwing;
    this.rightArmGroup.rotation.z = -0.08;

    // 3. Cơ thể nhún lên xuống (Bobbing)
    const bounce = Math.abs(Math.sin(t)) * 0.06;
    this.pelvisGroup.position.y = 0.42 + bounce;

    // 4. Thân trên hơi chúi về phía trước và lắc lư nhẹ
    this.torsoGroup.rotation.x = 0.12;
    this.torsoGroup.rotation.z = Math.sin(t) * 0.05;

    // 5. Vạt áo tràng đung đưa theo bước chân
    this.skirtGroup.rotation.x = -Math.sin(t) * 0.15;
    this.skirtGroup.rotation.z = Math.cos(t) * 0.08;

    // 6. Đầu gật gù nhẹ
    this.headGroup.rotation.x = Math.sin(t * 2) * 0.04;
    this.headGroup.rotation.z = -Math.sin(t) * 0.03;
  }

  // ─────────────────────────────────────────────
  // ĐỘNG TÁC ĐỨNG YÊN THỞ NHẸ (IDLE BREATH)
  // ─────────────────────────────────────────────
  private animateIdle() {
    const t = this.breathClock * 2.2;

    this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0, 0.15);
    this.leftLegGroup.rotation.y = THREE.MathUtils.lerp(this.leftLegGroup.rotation.y, 0, 0.15);
    this.leftLegGroup.rotation.z = THREE.MathUtils.lerp(this.leftLegGroup.rotation.z, 0, 0.15);

    this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, 0, 0.15);
    this.rightLegGroup.rotation.y = THREE.MathUtils.lerp(this.rightLegGroup.rotation.y, 0, 0.15);
    this.rightLegGroup.rotation.z = THREE.MathUtils.lerp(this.rightLegGroup.rotation.z, 0, 0.15);
    this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, 0, 0.15);
    this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, 0, 0.15);
    this.leftArmGroup.rotation.z = THREE.MathUtils.lerp(this.leftArmGroup.rotation.z, 0.06, 0.15);
    this.rightArmGroup.rotation.z = THREE.MathUtils.lerp(this.rightArmGroup.rotation.z, -0.06, 0.15);
    this.torsoGroup.rotation.x = THREE.MathUtils.lerp(this.torsoGroup.rotation.x, 0, 0.15);
    this.torsoGroup.rotation.z = THREE.MathUtils.lerp(this.torsoGroup.rotation.z, 0, 0.15);
    this.skirtGroup.rotation.set(0, 0, 0);

    (this.auraRing.material as THREE.MeshBasicMaterial).opacity *= 0.88;

    // Nhịp thở an nhiên
    const breathY = Math.sin(t) * 0.018;
    this.pelvisGroup.position.y = 0.42 + breathY;
    this.torsoGroup.scale.set(1 + Math.sin(t) * 0.015, 1 + breathY * 0.4, 1 + Math.sin(t) * 0.015);

    this.headGroup.rotation.x = Math.sin(t * 0.5) * 0.025;
    this.headGroup.rotation.y = Math.sin(t * 0.3) * 0.04;
  }

  // ─────────────────────────────────────────────
  // ĐỘNG TÁC THIỀN KIẾT GIÀ (MEDITATE)
  // ─────────────────────────────────────────────
  private animateMeditate() {
    this.pelvisGroup.position.y = THREE.MathUtils.lerp(this.pelvisGroup.position.y, 0.18, 0.12);

    this.leftLegGroup.rotation.set(-Math.PI / 2 + 0.1, 0.4, 0.28);
    this.rightLegGroup.rotation.set(-Math.PI / 2 + 0.1, -0.4, -0.28);

    // Kết ấn thiền định (Dhyana Mudra)
    this.leftArmGroup.rotation.set(0.7, 0.45, -0.42);
    this.rightArmGroup.rotation.set(0.7, -0.45, 0.42);

    this.torsoGroup.rotation.set(0, 0, 0);
    this.headGroup.rotation.set(0.18, 0, 0);

    const auraMat = this.auraRing.material as THREE.MeshBasicMaterial;
    auraMat.opacity = THREE.MathUtils.lerp(auraMat.opacity, 0.7, 0.06);
    this.auraRing.rotation.z += 0.008;
    this.auraRing.position.y = 0.5 + Math.sin(this.breathClock * 1.5) * 0.04;
  }

  // ─────────────────────────────────────────────
  // ĐỘNG TÁC BÁI PHẬT (PRAY / ANJALI)
  // ─────────────────────────────────────────────
  private animatePray() {
    this.pelvisGroup.position.y = 0.42;
    this.leftLegGroup.rotation.set(0, 0, 0);
    this.rightLegGroup.rotation.set(0, 0, 0);

    // Chắp tay búp sen trước ngực
    this.leftArmGroup.rotation.set(-1.15, 0.55, 0.32);
    this.rightArmGroup.rotation.set(-1.15, -0.55, -0.32);

    // Thân và đầu cúi lạy thành kính
    const bowCycle = Math.sin(this.actionClock * 2.5) * 0.22 + 0.16;
    this.torsoGroup.rotation.x = Math.max(0, bowCycle);
    this.headGroup.rotation.x = Math.max(0, bowCycle * 1.25);
  }

  // ─────────────────────────────────────────────
  // ĐỘNG TÁC VẪY TAY CHÀO (WAVE)
  // ─────────────────────────────────────────────
  private animateWave(dt: number) {
    this.walkClock += dt * 10;
    this.pelvisGroup.position.y = 0.42;

    this.leftArmGroup.rotation.set(0, 0, 0.06);

    this.rightArmGroup.rotation.x = -1.65;
    this.rightArmGroup.rotation.z = -1.15 + Math.sin(this.walkClock) * 0.38;

    this.headGroup.rotation.z = -0.15;
    this.headGroup.rotation.x = 0.05;
  }

  // ─────────────────────────────────────────────
  // ĐỘNG TÁC THỈNH CHUÔNG & GÕ MÕ
  // ─────────────────────────────────────────────
  private animateRingBell(dt: number) {
    this.walkClock += dt * 5;
    const thrust = Math.sin(this.walkClock) * 0.4;
    this.leftArmGroup.rotation.set(-0.8 + thrust, 0.2, 0);
    this.rightArmGroup.rotation.set(-0.8 + thrust, -0.2, 0);
    this.torsoGroup.rotation.x = Math.max(0, thrust * 0.3);
  }

  private animateWoodenFish(dt: number) {
    this.walkClock += dt * 14;

    // Ngồi thiền kiết già trang nghiêm trên bồ đoàn / pháp tòa
    this.pelvisGroup.position.y = THREE.MathUtils.lerp(this.pelvisGroup.position.y, 0.18, 0.15);
    this.leftLegGroup.rotation.set(-Math.PI / 2 + 0.1, 0.4, 0.28);
    this.rightLegGroup.rotation.set(-Math.PI / 2 + 0.1, -0.4, -0.28);
    this.torsoGroup.rotation.set(0.04, 0, 0);
    this.headGroup.rotation.set(0.12, 0, 0);

    // Tay trái ôm giữ mõ gỗ mít trên đùi
    this.leftArmGroup.rotation.set(-0.72, 0.38, 0.12);
    // Tay phải cầm dùi mõ gõ nhịp nhàng
    const tap = Math.sin(this.walkClock) * 0.32;
    this.rightArmGroup.rotation.set(-0.76 + tap, -0.26, -0.12);

    const auraMat = this.auraRing.material as THREE.MeshBasicMaterial;
    auraMat.opacity = THREE.MathUtils.lerp(auraMat.opacity, 0.45, 0.05);
    this.auraRing.rotation.z += 0.006;
  }

  // ─────────────────────────────────────────────
  // ĐỘNG TÁC QUÉT SÂN CHÙA (SWEEP)
  // ─────────────────────────────────────────────
  private animateSweep(dt: number) {
    this.walkClock += dt * 5.2;
    this.pelvisGroup.position.y = 0.40;
    this.leftLegGroup.rotation.set(-0.1, 0, 0);
    this.rightLegGroup.rotation.set(-0.06, 0, 0);

    // Thân hơi cúi về phía trước, xoay nhịp nhàng từ trái qua phải
    const sweep = Math.sin(this.walkClock);
    this.torsoGroup.rotation.x = 0.26;
    this.torsoGroup.rotation.y = sweep * 0.28;
    this.torsoGroup.rotation.z = sweep * 0.08;

    this.headGroup.rotation.x = 0.22;
    this.headGroup.rotation.y = sweep * 0.22;

    // Hai tay cầm chổi tre quét lia qua lia lại
    this.leftArmGroup.rotation.set(-0.78 + sweep * 0.16, 0.40 + sweep * 0.22, 0.18);
    this.rightArmGroup.rotation.set(-0.88 + sweep * 0.20, -0.30 + sweep * 0.22, -0.18);

    if (this.broomGroup) {
      this.broomGroup.visible = true;
      this.broomGroup.position.set(sweep * 0.14, -0.06, 0.32);
      this.broomGroup.rotation.set(-0.46, sweep * 0.15, sweep * 0.28);
    }
  }

  // ─────────────────────────────────────────────
  // ĐIỀU KHIỂN VẬN HÀNH
  // ─────────────────────────────────────────────
  public resetPose() {
    if (this.broomGroup) {
      this.broomGroup.visible = false;
    }
    this.leftLegGroup.rotation.set(0, 0, 0);
    this.rightLegGroup.rotation.set(0, 0, 0);
    this.leftArmGroup.rotation.set(0, 0, 0.06);
    this.rightArmGroup.rotation.set(0, 0, -0.06);
    this.torsoGroup.rotation.set(0, 0, 0);
    this.headGroup.rotation.set(0, 0, 0);
    this.pelvisGroup.position.set(0, 0.42, 0);
    this.skirtGroup.rotation.set(0, 0, 0);
    this.auraRing.position.set(0, 0.45, 0);
    this.auraRing.scale.set(1, 1, 1);
  }

  public moveByDirectionVector(moveDir: THREE.Vector3, dt: number) {
    if (moveDir.lengthSq() < 0.0001) {
      if (this.action === "walk" && !this.isNavigatingToTarget) {
        this.stopMoving();
      }
      return;
    }

    this.targetY = 0; // Hủy độ cao bồ đoàn khi bắt đầu di chuyển
    const norm = moveDir.clone().normalize();
    const nextX = this.worldX + norm.x * this.moveSpeed * dt;
    const nextZ = this.worldZ + norm.z * this.moveSpeed * dt;

    const moved = this.tryMove(nextX, nextZ);
    this.facingAngle = Math.atan2(norm.x, norm.z);
    this.direction = norm.x < 0 ? "left" : "right";

    if (moved) {
      this.isMoving = true;
      this.isNavigatingToTarget = false;
      if (this.action !== "walk") {
        this.setAction("walk");
      }
    } else {
      this.stopMoving();
    }
  }

  public moveTo(x: number, z: number) {
    this.targetY = 0; // Hủy độ cao bồ đoàn khi di chuyển
    this.targetX = x;
    this.targetZ = z;
    this.isNavigatingToTarget = true;
    this.isMoving = true;
    this.setAction("walk");
  }

  public stopMoving() {
    this.isMoving = false;
    this.isNavigatingToTarget = false;
    if (this.action === "walk") {
      this.setAction("idle");
    }
  }

  public setAction(action: PlayerAction) {
    if (this.action !== action) {
      this.resetPose();
      this.action = action;
      this.actionClock = 0;
    }
  }

  public setRobeColor(color: number) {
    this.robeColor = color;
    try {
      localStorage.setItem("chua_an_lac_robe_color", "0x" + color.toString(16));
    } catch (e) {
      console.warn("Could not save robe color to localStorage", e);
    }
    if (this.robeMat) {
      this.robeMat.color.setHex(color);
    }
  }

  /**
   * Dịch chuyển nhân vật tức thời
   * @param x Tọa độ X
   * @param z Tọa độ Z
   * @param y Cao độ Y (tùy chọn, mặc định lấy theo địa hình)
   * @param facing Hướng xoay góc nhìn nhân vật (radian)
   */
  public teleportTo(x: number, z: number, y?: number, facing?: number) {
    this.worldX = x;
    this.worldZ = z;
    this.targetX = x;
    this.targetZ = z;
    const groundH = this.getGroundHeight(x, z);
    this.worldY = y !== undefined ? y : groundH;
    this.targetY = this.worldY;
    if (facing !== undefined) {
      this.facingAngle = facing;
      this.group.rotation.y = facing;
    }
    this.group.position.set(this.worldX, this.worldY, this.worldZ);
    this.isMoving = false;
    this.isNavigatingToTarget = false;
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }
}
