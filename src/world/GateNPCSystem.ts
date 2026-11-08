/**
 * GateNPCSystem.ts - Hệ thống NPC Đón Tiếp & Tri Khách Trước Cổng Chùa An Lạc
 * 
 * - Chú Tiểu An Nhiên (Tiếp Dẫn Chùa An Lạc): Chắp tay hoa sen bái chào, áo tràng lam thanh tịnh, chỏm tóc trái đào.
 * - Chú Tiểu Hoan Hỷ (Tri Khách Thiền Tự): Nụ cười hoan hỷ vô lượng, áo tràng nâu sồng mộc mạc, đầu cạo 3 chấm hương giới điệp.
 * - Nametag 3D cao cấp, hoạt ảnh thở nhẹ nhàng, theo dõi hướng nhìn của người chơi và cúi chào cung kính.
 * - Tương tác khi click hoặc khi đi lại gần: phát chuông khánh thiền, hiện bong bóng thoại (Speech Bubble), ghi vào nhật ký đàm luận, tặng Giọt Cam Lồ chúc phúc!
 */

import * as THREE from "three";
import { SpeechBubbleManager } from "./SpeechBubble";
import { GameUI } from "../ui/GameUI";
import { zenAudio } from "../utils/audio";
import { dailyActivities } from "../utils/dailyActivities";
import { authService } from "../services/authService";

interface GateNPC {
  id: "annhien" | "hoanhy" | "tritue" | "trigiac" | "tinhtam";
  name: string;
  title: string;
  group: THREE.Group;
  headGroup: THREE.Group;
  torsoGroup: THREE.Group;
  pelvisGroup: THREE.Group;
  speechAnchor: THREE.Group;
  basePos: THREE.Vector3;
  baseRotY: number;
  lastGreetTime: number;
  bowProgress: number; // 0 (thẳng) -> 1 (cúi bái chào)
  isBowing: boolean;
  bowEndTime: number;
  dialogueIndex: number;
  dialogues: string[];
}

export class GateNPCSystem {
  public group: THREE.Group;
  public interactableMeshes: THREE.Object3D[] = [];
  private npcs: GateNPC[] = [];
  private speechBubbles: SpeechBubbleManager;
  private gameUI: GameUI;
  public onOrdainRequestCb?: () => void;
  public onQuestRequestCb?: () => void;

  constructor(scene: THREE.Scene, speechBubbles: SpeechBubbleManager, gameUI: GameUI) {
    this.speechBubbles = speechBubbles;
    this.gameUI = gameUI;
    this.group = new THREE.Group();
    scene.add(this.group);

    this.createNPCs();
  }

  public setOnOrdainRequest(cb: () => void) {
    this.onOrdainRequestCb = cb;
  }

  public setOnQuestRequest(cb: () => void) {
    this.onQuestRequestCb = cb;
  }

  private createNPCs() {
    // 🌸 1. Chú Tiểu An Nhiên (Bên trái cổng chùa, x = -2.3, z = 27.2, mặt hướng ra ngoài đón khách)
    const npcAnNhien = this.buildAnNhienNPC(-2.3, 0.0, 27.2, 0.16);
    this.npcs.push(npcAnNhien);
    this.group.add(npcAnNhien.group);

    // 🪷 2. Chú Tiểu Hoan Hỷ (Bên phải cổng chùa, x = 2.3, z = 27.2, mặt hướng ra ngoài đón khách)
    const npcHoanHy = this.buildHoanHyNPC(2.3, 0.0, 27.2, -0.16);
    this.npcs.push(npcHoanHy);
    this.group.add(npcHoanHy.group);

    // 🔔 3. Chú Tiểu Trí Tuệ (Người Giữ Đại Hồng Chung bên cạnh thềm Lầu Chuông)
    const npcTriTue = this.buildTriTueNPC(-7.4, 0.0, -7.5, -0.45);
    this.npcs.push(npcTriTue);
    this.group.add(npcTriTue.group);

    // 🪷 4. Hòa Thượng Thích Trí Giác (Bậc Trưởng Lão Thụ Giới bên trong Đại Hùng Bảo Điện)
    // Tọa độ tôn nghiêm tại Tiền Điện: x = 5.2, y = 0.65, z = -32.2 (cách xa toàn bộ hàng bồ đoàn Phật tử >4.2m, đứng giữa Pháp Tòa Trụ Trì và Pháp Tòa Cao Tăng)
    const npcTriGiac = this.buildTriGiacNPC(5.2, 0.65, -32.2, Math.PI - 0.28);
    this.npcs.push(npcTriGiac);
    this.group.add(npcTriGiac.group);

    // 🌿 5. Chú Tiểu Tịnh Tâm (Người Quản Lý Vườn An Lạc & Chấp Tác Công Quả)
    // Đứng tại lối vào Vườn An Lạc (gần Cổng Tam Quan, trước Hồ Sen): x = 6.2, y = 0.0, z = 15.5, mặt hướng ra trục đường chính
    const npcTinhTam = this.buildTinhTamNPC(6.2, 0.0, 15.5, -Math.PI / 2 + 0.15);
    this.npcs.push(npcTinhTam);
    this.group.add(npcTinhTam.group);
  }

  // ─────────────────────────────────────────────
  // XÂY DỰNG CHÚ TIỂU AN NHIÊN (TIẾP DẪN CHÙA AN LẠC)
  // ─────────────────────────────────────────────
  private buildAnNhienNPC(x: number, y: number, z: number, rotY: number): GateNPC {
    const root = new THREE.Group();
    root.position.set(x, y, z);
    root.rotation.y = rotY;

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe8d6, roughness: 0.62, metalness: 0.04 });
    const blueRobeMat = new THREE.MeshStandardMaterial({ color: 0x486b92, roughness: 0.55, metalness: 0.08 });
    const whiteCollarMat = new THREE.MeshStandardMaterial({ color: 0xfdfefe, roughness: 0.5 });
    const yellowSashMat = new THREE.MeshStandardMaterial({ color: 0xf4d03f, roughness: 0.45, metalness: 0.1 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1512, roughness: 0.35, metalness: 0.06 });
    const redRibbonMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.45 });
    const beadWoodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.4, metalness: 0.15 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x2b1e16, roughness: 0.7 });

    // Khớp hông & thân
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.42, 0);
    root.add(pelvis);

    // Chân & Giày
    [-0.11, 0.11].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.36, 12), blueRobeMat);
      leg.position.set(lx, -0.18, 0);
      leg.castShadow = true;
      pelvis.add(leg);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.18), shoeMat);
      shoe.position.set(lx, -0.36, 0.03);
      shoe.castShadow = true;
      pelvis.add(shoe);

      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.02, 0.186), whiteCollarMat);
      sole.position.set(lx, -0.40, 0.03);
      pelvis.add(sole);
    });

    // Thân áo tràng lam (Váy áo chữ A phủ chân)
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.31, 0.42, 16), blueRobeMat);
    skirt.position.set(0, -0.16, 0);
    skirt.castShadow = true;
    pelvis.add(skirt);

    // Thân trên (Torso)
    const torso = new THREE.Group();
    torso.position.set(0, 0.04, 0);
    pelvis.add(torso);

    const upperRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.36, 16), blueRobeMat);
    upperRobe.position.set(0, 0.22, 0);
    upperRobe.castShadow = true;
    torso.add(upperRobe);

    // Đai lưng vải vàng hổ phách
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.075, 16), yellowSashMat);
    sash.position.set(0, 0.05, 0);
    torso.add(sash);

    // Nơ thắt lưng & dải ruy băng
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), yellowSashMat);
    knot.position.set(0, 0.05, 0.22);
    torso.add(knot);

    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.012), yellowSashMat);
    ribbon.position.set(0, -0.06, 0.22);
    torso.add(ribbon);

    // Cổ áo trắng bên trong
    const innerCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.115, 0.10, 12), whiteCollarMat);
    innerCollar.position.set(0, 0.40, 0.08);
    innerCollar.rotation.x = 0.2;
    torso.add(innerCollar);

    // Chuỗi tràng hạt bồ đề 108 hạt quấn quanh cổ
    const mala = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 8, 24), beadWoodMat);
    mala.position.set(0, 0.30, 0.14);
    mala.rotation.x = Math.PI / 3.2;
    torso.add(mala);

    // Đôi tay chắp hoa sen trước ngực (Anjali Mudra / Liên Hoa Hợp Chưởng)
    const armsGroup = new THREE.Group();
    torso.add(armsGroup);

    [-1, 1].forEach((dir) => {
      // Ống tay áo thụng
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.28, 12), blueRobeMat);
      sleeve.position.set(dir * 0.16, 0.26, 0.10);
      sleeve.rotation.set(-0.6, 0, -dir * 0.45);
      sleeve.castShadow = true;
      armsGroup.add(sleeve);

      // Cẳng tay hướng lên chắp vào ngực
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.18, 10), skinMat);
      forearm.position.set(dir * 0.08, 0.28, 0.22);
      forearm.rotation.set(-1.1, 0, -dir * 0.35);
      armsGroup.add(forearm);
    });

    // Bàn tay chắp búp sen chính giữa ngực
    const handsJoined = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 8), skinMat);
    handsJoined.position.set(0, 0.34, 0.26);
    handsJoined.rotation.x = -0.3;
    armsGroup.add(handsJoined);

    // Đầu & Mặt
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.48, 0);
    torso.add(headGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 12), skinMat);
    neck.position.set(0, 0.05, 0);
    headGroup.add(neck);

    // Mặt Chibi Anime đáng yêu của Chú Tiểu An Nhiên
    const faceTex = this.createAnNhienFaceTexture();
    const headMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6, metalness: 0.04 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 24), headMat);
    head.position.set(0, 0.34, 0);
    head.castShadow = true;
    head.name = "npc_gate_annhien";
    headGroup.add(head);
    this.interactableMeshes.push(head);

    // Hai tai nhỏ xinh xắn
    [-0.32, 0.32].forEach((tx) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
      ear.position.set(tx, 0.33, 0.02);
      ear.scale.set(0.45, 0.9, 0.7);
      headGroup.add(ear);
    });

    // MÁI TÓC CHỎM TRÁI ĐÀO CHIBI DỄ THƯƠNG
    const hairGroup = new THREE.Group();
    hairGroup.position.set(0, 0.34, 0);
    headGroup.add(hairGroup);

    // Vòm tóc tròn đỉnh đầu
    const topCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.32),
      hairMat
    );
    hairGroup.add(topCap);

    // Tóc sau gáy
    const nape = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 12, 0, Math.PI * 2, Math.PI * 0.40, Math.PI * 0.45),
      hairMat
    );
    nape.position.set(0, -0.06, -0.06);
    hairGroup.add(nape);

    // Búi tóc chỏm trái đào trên đỉnh đầu
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.088, 14, 12), hairMat);
    bun.position.set(0, 0.37, 0.02);
    bun.scale.set(1.15, 0.9, 1.15);
    hairGroup.add(bun);

    // Dây nơ đỏ son quấn quanh búi tóc
    const bowRibbon = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 16), redRibbonMat);
    bowRibbon.position.set(0, 0.34, 0.02);
    bowRibbon.rotation.x = Math.PI / 2;
    hairGroup.add(bowRibbon);

    // Hai dải ruy băng đỏ rủ xuống sau gáy
    [-0.035, 0.035].forEach((rx) => {
      const streamer = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.22, 0.01), redRibbonMat);
      streamer.position.set(rx, 0.24, -0.10);
      streamer.rotation.set(0.35, 0, rx > 0 ? 0.2 : -0.2);
      hairGroup.add(streamer);
    });

    // Nametag 3D trên đầu
    const nameTag = this.createNPCSpriteNameTag("🌸 Chú Tiểu An Nhiên", "Tiếp Dẫn Chùa An Lạc", "#2e7d32", "#ffd54f");
    nameTag.position.set(0, 1.95, 0);
    root.add(nameTag);

    // Speech Anchor (Nơi bong bóng thoại xuất hiện)
    const speechAnchor = new THREE.Group();
    speechAnchor.position.set(0, -0.85, 0); // Bù trừ với SpeechBubble y=3.25 -> bóng thoại nổi ở y = 2.40m
    root.add(speechAnchor);

    // Bóng đổ tròn trên mặt đất
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);

    const dialogues = [
      "Nam Mô A Di Đà Phật! Con kính chào thiện nam tín nữ quang lâm Chùa An Lạc. Chúc bạn một ngày thân tâm thường an lạc, vạn sự hanh thông! 🙏",
      "A Di Đà Phật! Bước qua Cổng Tam Quan, kính mong đạo hữu buông xả muôn phiền não trần thế, giữ lòng thanh tịnh như hoa sen đầu hạ. 🌸",
      "Đạo hữu hãy ghé Hồ Sen thả một đóa hoa đăng gửi lời nguyện ước bình an, và sang Vườn An Lạc tưới nước cho búp sen nhé! 🪷",
      "Tâm an vạn sự an. Bình yên đến từ bên trong, đừng tìm kiếm ở bên ngoài. Chúc đạo hữu một ngày an lành cát tường! ✨",
      "Trong Chính Điện đang có khóa lễ chiêm bái Tam Thế Phật và 12 Pháp Tòa Cao Tăng. Mời đạo hữu cùng vào đảnh lễ! ☸"
    ];

    return {
      id: "annhien",
      name: "Chú Tiểu An Nhiên",
      title: "Tiếp Dẫn Chùa An Lạc",
      group: root,
      headGroup,
      torsoGroup: torso,
      pelvisGroup: pelvis,
      speechAnchor,
      basePos: new THREE.Vector3(x, y, z),
      baseRotY: rotY,
      lastGreetTime: 0,
      bowProgress: 0,
      isBowing: false,
      bowEndTime: 0,
      dialogueIndex: 0,
      dialogues
    };
  }

  // ─────────────────────────────────────────────
  // XÂY DỰNG CHÚ TIỂU HOAN HỶ (TRI KHÁCH THIỀN TỰ)
  // ─────────────────────────────────────────────
  private buildHoanHyNPC(x: number, y: number, z: number, rotY: number): GateNPC {
    const root = new THREE.Group();
    root.position.set(x, y, z);
    root.rotation.y = rotY;

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe8d6, roughness: 0.62, metalness: 0.04 });
    const brownRobeMat = new THREE.MeshStandardMaterial({ color: 0x784732, roughness: 0.6, metalness: 0.05 });
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xa0674f, roughness: 0.55 });
    const yellowSashMat = new THREE.MeshStandardMaterial({ color: 0xd4ac0d, roughness: 0.45, metalness: 0.1 });
    const beadWoodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.4, metalness: 0.2 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x241812, roughness: 0.7 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5 });

    // Khớp hông & thân
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.42, 0);
    root.add(pelvis);

    // Chân & Giày
    [-0.11, 0.11].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.36, 12), brownRobeMat);
      leg.position.set(lx, -0.18, 0);
      leg.castShadow = true;
      pelvis.add(leg);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.18), shoeMat);
      shoe.position.set(lx, -0.36, 0.03);
      shoe.castShadow = true;
      pelvis.add(shoe);

      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.02, 0.186), whiteMat);
      sole.position.set(lx, -0.40, 0.03);
      pelvis.add(sole);
    });

    // Thân áo tràng nâu sồng
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.31, 0.42, 16), brownRobeMat);
    skirt.position.set(0, -0.16, 0);
    skirt.castShadow = true;
    pelvis.add(skirt);

    const torso = new THREE.Group();
    torso.position.set(0, 0.04, 0);
    pelvis.add(torso);

    const upperRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.36, 16), brownRobeMat);
    upperRobe.position.set(0, 0.22, 0);
    upperRobe.castShadow = true;
    torso.add(upperRobe);

    // Đai lưng vải vàng
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.075, 16), yellowSashMat);
    sash.position.set(0, 0.05, 0);
    torso.add(sash);

    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), yellowSashMat);
    knot.position.set(0, 0.05, 0.22);
    torso.add(knot);

    // Cổ áo chéo màu nâu nhạt
    const innerCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.115, 0.10, 12), collarMat);
    innerCollar.position.set(0, 0.40, 0.08);
    innerCollar.rotation.x = 0.2;
    torso.add(innerCollar);

    // Chuỗi tràng hạt bồ đề gỗ mun
    const mala = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 8, 24), beadWoodMat);
    mala.position.set(0, 0.30, 0.14);
    mala.rotation.x = Math.PI / 3.2;
    torso.add(mala);

    // TAY CỦA CHÚ TIỂU HOAN HỶ: Tay phải giơ lên vẫy chào vui tươi, tay trái chắp trước ngực
    const armsGroup = new THREE.Group();
    torso.add(armsGroup);

    // Tay trái chắp trước ngực
    const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.26, 12), brownRobeMat);
    leftSleeve.position.set(-0.16, 0.26, 0.08);
    leftSleeve.rotation.set(-0.55, 0, 0.45);
    armsGroup.add(leftSleeve);

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.17, 10), skinMat);
    leftForearm.position.set(-0.06, 0.28, 0.20);
    leftForearm.rotation.set(-1.05, 0, 0.35);
    armsGroup.add(leftForearm);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.02), skinMat);
    leftHand.position.set(-0.02, 0.33, 0.24);
    leftHand.rotation.set(-0.3, 0, 0.15);
    armsGroup.add(leftHand);

    // Tay phải giơ lên vẫy chào mừng
    const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.26, 12), brownRobeMat);
    rightSleeve.position.set(0.18, 0.32, 0.04);
    rightSleeve.rotation.set(0, 0, -1.1);
    armsGroup.add(rightSleeve);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.18, 10), skinMat);
    rightForearm.position.set(0.28, 0.44, 0.08);
    rightForearm.rotation.set(0.2, 0, -0.35);
    armsGroup.add(rightForearm);

    // Bàn tay mở đón chào
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), skinMat);
    rightHand.position.set(0.32, 0.54, 0.10);
    rightHand.scale.set(0.8, 1.2, 0.4);
    armsGroup.add(rightHand);

    // Đầu cạo tròn nhẵn với 3 chấm hương giới điệp trên đỉnh trán
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.48, 0);
    torso.add(headGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 12), skinMat);
    neck.position.set(0, 0.05, 0);
    headGroup.add(neck);

    // Texture nụ cười hoan hỷ tít mắt của Chú Tiểu Hoan Hỷ
    const faceTex = this.createHoanHyFaceTexture();
    const headMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6, metalness: 0.04 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 24), headMat);
    head.position.set(0, 0.34, 0);
    head.castShadow = true;
    head.name = "npc_gate_hoanhy";
    headGroup.add(head);
    this.interactableMeshes.push(head);

    // Hai tai
    [-0.32, 0.32].forEach((tx) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
      ear.position.set(tx, 0.33, 0.02);
      ear.scale.set(0.45, 0.9, 0.7);
      headGroup.add(ear);
    });

    // 3 Chấm hương giới điệp trên trán
    const dotMat = new THREE.MeshStandardMaterial({ color: 0x935116, roughness: 0.8 });
    [-0.045, 0, 0.045].forEach((dx) => {
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.015, 8), dotMat);
      dot.position.set(dx, 0.56, 0.20);
      dot.rotation.x = Math.PI / 4;
      headGroup.add(dot);
    });

    // Nametag 3D
    const nameTag = this.createNPCSpriteNameTag("🪷 Chú Tiểu Hoan Hỷ", "Tri Khách Thiền Tự", "#b9770e", "#f9e79f");
    nameTag.position.set(0, 1.95, 0);
    root.add(nameTag);

    // Speech Anchor
    const speechAnchor = new THREE.Group();
    speechAnchor.position.set(0, -0.85, 0);
    root.add(speechAnchor);

    // Bóng đổ
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);

    const dialogues = [
      "A Di Đà Phật! Hoan hỷ đón chào quý đạo hữu đến với cõi tịnh Chùa An Lạc! Nụ cười nở trên môi, an vui bước theo sau. 😊",
      "Đạo hữu đã thỉnh Đại Hồng Chung hôm nay chưa? Hãy lên Lầu Chuông gióng một hồi chuông để muôn ngàn ưu tư tan biến nhé! 🔔",
      "Trong Đại Hùng Bảo Điện có Tam Thế Phật từ bi gia hộ và 12 Pháp Tòa Cao Tăng. Mời đạo hữu vào chiêm bái và tọa thiền! 🧘",
      "Mỗi ngày làm một việc thiện, tâm hồn sẽ ngát hương như hoa sen nở giữa bùn lầy. Chúc đạo hữu luôn tràn ngập hỷ lạc! 🪷",
      "Hoa đăng trên hồ sen đã thắp sáng lung linh rồi. Đạo hữu đừng quên ghé cầu bình an và may mắn cho gia đình nhé! 🕯️"
    ];

    return {
      id: "hoanhy",
      name: "Chú Tiểu Hoan Hỷ",
      title: "Tri Khách Thiền Tự",
      group: root,
      headGroup,
      torsoGroup: torso,
      pelvisGroup: pelvis,
      speechAnchor,
      basePos: new THREE.Vector3(x, y, z),
      baseRotY: rotY,
      lastGreetTime: 0,
      bowProgress: 0,
      isBowing: false,
      bowEndTime: 0,
      dialogueIndex: 0,
      dialogues
    };
  }

  // ─────────────────────────────────────────────
  // XÂY DỰNG CHÚ TIỂU TRÍ TUỆ (NGƯỜI GIỮ ĐẠI HỒNG CHUNG)
  // ─────────────────────────────────────────────
  private buildTriTueNPC(x: number, y: number, z: number, rotY: number): GateNPC {
    const root = new THREE.Group();
    root.position.set(x, y, z);
    root.rotation.y = rotY;

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe8d6, roughness: 0.62, metalness: 0.04 });
    const brownRobeMat = new THREE.MeshStandardMaterial({ color: 0x6e3816, roughness: 0.62, metalness: 0.05 });
    const whiteCollarMat = new THREE.MeshStandardMaterial({ color: 0xfdfefe, roughness: 0.5 });
    const yellowSashMat = new THREE.MeshStandardMaterial({ color: 0xf4d03f, roughness: 0.45, metalness: 0.1 });
    const beadWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.4, metalness: 0.2 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x241812, roughness: 0.7 });

    // Khớp hông & thân
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.42, 0);
    root.add(pelvis);

    // Chân & Giày
    [-0.11, 0.11].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.36, 12), brownRobeMat);
      leg.position.set(lx, -0.18, 0);
      leg.castShadow = true;
      pelvis.add(leg);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.18), shoeMat);
      shoe.position.set(lx, -0.36, 0.03);
      shoe.castShadow = true;
      pelvis.add(shoe);

      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.02, 0.186), whiteCollarMat);
      sole.position.set(lx, -0.40, 0.03);
      pelvis.add(sole);
    });

    // Thân áo tràng nâu sồng
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.31, 0.42, 16), brownRobeMat);
    skirt.position.set(0, -0.16, 0);
    skirt.castShadow = true;
    pelvis.add(skirt);

    const torso = new THREE.Group();
    torso.position.set(0, 0.04, 0);
    pelvis.add(torso);

    const upperRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.36, 16), brownRobeMat);
    upperRobe.position.set(0, 0.22, 0);
    upperRobe.castShadow = true;
    torso.add(upperRobe);

    // Đai lưng vải vàng
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.075, 16), yellowSashMat);
    sash.position.set(0, 0.05, 0);
    torso.add(sash);

    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), yellowSashMat);
    knot.position.set(0, 0.05, 0.22);
    torso.add(knot);

    // Cổ áo giao lĩnh màu trắng thanh tịnh
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.11), whiteCollarMat);
    collar.position.set(0, 0.38, 0.10);
    collar.rotation.x = 0.25;
    torso.add(collar);

    // Chuỗi tràng hạt bồ đề 108 hạt quấn quanh cổ
    const mala = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.016, 8, 24), beadWoodMat);
    mala.position.set(0, 0.28, 0.14);
    mala.rotation.x = Math.PI / 3.4;
    torso.add(mala);

    // TAY CHẮP BÚP SEN CUNG KÍNH TRƯỚC NGỰC
    const armsGroup = new THREE.Group();
    torso.add(armsGroup);

    // Ống tay áo thụng hai bên khép vào nhau
    [-0.14, 0.14].forEach((ax) => {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.26, 12), brownRobeMat);
      sleeve.position.set(ax, 0.25, 0.08);
      sleeve.rotation.set(-0.65, 0, ax > 0 ? -0.45 : 0.45);
      armsGroup.add(sleeve);
    });

    // Cẳng tay chắp vào giữa
    [-0.07, 0.07].forEach((fx) => {
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.18, 10), skinMat);
      forearm.position.set(fx, 0.29, 0.18);
      forearm.rotation.set(-1.15, 0, fx > 0 ? -0.35 : 0.35);
      armsGroup.add(forearm);
    });

    // Hai bàn tay chắp hình búp sen
    const hands = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.11, 0.07), skinMat);
    hands.position.set(0, 0.34, 0.24);
    hands.rotation.x = -0.32;
    armsGroup.add(hands);

    // Đầu cạo nhẵn trang nghiêm với 3 chấm hương giới điệp
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.48, 0);
    torso.add(headGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 12), skinMat);
    neck.position.set(0, 0.05, 0);
    headGroup.add(neck);

    // Texture khuôn mặt trí tuệ, tươi sáng, hiền hòa
    const faceTex = this.createTriTueFaceTexture();
    const headMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6, metalness: 0.04 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 24), headMat);
    head.position.set(0, 0.34, 0);
    head.castShadow = true;
    head.name = "npc_gate_tritue";
    headGroup.add(head);
    this.interactableMeshes.push(head);

    // Hai tai
    [-0.32, 0.32].forEach((tx) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
      ear.position.set(tx, 0.33, 0.02);
      ear.scale.set(0.45, 0.9, 0.7);
      headGroup.add(ear);
    });

    // 3 Chấm hương giới điệp trên trán
    const dotMat = new THREE.MeshStandardMaterial({ color: 0x935116, roughness: 0.8 });
    [-0.045, 0, 0.045].forEach((dx) => {
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.015, 8), dotMat);
      dot.position.set(dx, 0.56, 0.20);
      dot.rotation.x = Math.PI / 4;
      headGroup.add(dot);
    });

    // Nametag 3D trên đầu Chú Tiểu Trí Tuệ
    const nameTag = this.createNPCSpriteNameTag("🪷 Chú Tiểu Trí Tuệ", "Người Giữ Đại Hồng Chung", "#b9770e", "#ffe082");
    nameTag.position.set(0, 1.95, 0);
    root.add(nameTag);

    // Speech Anchor
    const speechAnchor = new THREE.Group();
    speechAnchor.position.set(0, -0.85, 0);
    root.add(speechAnchor);

    // Bóng đổ mặt đất
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);

    const dialogues = [
      "A Di Đà Phật! Hoan hỷ đón chào quý đạo hữu đến chiêm bái Lầu Chuông Đại Hồng Chung! 🙏",
      "Đạo hữu hãy nhấp chuột vào Đại Hồng Chung để thỉnh một hồi chuông thanh tịnh, xua tan 108 phiền não và tích lũy +10 Điểm Công Đức mỗi ngày nhé! 🔔",
      "Kệ chuông dạy: 'Nghe chuông phiền não tan mây khói, ý lặng tâm an miệng mỉm cười... Nguyện tiếng chuông này vang khắp mười phương pháp giới!' ✨",
      "Mỗi tiếng chuông đại hồng ngân vang là một lời nguyện an lành gửi đến muôn loài chúng sanh. Kính chúc đạo hữu thân tâm thường an lạc! 🌸",
      "Sau khi thỉnh chuông xong, đạo hữu có thể vào Đại Hùng Bảo Điện đảnh lễ Tam Thế Phật hoặc ra Cầu Hồ Sen thả hoa đăng cầu an nhé! 🪷",
    ];

    return {
      id: "tritue",
      name: "Chú Tiểu Trí Tuệ",
      title: "Người Giữ Đại Hồng Chung",
      group: root,
      headGroup,
      torsoGroup: torso,
      pelvisGroup: pelvis,
      speechAnchor,
      basePos: new THREE.Vector3(x, y, z),
      baseRotY: rotY,
      lastGreetTime: 0,
      bowProgress: 0,
      isBowing: false,
      bowEndTime: 0,
      dialogueIndex: 0,
      dialogues,
    };
  }

  // ─────────────────────────────────────────────
  // XÂY DỰNG HÒA THƯỢNG THÍCH TRÍ GIÁC (BẬC TRƯỞNG LÃO THỤ GIỚI CHÍNH ĐIỆN)
  // ─────────────────────────────────────────────
  private buildTriGiacNPC(x: number, y: number, z: number, rotY: number): GateNPC {
    const root = new THREE.Group();
    root.position.set(x, y, z);
    root.rotation.y = rotY;

    // Vật liệu cao cấp sa-môn
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe6ce, roughness: 0.65, metalness: 0.04 });
    const saffronKasayaMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.52, metalness: 0.08 });
    const darkBrownUnderMat = new THREE.MeshStandardMaterial({ color: 0x5a2d12, roughness: 0.65, metalness: 0.05 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.28, metalness: 0.75 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x241812, roughness: 0.7 });

    // Khớp hông & thân
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.42, 0);
    root.add(pelvis);

    // Chân & Giày
    [-0.12, 0.12].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.38, 12), darkBrownUnderMat);
      leg.position.set(lx, -0.19, 0);
      leg.castShadow = true;
      pelvis.add(leg);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.20), shoeMat);
      shoe.position.set(lx, -0.37, 0.03);
      shoe.castShadow = true;
      pelvis.add(shoe);
    });

    // Vạt áo tràng nâu sồng buông rủ
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.35, 0.44, 16), darkBrownUnderMat);
    skirt.position.set(0, -0.16, 0);
    skirt.castShadow = true;
    pelvis.add(skirt);

    const torso = new THREE.Group();
    torso.position.set(0, 0.04, 0);
    pelvis.add(torso);

    const upperRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.42, 16), darkBrownUnderMat);
    upperRobe.position.set(0, 0.22, 0);
    upperRobe.castShadow = true;
    torso.add(upperRobe);

    // Y CÀ SA HOÀNG Y THẾP VÀNG QUẤN CHÉO QUA VAI TRÁI
    const kasayaSash = new THREE.Mesh(
      new THREE.CylinderGeometry(0.245, 0.275, 0.44, 16, 1, false, 0, Math.PI * 1.1),
      saffronKasayaMat
    );
    kasayaSash.position.set(0, 0.22, 0.01);
    kasayaSash.rotation.y = -Math.PI * 0.28;
    torso.add(kasayaSash);

    // Móc kim thoa đính ngọc giữ y cà sa ở vai trái
    const kasayaBuckle = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.014, 8, 20), goldMat);
    kasayaBuckle.position.set(-0.16, 0.36, 0.17);
    kasayaBuckle.rotation.y = 0.4;
    torso.add(kasayaBuckle);

    // Chuỗi tràng hạt bồ đề 108 hạt vàng kim đeo cổ
    const mala = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.020, 8, 28), goldMat);
    mala.position.set(0, 0.32, 0.14);
    mala.rotation.x = Math.PI / 3.2;
    torso.add(mala);

    // TAY CHẮP BÚP SEN TỪ BI
    const armsGroup = new THREE.Group();
    torso.add(armsGroup);

    [-0.16, 0.16].forEach((ax) => {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.28, 12), saffronKasayaMat);
      sleeve.position.set(ax, 0.26, 0.08);
      sleeve.rotation.set(-0.65, 0, ax > 0 ? -0.45 : 0.45);
      armsGroup.add(sleeve);
    });

    [-0.08, 0.08].forEach((fx) => {
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.19, 10), skinMat);
      forearm.position.set(fx, 0.30, 0.19);
      forearm.rotation.set(-1.15, 0, fx > 0 ? -0.35 : 0.35);
      armsGroup.add(forearm);
    });

    const hands = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.12, 0.075), skinMat);
    hands.position.set(0, 0.35, 0.25);
    hands.rotation.x = -0.32;
    armsGroup.add(hands);

    // ĐẦU CẠO TRỌC THANH KHIẾT VỚI 6 CHẤM HƯƠNG GIỚI ĐIỆP
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.50, 0);
    torso.add(headGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.10, 0.10, 12), skinMat);
    neck.position.set(0, 0.05, 0);
    headGroup.add(neck);

    // Texture khuôn mặt Hòa Thượng Trưởng Lão (râu mày bạc trắng, phúc tướng từ bi)
    const faceTex = this.createTriGiacFaceTexture();
    const headMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6, metalness: 0.04 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 24), headMat);
    head.position.set(0, 0.34, 0);
    head.castShadow = true;
    head.name = "npc_mainhall_trigiac";
    headGroup.add(head);
    this.interactableMeshes.push(head);

    // Hai tai dài phúc tướng
    [-0.32, 0.32].forEach((tx) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), skinMat);
      ear.position.set(tx, 0.32, 0.02);
      ear.scale.set(0.45, 1.25, 0.7);
      headGroup.add(ear);
    });

    // 6 Chấm hương giới điệp trên đỉnh đầu (2 hàng x 3 cột)
    const dotMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffd700,
      emissiveIntensity: 1.5,
    });
    const markRows = [-0.042, 0.042];
    const markCols = [0.065, 0, -0.065];
    markRows.forEach((mx) => {
      markCols.forEach((mz) => {
        const mark = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), dotMat);
        mark.position.set(mx, 0.67, mz);
        headGroup.add(mark);
      });
    });

    // Nametag 3D trên đầu Hòa Thượng Thích Trí Giác
    const nameTag = this.createNPCSpriteNameTag("🪷 Hòa Thượng Thích Trí Giác", "Bậc Trưởng Lão Thụ Giới", "#8c440a", "#ffd700");
    nameTag.position.set(0, 2.05, 0);
    root.add(nameTag);

    // Speech Anchor
    const speechAnchor = new THREE.Group();
    speechAnchor.position.set(0, -0.85, 0);
    root.add(speechAnchor);

    // Bệ Đài Sen Gỗ Gụ Thụ Giới Dưới Chân Hòa Thượng
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x3d140a, roughness: 0.5 });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.70, 0.78, 0.08, 24), plinthMat);
    plinth.position.y = 0.04;
    plinth.receiveShadow = true;
    plinth.name = "npc_mainhall_trigiac";
    root.add(plinth);
    this.interactableMeshes.push(plinth);

    // Viền nẹp mạ vàng
    const plinthRim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.016, 8, 24), goldMat);
    plinthRim.rotation.x = Math.PI / 2;
    plinthRim.position.y = 0.08;
    root.add(plinthRim);

    // Đệm tròn lụa hoa sen vàng
    const matMat = new THREE.MeshStandardMaterial({ color: 0xd4ac0d, roughness: 0.65 });
    const roundMat = new THREE.Mesh(new THREE.CircleGeometry(0.66, 24), matMat);
    roundMat.rotation.x = -Math.PI / 2;
    roundMat.position.y = 0.082;
    root.add(roundMat);

    // Bàn Đôn Gỗ Đựng Sổ Giới Điệp Tam Bảo
    const tableGroup = new THREE.Group();
    tableGroup.position.set(0.85, 0, 0.05);

    const tableLegMat = new THREE.MeshStandardMaterial({ color: 0x2b0d06, roughness: 0.5 });
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.05, 18), plinthMat);
    tableTop.position.y = 0.68;
    tableTop.name = "npc_mainhall_trigiac";
    tableGroup.add(tableTop);
    this.interactableMeshes.push(tableTop);

    const tableRim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.012, 8, 18), goldMat);
    tableRim.rotation.x = Math.PI / 2;
    tableRim.position.y = 0.70;
    tableGroup.add(tableRim);

    const tablePillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.65, 12), tableLegMat);
    tablePillar.position.y = 0.33;
    tableGroup.add(tablePillar);

    const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.06, 16), plinthMat);
    tableBase.position.y = 0.03;
    tableGroup.add(tableBase);

    // Cuốn Sổ Giới Điệp Tam Bảo bìa gấm vàng mở sẵn
    const bookMat = new THREE.MeshStandardMaterial({ color: 0xfef9e7, roughness: 0.5 });
    const bookCoverMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.20), bookMat);
    book.position.set(0, 0.72, 0);
    book.rotation.y = -0.2;
    tableGroup.add(book);

    const bookCover = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.008, 0.21), bookCoverMat);
    bookCover.position.set(0, 0.705, 0);
    bookCover.rotation.y = -0.2;
    tableGroup.add(bookCover);

    // Lư trầm ngọc nhỏ tỏa hương
    const censerMat = new THREE.MeshStandardMaterial({ color: 0x1b4d3e, roughness: 0.3, metalness: 0.4 });
    const censer = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), censerMat);
    censer.position.set(-0.14, 0.74, -0.06);
    tableGroup.add(censer);

    root.add(tableGroup);

    // Hào quang vàng kim dưới chân
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const aura = new THREE.Mesh(new THREE.RingGeometry(0.70, 0.95, 24), auraMat);
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.085;
    root.add(aura);

    const dialogues = [
      "A Di Đà Phật! Bần tăng Thích Trí Giác kính chào đạo hữu. Đạo hữu có phát nguyện xả bỏ duyên trần, xuống tóc xuất gia không? 🙏",
      "Kính bạch đạo hữu: Khi xuống tóc đi tu, đạo hữu sẽ xả bỏ mái tóc thế tục, cạo đầu thanh khiết, đắp y Cà Sa và mang họ Thích của Đức Bổn Sư Thích Ca Mâu Ni!",
      "Theo quy củ thiền môn: Người chơi bắt buộc phải Xuống Tóc Đi Tu mới được tấn phong làm Hòa Thượng Trụ Trì hoặc 12 Vị Cao Tăng của Chùa!",
      "Để ghi danh vào Sổ Giới Điệp Tam Bảo lưu truyền công đức, đạo hữu cần Đăng Nhập bằng Google trước khi làm lễ Xuống Tóc nhé! 🪷",
      "Sau khi xuất gia, hãy tinh tấn tụng kinh niệm Phật, thả hoa đăng và tích lũy Điểm Công Đức để sớm được đăng tọa Pháp Tòa Trụ Trì! ✨",
    ];

    return {
      id: "trigiac",
      name: "Hòa Thượng Thích Trí Giác",
      title: "Bậc Trưởng Lão Thụ Giới",
      group: root,
      headGroup,
      torsoGroup: torso,
      pelvisGroup: pelvis,
      speechAnchor,
      basePos: new THREE.Vector3(x, y, z),
      baseRotY: rotY,
      lastGreetTime: 0,
      bowProgress: 0,
      isBowing: false,
      bowEndTime: 0,
      dialogueIndex: 0,
      dialogues,
    };
  }

  // ─────────────────────────────────────────────
  // XÂY DỰNG CHÚ TIỂU TỊNH TÂM (CHẤP TÁC VƯỜN AN LẠC)
  // ─────────────────────────────────────────────
  private buildTinhTamNPC(x: number, y: number, z: number, rotY: number): GateNPC {
    const root = new THREE.Group();
    root.position.set(x, y, z);
    root.rotation.y = rotY;

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffe8d6, roughness: 0.62, metalness: 0.04 });
    const earthRobeMat = new THREE.MeshStandardMaterial({ color: 0x584435, roughness: 0.68, metalness: 0.04 });
    const whiteCollarMat = new THREE.MeshStandardMaterial({ color: 0xfdfefe, roughness: 0.5 });
    const sashMat = new THREE.MeshStandardMaterial({ color: 0x597355, roughness: 0.55 });
    const beadWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a2a18, roughness: 0.4, metalness: 0.2 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x241812, roughness: 0.7 });
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0xb58a5f, roughness: 0.6 });
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xd4b07b, roughness: 0.8 });
    const nonLaMat = new THREE.MeshStandardMaterial({ color: 0xdcc090, roughness: 0.75 });
    const greenPlantMat = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.6 });
    const lotusMat = new THREE.MeshStandardMaterial({
      color: 0xf06292,
      emissive: 0xad1457,
      emissiveIntensity: 0.25,
      roughness: 0.45,
    });
    const stonePlinthMat = new THREE.MeshStandardMaterial({ color: 0x8d877e, roughness: 0.85 });

    // Khớp hông & thân
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.42, 0);
    root.add(pelvis);

    // Chân & Giày
    [-0.11, 0.11].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.36, 12), earthRobeMat);
      leg.position.set(lx, -0.18, 0);
      leg.castShadow = true;
      pelvis.add(leg);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.18), shoeMat);
      shoe.position.set(lx, -0.36, 0.03);
      shoe.castShadow = true;
      pelvis.add(shoe);

      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.02, 0.186), whiteCollarMat);
      sole.position.set(lx, -0.40, 0.03);
      pelvis.add(sole);
    });

    // Thân áo tràng nâu đất làm vườn
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.31, 0.42, 16), earthRobeMat);
    skirt.position.set(0, -0.16, 0);
    skirt.castShadow = true;
    pelvis.add(skirt);

    const torso = new THREE.Group();
    torso.position.set(0, 0.04, 0);
    pelvis.add(torso);

    const upperRobe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.36, 16), earthRobeMat);
    upperRobe.position.set(0, 0.22, 0);
    upperRobe.castShadow = true;
    upperRobe.name = "npc_garden_tinhtam";
    torso.add(upperRobe);
    this.interactableMeshes.push(upperRobe);

    // Đai lưng vải thô xanh rêu mộc mạc
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.075, 16), sashMat);
    sash.position.set(0, 0.05, 0);
    torso.add(sash);

    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), sashMat);
    knot.position.set(0, 0.05, 0.22);
    torso.add(knot);

    // Cổ áo giao lĩnh màu trắng thanh tịnh
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.11), whiteCollarMat);
    collar.position.set(0, 0.38, 0.10);
    collar.rotation.x = 0.25;
    torso.add(collar);

    // Chuỗi tràng hạt bồ đề nhỏ đeo quanh cổ
    const mala = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.015, 8, 22), beadWoodMat);
    mala.position.set(0, 0.28, 0.13);
    mala.rotation.x = Math.PI / 3.4;
    torso.add(mala);

    // Cánh tay & Dụng cụ chấp tác
    const armsGroup = new THREE.Group();
    torso.add(armsGroup);

    // Tay trái: cầm chổi tre quét lá sân chùa
    const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.26, 12), earthRobeMat);
    leftSleeve.position.set(-0.16, 0.24, 0.08);
    leftSleeve.rotation.set(-0.4, 0, 0.35);
    armsGroup.add(leftSleeve);

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.18, 10), skinMat);
    leftForearm.position.set(-0.14, 0.12, 0.16);
    leftForearm.rotation.set(-0.7, 0, 0.2);
    armsGroup.add(leftForearm);

    // Chổi tre quét dọn sân chùa
    const broomGroup = new THREE.Group();
    broomGroup.position.set(-0.18, 0.10, 0.20);
    broomGroup.rotation.set(0.2, 0, 0.15);

    const broomHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.95, 8), bambooMat);
    broomHandle.position.set(0, -0.05, 0);
    broomGroup.add(broomHandle);

    const broomHead = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.28, 12), strawMat);
    broomHead.position.set(0, -0.46, 0);
    broomGroup.add(broomHead);

    const broomRope = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.009, 6, 12), earthRobeMat);
    broomRope.rotation.x = Math.PI / 2;
    broomRope.position.set(0, -0.36, 0);
    broomGroup.add(broomRope);

    armsGroup.add(broomGroup);

    // Tay phải: cầm cành sen hồng tươi thắm cúng Phật
    const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.26, 12), earthRobeMat);
    rightSleeve.position.set(0.16, 0.24, 0.08);
    rightSleeve.rotation.set(-0.55, 0, -0.35);
    armsGroup.add(rightSleeve);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.18, 10), skinMat);
    rightForearm.position.set(0.12, 0.16, 0.18);
    rightForearm.rotation.set(-0.95, 0, -0.2);
    armsGroup.add(rightForearm);

    // Cành hoa sen hồng dâng cúng
    const lotusSprig = new THREE.Group();
    lotusSprig.position.set(0.12, 0.24, 0.22);
    lotusSprig.rotation.set(-0.2, 0.2, -0.15);

    const lotusStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6), greenPlantMat);
    lotusStem.position.set(0, 0.08, 0);
    lotusSprig.add(lotusStem);

    const lotusBloom = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.15, 8), lotusMat);
    lotusBloom.position.set(0, 0.24, 0);
    lotusSprig.add(lotusBloom);

    const leafMini = new THREE.Mesh(new THREE.CircleGeometry(0.065, 6), greenPlantMat);
    leafMini.rotation.x = -Math.PI / 2;
    leafMini.position.set(-0.04, 0.12, 0.02);
    lotusSprig.add(leafMini);

    armsGroup.add(lotusSprig);

    // Đầu cạo nhẵn thanh khiết
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.48, 0);
    torso.add(headGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 12), skinMat);
    neck.position.set(0, 0.05, 0);
    headGroup.add(neck);

    // Texture nụ cười an lạc, hoan hỷ
    const faceTex = this.createHoanHyFaceTexture();
    const headMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6, metalness: 0.04 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 24), headMat);
    head.position.set(0, 0.34, 0);
    head.castShadow = true;
    head.name = "npc_garden_tinhtam";
    headGroup.add(head);
    this.interactableMeshes.push(head);

    // Hai tai
    [-0.32, 0.32].forEach((tx) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
      ear.position.set(tx, 0.33, 0.02);
      ear.scale.set(0.45, 0.9, 0.7);
      headGroup.add(ear);
    });

    // 3 Chấm hương giới điệp trên trán
    const dotMat = new THREE.MeshStandardMaterial({ color: 0x935116, roughness: 0.8 });
    [-0.045, 0, 0.045].forEach((dx) => {
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.015, 8), dotMat);
      dot.position.set(dx, 0.48, 0.30);
      dot.rotation.x = Math.PI / 2;
      headGroup.add(dot);
    });

    // Chiếc nón lá trúc truyền thống đeo sau lưng áo
    const nonLaGroup = new THREE.Group();
    nonLaGroup.position.set(0, 0.20, -0.22);
    nonLaGroup.rotation.set(0.5, Math.PI, 0);

    const nonLaCone = new THREE.Mesh(new THREE.ConeGeometry(0.30, 0.12, 18), nonLaMat);
    nonLaGroup.add(nonLaCone);

    const nonLaRim = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.012, 8, 18), bambooMat);
    nonLaRim.rotation.x = Math.PI / 2;
    nonLaGroup.add(nonLaRim);

    // Dây quai nón vải mềm quấn quanh cổ
    const nonLaStrap = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 6, 16), earthRobeMat);
    nonLaStrap.position.set(0, 0.08, 0.12);
    nonLaStrap.rotation.x = Math.PI / 4;
    nonLaGroup.add(nonLaStrap);

    torso.add(nonLaGroup);

    // Nametag 3D trên đầu Chú Tiểu Tịnh Tâm
    const nameTag = this.createNPCSpriteNameTag("🌿 Chú Tiểu Tịnh Tâm", "Chấp Tác Vườn An Lạc", "#2e7d32", "#c8e6c9");
    nameTag.position.set(0, 1.95, 0);
    root.add(nameTag);

    // Speech Anchor
    const speechAnchor = new THREE.Group();
    speechAnchor.position.set(0, -0.85, 0);
    root.add(speechAnchor);

    // Bệ đá cuội tròn dưới chân
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.06, 20), stonePlinthMat);
    plinth.position.y = 0.03;
    plinth.receiveShadow = true;
    plinth.name = "npc_garden_tinhtam";
    root.add(plinth);
    this.interactableMeshes.push(plinth);

    // Vòng sỏi trang trí quanh bệ
    const gravelRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.66, 0.035, 6, 24),
      new THREE.MeshStandardMaterial({ color: 0xc4bcb3, roughness: 0.9 })
    );
    gravelRing.rotation.x = Math.PI / 2;
    gravelRing.position.y = 0.02;
    root.add(gravelRing);

    const dialogues = [
      "A Di Đà Phật! Đạo hữu ghé thăm Vườn An Lạc, cùng chung tay chấp tác công quả thiền môn nhé! 🙏",
      "Mỗi ngày gieo một việc thiện, tâm an như nước mùa thu. Hãy cùng nhận công quả hôm nay nha! 🌿",
      "Quét chùa, trồng hoa, lau dọn hương án... mỗi việc làm thành kính đều tích lũy công đức vô lượng! ✨",
      "Lao động là thiền tập, phụng sự là cúng dường Tam Bảo. Kính chúc đạo hữu luôn an lạc! 🌸",
      "Mỗi ngày đạo hữu có thể nhận tối đa 10 nhiệm vụ. Hoàn thành mỗi việc nhận ngay +10 Điểm Công Đức! 🙏",
    ];

    return {
      id: "tinhtam",
      name: "Chú Tiểu Tịnh Tâm",
      title: "Chấp Tác Vườn An Lạc",
      group: root,
      headGroup,
      torsoGroup: torso,
      pelvisGroup: pelvis,
      speechAnchor,
      basePos: new THREE.Vector3(x, y, z),
      baseRotY: rotY,
      lastGreetTime: 0,
      bowProgress: 0,
      isBowing: false,
      bowEndTime: 0,
      dialogueIndex: 0,
      dialogues,
    };
  }

  // ─────────────────────────────────────────────
  // TEXTURE DIỆN MẠO CHÚ TIỂU AN NHIÊN
  // Mắt to tròn long lanh, má đào ửng hồng, nụ cười an lạc
  // ─────────────────────────────────────────────
  private createAnNhienFaceTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // Nền da Chibi trắng hồng
    ctx.fillStyle = "#fff6ef";
    ctx.fillRect(0, 0, 1024, 1024);

    const centerX = 256;
    const centerY = 512;
    const eyeDist = 65;

    // Vùng tỏa sáng mềm mại trên gò má
    const glow = ctx.createRadialGradient(centerX, centerY + 15, 20, centerX, centerY + 15, 180);
    glow.addColorStop(0, "rgba(255, 230, 215, 0.6)");
    glow.addColorStop(1, "rgba(255, 246, 239, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 15, 180, 0, Math.PI * 2);
    ctx.fill();

    // Má đào ửng hồng anime (///)
    [-eyeDist - 25, eyeDist + 25].forEach((bx) => {
      const bGrad = ctx.createRadialGradient(centerX + bx, centerY + 38, 2, centerX + bx, centerY + 38, 45);
      bGrad.addColorStop(0, "rgba(255, 110, 130, 0.65)");
      bGrad.addColorStop(0.6, "rgba(255, 160, 175, 0.28)");
      bGrad.addColorStop(1, "rgba(255, 246, 239, 0)");
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(centerX + bx, centerY + 38, 45, 0, Math.PI * 2);
      ctx.fill();

      // Vạch thẹn thùng anime
      ctx.strokeStyle = "rgba(240, 80, 105, 0.65)";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX + bx + i * 8 - 4, centerY + 32);
        ctx.lineTo(centerX + bx + i * 8 + 4, centerY + 46);
        ctx.stroke();
      }
    });

    // Lông mày hiền từ thanh tú
    ctx.strokeStyle = "#4a3227";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    // Mày trái
    ctx.beginPath();
    ctx.moveTo(centerX - eyeDist - 25, centerY - 60);
    ctx.quadraticCurveTo(centerX - eyeDist, centerY - 72, centerX - eyeDist + 24, centerY - 58);
    ctx.stroke();
    // Mày phải
    ctx.beginPath();
    ctx.moveTo(centerX + eyeDist - 24, centerY - 58);
    ctx.quadraticCurveTo(centerX + eyeDist, centerY - 72, centerX + eyeDist + 25, centerY - 60);
    ctx.stroke();

    // Nốt chu sa cát tường Phật giáo
    ctx.fillStyle = "#d32f2f";
    ctx.beginPath();
    ctx.arc(centerX, centerY - 52, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Đôi mắt to tròn long lanh Chibi Anime
    const drawEye = (ex: number, isRight: boolean) => {
      const ew = 44;
      const eh = 58;

      // Tròng trắng
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(ex, centerY, ew, eh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Mống mắt màu lam chàm bảo ngọc (Deep Indigo Sapphire)
      const irisGrad = ctx.createLinearGradient(ex, centerY - eh * 0.7, ex, centerY + eh * 0.85);
      irisGrad.addColorStop(0, "#1a2a3a");
      irisGrad.addColorStop(0.45, "#2b4c6f");
      irisGrad.addColorStop(0.85, "#41729f");
      irisGrad.addColorStop(1, "#6ba4b8");

      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.ellipse(ex + (isRight ? -2 : 2), centerY + 2, ew * 0.76, eh * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      // Đồng tử sâu thẳm
      ctx.fillStyle = "#0c1520";
      ctx.beginPath();
      ctx.ellipse(ex + (isRight ? -2 : 2), centerY + 4, ew * 0.40, eh * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();

      // Điểm sáng lung linh (Anime Eye Highlights)
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ex + (isRight ? -10 : 6), centerY - 16, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ex + (isRight ? 12 : -14), centerY + 18, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Viền mi trên đậm đà phong cách Chibi
      ctx.strokeStyle = "#1b1410";
      ctx.lineWidth = 5.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(ex, centerY - 10, ew * 1.05, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    };

    drawEye(centerX - eyeDist, false);
    drawEye(centerX + eyeDist, true);

    // Chiếc mũi nhỏ nhắn dễ thương
    ctx.fillStyle = "rgba(180, 110, 90, 0.45)";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 26, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nụ cười mỉm thanh thản an nhiên
    ctx.strokeStyle = "#a93226";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(centerX, centerY + 38, 14, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  // ─────────────────────────────────────────────
  // TEXTURE DIỆN MẠO CHÚ TIỂU HOAN HỶ
  // Mắt cười tít hình trăng lưỡi liềm ^ _ ^, nụ cười rạng rỡ hỷ lạc
  // ─────────────────────────────────────────────
  private createHoanHyFaceTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // Nền da Chibi
    ctx.fillStyle = "#fff6ef";
    ctx.fillRect(0, 0, 1024, 1024);

    const centerX = 256;
    const centerY = 512;
    const eyeDist = 65;

    // Má hồng rạng rỡ tươi vui
    [-eyeDist - 25, eyeDist + 25].forEach((bx) => {
      const bGrad = ctx.createRadialGradient(centerX + bx, centerY + 36, 2, centerX + bx, centerY + 36, 48);
      bGrad.addColorStop(0, "rgba(255, 100, 120, 0.70)");
      bGrad.addColorStop(0.6, "rgba(255, 150, 165, 0.32)");
      bGrad.addColorStop(1, "rgba(255, 246, 239, 0)");
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(centerX + bx, centerY + 36, 48, 0, Math.PI * 2);
      ctx.fill();

      // Vạch thẹn thùng anime
      ctx.strokeStyle = "rgba(235, 70, 95, 0.70)";
      ctx.lineWidth = 2.8;
      ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX + bx + i * 8 - 4, centerY + 30);
        ctx.lineTo(centerX + bx + i * 8 + 4, centerY + 44);
        ctx.stroke();
      }
    });

    // Lông mày tươi cười cong vút lên
    ctx.strokeStyle = "#4a3227";
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";
    // Mày trái
    ctx.beginPath();
    ctx.moveTo(centerX - eyeDist - 28, centerY - 62);
    ctx.quadraticCurveTo(centerX - eyeDist, centerY - 80, centerX - eyeDist + 24, centerY - 58);
    ctx.stroke();
    // Mày phải
    ctx.beginPath();
    ctx.moveTo(centerX + eyeDist - 24, centerY - 58);
    ctx.quadraticCurveTo(centerX + eyeDist, centerY - 80, centerX + eyeDist + 28, centerY - 62);
    ctx.stroke();

    // ĐÔI MẮT CƯỜI TÍT HÌNH TRĂNG LƯỠI LIỀM (^ _ ^) SIÊU ĐÁNG YÊU
    const drawLaughingEye = (ex: number) => {
      ctx.strokeStyle = "#1a120c";
      ctx.lineWidth = 6.5;
      ctx.lineCap = "round";

      // Đường cong mắt cười tít mí
      ctx.beginPath();
      ctx.arc(ex, centerY + 4, 32, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Hàng mi cong vút hoan hỷ
      ctx.lineWidth = 4.0;
      ctx.beginPath();
      ctx.arc(ex, centerY + 8, 26, Math.PI * 1.20, Math.PI * 1.80);
      ctx.stroke();
    };

    drawLaughingEye(centerX - eyeDist);
    drawLaughingEye(centerX + eyeDist);

    // Mũi nhỏ
    ctx.fillStyle = "rgba(180, 110, 90, 0.45)";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 24, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // NỤ CƯỜI TƯƠI RẠNG RỠ HỶ LẠC (Miệng cười mở to hình vòng cung)
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.arc(centerX, centerY + 38, 20, 0, Math.PI);
    ctx.closePath();
    ctx.fill();

    // Răng trên trắng nhỏ xinh
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.rect(centerX - 10, centerY + 38, 20, 5);
    ctx.fill();

    // Lưỡi hồng đào
    ctx.fillStyle = "#ff7675";
    ctx.beginPath();
    ctx.arc(centerX, centerY + 53, 11, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  // ─────────────────────────────────────────────
  // TEXTURE DIỆN MẠO CHÚ TIỂU TRÍ TUỆ
  // Đôi mắt to tròn sáng ngời trí tuệ màu hổ phách vàng kim, nụ cười an hòa
  // ─────────────────────────────────────────────
  private createTriTueFaceTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // Nền da Chibi trắng hồng
    ctx.fillStyle = "#fff6ef";
    ctx.fillRect(0, 0, 1024, 1024);

    const centerX = 256;
    const centerY = 512;
    const eyeDist = 65;

    // Vùng tỏa sáng mềm mại trên gò má
    const glow = ctx.createRadialGradient(centerX, centerY + 15, 20, centerX, centerY + 15, 180);
    glow.addColorStop(0, "rgba(255, 230, 215, 0.6)");
    glow.addColorStop(1, "rgba(255, 246, 239, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 15, 180, 0, Math.PI * 2);
    ctx.fill();

    // Má đào ửng hồng dịu nhẹ
    [-eyeDist - 25, eyeDist + 25].forEach((bx) => {
      const bGrad = ctx.createRadialGradient(centerX + bx, centerY + 38, 2, centerX + bx, centerY + 38, 44);
      bGrad.addColorStop(0, "rgba(255, 120, 135, 0.60)");
      bGrad.addColorStop(0.6, "rgba(255, 170, 180, 0.25)");
      bGrad.addColorStop(1, "rgba(255, 246, 239, 0)");
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(centerX + bx, centerY + 38, 44, 0, Math.PI * 2);
      ctx.fill();

      // Vạch thẹn thùng anime
      ctx.strokeStyle = "rgba(240, 90, 110, 0.60)";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX + bx + i * 8 - 4, centerY + 32);
        ctx.lineTo(centerX + bx + i * 8 + 4, centerY + 46);
        ctx.stroke();
      }
    });

    // Lông mày hiền từ thanh tú
    ctx.strokeStyle = "#4a3227";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    // Mày trái
    ctx.beginPath();
    ctx.moveTo(centerX - eyeDist - 25, centerY - 60);
    ctx.quadraticCurveTo(centerX - eyeDist, centerY - 74, centerX - eyeDist + 24, centerY - 58);
    ctx.stroke();
    // Mày phải
    ctx.beginPath();
    ctx.moveTo(centerX + eyeDist - 24, centerY - 58);
    ctx.quadraticCurveTo(centerX + eyeDist, centerY - 74, centerX + eyeDist + 25, centerY - 60);
    ctx.stroke();

    // Nốt chu sa cát tường Phật giáo trên trán
    ctx.fillStyle = "#d32f2f";
    ctx.beginPath();
    ctx.arc(centerX, centerY - 52, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Đôi mắt to tròn long lanh Chibi Anime màu Hổ Phách Hoàng Kim
    const drawEye = (ex: number, isRight: boolean) => {
      const ew = 44;
      const eh = 58;

      // Tròng trắng
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(ex, centerY, ew, eh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Mống mắt màu Hổ Phách Hoàng Kim (Amber Gold)
      const irisGrad = ctx.createLinearGradient(ex, centerY - eh * 0.7, ex, centerY + eh * 0.85);
      irisGrad.addColorStop(0, "#451a03");
      irisGrad.addColorStop(0.40, "#78350f");
      irisGrad.addColorStop(0.75, "#b45309");
      irisGrad.addColorStop(1, "#f59e0b");

      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.ellipse(ex + (isRight ? -2 : 2), centerY + 2, ew * 0.76, eh * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      // Đồng tử sâu thẳm
      ctx.fillStyle = "#1c0a02";
      ctx.beginPath();
      ctx.ellipse(ex + (isRight ? -2 : 2), centerY + 4, ew * 0.40, eh * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();

      // Điểm sáng lung linh (Anime Eye Highlights)
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ex + (isRight ? -10 : 6), centerY - 16, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ex + (isRight ? 12 : -14), centerY + 18, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Viền mi trên đậm đà phong cách Chibi
      ctx.strokeStyle = "#1b1410";
      ctx.lineWidth = 5.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(ex, centerY - 10, ew * 1.05, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    };

    drawEye(centerX - eyeDist, false);
    drawEye(centerX + eyeDist, true);

    // Mũi nhỏ nhắn
    ctx.fillStyle = "rgba(180, 110, 90, 0.45)";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 26, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nụ cười mỉm từ ái thanh thản
    ctx.strokeStyle = "#a93226";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(centerX, centerY + 38, 14, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  // ─────────────────────────────────────────────
  // TEXTURE DIỆN MẠO HÒA THƯỢNG THÍCH TRÍ GIÁC
  // Diện mạo Trưởng Lão Cao Tăng: râu mày bạc trắng, phúc tướng từ bi, mắt nhìn xuống thế gian mỉm cười
  // ─────────────────────────────────────────────
  private createTriGiacFaceTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // Nền da hồng hào phúc tướng
    ctx.fillStyle = "#fff4e8";
    ctx.fillRect(0, 0, 1024, 1024);

    const centerX = 256;
    const centerY = 512;
    const eyeDist = 68;

    // Vùng hào quang phúc tướng trên khuôn mặt
    const glow = ctx.createRadialGradient(centerX, centerY + 10, 30, centerX, centerY + 10, 220);
    glow.addColorStop(0, "rgba(255, 235, 205, 0.7)");
    glow.addColorStop(1, "rgba(255, 244, 232, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 10, 220, 0, Math.PI * 2);
    ctx.fill();

    // Má hồng hào phúc tướng
    [-eyeDist - 25, eyeDist + 25].forEach((bx) => {
      const bGrad = ctx.createRadialGradient(centerX + bx, centerY + 36, 2, centerX + bx, centerY + 36, 48);
      bGrad.addColorStop(0, "rgba(240, 140, 130, 0.45)");
      bGrad.addColorStop(1, "rgba(255, 244, 232, 0)");
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(centerX + bx, centerY + 36, 48, 0, Math.PI * 2);
      ctx.fill();
    });

    // Bạch hào ngọc sáng giữa trán (Urna)
    const urnaY = centerY - 55;
    const urnaGrad = ctx.createRadialGradient(centerX, urnaY, 2, centerX, urnaY, 18);
    urnaGrad.addColorStop(0, "#ffffff");
    urnaGrad.addColorStop(0.5, "#ffd700");
    urnaGrad.addColorStop(1, "rgba(255, 215, 0, 0)");
    ctx.fillStyle = urnaGrad;
    ctx.beginPath();
    ctx.arc(centerX, urnaY, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(centerX, urnaY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Đôi chân mày bạc trắng hiền từ hình cánh cung (White Elder Eyebrows)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";

    // Mày trái
    ctx.beginPath();
    ctx.moveTo(centerX - 18, centerY - 32);
    ctx.quadraticCurveTo(centerX - eyeDist, centerY - 62, centerX - eyeDist - 46, centerY - 28);
    ctx.stroke();

    // Mày phải
    ctx.beginPath();
    ctx.moveTo(centerX + 18, centerY - 32);
    ctx.quadraticCurveTo(centerX + eyeDist, centerY - 62, centerX + eyeDist + 46, centerY - 28);
    ctx.stroke();

    // Đôi mắt từ bi khép hờ tĩnh tọa nhìn xuống (Serene Half-closed Eyes)
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 6;
    ctx.beginPath();
    // Mắt trái
    ctx.moveTo(centerX - eyeDist - 34, centerY + 5);
    ctx.quadraticCurveTo(centerX - eyeDist, centerY - 10, centerX - eyeDist + 30, centerY + 8);
    ctx.stroke();

    // Mắt phải
    ctx.beginPath();
    ctx.moveTo(centerX + eyeDist - 30, centerY + 8);
    ctx.quadraticCurveTo(centerX + eyeDist, centerY - 10, centerX + eyeDist + 34, centerY + 5);
    ctx.stroke();

    // Nhãn cầu khép hờ nhìn xuống
    ctx.fillStyle = "#4e342e";
    [-eyeDist, eyeDist].forEach((ex) => {
      ctx.beginPath();
      ctx.ellipse(centerX + ex, centerY + 6, 10, 5, 0, 0, Math.PI);
      ctx.fill();
    });

    // Nụ cười từ bi an nhiên (Benevolent Smile)
    ctx.strokeStyle = "#a7382d";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 38, 22, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Chòm râu bạc trắng ngắn phúc hậu dưới cằm (White Beard)
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.beginPath();
    ctx.moveTo(centerX - 24, centerY + 58);
    ctx.quadraticCurveTo(centerX, centerY + 95, centerX + 24, centerY + 58);
    ctx.quadraticCurveTo(centerX, centerY + 68, centerX - 24, centerY + 58);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  // ─────────────────────────────────────────────
  // NAMETAG 3D TRÊN ĐẦU NPC
  // ─────────────────────────────────────────────
  private createNPCSpriteNameTag(name: string, role: string, badgeBg: string, textColor: string): THREE.Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = 380;
    canvas.height = 96;
    const ctx = canvas.getContext("2d")!;

    // Nền tối thanh tịnh với viền vàng kim
    ctx.fillStyle = "rgba(14, 22, 18, 0.92)";
    ctx.beginPath();
    ctx.roundRect(8, 6, 364, 84, 14);
    ctx.fill();

    // Viền kim loại mạ vàng
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dòng 1: Tên Chú Tiểu
    ctx.font = "bold 26px 'Be Vietnam Pro', -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(name, 190, 40);

    // Dòng 2: Danh hiệu / Nhiệm vụ [Tiếp Dẫn / Tri Khách]
    ctx.font = "bold 18px 'Be Vietnam Pro', -apple-system, sans-serif";
    ctx.fillStyle = badgeBg;
    ctx.fillText(`❖ ${role} ❖`, 190, 72);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.4, 0.65, 1);
    return sprite;
  }

  // ─────────────────────────────────────────────
  // LOOP HOẠT ẢNH & TƯƠNG TÁC
  // ─────────────────────────────────────────────
  public update(delta: number, time: number, playerPos: THREE.Vector3) {
    const now = performance.now();

    this.npcs.forEach((npc) => {
      // 1. Hoạt ảnh nhịp thở tự nhiên (Respiration)
      const breath = Math.sin(time * 2.2 + (npc.id === "hoanhy" ? 1.0 : 0)) * 0.012;
      npc.pelvisGroup.position.y = 0.42 + breath;

      // 2. Kiểm tra khoảng cách tới người chơi
      const dist = npc.group.position.distanceTo(playerPos);

      // Nếu người chơi ở gần (< 6.5m): Chú tiểu quay mặt hướng về phía người chơi trong cung góc đón tiếp
      if (dist < 6.5) {
        const dx = playerPos.x - npc.group.position.x;
        const dz = playerPos.z - npc.group.position.z;
        const rawTargetAngle = Math.atan2(dx, dz);

        // Giới hạn góc quay tự nhiên quanh hướng đón tiếp ra ngoài (+-75 độ quanh baseRotY)
        let angleDiff = rawTargetAngle - npc.baseRotY;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        const maxTurnCone = Math.PI * 0.42; // ~75 độ
        const clampedDiff = THREE.MathUtils.clamp(angleDiff, -maxTurnCone, maxTurnCone);
        const finalTarget = npc.baseRotY + clampedDiff;

        // Xoay nhẹ nhàng mượt mà
        let diff = finalTarget - npc.group.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        npc.group.rotation.y += diff * Math.min(1.0, delta * 3.5);
      } else {
        // Trở về góc quay đón tiếp hướng thẳng ra ngoài
        let diff = npc.baseRotY - npc.group.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        npc.group.rotation.y += diff * Math.min(1.0, delta * 2.0);
      }

      // 3. Tự động chào đón khi người chơi bước đến gần cổng chùa (< 4.2m)
      if (dist < 4.2 && now - npc.lastGreetTime > 30000) {
        this.triggerGreeting(npc);
      }

      // 4. Hoạt ảnh cúi đầu bái chào (Bowing Animation)
      if (npc.isBowing) {
        if (now < npc.bowEndTime) {
          npc.bowProgress = Math.min(1.0, npc.bowProgress + delta * 3.0);
        } else {
          npc.bowProgress = Math.max(0.0, npc.bowProgress - delta * 2.0);
          if (npc.bowProgress <= 0.01) {
            npc.isBowing = false;
          }
        }
      } else {
        npc.bowProgress = Math.max(0.0, npc.bowProgress - delta * 2.0);
      }

      // Áp dụng góc cúi đầu & gập nhẹ thân trên
      const bowAngle = npc.bowProgress * 0.24; // Cúi ~14 độ
      npc.headGroup.rotation.x = bowAngle + Math.sin(time * 1.5) * 0.03;
      npc.torsoGroup.rotation.x = bowAngle * 0.6;
    });
  }

  // ─────────────────────────────────────────────
  // PHÁT ĐỘNG LỜI CHÀO & BÁI BÁI
  // ─────────────────────────────────────────────
  public triggerGreeting(npc: GateNPC) {
    const now = performance.now();
    npc.lastGreetTime = now;
    npc.isBowing = true;
    npc.bowEndTime = now + 2400; // Cúi chào trong 2.4 giây

    // Phát tiếng chuông khánh thiền thanh tịnh
    zenAudio.playSingingBowl(528);

    // Lấy câu thoại tiếp theo trong danh sách
    let quote = npc.dialogues[npc.dialogueIndex];
    if (npc.id === "trigiac") {
      const isMonk = authService.isMonk() || this.gameUI.playerName.startsWith("Thích ");
      if (isMonk) {
        quote = `A Di Đà Phật! Kính chào Thầy [${this.gameUI.playerName}]. Chúc Thầy ngày càng tinh tấn tu tập, thân tâm thường an lạc! Thầy hoan hỷ khoác y Cà Sa tương ứng phẩm vị hiện tại nhé! 🙏`;
      }
    }
    npc.dialogueIndex = (npc.dialogueIndex + 1) % npc.dialogues.length;

    // Hiển thị Speech Bubble trên đầu chú tiểu
    this.speechBubbles.show(npc.speechAnchor, quote, 5500);

    // Thêm tin nhắn vào khung chat hệ thống
    this.gameUI.appendChatMessage(npc.name, quote);

    // Tặng thưởng phước đức lần đầu trong ngày (1 lần/ngày theo chuẩn DailyActivityManager)
    if (dailyActivities.canReceiveGateBlessing()) {
      dailyActivities.recordGateBlessing();
      setTimeout(() => {
        this.gameUI.incrementCamLo(5, "Chú Tiểu chúc phúc");
        this.gameUI.appendChatMessage(
          "Chùa",
          `✨ ${npc.name} kính chúc đạo hữu thân tâm an lạc (+5 Điểm Công Đức chúc phúc)!`
        );
      }, 1200);
    }

    // Nếu là Chú Tiểu Trí Tuệ tại Lầu Chuông và hôm nay chưa thỉnh chuông, gửi thêm lời nhắc nhở
    if (npc.id === "tritue" && dailyActivities.canRingGrandBell()) {
      setTimeout(() => {
        this.gameUI.appendChatMessage(
          "Chú Tiểu Trí Tuệ",
          "🔔 Hôm nay đạo hữu chưa thỉnh Đại Hồng Chung, hãy nhấp vào chuông để gõ một hồi chuông nhận +10 Điểm Công Đức nhé! 🙏"
        );
      }, 1800);
    }

    // Nếu là Hòa Thượng Thích Trí Giác tại Đại Hùng Bảo Điện: Mở bảng Nghi Lễ Xuất Gia Thụ Giới
    if (npc.id === "trigiac") {
      setTimeout(() => {
        if (this.onOrdainRequestCb) {
          this.onOrdainRequestCb();
        }
      }, 800);
    }

    // Nếu là Chú Tiểu Tịnh Tâm tại Vườn An Lạc: Mở bảng Nhiệm Vụ Chấp Tác Công Quả
    if (npc.id === "tinhtam") {
      setTimeout(() => {
        if (this.onQuestRequestCb) {
          this.onQuestRequestCb();
        }
      }, 700);
    }
  }

  // ─────────────────────────────────────────────
  // KIỂM TRA CLICK CHUỘT VÀO NPC
  // ─────────────────────────────────────────────
  public handleRaycastClick(hitObject: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = hitObject;
    while (current) {
      if (current.name === "npc_gate_annhien") {
        const npc = this.npcs.find((n) => n.id === "annhien");
        if (npc) {
          this.triggerGreeting(npc);
          return true;
        }
      } else if (current.name === "npc_gate_hoanhy") {
        const npc = this.npcs.find((n) => n.id === "hoanhy");
        if (npc) {
          this.triggerGreeting(npc);
          return true;
        }
      } else if (current.name === "npc_gate_tritue") {
        const npc = this.npcs.find((n) => n.id === "tritue");
        if (npc) {
          this.triggerGreeting(npc);
          return true;
        }
      } else if (current.name === "npc_mainhall_trigiac") {
        const npc = this.npcs.find((n) => n.id === "trigiac");
        if (npc) {
          this.triggerGreeting(npc);
          if (this.onOrdainRequestCb) {
            this.onOrdainRequestCb();
          }
          return true;
        }
      } else if (current.name === "npc_garden_tinhtam") {
        const npc = this.npcs.find((n) => n.id === "tinhtam");
        if (npc) {
          this.triggerGreeting(npc);
          if (this.onQuestRequestCb) {
            this.onQuestRequestCb();
          }
          return true;
        }
      }
      current = current.parent;
    }
    return false;
  }
}
