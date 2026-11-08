/**
 * TempleWorld.ts - Thế giới Chùa 3D Kiến Trúc Cổ Truyền Việt Nam
 * - Cổng Tam Quan sơn son thếp vàng, mái ngói đao cong, đèn lồng đỏ treo mái
 * - ĐẠI HÙNG BẢO ĐIỆN NỘI THẤT MỞ: Ban thờ Tam Thế Phật uy nghiêm (Đức Phật Thích Ca, Bồ Tát Quán Thế Âm, Bồ Tát Đại Thế Chí ngự tòa sen vàng hào quang sáng chói)
 * - Ban thờ ngũ sự, lư hương, nến đồng, bình hoa sen, chuông gia trì, mõ gỗ, bồ đoàn thiền tọa
 * - Lầu Chuông Đại Hồng Chung, đèn đá Thạch Đăng lục giác cổ kính
 * - Cây Bồ Đề cổ thụ rễ nổi tán xòe nhiều tầng, rặng tre xanh, khóm hoa sen cạn
 * - Hồ sen trong biếc, cầu gỗ bắc ngang có trụ chạm búp sen
 */

import * as THREE from "three";

export class TempleWorld {
  public scene: THREE.Scene;
  public groundMesh!: THREE.Mesh;
  public hallFloorMesh!: THREE.Mesh;
  public colliders: THREE.Box3[] = [];
  public buddhaStatues: THREE.Object3D[] = [];
  public altarGroup!: THREE.Group;
  public cushionMeshes: THREE.Object3D[] = [];
  public cushionPositions: {
    x: number;
    y: number;
    z: number;
    type?: "abbot" | "senior" | "lay";
    seniorRank?: number;
    name?: string;
    label?: string;
  }[] = [];

  // Vùng hồ sen
  public pondBounds = { minX: -12.5, maxX: 12.5, minZ: -4.5, maxZ: 6.5 };
  public bridgeBounds = { minX: -1.4, maxX: 1.4, minZ: -4.8, maxZ: 6.8 };

  // Danh sách đèn lồng & đèn đá để thắp sáng ban đêm
  public stoneLampLights: THREE.PointLight[] = [];
  public grandBellMesh?: THREE.Mesh;
  public incenseDingMesh?: THREE.Mesh;
  public bridgeDeckMesh?: THREE.Mesh;
  public grandIncenseBurnerMesh?: THREE.Object3D;
  public fruitPlatters: THREE.Object3D[] = [];
  public altarBellMesh?: THREE.Object3D;
  public altarFishMesh?: THREE.Object3D;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public build() {
    // Lưu ý: Ánh sáng Sun/Ambient/Hemi và Bầu trời được quản lý tập trung bởi DayNightSystem
    // để tránh trùng lặp 2 pass đổ bóng 2048x2048 gây nghẽn GPU/lag giật.
    this.createCourtyardGround();
    this.createPavedStonePaths();
    this.createPondAndShoreline();
    this.createOrnateWoodenBridge();
    this.createTempleMainHall();
    this.createImperialGate();
    this.createBellTower();
    this.createAncientBodhiTrees();
    this.createHexagonalStoneLanterns();
    this.createBambooGroves();
    this.createIncenseDingAndSmoke();
    this.createFlowerPatches();
    this.createZenGardens();
    this.createEnclosureWalls();
    this.createScenicMistyMountainPerimeter();
  }

  // ─────────────────────────────────────────────
  // HỆ THỐNG KIỂM TRA VA CHẠM THẾ GIỚI CHÙA (WORLD COLLISION SYSTEM)
  // Ngăn chặn 100% hiện tượng đi xuyên tường chính điện, rơi xuống hồ, hoặc đi ra ngoài khuôn viên
  // ─────────────────────────────────────────────
  public isBlocked(x: number, z: number, radius = 0.35): boolean {
    // 1. Giới hạn toàn khuôn viên mở rộng quanh chùa (Expanded Island Sanctuary Boundary)
    // Tăng mạnh khoảng cách nhân vật có thể đi dạo quanh chùa: X in [-55, 55], Z in [-56, 56]
    if (x - radius < -55.0 || x + radius > 55.0) return true;
    if (z - radius < -56.0 || z + radius > 56.0) return true;

    // Tường bao mặt tiền: z = 25.5, mở cửa cổng Tam Quan tại x in [-7.4, 7.4]
    // Chỉ chặn 2 bên cánh gà tường mặt tiền: [-28.5, -7.3] và [7.3, 28.5]
    if (z >= 24.6 && z <= 26.4 && Math.abs(x) >= 7.3 && Math.abs(x) <= 28.5) return true;

    // Tường bao Tả & Hữu hai bên (x = ±28.5, mở cổng vòm ra hoa viên ngoại cảnh tại z in [-2.0, 2.0])
    if (Math.abs(x) >= 27.8 && Math.abs(x) <= 29.2) {
      if ((z >= -56.5 && z <= -2.0) || (z >= 2.0 && z <= 25.8)) {
        return true;
      }
    }

    // Tường hậu phía sau cùng: z = -56.0, từ x in [-28.5, 28.5]
    if (z <= -55.2 && z >= -56.8 && Math.abs(x) <= 28.5) return true;

    // 2. Đại Hùng Bảo Điện (Main Sanctuary Hall)
    // Mặt tiền: tường trước tại z = -13.25, chỉ mở cửa chính giữa tại x in [-7.6, 7.6]
    if (z >= -13.9 && z <= -12.6 && Math.abs(x) >= 7.5 && Math.abs(x) <= 19.8) return true;

    // Tường hậu phía sau bàn thờ tại z = -48.75
    if (z <= -47.8 && z >= -49.5 && Math.abs(x) <= 19.8) return true;

    // Tường bên trái & phải của Chính Điện: từ z = -12.8 đến z = -49.0
    if (z <= -12.8 && z >= -49.0) {
      if (Math.abs(x) >= 18.5 && Math.abs(x) <= 20.5) return true;
    }

    // Ban thờ Tam Thế Phật uy nghiêm (z = -44.0, sâu ra z = -40.8, rộng x in [-10.8, 10.8])
    // Ngăn người chơi không đi xuyên qua bàn thờ và tôn tượng Phật
    if (z <= -40.8 && z >= -47.8 && Math.abs(x) <= 10.8) return true;

    // 3. Hồ Sen (Pond & Bridge)
    const pb = this.pondBounds;
    const bb = this.bridgeBounds;
    const inPond = x >= pb.minX && x <= pb.maxX && z >= pb.minZ && z <= pb.maxZ;
    const onBridge = x >= bb.minX && x <= bb.maxX && z >= bb.minZ && z <= bb.maxZ;
    if (inPond && !onBridge) return true;

    // 4. Các vật cản tĩnh đã đăng ký trong colliders (cột, lầu chuông, thạch đăng, cây cổ thụ, hòn non bộ)
    const minV = new THREE.Vector3(x - radius, 0.1, z - radius);
    const maxV = new THREE.Vector3(x + radius, 2.0, z + radius);
    const box = new THREE.Box3(minV, maxV);
    for (let i = 0; i < this.colliders.length; i++) {
      if (this.colliders[i].intersectsBox(box)) return true;
    }

    return false;
  }


  // ─────────────────────────────────────────────
  // HOA VĂN & KẾT CẤU GẠCH ĐÁ CỔ SÂN CHÙA (PROCEDURAL STONE TEXTURES)
  // ─────────────────────────────────────────────
  private generateCourtyardStoneTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // 1. Nền sỏi vữa rãnh tối giữa các viên đá (deep slate mortar)
    ctx.fillStyle = "#363a33";
    ctx.fillRect(0, 0, 1024, 1024);

    // Lát đá 8 hàng x 8 cột (mỗi viên ~128x128px), xếp so le (running bond)
    const rows = 8;
    const cols = 8;
    const tileH = 1024 / rows;
    const tileW = 1024 / cols;
    const gap = 3.5;

    // Bảng màu đá xanh Ninh Bình & phiến đá cổ phong hóa
    const stonePalettes = [
      { base: "#9ca197", edge: "#81867c", light: "#b3b9ae" },
      { base: "#93988f", edge: "#7a7f76", light: "#aab0a6" },
      { base: "#8c9288", edge: "#72776d", light: "#a3a99f" },
      { base: "#a4aaa0", edge: "#898e85", light: "#bac0b6" },
      { base: "#858a80", edge: "#6f7369", light: "#9da398" },
      { base: "#90968c", edge: "#777c72", light: "#a6ac9f" },
      { base: "#9fa59b", edge: "#848980", light: "#b5bbb1" },
      { base: "#888e84", edge: "#70756b", light: "#9fa59b" },
    ];

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2 === 1) ? tileW * 0.5 : 0;
      for (let c = -1; c <= cols; c++) {
        const x = c * tileW + offsetX + gap * 0.5;
        const y = r * tileH + gap * 0.5;
        const w = tileW - gap;
        const h = tileH - gap;

        if (x + w < 0 || x > 1024) continue;

        const pIndex = Math.abs((r * 13 + c * 7 + (r + c) * 3) % stonePalettes.length);
        const p = stonePalettes[pIndex];

        // Gradient vát cạnh (bevel & ambient occlusion)
        const cx = x + w * 0.5;
        const cy = y + h * 0.5;
        const rad = Math.max(w, h) * 0.7;
        const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, rad);
        grad.addColorStop(0, p.light);
        grad.addColorStop(0.65, p.base);
        grad.addColorStop(1, p.edge);

        ctx.fillStyle = grad;
        ctx.beginPath();
        const cr = 3.0;
        ctx.moveTo(x + cr, y);
        ctx.lineTo(x + w - cr, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + cr);
        ctx.lineTo(x + w, y + h - cr);
        ctx.quadraticCurveTo(x + w, y + h, x + w - cr, y + h);
        ctx.lineTo(x + cr, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - cr);
        ctx.lineTo(x, y + cr);
        ctx.quadraticCurveTo(x, y, x + cr, y);
        ctx.closePath();
        ctx.fill();

        // Thêm hạt thạch anh & vân đá cổ phong hóa
        for (let s = 0; s < 40; s++) {
          const sx = x + 3 + Math.random() * (w - 6);
          const sy = y + 3 + Math.random() * (h - 6);
          const sr = 0.5 + Math.random() * 1.5;
          ctx.fillStyle = Math.random() > 0.5 ? "rgba(255, 255, 255, 0.12)" : "rgba(35, 40, 32, 0.14)";
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Đốm rêu xanh chùa cổ tại các góc khe vữa (ancient temple moss)
    for (let m = 0; m < 140; m++) {
      const mx = Math.random() * 1024;
      const my = Math.random() * 1024;
      const mRad = 4 + Math.random() * 14;
      const mGrad = ctx.createRadialGradient(mx, my, 1, mx, my, mRad);
      mGrad.addColorStop(0, "rgba(48, 86, 44, 0.55)");
      mGrad.addColorStop(0.6, "rgba(68, 114, 60, 0.35)");
      mGrad.addColorStop(1, "rgba(40, 70, 36, 0)");
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.arc(mx, my, mRad, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private generateCourtyardStoneBumpMap(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    // Nền rãnh vữa đen sâu
    ctx.fillStyle = "#181818";
    ctx.fillRect(0, 0, 512, 512);

    const rows = 8;
    const cols = 8;
    const tileH = 512 / rows;
    const tileW = 512 / cols;
    const gap = 2.0;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2 === 1) ? tileW * 0.5 : 0;
      for (let c = -1; c <= cols; c++) {
        const x = c * tileW + offsetX + gap * 0.5;
        const y = r * tileH + gap * 0.5;
        const w = tileW - gap;
        const h = tileH - gap;

        if (x + w < 0 || x > 512) continue;

        const cx = x + w * 0.5;
        const cy = y + h * 0.5;
        const rad = Math.max(w, h) * 0.7;
        const grad = ctx.createRadialGradient(cx, cy, 3, cx, cy, rad);
        grad.addColorStop(0, "#d8d8d8");
        grad.addColorStop(0.7, "#b0b0b0");
        grad.addColorStop(1, "#404040");

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        for (let s = 0; s < 25; s++) {
          const sx = x + Math.random() * w;
          const sy = y + Math.random() * h;
          const val = Math.floor(Math.random() * 50 - 25);
          ctx.fillStyle = val > 0 ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.12)";
          ctx.fillRect(sx, sy, 1.5, 1.5);
        }
      }
    }

    const bump = new THREE.CanvasTexture(canvas);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.RepeatWrapping;
    return bump;
  }

  // ─────────────────────────────────────────────
  // MẶT ĐẤT SÂN CHÙA (NỀN GẠCH ĐÁ CỔ KÍNH & HỐ TRẦM LÒNG HỒ SEN)
  // ─────────────────────────────────────────────
  private createCourtyardGround() {
    const geo = new THREE.PlaneGeometry(120, 120, 80, 80);
    geo.rotateX(-Math.PI / 2);

    const colors = new Float32Array(geo.attributes.position.count * 3);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Kiểm tra xem đỉnh có nằm trong lòng hồ sen hay không (Tâm z=1.0, X=[-12.5, 12.5], Z=[-4.5, 6.5])
      const inBasinInner = Math.abs(x) <= 12.5 && Math.abs(z - 1.0) <= 5.5;
      const inEmbankmentFoot = Math.abs(x) <= 13.5 && Math.abs(z - 1.0) <= 6.5;

      if (inBasinInner) {
        // Hạ sâu đáy đất xuống -1.2m và tô màu bùn phù sa sẫm
        pos.setY(i, -1.2);
        colors[i * 3] = 0.05;
        colors[i * 3 + 1] = 0.09;
        colors[i * 3 + 2] = 0.06;
      } else if (inEmbankmentFoot) {
        // Chân móng bờ kè đá hoa cương (hạ xuống -0.45m để ẩn hoàn toàn dưới khối đá)
        pos.setY(i, -0.45);
        colors[i * 3] = 0.08;
        colors[i * 3 + 1] = 0.11;
        colors[i * 3 + 2] = 0.08;
      } else {
        // Mặt sân chùa lát đá Ninh Bình cổ kính (nhận trọn vẹn vân texture đá và bump map)
        pos.setY(i, 0);
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 1.0;
      }
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const stoneTex = this.generateCourtyardStoneTexture();
    stoneTex.repeat.set(24, 24);
    const bumpTex = this.generateCourtyardStoneBumpMap();
    bumpTex.repeat.set(24, 24);

    const mat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      bumpMap: bumpTex,
      bumpScale: 0.05,
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.03,
    });

    this.groundMesh = new THREE.Mesh(geo, mat);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // ─────────────────────────────────────────────
    // ĐẠI DƯƠNG / BIỂN XANH BAO LA QUANH ĐẢO CHÙA (SURROUNDING CALM BLUE OCEAN WATER)
    // Tỏa rộng bao la bên ngoài vùng gạch nền sân chùa (120m x 120m),
    // tạo nên cảnh biển biếc thanh lương, tĩnh tại, chuẩn bị không gian mở rộng chùa sau này!
    // ─────────────────────────────────────────────
    const oceanGeo = new THREE.PlaneGeometry(1600, 1600, 8, 8);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x1b4958, // Màu xanh biển thanh lương, ngọc bích
      roughness: 0.16,
      metalness: 0.22,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.set(0, -0.32, 0); // Thấp hơn mặt đất sân chùa 0.32m
    oceanMesh.receiveShadow = true;
    oceanMesh.name = "surrounding_ocean_plane";
    this.scene.add(oceanMesh);
  }

  // ─────────────────────────────────────────────
  // ĐƯỜNG LÁT ĐÁ HOA CƯƠNG CỔ KÍNH & PHIẾN CHẠM HOA SEN
  // ─────────────────────────────────────────────
  private createPavedStonePaths() {
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0xd2ccc2,
      roughness: 0.68,
      metalness: 0.04,
    });

    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x6e6962,
      roughness: 0.85,
    });

    const lotusMedallionMat = new THREE.MeshStandardMaterial({
      color: 0xc89b42,
      roughness: 0.45,
      metalness: 0.4,
    });

    // Đoạn 1: Trục đường chính từ Cổng Tam Quan dẫn tới bờ nam Cầu Hồ Sen (z = 7.0 đến z = 25.5)
    const southPath = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 18.5), stoneMat);
    southPath.position.set(0, 0.04, 16.25);
    southPath.receiveShadow = true;
    this.scene.add(southPath);

    [-1.65, 1.65].forEach((bx) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 18.5), borderMat);
      curb.position.set(bx, 0.06, 16.25);
      curb.castShadow = true;
      curb.receiveShadow = true;
      this.scene.add(curb);
    });

    // Các phiến đá chạm hoa sen nổi dọc theo trục đường chính Nam
    [9.0, 13.0, 17.0, 21.0, 24.5].forEach((lz) => {
      this.createLotusMedallion(0, 0.082, lz, 0.45, lotusMedallionMat);
    });

    // Đoạn 2: Trục đường chính từ bờ bắc Cầu Hồ Sen dẫn tới sân trước Chính Điện (z = -5.0 đến z = -11.0)
    const northPath = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 6.0), stoneMat);
    northPath.position.set(0, 0.04, -8.0);
    northPath.receiveShadow = true;
    this.scene.add(northPath);

    [-1.65, 1.65].forEach((bx) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 6.0), borderMat);
      curb.position.set(bx, 0.06, -8.0);
      curb.castShadow = true;
      curb.receiveShadow = true;
      this.scene.add(curb);
    });

    [-6.5, -9.5].forEach((lz) => {
      this.createLotusMedallion(0, 0.082, lz, 0.45, lotusMedallionMat);
    });

    // Sân gạch rộng trước thềm Chính Điện
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(22, 0.08, 10), stoneMat);
    plaza.position.set(0, 0.04, -11);
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    // Đại hoa sen trung tâm sân Chính Điện
    this.createLotusMedallion(0, 0.082, -11.0, 1.2, lotusMedallionMat);

    // Bậc tam cấp dẫn lên thềm chùa
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(7.0 - i * 0.5, 0.14, 0.6),
        borderMat
      );
      step.position.set(0, 0.07 + i * 0.14, -15.2 + i * 0.55);
      step.castShadow = true;
      step.receiveShadow = true;
      this.scene.add(step);
    }
  }

  private createLotusMedallion(x: number, y: number, z: number, radius: number, mat: THREE.Material) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const center = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.35, radius * 0.35, 0.015, 16), mat);
    group.add(center);

    for (let p = 0; p < 8; p++) {
      const ang = (p / 8) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.45, 0.018, radius * 0.28), mat);
      petal.position.set(Math.cos(ang) * radius * 0.65, 0, Math.sin(ang) * radius * 0.65);
      petal.rotation.y = -ang;
      group.add(petal);
    }

    this.scene.add(group);
  }

  // ─────────────────────────────────────────────
  // HỒ SEN TRONG BIẾC & BỜ ĐÁ HOA CƯƠNG CỔ KÍNH
  // ─────────────────────────────────────────────
  private generatePondBedTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    // Nền bùn phù sa hồ sen sẫm màu
    ctx.fillStyle = "#0c2018";
    ctx.fillRect(0, 0, 512, 512);

    // Vẽ hàng trăm viên sỏi đá cuội tự nhiên đa sắc (pebbles & river stones)
    const pebbleColors = [
      "#26382f", "#33443a", "#425044", "#1b2b22",
      "#15261c", "#394a3b", "#49584d", "#23382c"
    ];

    for (let i = 0; i < 450; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const rx = 3 + Math.random() * 8;
      const ry = 2 + Math.random() * 6;
      const rot = Math.random() * Math.PI;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.fillStyle = pebbleColors[Math.floor(Math.random() * pebbleColors.length)];
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Đốm sáng trên sỏi cuội
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.ellipse(-rx * 0.25, -ry * 0.25, rx * 0.45, ry * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Đốm rêu xanh thủy sinh
    for (let j = 0; j < 80; j++) {
      const mx = Math.random() * 512;
      const my = Math.random() * 512;
      const mRad = 12 + Math.random() * 24;
      const grad = ctx.createRadialGradient(mx, my, 2, mx, my, mRad);
      grad.addColorStop(0, "rgba(22, 85, 46, 0.50)");
      grad.addColorStop(1, "rgba(12, 32, 24, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mx, my, mRad, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 2.5);
    return texture;
  }

  private createPondAndShoreline() {
    const pondGroup = new THREE.Group();

    // 1. Đáy hồ sen đào sâu âm đất (y = -0.80m)
    const pondFloorMat = new THREE.MeshStandardMaterial({
      map: this.generatePondBedTexture(),
      roughness: 0.88,
      metalness: 0.08,
    });
    const pondFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(25.2, 11.2),
      pondFloorMat
    );
    pondFloor.rotateX(-Math.PI / 2);
    pondFloor.position.set(0, -0.80, 1.0);
    pondFloor.receiveShadow = true;
    pondGroup.add(pondFloor);

    // 2. Rải đá cuội và sỏi suối tự nhiên dưới đáy hồ sen (y = -0.76m)
    const pebbleMat = new THREE.MeshStandardMaterial({
      color: 0x36433b,
      roughness: 0.92,
    });
    const riverPebblePositions = [
      [-6, -0.76, -1.5], [-8, -0.75, 2], [7, -0.76, -2.5],
      [9, -0.75, 2.5], [-3, -0.76, 4], [4, -0.75, -3],
      [-10, -0.75, -2], [10, -0.76, -1], [-4, -0.76, -3.5],
      [6, -0.75, 3.5], [-1.8, -0.76, 0], [1.8, -0.75, 2],
      [-7.5, -0.76, 3.8], [8.2, -0.76, -1.8], [-11, -0.75, 1.2],
      [11, -0.75, 3.2], [-5, -0.76, 1.5], [5.5, -0.76, -0.5]
    ];
    riverPebblePositions.forEach(([rx, ry, rz]) => {
      const pebble = new THREE.Mesh(
        new THREE.SphereGeometry(0.25 + Math.random() * 0.20, 7, 5),
        pebbleMat
      );
      pebble.position.set(rx, ry, rz);
      pebble.scale.set(1.4, 0.55, 1.2);
      pebble.rotation.y = Math.random() * Math.PI;
      pebble.receiveShadow = true;
      pondGroup.add(pebble);
    });

    // 3. Tường kè đá xanh rêu cổ lòng hồ (chìm sâu từ y = +0.20m xuống -0.80m, cao 1.0m)
    const innerWallMat = new THREE.MeshStandardMaterial({
      color: 0x424640,
      roughness: 0.86,
      metalness: 0.05,
    });
    // Gờ ngấn nước sẫm màu nơi tiếp giáp mặt nước y = -0.16m
    const waterlineMat = new THREE.MeshBasicMaterial({
      color: 0x182921,
      transparent: true,
      opacity: 0.75,
    });

    const retainingWalls = [
      // Bờ Bắc
      { pos: [0, -0.30, -4.45], size: [25.0, 1.0, 0.32], wlPos: [0, -0.16, -4.30], wlSize: [25.0, 0.08, 0.04] },
      // Bờ Nam
      { pos: [0, -0.30, 6.45], size: [25.0, 1.0, 0.32], wlPos: [0, -0.16, 6.30], wlSize: [25.0, 0.08, 0.04] },
      // Bờ Tây
      { pos: [-12.45, -0.30, 1.0], size: [0.32, 1.0, 11.2], wlPos: [-12.30, -0.16, 1.0], wlSize: [0.04, 0.08, 11.2] },
      // Bờ Đông
      { pos: [12.45, -0.30, 1.0], size: [0.32, 1.0, 11.2], wlPos: [12.30, -0.16, 1.0], wlSize: [0.04, 0.08, 11.2] },
    ];

    retainingWalls.forEach((w) => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(w.size[0], w.size[1], w.size[2]),
        innerWallMat
      );
      wall.position.set(w.pos[0], w.pos[1], w.pos[2]);
      wall.receiveShadow = true;
      pondGroup.add(wall);

      const mark = new THREE.Mesh(
        new THREE.BoxGeometry(w.wlSize[0], w.wlSize[1], w.wlSize[2]),
        waterlineMat
      );
      mark.position.set(w.wlPos[0], w.wlPos[1], w.wlPos[2]);
      pondGroup.add(mark);
    });

    // 4. Bờ kè đá hoa cương nguyên khối nổi bật trên mặt đất (Cao +0.20m so với mặt cỏ, rộng 0.90m)
    const graniteRimMat = new THREE.MeshStandardMaterial({
      color: 0x6e6961,
      roughness: 0.68,
      metalness: 0.06,
    });
    const bullnoseMat = new THREE.MeshStandardMaterial({
      color: 0x58534c,
      roughness: 0.72,
    });

    const shoreRims = [
      // Bờ Bắc (z = -4.85)
      { pos: [0, 0.10, -4.85], size: [26.6, 0.20, 0.90] },
      // Bờ Nam (z = 6.85)
      { pos: [0, 0.10, 6.85], size: [26.6, 0.20, 0.90] },
      // Bờ Tây (x = -12.85)
      { pos: [-12.85, 0.10, 1.0], size: [0.90, 0.20, 12.6] },
      // Bờ Đông (x = 12.85)
      { pos: [12.85, 0.10, 1.0], size: [0.90, 0.20, 12.6] },
    ];

    shoreRims.forEach((r) => {
      const rim = new THREE.Mesh(
        new THREE.BoxGeometry(r.size[0], r.size[1], r.size[2]),
        graniteRimMat
      );
      rim.position.set(r.pos[0], r.pos[1], r.pos[2]);
      rim.castShadow = true;
      rim.receiveShadow = true;
      pondGroup.add(rim);
    });

    // Gờ vát bo tròn viền bờ kè mép trong (Bullnose Roll)
    const bnNorth = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 25.2, 8), bullnoseMat);
    bnNorth.rotation.z = Math.PI / 2;
    bnNorth.position.set(0, 0.20, -4.42);
    pondGroup.add(bnNorth);

    const bnSouth = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 25.2, 8), bullnoseMat);
    bnSouth.rotation.z = Math.PI / 2;
    bnSouth.position.set(0, 0.20, 6.42);
    pondGroup.add(bnSouth);

    const bnWest = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 11.2, 8), bullnoseMat);
    bnWest.rotation.x = Math.PI / 2;
    bnWest.position.set(-12.42, 0.20, 1.0);
    pondGroup.add(bnWest);

    const bnEast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 11.2, 8), bullnoseMat);
    bnEast.rotation.x = Math.PI / 2;
    bnEast.position.set(12.42, 0.20, 1.0);
    pondGroup.add(bnEast);

    // 5. 4 Tháp Đèn Đá Cổ Sân Chùa tại 4 góc hồ sen (Anchoring Pagoda Stone Lanterns)
    const cornerLanternPositions = [
      [-12.85, 0.20, -4.85],
      [12.85, 0.20, -4.85],
      [-12.85, 0.20, 6.85],
      [12.85, 0.20, 6.85],
    ];

    cornerLanternPositions.forEach(([cx, cy, cz]) => {
      const lanternGroup = new THREE.Group();
      lanternGroup.position.set(cx, cy, cz);

      // Chân đế bát giác
      const baseMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.48, 0.16, 8),
        graniteRimMat
      );
      baseMesh.position.y = 0.08;
      lanternGroup.add(baseMesh);

      // Trụ đá chạm khắc cánh sen
      const pillarMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 0.52, 8),
        graniteRimMat
      );
      pillarMesh.position.y = 0.42;
      lanternGroup.add(pillarMesh);

      // Đài sen đỡ buồng đèn
      const lotusPlinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.24, 0.12, 8),
        bullnoseMat
      );
      lotusPlinth.position.y = 0.74;
      lanternGroup.add(lotusPlinth);

      // Buồng đèn đá có 4 cửa sổ đón gió
      const fireChamber = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.32, 0.36),
        new THREE.MeshStandardMaterial({
          color: 0x4a463e,
          roughness: 0.75,
        })
      );
      fireChamber.position.y = 0.96;
      lanternGroup.add(fireChamber);

      // Lõi đèn phát sáng vàng ấm
      const coreLightMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd180 })
      );
      coreLightMesh.position.y = 0.96;
      lanternGroup.add(coreLightMesh);

      // Lõi đèn phát quang rực rỡ (emissive), không cần dùng PointLight nặng để giữ 60 FPS mượt mà

      // Mái đá uốn cong 4 góc (chạm đầu đao truyền thống)
      const roofMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.58, 0.20, 4),
        graniteRimMat
      );
      roofMesh.rotation.y = Math.PI / 4;
      roofMesh.position.y = 1.22;
      lanternGroup.add(roofMesh);

      // Búp sen / Hồ lô đỉnh tháp bằng đồng vàng
      const topFinial = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.14, 8),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.7 })
      );
      topFinial.position.y = 1.39;
      lanternGroup.add(topFinial);

      pondGroup.add(lanternGroup);
    });

    // 6. Trụ đá chạm búp sen phong thủy (Stone Balustrade Lotus Posts) dọc 2 bờ Bắc & Nam
    const balustradeX = [-10.2, -7.0, -3.8, 3.8, 7.0, 10.2];
    [-4.85, 6.85].forEach((bz) => {
      balustradeX.forEach((bx) => {
        const postGroup = new THREE.Group();
        postGroup.position.set(bx, 0.20, bz);

        // Thân cột đá vuông chạm vát
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.55, 0.18),
          graniteRimMat
        );
        post.position.y = 0.275;
        post.castShadow = true;
        postGroup.add(post);

        // Đài búp sen đá
        const budBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.08, 0.08, 8),
          bullnoseMat
        );
        budBase.position.y = 0.59;
        postGroup.add(budBase);

        const lotusBud = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.16, 8),
          new THREE.MeshStandardMaterial({ color: 0xb5af9b, roughness: 0.65 })
        );
        lotusBud.position.y = 0.71;
        postGroup.add(lotusBud);

        pondGroup.add(postGroup);
      });
    });

    // 7. Bãi đá tảng tự nhiên ven bờ (Natural River Boulders breaking geometric lines)
    const naturalRockMat = new THREE.MeshStandardMaterial({
      color: 0x5a544b,
      roughness: 0.90,
    });
    const naturalRockClusters = [
      // Góc Tây Bắc
      { x: -10.5, y: -0.05, z: -3.8, s: [1.2, 0.55, 0.9], r: 0.4 },
      { x: -11.4, y: -0.08, z: -3.3, s: [0.8, 0.45, 0.7], r: -0.8 },
      // Góc Đông Bắc
      { x: 10.5, y: -0.05, z: -3.8, s: [1.1, 0.52, 0.85], r: -0.5 },
      { x: 11.5, y: -0.08, z: -3.2, s: [0.75, 0.42, 0.75], r: 0.7 },
      // Góc Tây Nam
      { x: -10.8, y: -0.05, z: 5.6, s: [1.3, 0.58, 0.95], r: 0.6 },
      { x: -9.6, y: -0.08, z: 5.8, s: [0.8, 0.45, 0.7], r: -0.3 },
      // Góc Đông Nam
      { x: 10.6, y: -0.05, z: 5.6, s: [1.25, 0.56, 0.9], r: -0.7 },
      { x: 11.6, y: -0.08, z: 5.4, s: [0.7, 0.40, 0.65], r: 0.5 },
    ];

    naturalRockClusters.forEach((rc) => {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rc.s[0] * 0.5, 1),
        naturalRockMat
      );
      rock.position.set(rc.x, rc.y, rc.z);
      rock.scale.set(1.0, rc.s[1] / (rc.s[0] * 0.5), rc.s[2] / (rc.s[0] * 0.5));
      rock.rotation.set(0.1, rc.r, 0.1);
      rock.castShadow = true;
      rock.receiveShadow = true;
      pondGroup.add(rock);
    });

    this.scene.add(pondGroup);

    this.createLotusColonies();
  }

  private createLotusColonies() {
    // 16 cụm hoa sen thanh thoát phân bố hài hòa 2 bên cánh hồ
    const coords = [
      // Nhánh Tây hồ sen (X < 0)
      [-4.0, 3.2], [-6.8, -1.2], [-8.5, 3.8], [-10.2, 0.8],
      [-5.2, -2.4], [-9.5, -2.6], [-3.2, -3.0], [-7.5, 1.8],
      // Nhánh Đông hồ sen (X > 0)
      [4.2, -2.2], [6.5, 2.5], [8.8, -2.0], [10.2, 1.5],
      [5.0, 4.2], [9.2, 4.0], [3.5, 2.8], [7.2, -3.2],
    ];

    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x114a27,
      roughness: 0.82,
    });

    const padMat = new THREE.MeshStandardMaterial({
      color: 0x1e824c,
      roughness: 0.52,
      side: THREE.DoubleSide,
    });

    const pinkPetalMat = new THREE.MeshStandardMaterial({
      color: 0xf06292,
      emissive: 0xad1457,
      emissiveIntensity: 0.15,
      roughness: 0.42,
    });

    const whitePetalMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfce4ec,
      emissiveIntensity: 0.10,
      roughness: 0.40,
    });

    const pistilMat = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      emissive: 0xd4ac0d,
      emissiveIntensity: 0.30,
    });

    coords.forEach(([x, z], idx) => {
      const group = new THREE.Group();
      // Mặt nước ở y = -0.16m, lá sen nổi nhẹ trên nước tại y = -0.15m
      group.position.set(x, -0.15, z);

      // Cuống hoa sen vươn dài từ đáy hồ (-0.80m) lên mặt nước (-0.15m) -> dài 0.65m
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.65, 6), stemMat);
      stem.position.y = -0.325;
      group.add(stem);

      // Lá sen chính to bản (đường kính ~1.2m)
      const padGeo = new THREE.CircleGeometry(0.60 + (idx % 3) * 0.08, 18);
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.005;
      group.add(pad);

      // Lá sen phụ nhỏ kèm theo bên cạnh
      const subPad = new THREE.Mesh(new THREE.CircleGeometry(0.35, 14), padMat);
      subPad.rotation.x = -Math.PI / 2;
      subPad.position.set(0.45, 0.006, 0.35);
      group.add(subPad);

      // Chọn sen hồng truyền thống hoặc bạch liên thanh khiết xen kẽ
      const chosenPetalMat = idx % 3 === 0 ? whitePetalMat : pinkPetalMat;

      // Hoa sen nở rực rỡ
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 4), chosenPetalMat);
        petal.position.set(Math.cos(a) * 0.17, 0.12, Math.sin(a) * 0.17);
        petal.scale.set(1.15, 0.45, 1.7);
        petal.rotation.y = a;
        group.add(petal);
      }

      // Nhụy hoa sen vàng óng
      const pistil = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), pistilMat);
      pistil.position.y = 0.16;
      group.add(pistil);

      // Búp sen non vươn cao đón sương sớm
      const budStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.35, 6), stemMat);
      budStem.position.set(-0.35, 0.12, -0.25);
      group.add(budStem);

      const youngBud = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.16, 8), chosenPetalMat);
      youngBud.position.set(-0.35, 0.35, -0.25);
      group.add(youngBud);

      this.scene.add(group);
    });
  }

  // ─────────────────────────────────────────────
  // CẦU GỖ AN LẠC BẮC QUA HỒ SEN
  // ─────────────────────────────────────────────
  private createOrnateWoodenBridge() {
    const bridgeGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6d3617, roughness: 0.62 });
    const redLacquer = new THREE.MeshStandardMaterial({ color: 0x94291e, roughness: 0.52 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.28, metalness: 0.75 });
    const darkPilingMat = new THREE.MeshStandardMaterial({ color: 0x3b2012, roughness: 0.85 });
    const abutmentMat = new THREE.MeshStandardMaterial({ color: 0x6e6961, roughness: 0.70 });

    // 1. Mặt sàn cầu gỗ lim kiên cố (rộng 2.6m, dài 11.6m, độ cao y = 0.18m)
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 11.6), woodMat);
    deck.position.set(0, 0.18, 1.0);
    deck.castShadow = true;
    deck.receiveShadow = true;
    bridgeGroup.add(deck);
    this.bridgeDeckMesh = deck;

    // 2. Mố cầu bằng đá hoa cương tại 2 đầu cầu (kết nối êm ái với trục đường chính)
    [-4.95, 6.95].forEach((az) => {
      const abutment = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.22, 0.75), abutmentMat);
      abutment.position.set(0, 0.11, az);
      abutment.receiveShadow = true;
      bridgeGroup.add(abutment);
    });

    // 3. Hệ thống cọc trụ gỗ lim chịu lực cắm sâu xuống đáy hồ sen (từ y = 0.10m xuống -0.80m -> cao 0.95m)
    const pilingZ = [-3.2, -0.8, 1.6, 4.0];
    pilingZ.forEach((pz) => {
      [-1.05, 1.05].forEach((px) => {
        const piling = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.13, 0.95, 8),
          darkPilingMat
        );
        piling.position.set(px, -0.35, pz);
        piling.receiveShadow = true;
        bridgeGroup.add(piling);
      });

      // Dầm xà ngang giằng 2 trụ cầu dưới sàn
      const crossBeam = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 0.12, 0.16),
        darkPilingMat
      );
      crossBeam.position.set(0, 0.05, pz);
      bridgeGroup.add(crossBeam);
    });

    // 4. Lan can sơn son thếp vàng & trụ chạm búp sen 2 bên thành cầu
    [-1.2, 1.2].forEach((rx) => {
      const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 11.6, 8), redLacquer);
      topRail.rotation.x = Math.PI / 2;
      topRail.position.set(rx, 0.72, 1.0);
      bridgeGroup.add(topRail);

      const midRail = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 11.6, 8), redLacquer);
      midRail.rotation.x = Math.PI / 2;
      midRail.position.set(rx, 0.44, 1.0);
      bridgeGroup.add(midRail);

      for (let z = -4.5; z <= 6.5; z += 2.2) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.88, 8), redLacquer);
        post.position.set(rx, 0.46, z);
        bridgeGroup.add(post);

        const finial = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.15, 8), goldMat);
        finial.position.set(rx, 0.96, z);
        bridgeGroup.add(finial);
      }
    });

    this.scene.add(bridgeGroup);
  }

  // ─────────────────────────────────────────────
  // CỔNG TAM QUAN SƠN SON THẾP VÀNG "CHÙA AN LẠC"
  // Kiến trúc Cổng Tam Quan 3 Cửa Cổ Truyền Việt Nam
  // ─────────────────────────────────────────────
  private createImperialGate() {
    const group = new THREE.Group();

    // Vật liệu cao cấp
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x6e1f14, roughness: 0.45, metalness: 0.08 });
    const stoneBaseMat = new THREE.MeshStandardMaterial({ color: 0x8a9597, roughness: 0.72, metalness: 0.05 });
    const stonePlinthMat = new THREE.MeshStandardMaterial({ color: 0x7b8789, roughness: 0.78 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.75 });
    const wallPlasterMat = new THREE.MeshStandardMaterial({ color: 0xd6a858, roughness: 0.82 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d170e, roughness: 0.55 });
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xcd7f32, roughness: 0.35, metalness: 0.65 });

    // ==========================================
    // 1. NỀN ĐÀI ĐÁ XANH & THỀM TAM CẤP
    // ==========================================
    // Bệ đá khối 2 bên cánh Cổng Tam Quan (chừa đại lộ lát đá ở giữa x in [-1.6, 1.6])
    [-4.7, 4.7].forEach((px) => {
      const terrace = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.36, 4.6), stonePlinthMat);
      terrace.position.set(px, 0.18, 25.5);
      terrace.receiveShadow = true;
      group.add(terrace);

      // Bậc đá viền hoa sen xung quanh bệ
      const curb = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.12, 4.7), stoneBaseMat);
      curb.position.set(px, 0.06, 25.5);
      curb.receiveShadow = true;
      group.add(curb);
    });

    // Đại lộ đá dẫn thẳng qua cổng (kéo dài đón tiếp từ z = 23 đến z = 29.5)
    const centralStoneWalkway = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.08, 6.5),
      new THREE.MeshStandardMaterial({ color: 0xbdb7ab, roughness: 0.75, metalness: 0.05 })
    );
    centralStoneWalkway.position.set(0, 0.04, 26.25);
    centralStoneWalkway.receiveShadow = true;
    group.add(centralStoneWalkway);

    // Gờ đá xanh viền 2 bên lối đi trung tâm
    [-1.65, 1.65].forEach((bx) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 6.5), stoneBaseMat);
      curb.position.set(bx, 0.06, 26.25);
      curb.receiveShadow = true;
      group.add(curb);
    });

    // ==========================================
    // 2. HỆ THỐNG TRỤ CỘT GỖ LIM & CHÂN TẢNG ĐÁ
    // ==========================================
    // 4 Cột Cái trung tâm: x = ±1.85, z = 26.2 (trước) & z = 24.8 (sau)
    const mainPillars = [
      { x: -1.85, z: 26.2 }, { x: 1.85, z: 26.2 },
      { x: -1.85, z: 24.8 }, { x: 1.85, z: 24.8 }
    ];
    mainPillars.forEach((p) => {
      // Chân tảng đá tảng bồng hoa sen
      const basePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.40, 16), stoneBaseMat);
      basePedestal.position.set(p.x, 0.20, p.z);
      basePedestal.castShadow = true;
      group.add(basePedestal);

      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 8, 16), goldMat);
      baseRing.position.set(p.x, 0.38, p.z);
      baseRing.rotation.x = Math.PI / 2;
      group.add(baseRing);

      // Thân cột cái gỗ lim cao 5.8m
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 5.8, 16), pillarMat);
      col.position.set(p.x, 3.10, p.z);
      col.castShadow = true;
      group.add(col);

      // Đấu củng và con bọ đỡ xà thếp vàng
      const capital = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.22, 0.58), goldMat);
      capital.position.set(p.x, 6.00, p.z);
      capital.castShadow = true;
      group.add(capital);

      const subCapital = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.72), darkWoodMat);
      subCapital.position.set(p.x, 6.12, p.z);
      group.add(subCapital);
    });

    // 4 Cột Quân phụ hai bên: x = ±5.4, z = 26.2 (trước) & z = 24.8 (sau)
    const sidePillars = [
      { x: -5.4, z: 26.2 }, { x: 5.4, z: 26.2 },
      { x: -5.4, z: 24.8 }, { x: 5.4, z: 24.8 }
    ];
    sidePillars.forEach((p) => {
      const basePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.38, 0.38, 16), stoneBaseMat);
      basePedestal.position.set(p.x, 0.19, p.z);
      basePedestal.castShadow = true;
      group.add(basePedestal);

      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 4.6, 14), pillarMat);
      col.position.set(p.x, 2.50, p.z);
      col.castShadow = true;
      group.add(col);

      const capital = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.48), goldMat);
      capital.position.set(p.x, 4.80, p.z);
      group.add(capital);
    });

    // 2 Cột Trụ Biên ngoài cùng (kết nối với tường bao): x = ±7.4, z = 25.5
    [-7.4, 7.4].forEach((px) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 4.2, 14), pillarMat);
      col.position.set(px, 2.10, 25.5);
      col.castShadow = true;
      group.add(col);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.44), goldMat);
      cap.position.set(px, 4.25, 25.5);
      group.add(cap);
    });

    // ==========================================
    // 3. TƯỜNG GẠCH NUNG & CỬA SỔ TRÒN HUYỀN QUAN
    // ==========================================
    // Tường vách sơn vàng chùa nối giữa Cột Cái và Cột Quân (x in [-5.4, -1.85] và [1.85, 5.4])
    [-3.62, 3.62].forEach((wx) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(3.1, 3.8, 0.34), wallPlasterMat);
      wall.position.set(wx, 2.10, 25.5);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);

      // Chân tường ốp đá xanh cổ truyền
      const wallPlinth = new THREE.Mesh(new THREE.BoxGeometry(3.16, 0.35, 0.42), stoneBaseMat);
      wallPlinth.position.set(wx, 0.35, 25.5);
      wallPlinth.receiveShadow = true;
      group.add(wallPlinth);

      // Cửa sổ tròn Sắc Không (Huyền quan Vô Ngã)
      const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.065, 12, 32), goldMat);
      ringOuter.position.set(wx, 2.30, 25.5);
      group.add(ringOuter);

      const ringInner = new THREE.Mesh(new THREE.TorusGeometry(0.50, 0.035, 10, 28), pillarMat);
      ringInner.position.set(wx, 2.30, 25.5);
      group.add(ringInner);

      // Hoa văn chữ Vạn 卍 kim sắc ở tâm cửa sổ
      const swastikaArm1 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.04), goldMat);
      swastikaArm1.position.set(wx, 2.30, 25.5);
      group.add(swastikaArm1);

      const swastikaArm2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.52, 0.04), goldMat);
      swastikaArm2.position.set(wx, 2.30, 25.5);
      group.add(swastikaArm2);

      // Móc chữ Vạn 4 góc
      [
        { ox: -0.23, oy: 0.10, w: 0.05, h: 0.20 },
        { ox: 0.23, oy: -0.10, w: 0.05, h: 0.20 },
        { ox: 0.10, oy: 0.23, w: 0.20, h: 0.05 },
        { ox: -0.10, oy: -0.23, w: 0.20, h: 0.05 }
      ].forEach((hook) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(hook.w, hook.h, 0.04), goldMat);
        m.position.set(wx + hook.ox, 2.30 + hook.oy, 25.5);
        group.add(m);
      });
    });

    // Tường vách ngoài nối cột quân với cột biên (x in [-7.4, -5.4] và [5.4, 7.4])
    [-6.4, 6.4].forEach((wx) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.4, 0.32), wallPlasterMat);
      wall.position.set(wx, 1.90, 25.5);
      wall.castShadow = true;
      group.add(wall);

      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.35, 0.40), stoneBaseMat);
      plinth.position.set(wx, 0.35, 25.5);
      group.add(plinth);
    });

    // ==========================================
    // 4. CÁNH CỬA GỖ LIM MỞ HÉ NGHÊNH ĐÓN
    // ==========================================
    // Cửa chính giữa: 2 cánh cửa gỗ lim mở hé góc 35 độ
    const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.65, 4.2, 0.08), darkWoodMat);
    leftDoor.position.set(-1.15, 2.35, 25.95);
    leftDoor.rotation.y = -0.60;
    leftDoor.castShadow = true;
    group.add(leftDoor);

    const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(1.65, 4.2, 0.08), darkWoodMat);
    rightDoor.position.set(1.15, 2.35, 25.95);
    rightDoor.rotation.y = 0.60;
    rightDoor.castShadow = true;
    group.add(rightDoor);

    // Núm đồng chạm đầu sư tử ngậm vòng trên 2 cánh cửa
    [
      { x: -1.0, z: 26.25, rot: -0.60 },
      { x: 1.0, z: 26.25, rot: 0.60 }
    ].forEach((dk) => {
      const knockerPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12), bronzeMat);
      knockerPlate.position.set(dk.x, 2.35, dk.z);
      knockerPlate.rotation.x = Math.PI / 2;
      knockerPlate.rotation.z = dk.rot;
      group.add(knockerPlate);

      const knockerRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 16), goldMat);
      knockerRing.position.set(dk.x, 2.27, dk.z + 0.03);
      group.add(knockerRing);
    });

    // ==========================================
    // 5. HỆ XÀ GỖ CHẠM MÂY & ĐẤU CỦNG
    // ==========================================
    // Xà hạ nối các cột chính (z = 26.2 & 24.8)
    [26.2, 24.8].forEach((bz) => {
      // Xà chính giữa
      const mainBeam = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.32, 0.38), darkWoodMat);
      mainBeam.position.set(0, 5.85, bz);
      mainBeam.castShadow = true;
      group.add(mainBeam);

      // Xà nách hai bên
      [-3.62, 3.62].forEach((bx) => {
        const sideBeam = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.28, 0.32), darkWoodMat);
        sideBeam.position.set(bx, 4.65, bz);
        sideBeam.castShadow = true;
        group.add(sideBeam);
      });
    });

    // Xà dọc nối cột trước và cột sau
    [-1.85, 1.85].forEach((lx) => {
      const longBeam = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 1.8), darkWoodMat);
      longBeam.position.set(lx, 5.85, 25.5);
      group.add(longBeam);
    });

    // ==========================================
    // 6. HỆ THỐNG MÁI NGÓI MŨI HÀI 2 TẦNG CONG VÚT
    // ==========================================
    // A. CỔNG CHÍNH (GIỮA) - TRÙNG THIỀM ĐIỆP ỐC (2 TẦNG MÁI)
    // 1. Mái Hạ Cổng Chính (y = 5.2m, rộng 6.8m x sâu 4.6m)
    this.createOrnateCurvedRoof(group, 0, 5.25, 25.5, 6.8, 0.85, 4.6, 0xa93226);

    // 2. Cổ Diêm (Tầng cổ lầu giữa hai mái - nơi gắn Đại Tự Hoành Phi "CHÙA AN LẠC")
    const clerestory = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.35, 3.0), darkWoodMat);
    clerestory.position.set(0, 6.30, 25.5);
    clerestory.castShadow = true;
    group.add(clerestory);

    // Chấn song con tiện gỗ mạ vàng trên cổ diêm
    [-1.8, -1.4, -1.0, 1.0, 1.4, 1.8].forEach((gx) => {
      const slatF = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.25, 8), goldMat);
      slatF.position.set(gx, 6.30, 27.02);
      group.add(slatF);

      const slatB = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.25, 8), goldMat);
      slatB.position.set(gx, 6.30, 23.98);
      group.add(slatB);
    });

    // 3. Mái Thượng Cổng Chính (y = 7.35m, rộng 5.6m x sâu 3.8m)
    this.createOrnateCurvedRoof(group, 0, 7.35, 25.5, 5.6, 0.90, 3.8, 0x922b21);

    // 4. Bánh Xe Pháp Luân (Dharmachakra) Thếp Vàng trên đỉnh nóc cổng chính (y = 8.45m)
    const dharmaRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 12, 32), goldMat);
    dharmaRing.position.set(0, 8.45, 25.5);
    dharmaRing.rotation.y = Math.PI / 2;
    group.add(dharmaRing);

    // Tâm hoa sen Pháp Luân
    const dharmaLotus = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), goldMat);
    dharmaLotus.position.set(0, 8.45, 25.5);
    group.add(dharmaLotus);

    // 8 Nan hoa Pháp Luân
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.52, 8), goldMat);
      spoke.position.set(0, 8.45 + Math.sin(angle) * 0.25, 25.5 + Math.cos(angle) * 0.25);
      spoke.rotation.x = angle;
      group.add(spoke);
    }

    // B. MÁI CỔNG PHỤ TẢ & HỮU (HAI BÊN)
    // Mái Cổng Tả (Bên trái: x = -4.6, y = 4.65m, rộng 4.4m x sâu 3.6m)
    this.createOrnateCurvedRoof(group, -4.6, 4.65, 25.5, 4.4, 0.78, 3.6, 0xa93226);

    // Mái Cổng Hữu (Bên phải: x = 4.6, y = 4.65m, rộng 4.4m x sâu 3.6m)
    this.createOrnateCurvedRoof(group, 4.6, 4.65, 25.5, 4.4, 0.78, 3.6, 0xa93226);

    // ==========================================
    // 7. HOÀNH PHI ĐẠI TỰ "CHÙA AN LẠC" SƠN SON THẾP VÀNG
    // (Đầy đủ tên chùa, sắc nét 1024x340 px, có cả mặt trước & mặt sau)
    // ==========================================
    // Mặt Tiền (Hướng đón khách vào chùa - facing +Z, z = 27.05)
    const frontSignTex = this.createGateSignboardTexture("front");
    const frontSignMat = new THREE.MeshStandardMaterial({
      map: frontSignTex,
      roughness: 0.28,
      metalness: 0.45
    });

    const frontSignMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.15, 0.10), frontSignMat);
    frontSignMesh.position.set(0, 6.30, 27.05);
    frontSignMesh.castShadow = true;
    group.add(frontSignMesh);

    // Khung viền thếp vàng 3D đắp nổi quanh Hoành Phi mặt tiền
    const frontSignFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.72, 1.25, 0.06),
      goldMat
    );
    frontSignFrame.position.set(0, 6.30, 27.02);
    group.add(frontSignFrame);

    // Mặt Hậu (Nhìn từ sân chùa quay ra cổng - facing -Z, z = 23.95)
    const backSignTex = this.createGateSignboardTexture("back");
    const backSignMat = new THREE.MeshStandardMaterial({
      map: backSignTex,
      roughness: 0.28,
      metalness: 0.45
    });

    const backSignMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.15, 0.10), backSignMat);
    backSignMesh.position.set(0, 6.30, 23.95);
    backSignMesh.rotation.y = Math.PI;
    backSignMesh.castShadow = true;
    group.add(backSignMesh);

    const backSignFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.72, 1.25, 0.06),
      goldMat
    );
    backSignFrame.position.set(0, 6.30, 23.98);
    group.add(backSignFrame);

    // ==========================================
    // 8. CẶP CÂU ĐỐI LÒNG MÁNG TRÊN CỘT CÁI
    // Cột Trái: "AN NHIÊN TỰ TẠI BỒ ĐỀ CHIẾU"
    // Cột Phải: "LẠC NGHIỆP TỪ BI BÁT NHÃ KHAI"
    // ==========================================
    const leftCoupletTex = this.createGateCoupletTexture("left");
    const leftCoupletMat = new THREE.MeshStandardMaterial({ map: leftCoupletTex, roughness: 0.35, metalness: 0.3 });
    const leftCouplet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 3.2, 0.08), leftCoupletMat);
    leftCouplet.position.set(-1.85, 3.10, 26.46);
    leftCouplet.castShadow = true;
    group.add(leftCouplet);

    const rightCoupletTex = this.createGateCoupletTexture("right");
    const rightCoupletMat = new THREE.MeshStandardMaterial({ map: rightCoupletTex, roughness: 0.35, metalness: 0.3 });
    const rightCouplet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 3.2, 0.08), rightCoupletMat);
    rightCouplet.position.set(1.85, 3.10, 26.46);
    rightCouplet.castShadow = true;
    group.add(rightCouplet);

    // ==========================================
    // 9. BIỂN CHỮ VÀNG HAI CỔNG PHỤ (TỪ BI & HỶ XẢ)
    // ==========================================
    // Cổng Tả (Bên trái): "TỪ BI"
    const tuBiTex = this.createGateSidePortalSignTexture("TỪ BI");
    const tuBiMat = new THREE.MeshStandardMaterial({ map: tuBiTex, roughness: 0.3, metalness: 0.4 });
    const tuBiSignF = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.08), tuBiMat);
    tuBiSignF.position.set(-4.6, 4.15, 26.35);
    group.add(tuBiSignF);

    // Cổng Hữu (Bên phải): "HỶ XẢ"
    const hyXaTex = this.createGateSidePortalSignTexture("HỶ XẢ");
    const hyXaMat = new THREE.MeshStandardMaterial({ map: hyXaTex, roughness: 0.3, metalness: 0.4 });
    const hyXaSignF = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.08), hyXaMat);
    hyXaSignF.position.set(4.6, 4.15, 26.35);
    group.add(hyXaSignF);

    // ==========================================
    // 10. TƯỢNG NGHÊ ĐÁ / SƯ TỬ ĐÁ CANH CỔNG
    // ==========================================
    const leftLion = this.createStoneGuardianNghê(-2.8, 0, 27.5, 0.25);
    group.add(leftLion);

    const rightLion = this.createStoneGuardianNghê(2.8, 0, 27.5, -0.25);
    group.add(rightLion);

    // 2 Cây đèn đá lục giác thắp sáng dẫn vào cổng
    this.createStoneLamp(-4.2, 28.2);
    this.createStoneLamp(4.2, 28.2);

    // ==========================================
    // 11. ĐÈN LỒNG ĐỎ TREO HIÊN CỔNG
    // ==========================================
    [-3.8, -1.85, 0, 1.85, 3.8].forEach((lx) => {
      this.createHangingLantern(group, lx, 4.25, 26.3);
    });

    this.scene.add(group);

    // ==========================================
    // 12. COLLIDERS VỮNG CHẮC CHO CỔNG TAM QUAN
    // Lối đi trung tâm x in [-1.6, 1.6] thông suốt hoàn hảo!
    // ==========================================
    // Chặn phía cánh trái (x in [-7.6, -1.65])
    this.colliders.push(new THREE.Box3(new THREE.Vector3(-7.6, 0, 24.5), new THREE.Vector3(-1.65, 7, 26.5)));
    // Chặn phía cánh phải (x in [1.65, 7.6])
    this.colliders.push(new THREE.Box3(new THREE.Vector3(1.65, 0, 24.5), new THREE.Vector3(7.6, 7, 26.5)));
  }

  /**
   * Tạo Hoành Phi Đại Tự Sơn Son Thếp Vàng "CHÙA AN LẠC"
   * Độ phân giải cao 1024x340 px, chữ Quốc ngữ thư pháp sắc sảo, viền hoa sen hoàng kim
   */
  private createGateSignboardTexture(facing: "front" | "back"): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 340;
    const ctx = canvas.getContext("2d")!;

    // 1. Nền gỗ sơn son thếp vàng đỏ trầm hoàng gia
    const bgGrad = ctx.createLinearGradient(0, 0, 1024, 340);
    bgGrad.addColorStop(0, "#2c0707");
    bgGrad.addColorStop(0.3, "#420c0c");
    bgGrad.addColorStop(0.7, "#350808");
    bgGrad.addColorStop(1, "#220505");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 340);

    // Vân gỗ sơn mài tinh tế
    ctx.fillStyle = "rgba(255, 215, 0, 0.03)";
    for (let y = 0; y < 340; y += 4) {
      ctx.fillRect(0, y, 1024, 1.5);
    }

    // 2. Viền hoa văn kim loại mạ vàng kép
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 14, 992, 312);

    ctx.strokeStyle = "#f9e79f";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(26, 24, 972, 292);

    // Họa tiết hoa sen & rồng uốn 4 góc
    const drawCornerFlourish = (cx: number, cy: number, flipX: boolean, flipY: boolean) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.strokeStyle = "#f4d03f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 40);
      ctx.quadraticCurveTo(0, 0, 40, 0);
      ctx.stroke();

      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(14, 14, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawCornerFlourish(32, 30, false, false);
    drawCornerFlourish(992, 30, true, false);
    drawCornerFlourish(32, 310, false, true);
    drawCornerFlourish(992, 310, true, true);

    // 3. Dòng chữ trên (Sub-header)
    ctx.textAlign = "center";
    ctx.font = "bold 26px 'Be Vietnam Pro', -apple-system, serif";
    ctx.fillStyle = "#ffd54f";
    const subTop = facing === "front" ? "❖  AN LẠC THIỀN TỰ • 安 樂 禪 寺  ❖" : "❖  QUAY ĐẦU LÀ BỜ • 苦 海 無 邊  ❖";
    ctx.fillText(subTop, 512, 68);

    // 4. DÒNG CHỮ CHÍNH: "CHÙA AN LẠC" (To đậm, sắc nét, gradient hoàng kim)
    ctx.font = "900 86px 'Be Vietnam Pro', 'Times New Roman', serif";

    // Đổ bóng nổi 3D sâu thẳm
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillText("CHÙA AN LẠC", 516, 192);

    // Viền kim loại sắc sảo
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#7d5a10";
    ctx.strokeText("CHÙA AN LẠC", 512, 188);

    // Gradient mạ vàng sáng rực
    const textGrad = ctx.createLinearGradient(0, 110, 0, 200);
    textGrad.addColorStop(0, "#fff5cc");
    textGrad.addColorStop(0.25, "#ffd700");
    textGrad.addColorStop(0.65, "#f1c40f");
    textGrad.addColorStop(1, "#b7950b");
    ctx.fillStyle = textGrad;
    ctx.fillText("CHÙA AN LẠC", 512, 188);

    // Cặp đóa sen vàng hai bên dòng chữ chính
    [-340, 340].forEach((ox) => {
      ctx.fillStyle = "#ffd700";
      ctx.font = "40px sans-serif";
      ctx.fillText("🪷", 512 + ox, 184);
    });

    // 5. Dòng chữ dưới (Châm ngôn thiền tự)
    ctx.font = "bold 22px 'Be Vietnam Pro', -apple-system, serif";
    ctx.fillStyle = "#f9e79f";
    const subBottom = facing === "front" ? "TỪ BI HỶ XẢ  •  THÂN TÂM AN LẠC  •  PHỔ ĐỘ CHÚNG SANH" : "BÁT NHÃ QUANG MINH  •  VẠN SỰ CÁT TƯỜNG  •  A DI ĐÀ PHẬT";
    ctx.fillText(subBottom, 512, 275);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Tạo Câu Đối Lòng Máng Gỗ Sơn Son Thếp Vàng Treo Cột Cái
   * Cột Trái: "AN NHIÊN TỰ TẠI BỒ ĐỀ CHIẾU"
   * Cột Phải: "LẠC NGHIỆP TỪ BI BÁT NHÃ KHAI"
   */
  private createGateCoupletTexture(side: "left" | "right"): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // Nền sơn mài đỏ sẫm đen
    const bgGrad = ctx.createLinearGradient(0, 0, 256, 1024);
    bgGrad.addColorStop(0, "#1d0505");
    bgGrad.addColorStop(0.5, "#300808");
    bgGrad.addColorStop(1, "#180404");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 256, 1024);

    // Khung viền mạ vàng
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 232, 1000);

    ctx.strokeStyle = "#f9e79f";
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, 220, 988);

    // Danh sách 7 từ trong vế câu đối
    const words = side === "left"
      ? ["AN", "NHIÊN", "TỰ", "TẠI", "BỒ", "ĐỀ", "CHIẾU"]
      : ["LẠC", "NGHIỆP", "TỪ", "BI", "BÁT", "NHÃ", "KHAI"];

    ctx.textAlign = "center";
    ctx.font = "900 48px 'Be Vietnam Pro', 'Times New Roman', serif";

    const startY = 120;
    const stepY = 115;

    words.forEach((w, i) => {
      const y = startY + i * stepY;

      // Bóng chữ
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillText(w, 131, y + 3);

      // Viền kim loại
      ctx.strokeStyle = "#805b10";
      ctx.lineWidth = 4;
      ctx.strokeText(w, 128, y);

      // Gradient chữ vàng
      const grad = ctx.createLinearGradient(0, y - 40, 0, y + 10);
      grad.addColorStop(0, "#fff5cc");
      grad.addColorStop(0.5, "#ffd700");
      grad.addColorStop(1, "#b7950b");
      ctx.fillStyle = grad;
      ctx.fillText(w, 128, y);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Tạo Biển Chữ Vàng Cổng Phụ ("TỪ BI" / "HỶ XẢ")
   */
  private createGateSidePortalSignTexture(text: string): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#320808";
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 492, 236);

    ctx.textAlign = "center";
    ctx.font = "900 76px 'Be Vietnam Pro', serif";

    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillText(text, 259, 153);

    const grad = ctx.createLinearGradient(0, 60, 0, 180);
    grad.addColorStop(0, "#fff8dc");
    grad.addColorStop(0.5, "#ffd700");
    grad.addColorStop(1, "#b8860b");
    ctx.fillStyle = grad;
    ctx.fillText(text, 256, 150);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Tạo Tượng Nghê Đá / Sư Tử Đá Cổ Kính Canh Cổng Chùa
   */
  private createStoneGuardianNghê(x: number, y: number, z: number, rotY: number): THREE.Group {
    const lionGroup = new THREE.Group();
    lionGroup.position.set(x, y, z);
    lionGroup.rotation.y = rotY;

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x828f91, roughness: 0.76 });
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x6e7b7d, roughness: 0.8 });

    // Bệ đá sen tam cấp
    const base1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 1.1), plinthMat);
    base1.position.y = 0.11;
    base1.castShadow = true;
    lionGroup.add(base1);

    const base2 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.95), stoneMat);
    base2.position.y = 0.31;
    base2.castShadow = true;
    lionGroup.add(base2);

    // Thân nghê ngồi bệ vệ
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.58, 0.65), stoneMat);
    body.position.set(0, 0.68, -0.05);
    body.castShadow = true;
    lionGroup.add(body);

    // Ngực ưỡn kiêu hãnh
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), stoneMat);
    chest.position.set(0, 0.78, 0.18);
    chest.scale.set(0.9, 1.1, 0.8);
    lionGroup.add(chest);

    // 2 Chân trước thẳng đứng
    [-0.16, 0.16].forEach((cx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 0.52, 10), stoneMat);
      leg.position.set(cx, 0.64, 0.25);
      leg.castShadow = true;
      lionGroup.add(leg);

      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 8), stoneMat);
      paw.position.set(cx, 0.44, 0.30);
      paw.scale.set(1.1, 0.6, 1.3);
      lionGroup.add(paw);
    });

    // Đầu nghê uy phong ngẩng cao
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.42), stoneMat);
    head.position.set(0, 1.15, 0.16);
    head.castShadow = true;
    lionGroup.add(head);

    // Bờm xoăn mây cuộn
    const mane = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), stoneMat);
    mane.position.set(0, 1.18, -0.05);
    mane.scale.set(1.15, 1.0, 0.8);
    lionGroup.add(mane);

    // Mắt tròn và sừng nghê
    [-0.12, 0.12].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), stoneMat);
      eye.position.set(ex, 1.22, 0.35);
      lionGroup.add(eye);

      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), stoneMat);
      ear.position.set(ex, 1.38, 0.12);
      ear.rotation.z = ex > 0 ? -0.4 : 0.4;
      lionGroup.add(ear);
    });

    return lionGroup;
  }

  /**
   * Tạo Texture Gạch Gốm Bát Tràng Cổ Truyền Cho Sàn Chính Điện
   * Chống lóa sáng, loại bỏ hoàn toàn vệt z-fighting, màu nâu đỏ trầm ấm linh thiêng
   */
  private createTempleFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // 1. Nền gạch Bát Tràng đỏ trầm ấm
    ctx.fillStyle = "#5c1d12";
    ctx.fillRect(0, 0, 1024, 1024);

    const tileSize = 64; // Lưới gạch 16x16 viên
    for (let x = 0; x < 1024; x += tileSize) {
      for (let y = 0; y < 1024; y += tileSize) {
        // Biến thiên sắc thái tự nhiên của đất sét nung cổ truyền
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const rand = Math.abs(hash - Math.floor(hash));
        const shade = Math.floor(rand * 22);
        const r = 112 + shade;
        const g = 38 + Math.floor(shade * 0.35);
        const b = 24 + Math.floor(shade * 0.25);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

        // Họa tiết viền chỉ men mờ cổ kính
        ctx.strokeStyle = "rgba(45, 14, 8, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 3.5, y + 3.5, tileSize - 7, tileSize - 7);
      }
    }

    // 2. Mạch vữa tối màu chống chói lóa
    ctx.strokeStyle = "#38110a";
    ctx.lineWidth = 3;
    for (let x = 0; x <= 1024; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 6);
    tex.needsUpdate = true;
    return tex;
  }

  // ─────────────────────────────────────────────
  // TEXTURE CÂU ĐỐI SƠN SON THẾP VÀNG TRUYỀN THỐNG
  // ─────────────────────────────────────────────
  private createCoupletTexture(text: string): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // Nền sơn son đỏ thẫm bóng bẩy
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, "#4a0808");
    grad.addColorStop(0.2, "#851212");
    grad.addColorStop(0.5, "#a81c1c");
    grad.addColorStop(0.8, "#851212");
    grad.addColorStop(1, "#4a0808");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 1024);

    // Viền chỉ vàng kép
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 236, 1004);
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, 220, 988);

    // Họa tiết hoa sen đầu câu đối
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(128, 45, 14, 0, Math.PI * 2);
    ctx.fill();

    // Họa tiết cánh sen chân câu đối
    ctx.beginPath();
    ctx.arc(128, 975, 14, 0, Math.PI * 2);
    ctx.fill();

    // Thư pháp dát vàng dọc
    ctx.font = "bold 50px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    const chars = text.split("");
    const startY = 105;
    const spacing = (1024 - 190) / Math.max(chars.length - 1, 1);
    chars.forEach((c, i) => {
      ctx.fillStyle = "#ffe066";
      ctx.fillText(c, 128, startY + i * spacing);
      ctx.strokeStyle = "#b8860b";
      ctx.lineWidth = 1.2;
      ctx.strokeText(c, 128, startY + i * spacing);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  // ─────────────────────────────────────────────
  // TEXTURE THẢM GẤM ĐẠO LỘ HOA SEN CHÍNH ĐIỆN
  // ─────────────────────────────────────────────
  private createGrandAisleCarpetTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 2048;
    const ctx = canvas.getContext("2d")!;

    // Nền gấm đỏ son hoàng gia
    ctx.fillStyle = "#781c1c";
    ctx.fillRect(0, 0, 512, 2048);

    // Viền chỉ vàng hai bên mép thảm
    ctx.fillStyle = "#b8860b";
    ctx.fillRect(16, 0, 18, 2048);
    ctx.fillRect(512 - 34, 0, 18, 2048);

    ctx.fillStyle = "#ffd700";
    ctx.fillRect(22, 0, 6, 2048);
    ctx.fillRect(512 - 28, 0, 6, 2048);

    // Họa tiết hoa sen liên hoa vàng dát dọc thảm (cách mỗi 256px)
    for (let y = 128; y < 2048; y += 256) {
      // Vòng tròn hào quang ngoài
      ctx.strokeStyle = "rgba(255, 215, 0, 0.65)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(256, y, 76, 0, Math.PI * 2);
      ctx.stroke();

      // Vòng trong
      ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(256, y, 64, 0, Math.PI * 2);
      ctx.stroke();

      // Đài sen tâm
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(256, y, 20, 0, Math.PI * 2);
      ctx.fill();

      // 8 Cánh sen vàng tỏa đều
      for (let p = 0; p < 8; p++) {
        const ang = (p * Math.PI) / 4;
        const px = 256 + Math.cos(ang) * 44;
        const py = y + Math.sin(ang) * 44;
        ctx.fillStyle = "rgba(255, 230, 100, 0.85)";
        ctx.beginPath();
        ctx.arc(px, py, 13, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.needsUpdate = true;
    return tex;
  }

  // ─────────────────────────────────────────────
  // ĐẠI HÙNG BẢO ĐIỆN NGUY NGA - NỘI THẤT MỞ & TÒA TAM THẾ PHẬT
  // ─────────────────────────────────────────────
  private createTempleMainHall() {
    const group = new THREE.Group();
    const baseStone = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.8 });
    const wallYellow = new THREE.MeshStandardMaterial({ color: 0xd4a655, roughness: 0.6 });
    const pillarRed = new THREE.MeshStandardMaterial({ color: 0x8b2500, roughness: 0.48 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.7 });

    // 1. Bệ móng đá xanh đại thụ đồ sộ vững chãi (Mở rộng 40.0m x 37.0m - Cao 0.62m, tâm tại z = -31.0m)
    const base = new THREE.Mesh(new THREE.BoxGeometry(40.0, 0.62, 37.0), baseStone);
    base.position.set(0, 0.31, -31.0);
    base.castShadow = true;
    group.add(base);

    // 2. Sàn nội thất chính điện Bát Tràng tráng men mờ (Walk-in Floor 39.0m x 35.5m)
    // Đặt tại y = 0.65m (cao hơn bệ móng 3cm để triệt tiêu 100% hiện tượng z-fighting lóa sọc trắng)
    const floorTex = this.createTempleFloorTexture();
    const floorTileMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.94, // Tán xạ ánh sáng mờ tự nhiên, KHÔNG HỀ LÓA TRẮNG
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(39.0, 35.5), floorTileMat);
    floor.rotateX(-Math.PI / 2);
    floor.position.set(0, 0.65, -31.0);
    floor.receiveShadow = true;
    this.hallFloorMesh = floor;
    group.add(floor);

    // 3. Tường hậu nguy nga (Tường sau ban thờ - Cao 18.0m bao bọc trọn vẹn hào quang tượng Phật)
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(39.0, 18.0, 0.8), wallYellow);
    backWall.position.set(0, 9.65, -48.75);
    backWall.castShadow = true;
    group.add(backWall);

    // 4. Hai tường hồi hai bên (Tường trái & Tường phải - Cao 18.0m, sâu 35.5m)
    [-19.5, 19.5].forEach((wx) => {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 18.0, 35.5), wallYellow);
      sideWall.position.set(wx, 9.65, -31.0);
      sideWall.castShadow = true;
      group.add(sideWall);
    });

    // 5. Mặt tiền: Tường 2 bên chừa Cửa Chính Điện RỘNG MỞ 16M VÀ CAO 15.0M
    // Cho phép chiêm ngưỡng trọn vẹn dung nhan uy nghiêm của Tam Thế Phật và Pháp Tòa từ sân chùa!
    [-13.75, 13.75].forEach((fx) => {
      const frontWallSection = new THREE.Mesh(new THREE.BoxGeometry(11.5, 18.0, 0.8), wallYellow);
      frontWallSection.position.set(fx, 9.65, -13.25);
      frontWallSection.castShadow = true;
      group.add(frontWallSection);
    });

    // Vòm cửa chính điện trên cao (cửa mở thênh thang khoáng đạt tới độ cao 15.0m!)
    const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(16.5, 3.0, 0.8), pillarRed);
    doorLintel.position.set(0, 16.5, -13.25);
    doorLintel.castShadow = true;
    group.add(doorLintel);

    // BẬC NGŨ CẤP ĐÁ XANH DẪN VÀO CHÍNH ĐIỆN (Rộng 16m khớp trọn vẹn cửa chính, chuyển tiếp mượt từ y=0 lên sàn điện y=0.65)
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x85929e, roughness: 0.7 });
    const stepConfigs = [
      { y: 0.13, z: -11.5 },
      { y: 0.28, z: -12.0 },
      { y: 0.43, z: -12.5 },
      { y: 0.58, z: -13.0 },
    ];
    stepConfigs.forEach((sc) => {
      const step = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.16, 0.55), stepMat);
      step.position.set(0, sc.y, sc.z);
      step.receiveShadow = true;
      group.add(step);
    });

    // 6. Cột Gỗ Lim Đại Trụ & Chân Tảng Đá Hoa Sen Cổ Truyền
    // Thiết kế lại: Cột Cái mở rộng ra x = ±13.2m, Cột Quân đặt sát tường x = ±17.5m, Cột Cửa Chính tại x = ±7.5m (z = -13.25m)
    // Toàn bộ lòng điện rộng 26.4m hoàn toàn thông thoáng, cách xa bồ đoàn Phật tử ít nhất 3.5m!
    const plinthStoneMat = new THREE.MeshStandardMaterial({ color: 0x8a9296, roughness: 0.72 });
    const plinthLotusMat = new THREE.MeshStandardMaterial({ color: 0xa6b0b5, roughness: 0.65 });

    const pillarConfigs: { x: number; z: number }[] = [
      // Hàng cột mặt tiền cửa chính (z = -13.25m)
      { x: -17.5, z: -13.25 },
      { x: -7.5, z: -13.25 },
      { x: 7.5, z: -13.25 },
      { x: 17.5, z: -13.25 },

      // Hàng cột gian tiền tế (z = -25.0m) - Đặt rộng 2 bên sườn, hoàn toàn thoáng đãng khu bồ đoàn
      { x: -17.5, z: -25.0 },
      { x: -13.2, z: -25.0 },
      { x: 13.2, z: -25.0 },
      { x: 17.5, z: -25.0 },

      // Hàng cột gian trung đường (z = -37.0m) - Bên ngoài Pháp Tòa Cao Tăng
      { x: -17.5, z: -37.0 },
      { x: -13.2, z: -37.0 },
      { x: 13.2, z: -37.0 },
      { x: 17.5, z: -37.0 },

      // Hàng cột gian hậu điện (z = -48.0m) - Sát vách sau
      { x: -17.5, z: -48.0 },
      { x: -13.2, z: -48.0 },
      { x: 13.2, z: -48.0 },
      { x: 17.5, z: -48.0 },
    ];

    pillarConfigs.forEach((pc) => {
      // Bệ vuông đá chân tảng
      const squareBase = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.22, 1.25), plinthStoneMat);
      squareBase.position.set(pc.x, 0.76, pc.z);
      squareBase.receiveShadow = true;
      group.add(squareBase);

      // Đài sen đá chạm cánh úp ngửa nâng đỡ cột
      const lotusPlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 0.32, 16), plinthLotusMat);
      lotusPlinth.position.set(pc.x, 1.03, pc.z);
      group.add(lotusPlinth);

      // Thân cột Gỗ Lim đại trụ vững chắc
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 16.8, 16), pillarRed);
      p.position.set(pc.x, 9.79, pc.z);
      group.add(p);
    });

    // Xà gồ & vì kèo gỗ lim nâng đỡ mái điện trên cao (y = 18.2m)
    [-13.25, -25.0, -37.0, -48.0].forEach((bz) => {
      const tieBeam = new THREE.Mesh(new THREE.BoxGeometry(39.0, 0.5, 0.5), pillarRed);
      tieBeam.position.set(0, 18.2, bz);
      group.add(tieBeam);
    });

    [-17.5, -13.2, 13.2, 17.5].forEach((bx) => {
      const longBeam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 35.5), pillarRed);
      longBeam.position.set(bx, 18.2, -31.0);
      group.add(longBeam);
    });

    // 6b. ĐẠO LỘ THẢM GẤM HOA SEN ĐỎ SON TRẢI DÀI DẪN TỚI BAN THỜ
    const grandCarpetTex = this.createGrandAisleCarpetTexture();
    const grandCarpetMat = new THREE.MeshStandardMaterial({
      map: grandCarpetTex,
      roughness: 0.85,
    });
    const grandCarpet = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 26.5), grandCarpetMat);
    grandCarpet.rotateX(-Math.PI / 2);
    grandCarpet.position.set(0, 0.656, -26.5);
    grandCarpet.receiveShadow = true;
    group.add(grandCarpet);

    // 7. Câu Đối Sơn Son Thếp Vàng 2 bên Cột Cửa Chính (Chữ thư pháp dát vàng, hoành tráng)
    const couplLeftTex = this.createCoupletTexture("Phật quang phổ chiếu ba ngàn cõi");
    const couplRightTex = this.createCoupletTexture("Pháp vũ nhuần ban muôn triệu nhà");
    const couplMatLeft = new THREE.MeshStandardMaterial({ map: couplLeftTex, roughness: 0.35, metalness: 0.1 });
    const couplMatRight = new THREE.MeshStandardMaterial({ map: couplRightTex, roughness: 0.35, metalness: 0.1 });

    const couplLeft = new THREE.Mesh(new THREE.BoxGeometry(0.72, 10.5, 0.1), couplMatLeft);
    couplLeft.position.set(-6.5, 8.8, -12.7);
    group.add(couplLeft);

    const couplRight = new THREE.Mesh(new THREE.BoxGeometry(0.72, 10.5, 0.1), couplMatRight);
    couplRight.position.set(6.5, 8.8, -12.7);
    group.add(couplRight);

    // 8. Đèn Lồng Cung Đình Treo Trong Nội Điện trên cao (y = 14.5m)
    [-10.0, 0, 10.0].forEach((lx) => {
      this.createHangingLantern(group, lx, 14.5, -20.0);
      this.createHangingLantern(group, lx, 14.5, -30.0);
      this.createHangingLantern(group, lx, 14.5, -40.0);
    });

    // 8b. ĐÔI LỤC BÌNH BÁT TRÀNG, CỬA VÕNG THẾP VÀNG & TRÀNG PHAN NGŨ SẮC
    this.createMainHallEntranceDecorations(group);

    // 8c. ĐÔI HẠC NGỰ LƯNG RÙA ĐỒNG CỔ TRUYỀN CHẦU TRƯỚC BAN THỜ
    this.createCraneOnTurtleStatues(group);

    // ==========================================
    // 9. BAN THỜ TAM THẾ PHẬT UY NGHIÊM (LÙI SÂU VỀ PHÍA SAU TẠI Z = -44.0M)
    // ==========================================
    this.createGrandBuddhaAltar(group);

    // ==========================================
    // 10. HỆ THỐNG PHÁP TÒA & BỒ ĐOÀN ĐA TẦNG (TRỤ TRÌ -> CAO TĂNG -> PHẬT TỬ)
    // ==========================================
    this.createTieredSanctuarySeating(group);

    // ==========================================
    // 11. MÁI NGÓI ĐAO CONG 2 TẦNG NGUY NGA (Cao vút, bao phủ trọn vẹn toàn bộ tượng Phật)
    // ==========================================
    // Mái Hạ: Độ cao y = 18.5m, rộng 48.0m x sâu 42.0m x cao 3.2m
    this.createOrnateCurvedRoof(group, 0, 18.5, -31.0, 48.0, 3.2, 42.0, 0xa93226);

    // Cổ Diêm (Tầng cổ lầu giữa 2 mái - Cao 3.0m với chấn song gỗ cổ truyền)
    const clerestory = new THREE.Mesh(new THREE.BoxGeometry(34.0, 3.0, 28.0), wallYellow);
    clerestory.position.set(0, 21.0, -31.0);
    group.add(clerestory);

    // Mái Thượng: Độ cao y = 23.8m, rộng 36.0m x sâu 30.0m x cao 3.2m
    this.createOrnateCurvedRoof(group, 0, 23.8, -31.0, 36.0, 3.2, 30.0, 0x922b21);

    // Bánh xe Pháp Luân (Dharmachakra) thếp vàng trên đỉnh nóc chính điện (y = 27.2m)
    const dharma = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.18, 12, 32), goldMat);
    dharma.position.set(0, 27.2, -31.0);
    dharma.rotation.x = Math.PI / 2;
    group.add(dharma);

    // Hoành phi đại tự "ĐẠI HÙNG BẢO ĐIỆN" sơn son thếp vàng trên vòm cửa chính (y = 15.2m)
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.0, 0.22), goldMat);
    plaque.position.set(0, 15.2, -12.7);
    group.add(plaque);

    // ==========================================
    // 11b. HỆ THỐNG ĐÈN CHIẾU SÁNG HOÀNG KIM CHÍNH ĐIỆN (SANCTUARY GOLDEN LIGHTING)
    // Giúp bên trong Đại Hùng Bảo Điện ban đêm rực rỡ, trang nghiêm, ấm cúng
    // ==========================================
    const hallCentralLight = new THREE.PointLight(0xffdf88, 2.8, 48, 1.0);
    hallCentralLight.position.set(0, 14.0, -30.0);
    group.add(hallCentralLight);

    const altarFocusLight = new THREE.PointLight(0xffbe6b, 3.2, 38, 1.1);
    altarFocusLight.position.set(0, 8.8, -41.5);
    group.add(altarFocusLight);

    const leftSanctuaryLight = new THREE.PointLight(0xffaa44, 2.0, 30, 1.2);
    leftSanctuaryLight.position.set(-10.0, 8.5, -32.0);
    group.add(leftSanctuaryLight);

    const rightSanctuaryLight = new THREE.PointLight(0xffaa44, 2.0, 30, 1.2);
    rightSanctuaryLight.position.set(10.0, 8.5, -32.0);
    group.add(rightSanctuaryLight);

    const portalLight = new THREE.PointLight(0xffb54a, 2.2, 32, 1.1);
    portalLight.position.set(0, 6.5, -14.2);
    group.add(portalLight);

    this.scene.add(group);

    // ==========================================
    // 12. COLLIDERS TOÀN DIỆN CHO CHÍNH ĐIỆN (NGĂN CHẶN ĐI XUYÊN TƯỜNG)
    // ==========================================
    // Tường sau
    this.colliders.push(new THREE.Box3(new THREE.Vector3(-20.5, 0, -49.5), new THREE.Vector3(20.5, 20, -47.8)));
    // Tường trái & Tường phải
    this.colliders.push(new THREE.Box3(new THREE.Vector3(-20.5, 0, -49.0), new THREE.Vector3(-18.5, 20, -12.5)));
    this.colliders.push(new THREE.Box3(new THREE.Vector3(18.5, 0, -49.0), new THREE.Vector3(20.5, 20, -12.5)));
    // Mặt tiền: Chặn 2 bên tường, CHỪA CỬA RỘNG (x: -7.5 đến 7.5 hoàn toàn thông thoáng!)
    this.colliders.push(new THREE.Box3(new THREE.Vector3(-20.5, 0, -13.9), new THREE.Vector3(-7.5, 20, -12.5)));
    this.colliders.push(new THREE.Box3(new THREE.Vector3(7.5, 0, -13.9), new THREE.Vector3(20.5, 20, -12.5)));
    // Chặn ban thờ phật ở sâu phía trong để người không đi xuyên tượng
    this.colliders.push(new THREE.Box3(new THREE.Vector3(-11.5, 0, -47.8), new THREE.Vector3(11.5, 12, -40.8)));
  }

  // ─────────────────────────────────────────────
  // BAN THỜ TAM THẾ PHẬT & BÁO THÂN TÔN TƯỢNG ĐỒ SỘ (20M RỘNG, TỌA LẠC TẠI Z = -44.0M)
  // Thiết kế cân đối hài hòa: Tam Cấp Chạm Sen, Bát Hương Men Lam Bát Tràng, Đôi Mâm Bồng Ngũ Quả Tươi Thắm
  // ─────────────────────────────────────────────
  private createGrandBuddhaAltar(parent: THREE.Group) {
    const altarGroup = new THREE.Group();
    // Đặt lùi sâu sát tường hậu chính điện (z = -44.0m), giải phóng toàn bộ không gian thiền định phía trước!
    altarGroup.position.set(0, 0.65, -44.0);

    const woodAltarMat = new THREE.MeshStandardMaterial({ color: 0x3d1208, roughness: 0.45 }); // Gỗ gụ sơn son trầm ấm
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x240b05, roughness: 0.4 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.75 });
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0xb7950b, roughness: 0.3, metalness: 0.8 });

    // Texture mỹ nghệ truyền thống Bát Tràng & hoa văn chạm gỗ
    const batTrangTex = this.createBatTrangPorcelainTexture();
    const batTrangMat = new THREE.MeshStandardMaterial({
      map: batTrangTex,
      roughness: 0.22,
      metalness: 0.05,
    });

    const reliefWoodTex = this.createCarvedWoodAltarTexture();
    const reliefWoodMat = new THREE.MeshStandardMaterial({
      map: reliefWoodTex,
      roughness: 0.45,
    });

    const brocadeTex = this.createAltarBrocadeTexture();
    const brocadeMat = new THREE.MeshStandardMaterial({
      map: brocadeTex,
      roughness: 0.55,
    });

    // =========================================================================
    // 1. BÀN THỜ TAM CẤP KIẾN TRÚC CỔ TRUYỀN CÂN ĐỐI (Balanced 3-Tier Altar Pedestal)
    // Tỷ lệ chuẩn phong thủy Phật điện: Tầng Thượng (2.45m) -> Tầng Trung (1.75m) -> Tầng Hạ (1.10m)
    // =========================================================================

    // TẦNG THƯỢNG (Bệ Đỡ Tam Thế Phật: 15.6m rộng x 0.70m cao x 2.40m sâu, tâm z = -1.0m, mặt bàn y = 2.45m)
    const tier3 = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.70, 2.40), woodAltarMat);
    tier3.position.set(0, 2.10, -1.0);
    altarGroup.add(tier3);

    // Gờ nẹp chỉ mạ vàng tầng thượng
    const rim3 = new THREE.Mesh(new THREE.BoxGeometry(15.8, 0.08, 2.44), goldMat);
    rim3.position.set(0, 2.45, -1.0);
    altarGroup.add(rim3);

    // Bảng ốp hoa văn chạm sen thếp vàng mặt trước tầng thượng
    const panel3 = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.58, 0.06), reliefWoodMat);
    panel3.position.set(0, 2.10, 0.23);
    altarGroup.add(panel3);

    // Hàng cánh sen úp ngửa thếp vàng chạy dọc mép trên tầng thượng (InstancedMesh: 1 draw call thay vì 31)
    const petalGeo = new THREE.ConeGeometry(0.08, 0.16, 4);
    petalGeo.rotateX(Math.PI / 2);
    petalGeo.rotateZ(Math.PI / 4);
    const petalXCoords: number[] = [];
    for (let px = -7.4; px <= 7.4; px += 0.48) {
      petalXCoords.push(px);
    }
    const petalsInst = new THREE.InstancedMesh(petalGeo, goldMat, petalXCoords.length);
    const dummyPetal = new THREE.Object3D();
    petalXCoords.forEach((px, i) => {
      dummyPetal.position.set(px, 2.41, 0.22);
      dummyPetal.updateMatrix();
      petalsInst.setMatrixAt(i, dummyPetal.matrix);
    });
    petalsInst.instanceMatrix.needsUpdate = true;
    altarGroup.add(petalsInst);

    // TẦNG TRUNG (Trung Ban - Đồ Thờ & Đèn Sen: 17.6m rộng x 0.65m cao x 2.70m sâu, tâm z = -0.25m, mặt bàn y = 1.75m)
    // Lộ ra phía trước Tầng Thượng 0.90m (từ z = 0.20m đến z = 1.10m)
    const tier2 = new THREE.Mesh(new THREE.BoxGeometry(17.6, 0.65, 2.70), woodAltarMat);
    tier2.position.set(0, 1.425, -0.25);
    altarGroup.add(tier2);

    // Gờ nẹp chỉ mạ vàng tầng trung
    const rim2 = new THREE.Mesh(new THREE.BoxGeometry(17.8, 0.07, 2.74), goldMat);
    rim2.position.set(0, 1.75, -0.25);
    altarGroup.add(rim2);

    // Bảng ốp chạm trổ mặt trước tầng trung
    const panel2 = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.54, 0.06), reliefWoodMat);
    panel2.position.set(0, 1.425, 1.13);
    altarGroup.add(panel2);

    // Chỉ vàng trang trí viền chân tầng trung
    const trim2 = new THREE.Mesh(new THREE.BoxGeometry(17.65, 0.05, 0.08), goldMat);
    trim2.position.set(0, 1.15, 1.14);
    altarGroup.add(trim2);

    // TẦNG HẠ (Tiền Án / Hương Án Dâng Lễ Chính: 19.6m rộng x 1.10m cao x 2.50m sâu, tâm z = 0.75m, mặt bàn y = 1.10m)
    // Lộ ra phía trước Tầng Trung 0.90m (từ z = 1.10m đến z = 2.00m) tạo không gian bày lễ trang nghiêm
    const tier1 = new THREE.Mesh(new THREE.BoxGeometry(19.6, 1.10, 2.50), woodAltarMat);
    tier1.position.set(0, 0.55, 0.75);
    altarGroup.add(tier1);

    // Gờ nẹp chỉ mạ vàng mặt bàn tầng hạ
    const rim1 = new THREE.Mesh(new THREE.BoxGeometry(19.8, 0.08, 2.54), goldMat);
    rim1.position.set(0, 1.10, 0.75);
    altarGroup.add(rim1);

    // Bảng ốp đại tự & hoa văn mặt trước bàn thờ chính
    const panel1 = new THREE.Mesh(new THREE.BoxGeometry(19.5, 0.88, 0.06), reliefWoodMat);
    panel1.position.set(0, 0.55, 2.03);
    altarGroup.add(panel1);

    // Dạ cá / Yếm bàn thờ uốn cong chạm lộng thếp vàng chân bàn
    const apronSkirt = new THREE.Mesh(new THREE.BoxGeometry(19.7, 0.16, 0.10), goldMat);
    apronSkirt.position.set(0, 0.12, 2.05);
    altarGroup.add(apronSkirt);

    // 4 Chân quỳ nghê chạm khắc vững chãi ở các góc tiền án
    [-9.7, 9.7].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 1.10, 10), darkWoodMat);
      leg.position.set(lx, 0.55, 1.96);
      altarGroup.add(leg);

      const legGoldFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.14, 10), goldMat);
      legGoldFoot.position.set(lx, 0.07, 1.96);
      altarGroup.add(legGoldFoot);
    });

    // Thảm gấm đỏ thêu hoa sen vàng trang trọng ở trung tâm bàn thờ
    const runnerTop = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.90), brocadeMat);
    runnerTop.position.set(0, 1.105, 1.55);
    runnerTop.rotation.x = -Math.PI / 2;
    altarGroup.add(runnerTop);

    const runnerFront = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.85), brocadeMat);
    runnerFront.position.set(0, 0.675, 2.04);
    altarGroup.add(runnerFront);

    // =========================================================================
    // 0. ĐẠI PHÁP HỘI BÍCH HỌA CỔ ĐIỂN PHÍA SAU BAN THỜ (Grand Ancient Buddhist Mural Backdrop)
    // =========================================================================
    const muralTex = this.createAncientBuddhistMuralTexture();
    const muralMat = new THREE.MeshStandardMaterial({
      map: muralTex,
      roughness: 0.65,
      metalness: 0.20,
    });
    const muralMesh = new THREE.Mesh(new THREE.PlaneGeometry(24.0, 10.2), muralMat);
    muralMesh.position.set(0, 5.8, -2.15);
    altarGroup.add(muralMesh);

    // Khung gỗ gụ sơn son nẹp viền quanh bức bích họa
    const muralFrameTop = new THREE.Mesh(new THREE.BoxGeometry(24.4, 0.28, 0.18), woodAltarMat);
    muralFrameTop.position.set(0, 10.9, -2.12);
    altarGroup.add(muralFrameTop);

    // =========================================================================
    // 2. TÔN TRÍ BỘ TƯỢNG TAM THẾ PHẬT HOÀNG KIM (y = 2.45m, z = -1.0m)
    // =========================================================================
    // TƯỢNG 1 (CHÍNH GIỮA): ĐỨC PHẬT THÍCH CA MÂU NI NGỒI KIẾT GIÀ
    this.createBuddhaStatue(altarGroup, 0, 2.45, -1.0, 3.4, "shakyamuni");

    // TƯỢNG 2 (BÊN TRÁI): BỒ TÁT ĐỨNG TRANG NGHIÊM
    this.createBuddhaStatue(altarGroup, -4.5, 2.45, -1.0, 3.1, "avalokiteshvara");

    // TƯỢNG 3 (BÊN PHẢI): BỒ TÁT ĐỨNG TRANG NGHIÊM
    this.createBuddhaStatue(altarGroup, 4.5, 2.45, -1.0, 3.1, "mahasthamaprapta");

    // =========================================================================
    // 3. ĐỒ THỜ TƯƠNG QUAN TRÊN TẦNG HẠ (Hạ Ban - y = 1.10m, z = 1.55m)
    // Bát Hương Men Lam Bát Tràng, Đôi Mâm Bồng Ngũ Quả Cát Tường, Bộ Kỷ 5 Chén Nước, Đôi Nến Đỏ & Lọ Hoa
    // =========================================================================

    // 3.1. ĐẠI BÁT HƯƠNG MEN LAM BÁT TRÀNG CHÍNH ĐIỆN (Trung tâm bàn thờ)
    const grandIncenseBurner = this.createGrandIncenseBurner(batTrangMat, darkWoodMat, goldMat, bronzeMat);
    grandIncenseBurner.position.set(0, 1.10, 1.55);
    altarGroup.add(grandIncenseBurner);
    this.grandIncenseBurnerMesh = grandIncenseBurner;

    // 3.2. BỘ KỶ NGŨ CHÉN NƯỚC CAM LỒ THANH TỊNH CÚNG TAM BẢO (Phía trước bát hương)
    const waterCups = this.createWaterCupsGroup(batTrangMat, goldMat);
    waterCups.position.set(0, 1.10, 1.88);
    altarGroup.add(waterCups);

    // 3.3. ĐÔI MÂM BỒNG NGŨ QUẢ CÁT TƯỜNG TƯƠI THẮM (Tả - Hữu Bát Hương)
    this.fruitPlatters = [];
    // Mâm ngũ quả bên Tả (Trái)
    const fruitPlatterLeft = this.createFruitPlatter(goldMat);
    fruitPlatterLeft.position.set(-1.85, 1.10, 1.55);
    altarGroup.add(fruitPlatterLeft);
    this.fruitPlatters.push(fruitPlatterLeft);

    // Mâm ngũ quả bên Hữu (Phải)
    const fruitPlatterRight = this.createFruitPlatter(goldMat);
    fruitPlatterRight.position.set(1.85, 1.10, 1.55);
    fruitPlatterRight.rotation.y = Math.PI; // Đối xứng tự nhiên
    altarGroup.add(fruitPlatterRight);
    this.fruitPlatters.push(fruitPlatterRight);

    // 3.4. ĐÔI CHÂN NẾN ĐỒNG THAU & CÂY NẾN ĐỎ PHONG THỦY THẮP SÁNG
    [-3.40, 3.40].forEach((cx) => {
      const candlestick = this.createAltarBronzeCandlestick(bronzeMat, goldMat);
      candlestick.position.set(cx, 1.10, 1.55);
      altarGroup.add(candlestick);
    });

    // 3.5. ĐÔI LỌ LỤC BÌNH GỐM LAM BÁT TRÀNG CẮM SEN HỒNG & CÚC VÀNG
    [-5.40, 5.40].forEach((vx) => {
      const vase = this.createTallPorcelainFlowerVase(batTrangMat);
      vase.position.set(vx, 1.10, 1.55);
      altarGroup.add(vase);
    });

    // 3.6. MÕ GỖ GIA TRÌ (Bên Tả, x = -7.50m) & CHUÔNG BÁT ĐỒNG GIA TRÌ (Bên Hữu, x = +7.50m)
    // Mõ gỗ lớn chạm hình ngư long
    const fishWoodGroup = new THREE.Group();
    fishWoodGroup.position.set(-7.50, 1.10, 1.55);

    // Đệm lụa gấm vàng kê mõ
    const fishCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.48, 0.12, 16),
      new THREE.MeshStandardMaterial({ color: 0xfbc02d, roughness: 0.6 })
    );
    fishCushion.position.y = 0.06;
    fishWoodGroup.add(fishCushion);

    const fishWood = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 14),
      new THREE.MeshStandardMaterial({ color: 0x5d1e08, roughness: 0.55 })
    );
    fishWood.position.y = 0.44;
    fishWood.scale.set(1.0, 0.88, 1.18);
    fishWoodGroup.add(fishWood);

    // Dùi gõ mõ bọc vải nhung đỏ
    const fishStriker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 0.48, 8),
      new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.5 })
    );
    fishStriker.position.set(0.28, 0.15, 0.12);
    fishStriker.rotation.z = Math.PI / 3;
    fishWoodGroup.add(fishStriker);
    altarGroup.add(fishWoodGroup);
    this.altarFishMesh = fishWoodGroup;

    // Chuông bát đồng lớn (Đại chuông gia trì)
    const bellBowlGroup = new THREE.Group();
    bellBowlGroup.position.set(7.50, 1.10, 1.55);

    // Đệm gấm đỏ thêu hoa kê chuông
    const bellCushion = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.48, 0.12, 16),
      new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.6 })
    );
    bellCushion.position.y = 0.06;
    bellBowlGroup.add(bellCushion);

    const bellBowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      bronzeMat
    );
    bellBowl.rotation.x = Math.PI;
    bellBowl.position.y = 0.54;
    bellBowlGroup.add(bellBowl);

    // Dùi thỉnh chuông bằng gỗ tiện
    const bellStriker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.028, 0.45, 8),
      new THREE.MeshStandardMaterial({ color: 0xa1887f, roughness: 0.4 })
    );
    bellStriker.position.set(-0.28, 0.15, 0.12);
    bellStriker.rotation.z = -Math.PI / 3;
    bellBowlGroup.add(bellStriker);
    altarGroup.add(bellBowlGroup);
    this.altarBellMesh = bellBowlGroup;

    // =========================================================================
    // 4. PHÁP KHÍ TRANG NGHIÊM TRÊN TẦNG TRUNG (Trung Ban - y = 1.75m, z = 0.65m)
    // Đỉnh Hương Đồng Ba Chân Nghê Vờn Ngọc, Đôi Đèn Sen Pha Lê Lưu Ly Chiếu Sáng
    // =========================================================================

    // 4.1. ĐỈNH HƯƠNG ĐỒNG BA CHÂN CỔ KÍNH (Trung tâm tầng 2)
    const tripodCenser = this.createBronzeTripodCenser(bronzeMat, goldMat);
    tripodCenser.position.set(0, 1.75, 0.65);
    altarGroup.add(tripodCenser);

    // 4.2. ĐÔI ĐÈN HOA SEN PHA LÊ LƯU LY HỒNG PHÁT SÁNG LUNG LINH
    [-2.60, 2.60].forEach((lx) => {
      const lotusLamp = this.createCrystalLotusLamp(bronzeMat, goldMat);
      lotusLamp.position.set(lx, 1.75, 0.65);
      altarGroup.add(lotusLamp);
    });

    // 4.3. ĐÔI BÌNH HOA SEN BỔ TRỢ Ở HAI BÊN TẦNG TRUNG
    [-6.20, 6.20].forEach((vx) => {
      const v = this.createTallPorcelainFlowerVase(batTrangMat);
      v.position.set(vx, 1.75, 0.65);
      v.scale.set(0.85, 0.85, 0.85);
      altarGroup.add(v);
    });

    // =========================================================================
    // 5. NGUỒN SÁNG ẤM ÁP BAN ĐÊM & ÁNH HOÀNG KIM CHÍNH ĐIỆN
    // =========================================================================
    // Nguồn sáng ấm áp bao trùm mặt bàn thờ
    const altarCandleLight = new THREE.PointLight(0xffa726, 1.1, 12.0);
    altarCandleLight.position.set(0, 2.4, 1.5);
    altarGroup.add(altarCandleLight);
    this.stoneLampLights.push(altarCandleLight);

    // Nguồn sáng hoàng kim linh thánh trên cao rọi sáng dịu êm toàn bộ nội thất và 3 tôn tượng
    const hallSanctuaryLight = new THREE.PointLight(0xffd54f, 0.95, 38);
    hallSanctuaryLight.position.set(0, 14.5, 3.0);
    altarGroup.add(hallSanctuaryLight);
    this.stoneLampLights.push(hallSanctuaryLight);

    this.altarGroup = altarGroup;
    parent.add(altarGroup);
  }

  /**
   * Tạo Texture Men Lam Gốm Sứ Bát Tràng Truyền Thống Việt Nam
   * Men trắng ngà vân lam, họa tiết cánh sen, mây lành và viền thếp vàng cổ truyền
   */
  private createBatTrangPorcelainTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    // 1. Men sứ trắng ngà mịn màng
    const bgGrad = ctx.createLinearGradient(0, 0, 512, 512);
    bgGrad.addColorStop(0, "#ffffff");
    bgGrad.addColorStop(0.5, "#f7f9fb");
    bgGrad.addColorStop(1, "#edf1f5");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Viền hoa văn lam cổ Bát Tràng
    const cobaltDark = "#0d2b5c";
    const cobaltMid = "#1a4985";
    const cobaltLight = "#2a62a3";

    // Viền chỉ đôi
    ctx.strokeStyle = cobaltDark;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 496);
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, 476, 476);

    // Hàng cánh sen úp ngửa ở đáy
    ctx.fillStyle = cobaltMid;
    for (let x = 20; x < 490; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 480);
      ctx.quadraticCurveTo(x + 18, 425, x + 36, 480);
      ctx.fill();
      ctx.strokeStyle = cobaltDark;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Hàng cánh sen ở cổ
    for (let x = 20; x < 490; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 32);
      ctx.quadraticCurveTo(x + 18, 82, x + 36, 32);
      ctx.fill();
    }

    // Họa tiết hoa sen & mây cuộn ở thân bình
    const drawLotusMotif = (cx: number, cy: number, r: number) => {
      ctx.fillStyle = cobaltDark;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.36, r * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(cx - r * 0.45, cy + r * 0.15, r * 0.3, r * 0.8, -Math.PI / 6, 0, Math.PI * 2);
      ctx.ellipse(cx + r * 0.45, cy + r * 0.15, r * 0.3, r * 0.8, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = cobaltMid;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.42, r * 0.62, 0, Math.PI);
      ctx.stroke();

      ctx.strokeStyle = cobaltLight;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx - r * 1.25, cy + r * 0.2, r * 0.42, Math.PI * 0.5, Math.PI * 1.8);
      ctx.arc(cx + r * 1.25, cy + r * 0.2, r * 0.42, Math.PI * 1.2, Math.PI * 0.5);
      ctx.stroke();
    };

    drawLotusMotif(130, 256, 54);
    drawLotusMotif(382, 256, 54);

    // Viền chỉ vàng thếp điểm xuyết
    ctx.strokeStyle = "rgba(212, 175, 55, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 95); ctx.lineTo(512, 95);
    ctx.moveTo(0, 415); ctx.lineTo(512, 415);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Tạo Texture Gỗ Gụ Chạm Lộng Sơn Son Thếp Vàng Bàn Thờ
   */
  private createCarvedWoodAltarTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;

    // 1. Nền gỗ gụ sơn son huyết dụ trầm ấm
    const bgGrad = ctx.createLinearGradient(0, 0, 1024, 256);
    bgGrad.addColorStop(0, "#320e06");
    bgGrad.addColorStop(0.5, "#48150a");
    bgGrad.addColorStop(1, "#320e06");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 256);

    // Thớ vân gỗ mịn
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    for (let y = 0; y < 256; y += 4) {
      ctx.fillRect(0, y, 1024, 1.5);
    }

    // 2. Ô hộc chạm lộng sơn son thếp vàng
    const panelCount = 4;
    const panelW = 210;
    const panelH = 180;
    const gap = 38;
    const startX = (1024 - (panelCount * panelW + (panelCount - 1) * gap)) / 2;

    for (let i = 0; i < panelCount; i++) {
      const px = startX + i * (panelW + gap);
      const py = 38;

      ctx.fillStyle = "#220803";
      ctx.fillRect(px, py, panelW, panelH);

      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 4;
      ctx.strokeRect(px + 6, py + 6, panelW - 12, panelH - 12);
      ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 14, py + 14, panelW - 28, panelH - 28);

      const cx = px + panelW / 2;
      const cy = py + panelH / 2;

      ctx.fillStyle = "#ffd54f";
      ctx.beginPath();
      ctx.ellipse(cx, cy, 18, 30, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 16, cy + 5, 14, 25, -Math.PI / 6, 0, Math.PI * 2);
      ctx.ellipse(cx + 16, cy + 5, 14, 25, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx - 45, cy + 20, 20, Math.PI * 0.2, Math.PI * 1.5);
      ctx.arc(cx + 45, cy + 20, 20, -Math.PI * 0.5, Math.PI * 0.8);
      ctx.stroke();

      ctx.strokeStyle = "#ffd54f";
      ctx.lineWidth = 2;
      [
        [px + 20, py + 20],
        [px + panelW - 20, py + 20],
        [px + 20, py + panelH - 20],
        [px + panelW - 20, py + panelH - 20]
      ].forEach(([corX, corY]) => {
        ctx.strokeRect(corX - 6, corY - 6, 12, 12);
      });
    }

    ctx.fillStyle = "#ffd700";
    ctx.fillRect(0, 6, 1024, 6);
    ctx.fillRect(0, 244, 1024, 6);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Tạo Texture Khăn Gấm Đỏ Thêu Sen Vàng Trải Bàn Thờ
   */
  private createAltarBrocadeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    // Nền gấm đỏ thẫm hoàng cung
    const bg = ctx.createLinearGradient(0, 0, 512, 512);
    bg.addColorStop(0, "#821212");
    bg.addColorStop(0.5, "#9e1919");
    bg.addColorStop(1, "#6f0d0d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 512);

    // Họa tiết quả trám dệt kim tuyến
    ctx.strokeStyle = "rgba(255, 215, 0, 0.15)";
    ctx.lineWidth = 1.5;
    for (let x = -512; x < 1024; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 512, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, 512); ctx.lineTo(x + 512, 0);
      ctx.stroke();
    }

    const cx = 256;
    const cy = 256;

    ctx.strokeStyle = "rgba(255, 215, 0, 0.55)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#ffd54f";
    ctx.beginPath();
    ctx.ellipse(cx, cy - 20, 36, 68, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 38, cy - 10, 30, 60, -Math.PI / 5, 0, Math.PI * 2);
    ctx.ellipse(cx + 38, cy - 10, 30, 60, Math.PI / 5, 0, Math.PI * 2);
    ctx.ellipse(cx - 65, cy + 8, 24, 48, -Math.PI / 3, 0, Math.PI * 2);
    ctx.ellipse(cx + 65, cy + 8, 24, 48, Math.PI / 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffb300";
    ctx.beginPath();
    ctx.arc(cx, cy + 22, 28, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = "#ffd700";
    ctx.fillRect(0, 485, 512, 27);
    for (let x = 6; x < 512; x += 12) {
      ctx.fillStyle = "#d4af37";
      ctx.fillRect(x, 485, 4, 27);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Tạo Mâm Bồng Ngũ Quả Cát Tường Tươi Thắm Cúng Phật
   * Gồm: Nải chuối tiêu xanh đỡ mâm, bưởi vàng chính giữa, thanh long đỏ rực, táo đỏ cát tường, cam vàng và xoài cát
   */
  private createFruitPlatter(goldMat: THREE.Material): THREE.Group {
    const platterGroup = new THREE.Group();

    // 1. MÂM BỒNG CHÂN CAO BẰNG ĐỒNG THẾP VÀNG (High-Footed Auspicious Platter)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.09, 16), goldMat);
    base.position.y = 0.045;
    platterGroup.add(base);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.22, 12), goldMat);
    stem.position.y = 0.20;
    platterGroup.add(stem);

    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.48, 0.08, 20), goldMat);
    plate.position.y = 0.35;
    platterGroup.add(plate);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.70, 0.025, 6, 20), goldMat);
    rim.position.y = 0.39;
    rim.rotation.x = Math.PI / 2;
    platterGroup.add(rim);

    // 2. VẬT LIỆU CHO CÁC LOẠI TRÁI CÂY TƯƠI CÚNG PHẬT
    const bananaMat = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.45, metalness: 0.05 });
    const bananaTipMat = new THREE.MeshStandardMaterial({ color: 0x2e1c0c, roughness: 0.7 });
    const pomeloMat = new THREE.MeshStandardMaterial({ color: 0xc0ca33, roughness: 0.35, metalness: 0.05 });
    const dragonMat = new THREE.MeshStandardMaterial({ color: 0xe91e63, roughness: 0.28, metalness: 0.08 });
    const leafGreenMat = new THREE.MeshStandardMaterial({ color: 0x66bb6a, roughness: 0.4 });
    const appleMat = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.22, metalness: 0.10 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf57c00, roughness: 0.35, metalness: 0.05 });
    const mangoMat = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.30, metalness: 0.05 });

    // 3. NẢI CHUỐI TIÊU XANH UỐN CONG NÂNG ĐỠ (InstancedMesh: 2 draw calls thay vì 26)
    const bananaCount = 13;
    const bananaGeo = new THREE.CylinderGeometry(0.042, 0.035, 0.36, 6);
    const tipGeo = new THREE.ConeGeometry(0.035, 0.04, 5);

    const bananaInst = new THREE.InstancedMesh(bananaGeo, bananaMat, bananaCount);
    const tipInst = new THREE.InstancedMesh(tipGeo, bananaTipMat, bananaCount);
    const dummyB = new THREE.Object3D();
    const dummyT = new THREE.Object3D();

    for (let i = 0; i < bananaCount; i++) {
      const angle = -Math.PI * 0.78 + (i / (bananaCount - 1)) * Math.PI * 1.56;
      const bRadius = 0.38 + (i % 2 === 0 ? 0.03 : -0.02);
      const bx = Math.sin(angle) * bRadius;
      const bz = Math.cos(angle) * (bRadius * 0.85);

      dummyB.position.set(bx, 0.44, bz);
      dummyB.rotation.set(0.48, angle, -Math.sin(angle) * 0.25);
      dummyB.updateMatrix();
      bananaInst.setMatrixAt(i, dummyB.matrix);

      dummyT.position.set(bx * 1.22, 0.58, bz * 1.22);
      dummyT.rotation.set(0.48, angle, 0);
      dummyT.updateMatrix();
      tipInst.setMatrixAt(i, dummyT.matrix);
    }
    bananaInst.instanceMatrix.needsUpdate = true;
    tipInst.instanceMatrix.needsUpdate = true;
    platterGroup.add(bananaInst);
    platterGroup.add(tipInst);

    // 4. QUẢ BƯỞI VÀNG CÁT TƯỜNG Ở CHÍNH GIỮA (Golden Pomelo)
    const pomelo = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), pomeloMat);
    pomelo.position.set(0, 0.58, 0.02);
    pomelo.scale.set(1.0, 1.14, 1.0);
    platterGroup.add(pomelo);

    // Cuống bưởi & lá xanh
    const stemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.07, 5), bananaTipMat);
    stemMesh.position.set(0, 0.86, 0.02);
    platterGroup.add(stemMesh);

    const leafMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), leafGreenMat);
    leafMesh.position.set(0.04, 0.85, 0.04);
    leafMesh.scale.set(0.3, 1.0, 0.6);
    leafMesh.rotation.z = 0.4;
    platterGroup.add(leafMesh);

    // 5. QUẢ THANH LONG ĐỎ RỰC (Crimson Dragon Fruit)
    const dragonFruit = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), dragonMat);
    dragonFruit.position.set(0.18, 0.56, 0.16);
    dragonFruit.scale.set(0.85, 1.25, 0.85);
    dragonFruit.rotation.z = -0.25;
    dragonFruit.rotation.y = 0.4;
    platterGroup.add(dragonFruit);

    // Tai cánh xanh của thanh long
    const wingGeo = new THREE.ConeGeometry(0.035, 0.07, 4);
    for (let w = 0; w < 6; w++) {
      const wAngle = (w / 6) * Math.PI * 2;
      const wing = new THREE.Mesh(wingGeo, leafGreenMat);
      wing.position.set(
        0.18 + Math.cos(wAngle) * 0.14,
        0.52 + (w % 2) * 0.10,
        0.16 + Math.sin(wAngle) * 0.14
      );
      wing.rotation.x = Math.sin(wAngle) * 0.8;
      wing.rotation.z = -Math.cos(wAngle) * 0.8;
      platterGroup.add(wing);
    }

    // 6. CÁC QUẢ TÁO ĐỎ CÁT TƯỜNG (Auspicious Red Apples)
    const appleGeo = new THREE.SphereGeometry(0.125, 10, 8);
    const applePositions = [
      [-0.19, 0.48, 0.18],
      [-0.26, 0.47, -0.06],
      [0.02, 0.52, -0.22]
    ];
    applePositions.forEach(([ax, ay, az]) => {
      const apple = new THREE.Mesh(appleGeo, appleMat);
      apple.position.set(ax, ay, az);
      apple.scale.set(1.0, 0.92, 1.0);
      platterGroup.add(apple);

      const aStem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 4), bananaTipMat);
      aStem.position.set(ax, ay + 0.12, az);
      platterGroup.add(aStem);
    });

    // 7. CÁC QUẢ CAM VÀNG TƯƠI (Vibrant Citrus Oranges)
    const orangeGeo = new THREE.SphereGeometry(0.115, 10, 8);
    const orangePositions = [
      [0.22, 0.46, -0.05],
      [0.05, 0.45, 0.28],
      [0.20, 0.50, -0.19]
    ];
    orangePositions.forEach(([ox, oy, oz]) => {
      const orange = new THREE.Mesh(orangeGeo, orangeMat);
      orange.position.set(ox, oy, oz);
      platterGroup.add(orange);
    });

    // 8. QUẢ XOÀI CÁT VÀNG TRÊN ĐỈNH (Golden Ripe Mango)
    const mango = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mangoMat);
    mango.position.set(-0.06, 0.76, 0.12);
    mango.scale.set(0.68, 1.25, 0.85);
    mango.rotation.z = 0.55;
    mango.rotation.x = 0.35;
    platterGroup.add(mango);

    return platterGroup;
  }

  /**
   * Tạo Đại Bát Hương Men Lam Bát Tràng Chính Điện
   * Chân đế tam cấp gỗ gụ, thân gốm sứ men lam vẽ rồng sen, tro nếp trắng, bó chân nhang đỏ và nén hương đang thắp
   */
  private createGrandIncenseBurner(
    batTrangMat: THREE.Material,
    darkWoodMat: THREE.Material,
    goldMat: THREE.Material,
    bronzeMat: THREE.Material
  ): THREE.Group {
    const burnerGroup = new THREE.Group();

    // 1. Chân đế gỗ gụ tam cấp chạm lộng
    const baseStand = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.12, 20), darkWoodMat);
    baseStand.position.y = 0.06;
    burnerGroup.add(baseStand);

    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.02, 8, 24), goldMat);
    baseRing.position.y = 0.12;
    baseRing.rotation.x = Math.PI / 2;
    burnerGroup.add(baseRing);

    // 2. Thân Bát Hương Gốm Sứ Men Lam Bát Tràng
    const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.30, 0.44, 24), batTrangMat);
    vessel.position.y = 0.34;
    burnerGroup.add(vessel);

    // Vành miệng bát hương bọc đồng mạ vàng loe rộng
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.032, 10, 28), goldMat);
    rim.position.y = 0.56;
    rim.rotation.x = Math.PI / 2;
    burnerGroup.add(rim);

    // Đôi tai rồng mây cách điệu 2 bên bát hương
    [-0.40, 0.40].forEach((hx, i) => {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.026, 8, 16), bronzeMat);
      handle.position.set(hx, 0.38, 0);
      handle.rotation.y = i === 0 ? -Math.PI / 2 : Math.PI / 2;
      burnerGroup.add(handle);
    });

    // 3. Lòng bát hương đầy tro nếp trắng tinh sạch
    const ash = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0xf0f3f4, roughness: 0.95 })
    );
    ash.position.y = 0.52;
    burnerGroup.add(ash);

    // 4. Bó chân nhang đỏ may mắn cắm xòe quạt sum suê (InstancedMesh: 1 draw call thay vì 38)
    const stickMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.5 });
    const stickGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.38, 4);

    const stickCount = 38;
    const stickInst = new THREE.InstancedMesh(stickGeo, stickMat, stickCount);
    const dummyStick = new THREE.Object3D();

    for (let i = 0; i < stickCount; i++) {
      const rad = Math.sqrt(Math.random()) * 0.28;
      const ang = Math.random() * Math.PI * 2;
      const sx = Math.cos(ang) * rad;
      const sz = Math.sin(ang) * rad;
      const stickH = 0.32 + Math.random() * 0.14;

      dummyStick.scale.set(1, stickH / 0.38, 1);
      dummyStick.position.set(sx, 0.52 + stickH * 0.45, sz);
      dummyStick.rotation.set(
        (sz / 0.35) * 0.22 + (Math.random() - 0.5) * 0.08,
        0,
        (sx / 0.35) * 0.22 + (Math.random() - 0.5) * 0.08
      );
      dummyStick.updateMatrix();
      stickInst.setMatrixAt(i, dummyStick.matrix);
    }
    stickInst.instanceMatrix.needsUpdate = true;
    burnerGroup.add(stickInst);

    // 5. CÁC NÉN TÂM HƯƠNG ĐANG THẮP TỎA HƯƠNG (Đầu tàn đỏ rực phát sáng, khói chuyển sang hệ thống hạt altarSmoke)
    const burnStickMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.6 });
    const burnTipMat = new THREE.MeshStandardMaterial({
      color: 0xff3d00,
      emissive: 0xff5722,
      emissiveIntensity: 3.5,
    });

    const activeSticks = [
      [0, 0],
      [-0.07, 0.04],
      [0.07, 0.04],
      [-0.04, -0.06],
      [0.04, -0.06]
    ];

    activeSticks.forEach(([ax, az]) => {
      const stickLength = 0.58;
      const bStick = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, stickLength, 4), burnStickMat);
      bStick.position.set(ax, 0.52 + stickLength * 0.5, az);
      bStick.rotation.z = ax * 0.5;
      bStick.rotation.x = az * 0.5;
      burnerGroup.add(bStick);

      // Đầu nén hương đỏ rực
      const tipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), burnTipMat);
      const tipY = 0.52 + stickLength;
      tipMesh.position.set(ax * 1.05, tipY, az * 1.05);
      burnerGroup.add(tipMesh);
    });

    return burnerGroup;
  }

  /**
   * Tạo Bộ Kỷ Ngũ Chén Nước Cam Lồ Thanh Tịnh Cúng Tam Bảo
   */
  private createWaterCupsGroup(batTrangMat: THREE.Material, goldMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // Khay kỷ gỗ chạm son thếp vàng uốn cong
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(1.30, 0.05, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x4a180d, roughness: 0.4 })
    );
    tray.position.y = 0.025;
    group.add(tray);

    const trayRim = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.03, 0.28), goldMat);
    trayRim.position.y = 0.05;
    group.add(trayRim);

    // 5 chén nước Cam Lồ tinh khiết
    const cupGeo = new THREE.CylinderGeometry(0.055, 0.040, 0.08, 14);
    const waterGeo = new THREE.CylinderGeometry(0.050, 0.050, 0.015, 12);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x81d4fa,
      roughness: 0.1,
      metalness: 0.4,
      transparent: true,
      opacity: 0.85
    });

    const spacing = 0.24;
    for (let c = -2; c <= 2; c++) {
      const cx = c * spacing;
      const cup = new THREE.Mesh(cupGeo, batTrangMat);
      cup.position.set(cx, 0.08, 0);
      group.add(cup);

      // Nước trong chén
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.position.set(cx, 0.115, 0);
      group.add(water);

      // Viền chén bọc vàng
      const cupRim = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.007, 6, 16), goldMat);
      cupRim.position.set(cx, 0.12, 0);
      cupRim.rotation.x = Math.PI / 2;
      group.add(cupRim);
    }

    return group;
  }

  /**
   * Tạo Đôi Lọ Lục Bình Gốm Lam Bát Tràng Cắm Sen Hồng & Cúc Vàng
   */
  private createTallPorcelainFlowerVase(batTrangMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // Chân bình
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.20, 0.26, 0.15, 16),
      new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.5 })
    );
    foot.position.y = 0.075;
    group.add(foot);

    // Bụng bình nở tròn
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), batTrangMat);
    belly.position.y = 0.45;
    belly.scale.set(1.0, 1.25, 1.0);
    group.add(belly);

    // Cổ bình thon cao
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.20, 0.35, 16), batTrangMat);
    neck.position.y = 0.82;
    group.add(neck);

    // Miệng bình loe rộng cánh sen
    const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.13, 0.15, 16), batTrangMat);
    mouth.position.y = 1.05;
    group.add(mouth);

    // Hoa sen hồng và cúc vàng cắm rực rỡ trong bình
    const pinkLotusMat = new THREE.MeshStandardMaterial({
      color: 0xf48fb1,
      emissive: 0xad1457,
      emissiveIntensity: 0.35
    });
    const yellowDaisyMat = new THREE.MeshStandardMaterial({
      color: 0xffeb3b,
      emissive: 0xf57f17,
      emissiveIntensity: 0.30
    });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.5 });

    // 3 Búp sen hồng vươn cao
    const lotusOffsets = [
      [0, 1.45, 0, 0.20],
      [-0.14, 1.35, 0.08, 0.17],
      [0.14, 1.35, -0.08, 0.17]
    ];
    lotusOffsets.forEach(([lx, ly, lz, r]) => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6), stemMat);
      stem.position.set(lx * 0.6, ly - 0.22, lz * 0.6);
      group.add(stem);

      const lotus = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), pinkLotusMat);
      lotus.position.set(lx, ly, lz);
      lotus.scale.set(0.85, 1.35, 0.85);
      group.add(lotus);
    });

    // 4 Bông cúc vàng xen kẽ
    const daisyOffsets = [
      [-0.18, 1.22, -0.12],
      [0.18, 1.22, 0.12],
      [0.08, 1.26, 0.18],
      [-0.08, 1.26, -0.18]
    ];
    daisyOffsets.forEach(([dx, dy, dz]) => {
      const daisy = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), yellowDaisyMat);
      daisy.position.set(dx, dy, dz);
      group.add(daisy);
    });

    return group;
  }

  /**
   * Tạo Đôi Chân Nến Đồng Cổ & Cây Nến Đỏ Thắp Sáng Cúng Phật
   */
  private createAltarBronzeCandlestick(bronzeMat: THREE.Material, goldMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // Chân nến đồng chạm tam cấp
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.14, 16), bronzeMat);
    base.position.y = 0.07;
    group.add(base);

    // Đĩa hứng tàn nến rộng
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 0.06, 16), goldMat);
    tray.position.y = 0.45;
    group.add(tray);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.85, 12), bronzeMat);
    shaft.position.y = 0.50;
    group.add(shaft);

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.12, 12), goldMat);
    cup.position.y = 0.96;
    group.add(cup);

    // Cây nến đỏ phong thủy cúng Phật
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.35, metalness: 0.05 });
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.58, 12), candleMat);
    candle.position.y = 1.28;
    group.add(candle);

    // Ngọn lửa nến ấm áp (Emissive rực rỡ không cần thêm PointLight thừa)
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffca28,
      emissive: 0xff6f00,
      emissiveIntensity: 2.2
    });
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), flameMat);
    flame.position.y = 1.62;
    flame.scale.set(1.0, 1.8, 1.0);
    group.add(flame);

    return group;
  }

  /**
   * Tạo Đôi Đèn Hoa Sen Pha Lê Lưu Ly Hồng Phát Sáng
   */
  private createCrystalLotusLamp(bronzeMat: THREE.Material, goldMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // Đế đèn hoa sen bằng đồng
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.12, 14), bronzeMat);
    base.position.y = 0.06;
    group.add(base);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.30, 10), goldMat);
    stem.position.y = 0.25;
    group.add(stem);

    // Đài sen pha lê lưu ly nhiều tầng cánh
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xf48fb1,
      emissive: 0xff4081,
      emissiveIntensity: 0.65,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.90
    });

    const outerLotus = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
      crystalMat
    );
    outerLotus.rotation.x = Math.PI;
    outerLotus.position.y = 0.58;
    group.add(outerLotus);

    // Nhụy ngọc sáng lung linh
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffeb3b,
        emissive: 0xffd700,
        emissiveIntensity: 2.0
      })
    );
    core.position.y = 0.52;
    group.add(core);

    return group;
  }

  /**
   * Tạo Đỉnh Hương Đồng Ba Chân Nghê Vờn Ngọc (Lư Trầm Tầng Trung)
   */
  private createBronzeTripodCenser(bronzeMat: THREE.Material, goldMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();

    // 3 Chân quỳ vững chãi
    for (let l = 0; l < 3; l++) {
      const legAngle = (l / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.25, 8), bronzeMat);
      leg.position.set(Math.cos(legAngle) * 0.28, 0.125, Math.sin(legAngle) * 0.28);
      leg.rotation.z = Math.cos(legAngle) * 0.25;
      leg.rotation.x = -Math.sin(legAngle) * 0.25;
      group.add(leg);
    }

    // Bầu đỉnh đồng tròn đúc hoa văn
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 14), bronzeMat);
    belly.position.y = 0.36;
    belly.scale.set(1.1, 0.9, 1.1);
    group.add(belly);

    // Vành chỉ vàng quanh eo đỉnh
    const bellyRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.022, 8, 24), goldMat);
    bellyRing.position.y = 0.36;
    bellyRing.rotation.x = Math.PI / 2;
    group.add(bellyRing);

    // Cổ loe miệng đỉnh
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.12, 16), bronzeMat);
    neck.position.y = 0.52;
    group.add(neck);

    // Nắp đỉnh đồng hình vòm chạm thủng
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), bronzeMat);
    lid.position.y = 0.58;
    group.add(lid);

    // Tượng Nghê đồng vờn ngọc trên chóp nắp
    const kylin = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), goldMat);
    kylin.position.y = 0.78;
    kylin.scale.set(0.9, 1.2, 1.1);
    group.add(kylin);

    // Quai đỉnh đồng 2 bên (tai mây)
    [-0.38, 0.38].forEach((qx) => {
      const q = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), bronzeMat);
      q.position.set(qx, 0.42, 0);
      group.add(q);
    });

    return group;
  }

  /**
   * Tạo Texture Khuôn Mặt Đức Phật Từ Bi & Tướng Hảo Quang Minh
   * Độ phân giải cao 1024x1024, mắt khép hờ từ bi nhìn xuống, nụ cười an nhiên tự tại, bạch hào ngọc sáng rực rỡ
   */
  private createBuddhaFaceTexture(_type?: "shakyamuni" | "avalokiteshvara" | "mahasthamaprapta"): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // 1. Nền hoàng kim thanh tịnh (Radiant Golden Divine Complexion)
    // Tọa độ UV mặt Phật trên hình cầu: trung tâm U=0.25 (X=256), V=0.50 (Y=512)
    const faceCenterX = 256;
    const faceCenterY = 512;

    // Sắc tướng kim thân hoàng kim đồng cổ rực rỡ của Đức Phật & Nhị Vị Bồ Tát (Antique Gilt Bronze Gold)
    const skinGrad = ctx.createRadialGradient(faceCenterX, faceCenterY, 30, faceCenterX, faceCenterY, 340);
    skinGrad.addColorStop(0, "#fff5d7");
    skinGrad.addColorStop(0.35, "#f7dc8a");
    skinGrad.addColorStop(0.75, "#e5b948");
    skinGrad.addColorStop(1, "#c59426");
    ctx.fillStyle = skinGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. Gò má hồng hào trang nghiêm phúc tướng (Compassionate Divine Blush)
    const blushLeft = ctx.createRadialGradient(faceCenterX - 85, faceCenterY + 45, 10, faceCenterX - 85, faceCenterY + 45, 80);
    blushLeft.addColorStop(0, "rgba(235, 115, 115, 0.28)");
    blushLeft.addColorStop(1, "rgba(235, 115, 115, 0)");
    ctx.fillStyle = blushLeft;
    ctx.beginPath();
    ctx.arc(faceCenterX - 85, faceCenterY + 45, 80, 0, Math.PI * 2);
    ctx.fill();

    const blushRight = ctx.createRadialGradient(faceCenterX + 85, faceCenterY + 45, 10, faceCenterX + 85, faceCenterY + 45, 80);
    blushRight.addColorStop(0, "rgba(235, 115, 115, 0.28)");
    blushRight.addColorStop(1, "rgba(235, 115, 115, 0)");
    ctx.fillStyle = blushRight;
    ctx.beginPath();
    ctx.arc(faceCenterX + 85, faceCenterY + 45, 80, 0, Math.PI * 2);
    ctx.fill();

    // 3. Đôi Chân Mày Lá Liễu Thanh Tú (Willow-Leaf Eyebrows)
    ctx.strokeStyle = "#4a2a10";
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";

    // Chân mày trái
    ctx.beginPath();
    ctx.moveTo(faceCenterX - 24, faceCenterY - 48);
    ctx.quadraticCurveTo(faceCenterX - 72, faceCenterY - 78, faceCenterX - 124, faceCenterY - 45);
    ctx.stroke();

    // Chân mày phải
    ctx.beginPath();
    ctx.moveTo(faceCenterX + 24, faceCenterY - 48);
    ctx.quadraticCurveTo(faceCenterX + 72, faceCenterY - 78, faceCenterX + 124, faceCenterY - 45);
    ctx.stroke();

    // 4. Bạch Hào Quang Tướng Giữa Trán (Urna - Sacred White Wisdom Pearl)
    const urnaY = faceCenterY - 74;
    const urnaGlow = ctx.createRadialGradient(faceCenterX, urnaY, 2, faceCenterX, urnaY, 28);
    urnaGlow.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    urnaGlow.addColorStop(0.35, "rgba(255, 245, 180, 0.85)");
    urnaGlow.addColorStop(1, "rgba(255, 215, 0, 0)");
    ctx.fillStyle = urnaGlow;
    ctx.beginPath();
    ctx.arc(faceCenterX, urnaY, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(faceCenterX, urnaY, 9.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Điểm sáng ngọc mani
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(faceCenterX - 2.5, urnaY - 2.5, 3.0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Đôi Mắt Từ Bi Khép Hờ Tĩnh Tọa (Serene Meditative Half-Closed Eyes)
    const drawBuddhaEye = (cx: number, cy: number, isLeft: boolean) => {
      const ew = 46;
      // Đường mi mắt trên cong thanh thoát, khép hờ nhìn xuống thế gian
      ctx.strokeStyle = "#241206";
      ctx.lineWidth = 5.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      const leftTipX = isLeft ? cx - ew : cx - ew + 4;
      const rightTipX = isLeft ? cx + ew - 4 : cx + ew;
      ctx.moveTo(leftTipX, cy);
      ctx.quadraticCurveTo(cx, cy - 15, rightTipX, cy + 2);
      ctx.stroke();

      // Mí mắt đôi nhẹ nhàng phía trên
      ctx.strokeStyle = "rgba(100, 60, 25, 0.45)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(leftTipX + 6, cy - 7);
      ctx.quadraticCurveTo(cx, cy - 22, rightTipX - 6, cy - 6);
      ctx.stroke();

      // Đường viền mi dưới khép nhẹ
      ctx.strokeStyle = "rgba(120, 70, 30, 0.4)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(leftTipX + 4, cy + 2);
      ctx.quadraticCurveTo(cx, cy + 8, rightTipX - 4, cy + 3);
      ctx.stroke();

      // Nhãn cầu & đồng tử khép hờ tĩnh toạ nhìn xuống
      ctx.fillStyle = "#18120e";
      ctx.beginPath();
      ctx.ellipse(cx + (isLeft ? 4 : -4), cy + 1, 10, 5.5, 0, 0, Math.PI);
      ctx.fill();

      // Đuôi mắt cong nhẹ từ bi
      ctx.lineWidth = 3.0;
      ctx.strokeStyle = "#241206";
      ctx.beginPath();
      const tailX = isLeft ? cx - ew : cx + ew;
      ctx.moveTo(tailX, cy);
      ctx.lineTo(tailX + (isLeft ? -8 : 8), cy - 3);
      ctx.stroke();
    };

    drawBuddhaEye(faceCenterX - 70, faceCenterY - 14, true);
    drawBuddhaEye(faceCenterX + 70, faceCenterY - 14, false);

    // 6. Sống Mũi Trang Nghiêm & Đầu Mũi Phúc Hậu (Noble Sculpted Nose)
    ctx.strokeStyle = "rgba(130, 80, 30, 0.35)";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(faceCenterX - 8, faceCenterY - 34);
    ctx.quadraticCurveTo(faceCenterX - 12, faceCenterY + 20, faceCenterX - 16, faceCenterY + 44);
    ctx.stroke();

    // Đầu mũi tròn đầy phúc tướng
    ctx.strokeStyle = "rgba(110, 65, 25, 0.6)";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(faceCenterX, faceCenterY + 48, 13, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Hai cánh mũi mềm mại
    ctx.beginPath();
    ctx.arc(faceCenterX - 15, faceCenterY + 48, 5.5, 0.8 * Math.PI, 1.8 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(faceCenterX + 15, faceCenterY + 48, 5.5, -0.8 * Math.PI, 0.2 * Math.PI);
    ctx.stroke();

    // 7. Nụ Cười Hoan Hỷ & Từ Bi Giải Thoát (Compassionate Transcendent Smile)
    const mouthY = faceCenterY + 88;
    // Rãnh nhân trung thanh thoát
    ctx.strokeStyle = "rgba(120, 70, 30, 0.3)";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(faceCenterX, faceCenterY + 54);
    ctx.lineTo(faceCenterX, mouthY - 8);
    ctx.stroke();

    // Bờ môi trên uốn hình cánh cung son ngọc
    ctx.fillStyle = "#a93226";
    ctx.beginPath();
    ctx.moveTo(faceCenterX - 32, mouthY - 2);
    ctx.quadraticCurveTo(faceCenterX - 16, mouthY - 10, faceCenterX, mouthY - 3);
    ctx.quadraticCurveTo(faceCenterX + 16, mouthY - 10, faceCenterX + 32, mouthY - 2);
    ctx.quadraticCurveTo(faceCenterX, mouthY + 6, faceCenterX - 32, mouthY - 2);
    ctx.fill();

    // Môi dưới đầy đặn màu son cát tường
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.moveTo(faceCenterX - 26, mouthY);
    ctx.quadraticCurveTo(faceCenterX, mouthY + 18, faceCenterX + 26, mouthY);
    ctx.quadraticCurveTo(faceCenterX, mouthY + 5, faceCenterX - 26, mouthY);
    ctx.fill();

    // Khóe môi nhếch lên nhẹ nhàng biểu thị nụ cười an lạc
    ctx.strokeStyle = "#641e16";
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(faceCenterX - 32, mouthY - 2);
    ctx.lineTo(faceCenterX - 36, mouthY - 6);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(faceCenterX + 32, mouthY - 2);
    ctx.lineTo(faceCenterX + 36, mouthY - 6);
    ctx.stroke();

    // Điểm bóng son nhẹ trên môi dưới
    ctx.fillStyle = "rgba(255, 230, 200, 0.55)";
    ctx.beginPath();
    ctx.ellipse(faceCenterX, mouthY + 7, 11, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Tạo Kiệt Tác Tranh Bích Họa Phật Giáo Cổ Điển Phía Sau Ban Thờ (Joseon / Goryeo Temple Mural)
   * Tái hiện 100% không gian chánh điện thiêng liêng: 3 vầng hào quang tròn xanh ngọc bích, mây ngũ sắc cuộn trào
   */
  private createAncientBuddhistMuralTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;

    // 1. Nền tranh lụa / sơn mài cổ trầm mặc nâu sẫm đất nung
    const bgGrad = ctx.createLinearGradient(0, 0, 2048, 1024);
    bgGrad.addColorStop(0, "#140b07");
    bgGrad.addColorStop(0.3, "#22130d");
    bgGrad.addColorStop(0.7, "#1a0e09");
    bgGrad.addColorStop(1, "#120a06");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Vân lụa cổ & bụi vàng thời gian
    ctx.fillStyle = "rgba(212, 175, 55, 0.025)";
    for (let y = 0; y < 1024; y += 3) {
      ctx.fillRect(0, y, 2048, 1.2);
    }

    // 2. Mây ngũ sắc cổ cuộn trào khắp bức bích họa (Swirling Auspicious Clouds)
    const drawCloudCluster = (cx: number, cy: number, r: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx - r * 0.7, cy + r * 0.2, r * 0.75, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.7, cy + r * 0.2, r * 0.75, 0, Math.PI * 2);
      ctx.arc(cx - r * 1.2, cy + r * 0.4, r * 0.5, 0, Math.PI * 2);
      ctx.arc(cx + r * 1.2, cy + r * 0.4, r * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Viền kim tuyến mây vàng
      ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
      ctx.lineWidth = 2.0;
      ctx.stroke();
    };

    // Vẽ các cụm mây lành ngũ sắc quanh viền
    const cloudCoords = [
      [180, 180, 70, "rgba(80, 35, 20, 0.45)"],
      [320, 240, 85, "rgba(28, 70, 52, 0.4)"],
      [680, 160, 90, "rgba(120, 45, 25, 0.35)"],
      [820, 220, 75, "rgba(35, 80, 60, 0.4)"],
      [1220, 220, 75, "rgba(35, 80, 60, 0.4)"],
      [1360, 160, 90, "rgba(120, 45, 25, 0.35)"],
      [1720, 240, 85, "rgba(28, 70, 52, 0.4)"],
      [1860, 180, 70, "rgba(80, 35, 20, 0.45)"],
      [220, 780, 95, "rgba(40, 20, 15, 0.5)"],
      [1820, 780, 95, "rgba(40, 20, 15, 0.5)"],
    ];
    cloudCoords.forEach(([cx, cy, r, col]) => {
      drawCloudCluster(cx as number, cy as number, r as number, col as string);
    });

    // 3. VẦNG HÀO QUANG TRUNG TÂM KHỔNG LỒ (SAU ĐỨC PHẬT THÍCH CA: X = 1024, Y = 460)
    const midX = 1024;
    const midY = 460;

    // Vành lửa hào quang ngoài cùng (R = 340px)
    const flameGrad = ctx.createRadialGradient(midX, midY, 260, midX, midY, 350);
    flameGrad.addColorStop(0, "rgba(212, 175, 55, 0.95)");
    flameGrad.addColorStop(0.5, "rgba(180, 40, 20, 0.85)");
    flameGrad.addColorStop(1, "rgba(50, 15, 10, 0.0)");
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.arc(midX, midY, 350, 0, Math.PI * 2);
    ctx.fill();

    // Vành hoa văn sen son thếp vàng (R = 270px)
    ctx.fillStyle = "#6e1a14";
    ctx.beginPath();
    ctx.arc(midX, midY, 270, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 6;
    ctx.stroke();

    // Vành hào quang xanh ngọc bích thanh tịnh (R = 195px)
    const jadeGrad = ctx.createRadialGradient(midX, midY, 20, midX, midY, 195);
    jadeGrad.addColorStop(0, "#27ae60");
    jadeGrad.addColorStop(0.65, "#1e8449");
    jadeGrad.addColorStop(1, "#145a32");
    ctx.fillStyle = jadeGrad;
    ctx.beginPath();
    ctx.arc(midX, midY, 195, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4d03f";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Tôn ảnh Đức Phật trong tranh bích họa (Painted Buddha figure in mural)
    // Tòa sen vẽ
    ctx.fillStyle = "#d35400";
    ctx.beginPath();
    ctx.ellipse(midX, midY + 110, 95, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Thân Phật vẽ khoác áo cà sa đỏ son
    ctx.fillStyle = "#922b21";
    ctx.beginPath();
    ctx.arc(midX, midY + 35, 65, 0, Math.PI * 2);
    ctx.fill();

    // Đầu Phật vẽ và nhục kế với hào quang tròn nhỏ
    ctx.fillStyle = "#f5b041";
    ctx.beginPath();
    ctx.arc(midX, midY - 35, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1e272c";
    ctx.beginPath();
    ctx.arc(midX, midY - 44, 30, Math.PI * 1.1, Math.PI * 1.9);
    ctx.arc(midX, midY - 68, 14, 0, Math.PI * 2);
    ctx.fill();

    // 4. VẦNG HÀO QUANG & BÍCH HỌA BỒ TÁT BÊN TRÁI (X = 460, Y = 460)
    const leftX = 460;
    const leftY = 460;

    // Vầng hào quang ngoài (R = 250px)
    const leftHaloGrad = ctx.createRadialGradient(leftX, leftY, 160, leftX, leftY, 255);
    leftHaloGrad.addColorStop(0, "rgba(212, 175, 55, 0.9)");
    leftHaloGrad.addColorStop(0.7, "rgba(160, 50, 25, 0.7)");
    leftHaloGrad.addColorStop(1, "rgba(40, 15, 10, 0.0)");
    ctx.fillStyle = leftHaloGrad;
    ctx.beginPath();
    ctx.arc(leftX, leftY, 255, 0, Math.PI * 2);
    ctx.fill();

    // Vòng ngọc bích (R = 175px)
    const leftJade = ctx.createRadialGradient(leftX, leftY, 20, leftX, leftY, 175);
    leftJade.addColorStop(0, "#2ecc71");
    leftJade.addColorStop(0.7, "#196f3d");
    leftJade.addColorStop(1, "#0e3a1f");
    ctx.fillStyle = leftJade;
    ctx.beginPath();
    ctx.arc(leftX, leftY, 175, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Tôn ảnh Bồ Tát vẽ đứng trang nghiêm cầm hoa sen
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.ellipse(leftX, leftY + 120, 60, 140, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f5b041";
    ctx.beginPath();
    ctx.arc(leftX, leftY - 35, 30, 0, Math.PI * 2);
    ctx.fill();

    // Vương miện bích họa Bồ Tát
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.moveTo(leftX - 25, leftY - 50);
    ctx.lineTo(leftX - 15, leftY - 85);
    ctx.lineTo(leftX, leftY - 95);
    ctx.lineTo(leftX + 15, leftY - 85);
    ctx.lineTo(leftX + 25, leftY - 50);
    ctx.closePath();
    ctx.fill();

    // Cành hoa sen hồng trên tay
    ctx.fillStyle = "#e91e63";
    ctx.beginPath();
    ctx.arc(leftX + 45, leftY - 15, 14, 0, Math.PI * 2);
    ctx.fill();

    // 5. VẦNG HÀO QUANG & BÍCH HỌA BỒ TÁT BÊN PHẢI (X = 1588, Y = 460)
    const rightX = 1588;
    const rightY = 460;

    // Vầng hào quang ngoài (R = 250px)
    const rightHaloGrad = ctx.createRadialGradient(rightX, rightY, 160, rightX, rightY, 255);
    rightHaloGrad.addColorStop(0, "rgba(212, 175, 55, 0.9)");
    rightHaloGrad.addColorStop(0.7, "rgba(160, 50, 25, 0.7)");
    rightHaloGrad.addColorStop(1, "rgba(40, 15, 10, 0.0)");
    ctx.fillStyle = rightHaloGrad;
    ctx.beginPath();
    ctx.arc(rightX, rightY, 255, 0, Math.PI * 2);
    ctx.fill();

    // Vòng ngọc bích (R = 175px)
    const rightJade = ctx.createRadialGradient(rightX, rightY, 20, rightX, rightY, 175);
    rightJade.addColorStop(0, "#2ecc71");
    rightJade.addColorStop(0.7, "#196f3d");
    rightJade.addColorStop(1, "#0e3a1f");
    ctx.fillStyle = rightJade;
    ctx.beginPath();
    ctx.arc(rightX, rightY, 175, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Tôn ảnh Bồ Tát vẽ đứng trang nghiêm
    ctx.fillStyle = "#c0392b";
    ctx.beginPath();
    ctx.ellipse(rightX, rightY + 120, 60, 140, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f5b041";
    ctx.beginPath();
    ctx.arc(rightX, rightY - 35, 30, 0, Math.PI * 2);
    ctx.fill();

    // Vương miện bích họa Bồ Tát
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.moveTo(rightX - 25, rightY - 50);
    ctx.lineTo(rightX - 15, rightY - 85);
    ctx.lineTo(rightX, rightY - 95);
    ctx.lineTo(rightX + 15, rightY - 85);
    ctx.lineTo(rightX + 25, rightY - 50);
    ctx.closePath();
    ctx.fill();

    // Bình báu trên tay
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(rightX - 45, rightY - 10, 10, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 6. Vũ Hoa Thiên Hoa & Hoa Sen Vàng Khắp Bích Họa
    const lotusPetals = [
      [120, 420], [280, 620], [750, 400], [880, 680],
      [1160, 680], [1280, 400], [1760, 620], [1920, 420]
    ];
    ctx.fillStyle = "#ffd54f";
    lotusPetals.forEach(([px, py]) => {
      ctx.beginPath();
      ctx.ellipse(px, py, 14, 24, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * TƯỢNG PHẬT THÍCH CA MÂU NI NGỒI KIẾT GIÀ (CHÍNH GIỮA)
   * Thủ ấn Thuyết Pháp Vitarka Mudra giơ ngang ngực, tay trái mở ngửa trên đùi, vạt áo cà sa phủ mềm mại tràn đài sen
   */
  private createSeatedBuddhaStatue(
    parent: THREE.Group,
    x: number, y: number, z: number,
    scale: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.set(scale, scale, scale);
    group.name = "statue_shakyamuni";

    // Chất liệu Kim Thân Hoàng Kim Thếp Vàng Đồng Cổ (Antique Gilt Bronze Gold)
    const goldStatueMat = new THREE.MeshStandardMaterial({
      color: 0xdfa732,
      emissive: 0x6e4a05,
      emissiveIntensity: 0.18,
      metalness: 0.78,
      roughness: 0.28,
    });

    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0x8a5e0d,
      emissiveIntensity: 0.30,
      metalness: 0.88,
      roughness: 0.18,
    });

    const robeGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd49b28,
      emissive: 0x5a3d05,
      emissiveIntensity: 0.15,
      metalness: 0.72,
      roughness: 0.32,
    });

    // 1. TÒA SEN VÀNG CÁNH KÉP & VẠT ÁO CÀ SA PHỦ TRÀN (Flowing Golden Lotus Throne)
    // Đế tòa sen bát giác mạ vàng
    const baseOct = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 0.32, 16), goldStatueMat);
    baseOct.position.y = 0.16;
    group.add(baseOct);

    // Vành eo đài sen
    const waist = new THREE.Mesh(new THREE.CylinderGeometry(1.20, 1.35, 0.22, 20), goldStatueMat);
    waist.position.y = 0.42;
    group.add(waist);

    // Vòng cánh sen nở rộ mạ vàng
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), goldTrimMat);
      petal.position.set(Math.cos(a) * 1.15, 0.58, Math.sin(a) * 1.15);
      petal.scale.set(1.4, 0.55, 2.0);
      petal.rotation.y = -a;
      petal.rotation.x = 0.45;
      group.add(petal);
    }

    // 2. VẠT ÁO CÀ SA MỀM MẠI PHỦ TRÀN BỀ MẶT ĐÀI SEN (Cascading Robe Drapery - chuẩn theo ảnh)
    // Tầng sóng áo 1 (Rộng phủ mặt trước)
    const fold1 = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.28, 0.38), robeGoldMat);
    fold1.position.set(0, 0.55, 0.72);
    fold1.rotation.x = 0.32;
    group.add(fold1);

    // Tầng sóng áo 2 (Rủ mềm giữa đài sen)
    const fold2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.40, 14, 1, false, 0, Math.PI), robeGoldMat);
    fold2.position.set(0, 0.45, 0.88);
    fold2.rotation.set(0.55, 0, 0);
    group.add(fold2);

    // Nếp sóng áo uốn lượn hai bên mép đài sen
    [-0.45, 0.45].forEach((dx) => {
      const sideFold = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), robeGoldMat);
      sideFold.position.set(dx, 0.52, 0.78);
      sideFold.scale.set(0.9, 0.5, 1.4);
      sideFold.rotation.y = dx < 0 ? 0.3 : -0.3;
      group.add(sideFold);
    });

    // 3. TỌA THIỀN KIẾT GIÀ TRANG NGHIÊM (Crossed Legs)
    const crossedLegs = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.98, 0.38, 22), robeGoldMat);
    crossedLegs.position.y = 0.88;
    group.add(crossedLegs);

    // Hai bàn chân sen ngửa lòng bàn chân hướng lên trời
    [-0.26, 0.26].forEach((fx) => {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.16), goldStatueMat);
      foot.position.set(fx, 1.05, 0.38);
      foot.rotation.y = fx < 0 ? 0.35 : -0.35;
      group.add(foot);
    });

    // 4. THÂN KIM THÂN & Y CÀ SA NHIỀU NẾP GẤP (Torso & Robe)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.58, 0.98, 20), robeGoldMat);
    torso.position.y = 1.48;
    group.add(torso);

    // Y cà sa vắt chéo qua vai trái uyển chuyển
    const robeSash = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.60, 1.0, 20, 1, false, 0, Math.PI * 1.15),
      goldTrimMat
    );
    robeSash.position.y = 1.48;
    robeSash.rotation.y = -0.42;
    group.add(robeSash);

    // Viền cổ áo cà sa thếp vàng
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.04, 8, 20), goldTrimMat);
    collar.position.set(0, 1.90, 0.05);
    collar.rotation.x = Math.PI / 2.3;
    group.add(collar);

    // 5. THỦ ẤN THUYẾT PHÁP VITARKA MUDRA & THIỀN ĐỊNH (CHUẨN 100% THEO ẢNH CHỤP)
    // TAY PHẢI: Giơ lên ngang ngực, ngón cái chạm ngón giữa (Ấn Thuyết Pháp Vitarka Mudra), lòng bàn tay hướng ra phía trước!
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.34, 1.45, 0.05);
    group.add(rightArmGroup);

    // Bắp tay phải buông xuôi hơi hướng ra trước
    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.48, 12), goldStatueMat);
    rightUpperArm.position.set(0.08, -0.16, 0.10);
    rightUpperArm.rotation.set(0.45, -0.20, 0.45);
    rightArmGroup.add(rightUpperArm);

    // Cẳng tay phải gập vươn lên ngang ngực
    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.10, 0.52, 12), goldStatueMat);
    rightForearm.position.set(0.02, 0.16, 0.32);
    rightForearm.rotation.set(-1.18, 0.25, -0.30);
    rightArmGroup.add(rightForearm);

    // Bàn tay phải mạ vàng kết Ấn Thuyết Pháp (Vitarka Mudra)
    const rightHandGroup = new THREE.Group();
    rightHandGroup.position.set(-0.04, 0.38, 0.46);
    rightHandGroup.rotation.set(0.12, -0.18, 0.05);
    rightArmGroup.add(rightHandGroup);

    // Lòng bàn tay mở hướng ra phía trước
    const rightPalm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.06), goldStatueMat);
    rightHandGroup.add(rightPalm);

    // Ngón cái chạm ngón giữa tạo thành vòng tròn Pháp Luân
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.10, 8), goldStatueMat);
    thumb.position.set(-0.06, 0.04, 0.04);
    thumb.rotation.set(0.3, 0.4, 0.8);
    rightHandGroup.add(thumb);

    const middleFinger = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.12, 8), goldStatueMat);
    middleFinger.position.set(-0.01, 0.08, 0.05);
    middleFinger.rotation.set(0.4, -0.2, -0.3);
    rightHandGroup.add(middleFinger);

    // Các ngón trỏ, áp út và ngón út uốn cong thanh thoát
    [-0.04, 0.02, 0.05].forEach((fx, idx) => {
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.11, 8), goldStatueMat);
      finger.position.set(fx, 0.12, 0.01);
      finger.rotation.set(0.15 + idx * 0.05, 0, (idx - 1) * 0.1);
      rightHandGroup.add(finger);
    });

    // TAY TRÁI: Đặt ngửa ngang bụng/rốn, lòng bàn tay ngửa lên trời (Dhyana Mudra thanh tịnh, không cầm bát)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.34, 1.45, 0.05);
    group.add(leftArmGroup);

    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.48, 12), goldStatueMat);
    leftUpperArm.position.set(-0.08, -0.16, 0.10);
    leftUpperArm.rotation.set(0.55, 0.25, -0.45);
    leftArmGroup.add(leftUpperArm);

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.10, 0.50, 12), goldStatueMat);
    leftForearm.position.set(0.06, -0.32, 0.28);
    leftForearm.rotation.set(0.85, 0.45, -0.35);
    leftArmGroup.add(leftForearm);

    // Bàn tay trái mở ngửa lên trời
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.18), goldStatueMat);
    leftHand.position.set(0.24, -0.34, 0.42);
    leftHand.rotation.set(-0.15, 0.25, 0);
    leftArmGroup.add(leftHand);

    // 6. CỔ BA NGẤN PHÚC TƯỚNG & KHUÔN MẶT DIỆN PHẬT TỪ BI
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.20, 16), goldStatueMat);
    neck.position.y = 2.02;
    group.add(neck);

    [1.98, 2.04, 2.10].forEach((ny) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.014, 6, 16), goldTrimMat);
      ring.position.y = ny;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    });

    // Đầu Phật với texture diện tướng hoàng kim từ bi
    const faceTex = this.createBuddhaFaceTexture("shakyamuni");
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.28,
      metalness: 0.45,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.40, 24, 20), faceMat);
    head.position.y = 2.42;
    group.add(head);

    // Đôi tai dày dài chảy xuống vai
    [-0.40, 0.40].forEach((ex) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(ex, 2.38, 0);

      const earTop = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.26, 8), goldStatueMat);
      earGroup.add(earTop);

      const earLobe = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.022, 0.20, 6), goldStatueMat);
      earLobe.position.y = -0.18;
      earGroup.add(earLobe);

      group.add(earGroup);
    });

    // Tóc xoắn ốc bụt ốc (Ushnisha) nổi cao với viên ngọc Mani đỉnh đầu
    const ushnisha = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), goldStatueMat);
    ushnisha.position.set(0, 2.84, -0.02);
    group.add(ushnisha);

    const maniJewel = new THREE.Mesh(
      new THREE.ConeGeometry(0.065, 0.18, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd700, emissiveIntensity: 1.2 })
    );
    maniJewel.position.set(0, 3.0, -0.02);
    group.add(maniJewel);

    // Vòm ốc báu xoắn quanh đầu
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const curl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), goldTrimMat);
      curl.position.set(Math.cos(a) * 0.34, 2.72, Math.sin(a) * 0.34 - 0.04);
      group.add(curl);
    }

    this.buddhaStatues.push(group);
    parent.add(group);
    return group;
  }

  /**
   * TƯỢNG BỒ TÁT ĐỨNG TRANG NGHIÊM (HAI BÊN CHẦU ĐỨC PHẬT)
   * Tư thế ĐỨNG thẳng thướt tha trên đài sen tròn, đội Mão Ngũ Phật cao vút, dải lụa thiên y buông rủ hai bên hông
   */
  private createStandingBodhisattvaStatue(
    parent: THREE.Group,
    x: number, y: number, z: number,
    scale: number,
    side: "left" | "right"
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.set(scale, scale, scale);
    group.name = side === "left" ? "statue_avalokiteshvara" : "statue_mahasthamaprapta";

    // Chất liệu Hoàng Kim Thếp Vàng Đồng Cổ
    const goldStatueMat = new THREE.MeshStandardMaterial({
      color: 0xdfa732,
      emissive: 0x6e4a05,
      emissiveIntensity: 0.18,
      metalness: 0.78,
      roughness: 0.28,
    });

    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0x8a5e0d,
      emissiveIntensity: 0.30,
      metalness: 0.88,
      roughness: 0.18,
    });

    const robeGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd49b28,
      emissive: 0x5a3d05,
      emissiveIntensity: 0.15,
      metalness: 0.72,
      roughness: 0.32,
    });

    // 1. ĐÀI SEN VÀNG TRÒN NÂNG BƯỚC BỒ TÁT
    const baseOct = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.98, 0.28, 16), goldStatueMat);
    baseOct.position.y = 0.14;
    group.add(baseOct);

    // Cánh sen vàng vươn lên ôm chân đài
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), goldTrimMat);
      petal.position.set(Math.cos(a) * 0.82, 0.34, Math.sin(a) * 0.82);
      petal.scale.set(1.3, 0.5, 1.8);
      petal.rotation.y = -a;
      petal.rotation.x = -0.35;
      group.add(petal);
    }

    // 2. TƯ THẾ ĐỨNG THẲNG UY NGHI & ÁO TRÀNG DÀI (Standing Bodhisattva Silhouette)
    // Chân & Vạt váy tràng dài phủ mắt cá chân (Antariya)
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.52, 1.45, 18), robeGoldMat);
    skirt.position.y = 0.95;
    group.add(skirt);

    // Nếp gấp váy tràng dọc theo thân thể
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI - Math.PI / 2;
      const foldLine = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.40, 6), goldTrimMat);
      foldLine.position.set(Math.cos(a) * 0.44, 0.95, Math.sin(a) * 0.44);
      group.add(foldLine);
    }

    // Thắt lưng ngọc báu & đai vàng
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 18), goldTrimMat);
    sash.position.y = 1.68;
    group.add(sash);

    // Dải lụa thắt lưng buông rủ chính diện
    const centerStreamer = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.03), goldTrimMat);
    centerStreamer.position.set(0, 1.25, 0.42);
    group.add(centerStreamer);

    // Thân trên thon thả uy nghiêm (Upper Torso)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.80, 18), robeGoldMat);
    torso.position.y = 2.05;
    group.add(torso);

    // Chuỗi ngọc Anh Lạc đeo trước ngực rủ xuống bụng (Ornate Pectoral Jewelry)
    const pectoral = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.022, 8, 20), goldTrimMat);
    pectoral.position.set(0, 2.25, 0.15);
    pectoral.rotation.x = Math.PI / 2.5;
    group.add(pectoral);

    const pectoralDrop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.02), goldTrimMat);
    pectoralDrop.position.set(0, 1.95, 0.28);
    group.add(pectoralDrop);

    // 3. DẢI LỤA THIÊN Y UỐN LƯỢN THƯỚT THA HAI BÊN HÔNG (Celestial Flowing Scarves)
    // Dải lụa bên trái buông dài từ vai xuống qua hông tới đài sen
    const leftScarf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 1.85, 8),
      goldTrimMat
    );
    leftScarf.position.set(-0.52, 1.45, 0.08);
    leftScarf.rotation.z = 0.15;
    group.add(leftScarf);

    // Dải lụa bên phải buông dài
    const rightScarf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 1.85, 8),
      goldTrimMat
    );
    rightScarf.position.set(0.52, 1.45, 0.08);
    rightScarf.rotation.z = -0.15;
    group.add(rightScarf);

    // 4. CÁNH TAY & THỦ ẤN ĐỐI XỨNG CỦA HAI VỊ BỒ TÁT
    const isLeft = side === "left";

    // TAY BẮT ẤN CÁT TƯỜNG / THUYẾT PHÁP GIƠ NGANG NGỰC
    // Tượng trái dùng tay phải, tượng phải dùng tay trái
    const raisedArmDir = isLeft ? 1 : -1;
    const raisedArmGroup = new THREE.Group();
    raisedArmGroup.position.set(raisedArmDir * 0.30, 2.05, 0.05);
    group.add(raisedArmGroup);

    const upperArmRaised = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.44, 10), goldStatueMat);
    upperArmRaised.position.set(raisedArmDir * 0.08, -0.14, 0.08);
    upperArmRaised.rotation.set(0.40, -raisedArmDir * 0.20, raisedArmDir * 0.42);
    raisedArmGroup.add(upperArmRaised);

    const forearmRaised = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.46, 10), goldStatueMat);
    forearmRaised.position.set(0.02, 0.14, 0.26);
    forearmRaised.rotation.set(-1.15, raisedArmDir * 0.25, -raisedArmDir * 0.30);
    raisedArmGroup.add(forearmRaised);

    // Bàn tay giơ lên ngang ngực bắt ấn
    const handRaised = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.04), goldStatueMat);
    handRaised.position.set(-raisedArmDir * 0.02, 0.34, 0.36);
    handRaised.rotation.set(0.12, -raisedArmDir * 0.15, 0);
    raisedArmGroup.add(handRaised);

    // TAY BUÔNG XUÔI HẠ THẤP NGANG HÔNG
    const loweredArmDir = -raisedArmDir;
    const loweredArmGroup = new THREE.Group();
    loweredArmGroup.position.set(loweredArmDir * 0.30, 2.05, 0.05);
    group.add(loweredArmGroup);

    const upperArmLowered = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.46, 10), goldStatueMat);
    upperArmLowered.position.set(loweredArmDir * 0.06, -0.20, 0.04);
    upperArmLowered.rotation.set(0.15, 0, loweredArmDir * 0.22);
    loweredArmGroup.add(upperArmLowered);

    const forearmLowered = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.44, 10), goldStatueMat);
    forearmLowered.position.set(loweredArmDir * 0.10, -0.56, 0.14);
    forearmLowered.rotation.set(0.40, 0, loweredArmDir * 0.20);
    loweredArmGroup.add(forearmLowered);

    const handLowered = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.04), goldStatueMat);
    handLowered.position.set(loweredArmDir * 0.14, -0.74, 0.22);
    loweredArmGroup.add(handLowered);

    // 5. CỔ BA NGẤN & KHUÔN MẶT BỒ TÁT DIỆU TƯỚNG TỪ BI
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.18, 14), goldStatueMat);
    neck.position.y = 2.48;
    group.add(neck);

    const faceTex = this.createBuddhaFaceTexture(isLeft ? "avalokiteshvara" : "mahasthamaprapta");
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.28,
      metalness: 0.45,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 20), faceMat);
    head.position.y = 2.80;
    group.add(head);

    // Đôi tai dài đeo khuyên vàng
    [-0.34, 0.34].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.32, 6), goldStatueMat);
      ear.position.set(ex, 2.74, 0);
      group.add(ear);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12), goldTrimMat);
      ring.position.set(ex, 2.56, 0);
      group.add(ring);
    });

    // 6. MÃO NGŨ PHẬT / VƯƠNG MIỆN BÁU NHIỀU TẦNG CAO VÚT (Bodhisattva Crown - Chuẩn theo ảnh)
    const crownGroup = new THREE.Group();
    crownGroup.position.set(0, 3.10, -0.02);
    group.add(crownGroup);

    // Vành vương miện đính ngọc
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, 0.22, 16), goldTrimMat);
    crownGroup.add(crownBase);

    // Tầng thứ hai thu nhỏ
    const crownTier2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 0.25, 16), goldTrimMat);
    crownTier2.position.y = 0.20;
    crownGroup.add(crownTier2);

    // 5 Đỉnh chóp nhọn chạm hoa sen & ngọc báu vươn cao (Mão Ngũ Phật)
    const spireCoords = [
      { a: -0.65, h: 0.32 },
      { a: -0.32, h: 0.44 },
      { a: 0,     h: 0.52 }, // Chóp chính giữa cao nhất
      { a: 0.32,  h: 0.44 },
      { a: 0.65,  h: 0.32 }
    ];
    spireCoords.forEach((sp) => {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.065, sp.h, 6), goldTrimMat);
      spire.position.set(Math.sin(sp.a) * 0.32, 0.26 + sp.h / 2, Math.cos(sp.a) * 0.32);
      spire.rotation.z = -Math.sin(sp.a) * 0.25;
      crownGroup.add(spire);

      // Hạt ngọc trên đỉnh chóp
      const pearl = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd700, emissiveIntensity: 0.8 })
      );
      pearl.position.set(Math.sin(sp.a) * 0.32, 0.26 + sp.h + 0.02, Math.cos(sp.a) * 0.32);
      crownGroup.add(pearl);
    });

    // Lọn tóc mai đen mượt buông rủ sau hai vai (Thiên phát)
    [-0.18, 0.18].forEach((hx) => {
      const hairLock = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.02, 0.55, 6),
        new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.5 })
      );
      hairLock.position.set(hx, 2.65, -0.16);
      hairLock.rotation.x = 0.15;
      group.add(hairLock);
    });

    this.buddhaStatues.push(group);
    parent.add(group);
    return group;
  }

  /**
   * Wrapper Dispatcher Tôn Tượng Tam Thế Phật
   */
  private createBuddhaStatue(
    parent: THREE.Group,
    x: number, y: number, z: number,
    scale: number,
    type: "shakyamuni" | "avalokiteshvara" | "mahasthamaprapta"
  ) {
    if (type === "shakyamuni") {
      this.createSeatedBuddhaStatue(parent, x, y, z, scale);
    } else if (type === "avalokiteshvara") {
      this.createStandingBodhisattvaStatue(parent, x, y, z, scale, "left");
    } else {
      this.createStandingBodhisattvaStatue(parent, x, y, z, scale, "right");
    }
  }

  // ─────────────────────────────────────────────
  // HỆ THỐNG PHÁP TÒA & BỒ ĐOÀN ĐA TẦNG (TRỤ TRÌ -> CAO TĂNG -> PHẬT TỬ)
  // ─────────────────────────────────────────────
  private createTieredSanctuarySeating(parent: THREE.Group) {
    const seatingGroup = new THREE.Group();
    seatingGroup.name = "tiered_sanctuary_seating";

    const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x3d140a, roughness: 0.5 }); // Gỗ gụ mật
    const woodTeakMat = new THREE.MeshStandardMaterial({ color: 0x5c2c16, roughness: 0.55 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.3, metalness: 0.7 });
    const abbotVelvetMat = new THREE.MeshStandardMaterial({ color: 0x900c3f, roughness: 0.4 }); // Nhung gấm đỏ son hoàng thất
    const monkSaffronMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.45 }); // Vải hoàng y sa-môn
    const stepStoneMat = new THREE.MeshStandardMaterial({ color: 0x717d7e, roughness: 0.75 });
    const cushionBaseMat = new THREE.MeshStandardMaterial({ color: 0xd4ac0d, roughness: 0.75 }); // Cói thiền vàng ấm
    const cushionLotusMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.55 }); // Hoa sen đỏ son

    // 0. ĐẠI LỘ THẢM ĐỎ CHÍNH GIỮA (Nave Carpet Runner - 4.6m rộng dẫn từ cửa vào trước ban thờ)
    const carpet = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.015, 14.5),
      new THREE.MeshStandardMaterial({ color: 0x78281f, roughness: 0.85 })
    );
    carpet.position.set(0, 0.658, -22.0);
    carpet.receiveShadow = true;
    seatingGroup.add(carpet);

    // Viền chỉ vàng 2 bên mép thảm đỏ
    [-2.3, 2.3].forEach((cx) => {
      const carpetGoldBorder = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 14.5), goldTrimMat);
      carpetGoldBorder.position.set(cx, 0.66, -22.0);
      seatingGroup.add(carpetGoldBorder);
    });

    // =========================================================================
    // TẦNG 1: PHÁP TÒA HÒA THƯỢNG VIỆN CHỦ / TRỤ TRÌ (BẬC CAO NHẤT - y=2.00m, ngồi y=2.20m)
    // =========================================================================
    const abbotGroup = new THREE.Group();
    abbotGroup.name = "seat_abbot";

    // 1.1 Bệ đá & gỗ gụ đại thụ (Rộng 4.5m x Sâu 3.2m - Cao 1.35m so với sàn điện y=0.65 => Mặt trên tại y=2.00m)
    const abbotPlatform = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.35, 3.2), woodDarkMat);
    abbotPlatform.position.set(0, 1.325, -33.5);
    abbotGroup.add(abbotPlatform);

    // Viền chỉ mạ vàng quanh mép trên bệ trụ trì
    const abbotRim = new THREE.Mesh(new THREE.BoxGeometry(4.55, 0.08, 3.25), goldTrimMat);
    abbotRim.position.set(0, 2.01, -33.5);
    abbotGroup.add(abbotRim);

    // Lan can gỗ gụ 2 bên & phía sau bệ trụ trì
    [-2.15, 2.15].forEach((rx) => {
      const railSide = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 3.1), woodTeakMat);
      railSide.position.set(rx, 2.275, -33.5);
      abbotGroup.add(railSide);
    });
    const railBack = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.55, 0.12), woodTeakMat);
    railBack.position.set(0, 2.275, -35.0);
    abbotGroup.add(railBack);

    // Bậc tam cấp gỗ dẫn lên bệ trụ trì từ phía trước (rộng 1.8m, z từ -31.9 đến -30.9)
    const abbotSteps = [
      { y: 0.95, z: -31.1 },
      { y: 1.30, z: -31.4 },
      { y: 1.65, z: -31.7 },
    ];
    abbotSteps.forEach((st) => {
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.35), stepStoneMat);
      stepMesh.position.set(0, st.y, st.z);
      abbotGroup.add(stepMesh);
    });

    // 1.2 Pháp Tọa Đài Sen Trụ Trì (Golden Lotus Throne)
    // Đài sen vàng nâng đỡ tọa vị
    const lotusBase = new THREE.Mesh(new THREE.CylinderGeometry(0.70, 0.78, 0.22, 20), goldTrimMat);
    lotusBase.position.set(0, 2.11, -33.5);
    abbotGroup.add(lotusBase);

    // Lưng tựa chạm khắc Pháp Luân & Mây Lành (Cao 1.3m)
    const throneBack = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.25, 0.12), woodDarkMat);
    throneBack.position.set(0, 2.75, -34.05);
    abbotGroup.add(throneBack);

    const backRim = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.31, 0.08), goldTrimMat);
    backRim.position.set(0, 2.75, -34.08);
    abbotGroup.add(backRim);

    // Biểu tượng Bánh xe Pháp Luân nhỏ chạm giữa lưng ghế Trụ Trì
    const abbotDharmaIcon = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 20), goldTrimMat);
    abbotDharmaIcon.position.set(0, 2.95, -33.98);
    abbotGroup.add(abbotDharmaIcon);

    // Đệm ngồi nhung gấm đỏ son của Hòa Thượng Trụ Trì
    const abbotPad = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.10, 20), abbotVelvetMat);
    abbotPad.position.set(0, 2.22, -33.5);
    abbotGroup.add(abbotPad);

    // Hoa văn sen vàng thêu giữa đệm Trụ Trì
    const abbotLotusEmbroidery = new THREE.Mesh(new THREE.CircleGeometry(0.30, 16), goldTrimMat);
    abbotLotusEmbroidery.rotation.x = -Math.PI / 2;
    abbotLotusEmbroidery.position.set(0, 2.275, -33.5);
    abbotGroup.add(abbotLotusEmbroidery);

    // 1.3 Bàn Kinh Trụ Trì (Abbot Scripture Desk - Trước mặt ghế, z = -32.5m)
    const abbotDesk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.55), woodDarkMat);
    abbotDesk.position.set(0, 2.275, -32.5);
    abbotGroup.add(abbotDesk);

    const abbotDeskRim = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.05, 0.58), goldTrimMat);
    abbotDeskRim.position.set(0, 2.55, -32.5);
    abbotGroup.add(abbotDeskRim);

    // Cuốn Kinh Bát Nhã mở sẵn trên bàn Trụ Trì
    const openSutra = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.03, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xfef9e7, roughness: 0.6 })
    );
    openSutra.position.set(0, 2.59, -32.5);
    abbotGroup.add(openSutra);

    // Lư hương đồng nhỏ của Trụ Trì
    const smallDing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.09, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.25 })
    );
    smallDing.position.set(-0.65, 2.66, -32.5);
    abbotGroup.add(smallDing);

    // Biển hiệu thếp vàng: "PHÁP TÒA HÒA THƯỢNG TRỤ TRÌ"
    const abbotSign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.03), goldTrimMat);
    abbotSign.position.set(0, 2.20, -32.2);
    abbotGroup.add(abbotSign);

    seatingGroup.add(abbotGroup);
    this.cushionMeshes.push(abbotGroup);
    this.cushionPositions.push({
      x: 0,
      y: 2.20,
      z: -33.5,
      type: "abbot",
      name: "seat_abbot",
      label: "Pháp Tòa Hòa Thượng Trụ Trì",
    });

    // =========================================================================
    // TẦNG 2: PHÁP TÒA CHƯ TÔN ĐỨC CAO TĂNG / THƯỢNG TỌA - ĐẠI ĐỨC (BẬC TRUNG - y=1.50m, ngồi y=1.62m)
    // Tả Ban (Đông Lan - Bên Trái) & Hữu Ban (Tây Lan - Bên Phải)
    // =========================================================================
    const sidePlatformsConfig = [
      { side: "left", x: -9.5, sign: -1 },
      { side: "right", x: 9.5, sign: 1 },
    ];

    sidePlatformsConfig.forEach((spc) => {
      const pGroup = new THREE.Group();
      pGroup.name = `senior_monks_platform_${spc.side}`;

      // 2.1 Bệ nâng cao bằng gỗ gụ (Rộng 3.2m x Dài 5.6m - Cao 0.85m => Mặt trên tại y = 1.50m)
      const platformMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.85, 5.6), woodTeakMat);
      platformMesh.position.set(spc.x, 1.075, -33.5);
      pGroup.add(platformMesh);

      // Viền mạ vàng quanh mép trên
      const platformRim = new THREE.Mesh(new THREE.BoxGeometry(3.24, 0.06, 5.64), goldTrimMat);
      platformRim.position.set(spc.x, 1.51, -33.5);
      pGroup.add(platformRim);

      // Lan can ngoài
      const outerRail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.45, 5.5), woodDarkMat);
      outerRail.position.set(spc.x + spc.sign * 1.55, 1.73, -33.5);
      pGroup.add(outerRail);

      // Bậc tam cấp phía trước (z = -30.45m)
      const stepFront = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.42, 0.5), stepStoneMat);
      stepFront.position.set(spc.x, 0.86, -30.45);
      pGroup.add(stepFront);

      // 2.2 6 Chỗ Ngồi Cao Tăng cho mỗi bên (2 cột x 3 hàng = 6 chỗ x 2 bên = 12 Cao Tăng)
      const colOffsets = [-0.7, 0.7];
      const rowZList = [-34.8, -33.5, -32.2];
      let monkSeatIdx = 1;

      rowZList.forEach((rz) => {
        // Bàn đọc kinh dài trước mỗi hàng (hướng về phía Tam Thế Phật ở z = -44m)
        const desk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.35, 0.35), woodDarkMat);
        desk.position.set(spc.x, 1.675, rz - 0.45);
        pGroup.add(desk);

        colOffsets.forEach((cxOff) => {
          const seatX = spc.x + cxOff;
          const seatZ = rz;
          const seatName = `seat_senior_monk_${spc.side}_${monkSeatIdx}`;

          const seatSubGroup = new THREE.Group();
          seatSubGroup.name = seatName;
          seatSubGroup.position.set(seatX, 1.50, seatZ);

          // Đệm ngồi hoàng y sa-môn trang nhã
          const monkCushionBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.40, 0.44, 0.08, 14),
            monkSaffronMat
          );
          monkCushionBase.position.y = 0.04;
          seatSubGroup.add(monkCushionBase);

          // Viền vàng kim
          const monkCushionRim = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.015, 6, 20), goldTrimMat);
          monkCushionRim.position.y = 0.078;
          monkCushionRim.rotation.x = Math.PI / 2;
          seatSubGroup.add(monkCushionRim);

          // Hoa sen vàng thêu
          const lotusFlower = new THREE.Mesh(new THREE.CircleGeometry(0.18, 14), goldTrimMat);
          lotusFlower.rotation.x = -Math.PI / 2;
          lotusFlower.position.y = 0.082;
          seatSubGroup.add(lotusFlower);

          pGroup.add(seatSubGroup);
          this.cushionMeshes.push(seatSubGroup);

          const seniorRank = spc.side === "left"
            ? (monkSeatIdx - 1) * 2 + 2
            : (monkSeatIdx - 1) * 2 + 3;

          this.cushionPositions.push({
            x: seatX,
            y: 1.62,
            z: seatZ,
            type: "senior",
            seniorRank,
            name: seatName,
            label: `Pháp Tòa Cao Tăng #${seniorRank} (${spc.side === "left" ? "Tả Ban" : "Hữu Ban"})`,
          });

          monkSeatIdx++;
        });
      });

      seatingGroup.add(pGroup);
    });

    // =========================================================================
    // TẦNG 3: BỒ ĐOÀN THIỆN NAM TÍN NỮ / ĐẠO HỮU PHẬT TỬ (InstancedMesh: 4 draw calls thay vì 224)
    // Sắp xếp cách xa tượng Phật (z = -28.0m đến -16.0m), chừa đại lộ trung tâm 5.0m
    // =========================================================================
    const layRowsZ = [-16.5, -18.8, -21.1, -23.4, -25.7, -28.0];
    const leftColsX = [-9.6, -7.2, -4.8, -2.5];
    const rightColsX = [2.5, 4.8, 7.2, 9.6];

    const layPositions: { x: number; z: number }[] = [];
    layRowsZ.forEach((z) => {
      leftColsX.forEach((x) => layPositions.push({ x, z }));
      rightColsX.forEach((x) => layPositions.push({ x, z }));
    });

    const totalCushions = layPositions.length;
    const baseGeo = new THREE.CylinderGeometry(0.44, 0.48, 0.09, 14);
    const rimGeo = new THREE.TorusGeometry(0.43, 0.016, 6, 16);
    rimGeo.rotateX(Math.PI / 2);
    const padGeo = new THREE.CircleGeometry(0.40, 14);
    padGeo.rotateX(-Math.PI / 2);
    const pistilGeo = new THREE.CircleGeometry(0.13, 10);
    pistilGeo.rotateX(-Math.PI / 2);

    const baseInst = new THREE.InstancedMesh(baseGeo, cushionBaseMat, totalCushions);
    const rimInst = new THREE.InstancedMesh(rimGeo, goldTrimMat, totalCushions);
    const padInst = new THREE.InstancedMesh(padGeo, cushionLotusMat, totalCushions);
    const pistilInst = new THREE.InstancedMesh(pistilGeo, goldTrimMat, totalCushions);

    const dummyCushion = new THREE.Object3D();
    layPositions.forEach((p, idx) => {
      dummyCushion.position.set(p.x, 0.65 + 0.045, p.z);
      dummyCushion.updateMatrix();
      baseInst.setMatrixAt(idx, dummyCushion.matrix);

      dummyCushion.position.set(p.x, 0.65 + 0.088, p.z);
      dummyCushion.updateMatrix();
      rimInst.setMatrixAt(idx, dummyCushion.matrix);

      dummyCushion.position.set(p.x, 0.65 + 0.092, p.z);
      dummyCushion.updateMatrix();
      padInst.setMatrixAt(idx, dummyCushion.matrix);

      dummyCushion.position.set(p.x, 0.65 + 0.094, p.z);
      dummyCushion.updateMatrix();
      pistilInst.setMatrixAt(idx, dummyCushion.matrix);

      this.cushionPositions.push({
        x: p.x,
        y: 0.74,
        z: p.z,
        type: "lay",
        name: `cushion_${p.x.toFixed(1)}_${p.z.toFixed(1)}`,
        label: "Bồ Đoàn Thiền Tọa Đạo Hữu",
      });
    });

    baseInst.instanceMatrix.needsUpdate = true;
    rimInst.instanceMatrix.needsUpdate = true;
    padInst.instanceMatrix.needsUpdate = true;
    pistilInst.instanceMatrix.needsUpdate = true;

    seatingGroup.add(baseInst);
    seatingGroup.add(rimInst);
    seatingGroup.add(padInst);
    seatingGroup.add(pistilInst);

    parent.add(seatingGroup);
  }

  /**
   * Tạo mái ngói 4 mái dốc cong truyền thống với đầu đao vuốt nhọn kiểu Chùa Cổ Việt Nam
   * Bao bọc hoàn toàn kiến trúc, tạo bóng đổ uy nghiêm và che chở trọn vẹn tôn tượng Phật
   */
  private createOrnateCurvedRoof(
    parent: THREE.Group,
    cx: number, cy: number, cz: number,
    width: number, height: number, depth: number,
    tileColor: number
  ) {
    const roofGroup = new THREE.Group();
    roofGroup.position.set(cx, cy, cz);

    const tileMat = new THREE.MeshStandardMaterial({ color: tileColor, roughness: 0.65 });
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.6 });
    const woodSoffitMat = new THREE.MeshStandardMaterial({ color: 0x4a180d, roughness: 0.7 });

    // 1. Tấm trần đỡ dưới mái (Soffit/ceiling che kín bên dưới, tạo cảm giác gỗ lim ấm cúng khi nhìn từ trong điện)
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.22, depth * 0.94), woodSoffitMat);
    ceiling.position.y = -height * 0.22;
    ceiling.castShadow = true;
    roofGroup.add(ceiling);

    // 2. Mái dốc trước (Front slope - hướng về sân chùa)
    const frontSlopeAngle = Math.atan2(height * 0.58, depth * 0.44);
    const frontSlopeLen = Math.sqrt(Math.pow(height * 0.58, 2) + Math.pow(depth * 0.44, 2));
    const frontSlope = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.22, frontSlopeLen), tileMat);
    frontSlope.position.set(0, height * 0.12, depth * 0.22);
    frontSlope.rotation.x = frontSlopeAngle;
    frontSlope.castShadow = true;
    roofGroup.add(frontSlope);

    // 3. Mái dốc sau (Back slope)
    const backSlope = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.22, frontSlopeLen), tileMat);
    backSlope.position.set(0, height * 0.12, -depth * 0.22);
    backSlope.rotation.x = -frontSlopeAngle;
    backSlope.castShadow = true;
    roofGroup.add(backSlope);

    // 4. Mái dốc hai bên (Left & Right slopes)
    [-1, 1].forEach((dir) => {
      const sideSlopeAngle = Math.atan2(height * 0.58, width * 0.22);
      const sideSlopeLen = Math.sqrt(Math.pow(height * 0.58, 2) + Math.pow(width * 0.22, 2));
      const sideSlope = new THREE.Mesh(new THREE.BoxGeometry(sideSlopeLen, 0.20, depth * 0.88), tileMat);
      sideSlope.position.set(dir * width * 0.38, height * 0.10, 0);
      sideSlope.rotation.z = -dir * sideSlopeAngle;
      sideSlope.castShadow = true;
      roofGroup.add(sideSlope);
    });

    // 5. Bờ nóc chính (Main Ridge Beam) sơn son thếp vàng
    const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(width * 0.68, 0.42, 0.52), ridgeMat);
    ridgeBeam.position.set(0, height * 0.48, 0);
    roofGroup.add(ridgeBeam);

    // Hai đầu kìm nóc thếp vàng (Kìm nóc ngậm bờ nóc)
    [-1, 1].forEach((dir) => {
      const kimNoc = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.95, 8), ridgeMat);
      kimNoc.position.set(dir * (width * 0.34), height * 0.72, 0);
      kimNoc.rotation.z = -dir * 0.45;
      roofGroup.add(kimNoc);
    });

    // 6. 4 Đầu đao cong vút ở 4 góc mái (Traditional Upturned Dragon Eaves)
    const corners = [
      [-width * 0.5, -depth * 0.5],
      [width * 0.5, -depth * 0.5],
      [-width * 0.5, depth * 0.5],
      [width * 0.5, depth * 0.5],
    ];
    corners.forEach(([ox, oz]) => {
      const eaveGroup = new THREE.Group();
      eaveGroup.position.set(ox, -height * 0.1, oz);

      // Thân đao vuốt cong
      const eaveBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.24, 1.4, 8), ridgeMat);
      eaveBlade.position.set(Math.sign(ox) * 0.35, 0.55, Math.sign(oz) * 0.35);
      eaveBlade.rotation.z = -Math.sign(ox) * 0.85;
      eaveBlade.rotation.x = Math.sign(oz) * 0.55;
      eaveGroup.add(eaveBlade);

      // Búp sen / mỏ rồng đỉnh đao
      const eaveTip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), ridgeMat);
      eaveTip.position.set(Math.sign(ox) * 0.75, 1.05, Math.sign(oz) * 0.75);
      eaveGroup.add(eaveTip);

      roofGroup.add(eaveGroup);
    });

    parent.add(roofGroup);
  }

  // ─────────────────────────────────────────────
  // ĐÈN LỒNG ĐỎ TREO HIÊN CHÙA
  // ─────────────────────────────────────────────
  private createHangingLantern(parent: THREE.Group, x: number, y: number, z: number) {
    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(x, y, z);

    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xc0392b,
      emissive: 0x922b21,
      emissiveIntensity: 0.5,
      roughness: 0.4,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), lanternMat);
    sphere.scale.set(1, 1.25, 1);
    lanternGroup.add(sphere);

    const capMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3 });
    [0.28, -0.28].forEach((cy) => {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 10), capMat);
      cap.position.y = cy;
      lanternGroup.add(cap);
    });

    const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.25, 6), capMat);
    tassel.position.y = -0.42;
    lanternGroup.add(tassel);

    parent.add(lanternGroup);
  }

  // ─────────────────────────────────────────────
  // LẦU CHUÔNG ĐẠI HỒNG CHUNG (KIẾN TRÚC 2 TẦNG MÁI CONG CỔ TRUYỀN)
  // ─────────────────────────────────────────────
  private createBellTower() {
    const group = new THREE.Group();

    // Vật liệu cao cấp
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a6365, roughness: 0.85 });
    const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x3d4547, roughness: 0.8 });
    const brickFloorMat = new THREE.MeshStandardMaterial({ color: 0x8d4432, roughness: 0.7 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a1f10, roughness: 0.58 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x30140b, roughness: 0.65 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.28, metalness: 0.8 });
    const bronzeBellMat = new THREE.MeshStandardMaterial({ color: 0xba961c, roughness: 0.25, metalness: 0.88 });
    const agedBronzeMat = new THREE.MeshStandardMaterial({ color: 0x485848, roughness: 0.45, metalness: 0.65 });
    const roofTileMat = new THREE.MeshStandardMaterial({ color: 0xa93226, roughness: 0.65 });
    const roofRidgeMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.65 });
    const redSilkMat = new THREE.MeshStandardMaterial({ color: 0xb01b1b, roughness: 0.4 });
    const lanternRedMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.3, emissive: 0x922b21, emissiveIntensity: 0.4 });

    // ==========================================
    // 1. ĐÀI MÓNG ĐÁ XANH & BẬC TAM CẤP
    // ==========================================
    // Đài móng đá vuông vức
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.46, 5.6), stoneMat);
    plinth.position.y = 0.23;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Gờ phào đài sen chân móng
    const plinthBase = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.12, 5.9), darkStoneMat);
    plinthBase.position.y = 0.06;
    plinthBase.receiveShadow = true;
    group.add(plinthBase);

    // Sàn gạch nung Bát Tràng cổ kính
    const brickFloor = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.04, 5.1), brickFloorMat);
    brickFloor.position.y = 0.47;
    brickFloor.receiveShadow = true;
    group.add(brickFloor);

    // Bậc tam cấp 3 bậc đá xanh phía trước (hướng Nam, z > 0)
    [
      { w: 2.4, h: 0.15, d: 0.45, y: 0.08, z: 3.0 },
      { w: 2.4, h: 0.15, d: 0.45, y: 0.23, z: 2.65 },
      { w: 2.4, h: 0.15, d: 0.45, y: 0.38, z: 2.30 },
    ].forEach((step) => {
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(step.w, step.h, step.d), stoneMat);
      stepMesh.position.set(0, step.y, step.z);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      group.add(stepMesh);
    });

    // 2 Trụ đá búp sen hai bên đầu thềm
    [-1.35, 1.35].forEach((sx) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.24), darkStoneMat);
      post.position.set(sx, 0.35, 2.75);
      post.castShadow = true;
      group.add(post);

      const lotusBud = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), goldMat);
      lotusBud.scale.set(0.75, 1.3, 0.75);
      lotusBud.position.set(sx, 0.72, 2.75);
      group.add(lotusBud);
    });

    // Lan can đá chạm hoa sen bao quanh 3 mặt (trái, phải, sau)
    const railingSides = [
      { x: -2.48, z: 0, rotY: 0, len: 4.8 }, // Trái
      { x: 2.48, z: 0, rotY: 0, len: 4.8 },  // Phải
      { x: 0, z: -2.48, rotY: Math.PI / 2, len: 4.8 }, // Sau
    ];
    railingSides.forEach((side) => {
      const rGroup = new THREE.Group();
      rGroup.position.set(side.x, 0.48, side.z);
      rGroup.rotation.y = side.rotY;

      // Tay vịn đá
      const railBar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, side.len), darkStoneMat);
      railBar.position.y = 0.52;
      rGroup.add(railBar);

      // Chân lan can
      const railFoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, side.len), darkStoneMat);
      railFoot.position.y = 0.04;
      rGroup.add(railFoot);

      // Con tiện đá chạm cánh sen
      const postCount = 7;
      for (let i = 0; i < postCount; i++) {
        const pz = -side.len / 2 + 0.35 + (i * (side.len - 0.7)) / (postCount - 1);
        const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.44, 8), stoneMat);
        baluster.position.set(0, 0.28, pz);
        baluster.castShadow = true;
        rGroup.add(baluster);
      }
      group.add(rGroup);
    });

    // ==========================================
    // 2. 4 CHÂN TẢNG ĐÁ HOA SEN & 4 CỘT CÁI GỖ LIM
    // ==========================================
    const colCoords = [
      [-1.65, -1.65],
      [1.65, -1.65],
      [-1.65, 1.65],
      [1.65, 1.65],
    ];

    colCoords.forEach(([cx, cz]) => {
      // Chân tảng đá hoa sen chạm 2 tầng
      const plinthBaseCol = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.18, 16), darkStoneMat);
      plinthBaseCol.position.set(cx, 0.56, cz);
      plinthBaseCol.castShadow = true;
      group.add(plinthBaseCol);

      const lotusCol = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.33, 0.12, 16), stoneMat);
      lotusCol.position.set(cx, 0.70, cz);
      group.add(lotusCol);

      // Cột cái gỗ lim to vững chãi
      const colMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 3.8, 16), woodMat);
      colMesh.position.set(cx, 2.65, cz);
      colMesh.castShadow = true;
      group.add(colMesh);

      // Đai đồng bọc chân cột
      const brassBand = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.08, 16), goldMat);
      brassBand.position.set(cx, 0.80, cz);
      group.add(brassBand);
    });

    // ==========================================
    // 3. HỆ THỐNG DẦM, XÀ GỒ, CÂU ĐẦU & BIỂN HIỆU
    // ==========================================
    // Xà hạ liên kết 4 cột (y = 2.15)
    [
      { x: 0, z: -1.65, rotY: 0, w: 3.3 },
      { x: 0, z: 1.65, rotY: 0, w: 3.3 },
      { x: -1.65, z: 0, rotY: Math.PI / 2, w: 3.3 },
      { x: 1.65, z: 0, rotY: Math.PI / 2, w: 3.3 },
    ].forEach((b) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.16, 0.18), darkWoodMat);
      beam.position.set(b.x, 2.15, b.z);
      beam.rotation.y = b.rotY;
      group.add(beam);
    });

    // Xà thượng liên kết 4 cột (y = 4.35)
    [
      { x: 0, z: -1.65, rotY: 0, w: 3.6 },
      { x: 0, z: 1.65, rotY: 0, w: 3.6 },
      { x: -1.65, z: 0, rotY: Math.PI / 2, w: 3.6 },
      { x: 1.65, z: 0, rotY: Math.PI / 2, w: 3.6 },
    ].forEach((b) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.22, 0.24), woodMat);
      beam.position.set(b.x, 4.35, b.z);
      beam.rotation.y = b.rotY;
      beam.castShadow = true;
      group.add(beam);
    });

    // Con bọ / kẻ chuyền chạm đầu rồng đỡ mái tại 4 góc
    colCoords.forEach(([cx, cz]) => {
      const corbel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), darkWoodMat);
      corbel.position.set(cx * 1.05, 4.45, cz * 1.05);
      group.add(corbel);
    });

    // Dầm xà cái chịu lực giữa (dầm treo Đại Hồng Chung)
    const mainHangBeam = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.40, 3.8), woodMat);
    mainHangBeam.position.set(0, 4.30, 0);
    mainHangBeam.castShadow = true;
    group.add(mainHangBeam);

    // Đai đồng chịu lực bọc xà cái giữa
    const centerBrassClamps = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.8), goldMat);
    centerBrassClamps.position.set(0, 4.30, 0);
    group.add(centerBrassClamps);

    // Biển gỗ lim sơn son thếp vàng "ĐẠI HỒNG CHUNG"
    const plaqueGroup = new THREE.Group();
    plaqueGroup.position.set(0, 3.88, 1.76);
    group.add(plaqueGroup);

    const plaqueBoard = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.52, 0.08), darkWoodMat);
    plaqueBoard.castShadow = true;
    plaqueGroup.add(plaqueBoard);

    const plaqueFrame = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.58, 0.06), goldMat);
    plaqueGroup.add(plaqueFrame);

    // Canvas chữ vàng "ĐẠI HỒNG CHUNG"
    const plaqueCanvas = document.createElement("canvas");
    plaqueCanvas.width = 512;
    plaqueCanvas.height = 128;
    const pCtx = plaqueCanvas.getContext("2d")!;
    pCtx.fillStyle = "#4a1208";
    pCtx.fillRect(0, 0, 512, 128);
    pCtx.strokeStyle = "#ffd700";
    pCtx.lineWidth = 6;
    pCtx.strokeRect(6, 6, 500, 116);
    pCtx.fillStyle = "#ffd700";
    pCtx.font = "bold 44px 'Be Vietnam Pro', serif";
    pCtx.textAlign = "center";
    pCtx.textBaseline = "middle";
    pCtx.fillText("✦ ĐẠI HỒNG CHUNG ✦", 256, 64);

    const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
    const plaqueFrontMat = new THREE.MeshBasicMaterial({ map: plaqueTex });
    const plaqueFront = new THREE.Mesh(new THREE.PlaneGeometry(1.92, 0.46), plaqueFrontMat);
    plaqueFront.position.set(0, 0, 0.045);
    plaqueGroup.add(plaqueFront);

    // ==========================================
    // 4. ĐẠI HỒNG CHUNG ĐỒNG CỔ HOÀNG KIM (GRAND BRONZE BELL)
    // ==========================================
    const bellRoot = new THREE.Group();
    bellRoot.position.set(0, 2.50, 0);
    group.add(bellRoot);

    // Quai chuông rồng Bồ Lao đúc đồng ôm xà
    const boLaoHanger = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.085, 12, 24), agedBronzeMat);
    boLaoHanger.position.set(0, 1.45, 0);
    bellRoot.add(boLaoHanger);

    // Đỉnh chóp chuông đài sen
    const bellTopCap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 0.32, 24), bronzeBellMat);
    bellTopCap.position.set(0, 1.15, 0);
    bellRoot.add(bellTopCap);

    // Thân chuông trên (có 4 ô chạm khắc hoa văn & núm gõ)
    const bellUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.58, 0.95, 24), bronzeBellMat);
    bellUpper.position.set(0, 0.55, 0);
    bellUpper.castShadow = true;
    bellRoot.add(bellUpper);

    // 4 Núm chuông tròn nổi mạ vàng (4 hướng đón chày gõ)
    [
      { x: 0, z: 0.54, rotY: 0 },
      { x: 0, z: -0.54, rotY: Math.PI },
      { x: 0.54, z: 0, rotY: Math.PI / 2 },
      { x: -0.54, z: 0, rotY: -Math.PI / 2 },
    ].forEach((bPos) => {
      const bossPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), goldMat);
      bossPlate.rotation.x = Math.PI / 2;
      bossPlate.position.set(bPos.x, 0.55, bPos.z);
      bellRoot.add(bossPlate);

      const bossSphere = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), goldMat);
      bossSphere.position.set(bPos.x * 1.05, 0.55, bPos.z * 1.05);
      bellRoot.add(bossSphere);
    });

    // Thân chuông dưới xòe rộng (Vành chuông đại hồng)
    const bellLower = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.82, 0.85, 24), bronzeBellMat);
    bellLower.position.set(0, -0.32, 0);
    bellLower.castShadow = true;
    bellRoot.add(bellLower);

    // Vành miệng chuông hình hoa sen lượn sóng dày dặn
    const bellLip = new THREE.Mesh(new THREE.TorusGeometry(0.81, 0.085, 12, 32), goldMat);
    bellLip.position.set(0, -0.74, 0);
    bellLip.rotation.x = Math.PI / 2;
    bellRoot.add(bellLip);

    // Chỉ nổi ngang trang trí thân chuông (3 đai đồng viền)
    [-0.55, 0.10, 0.95].forEach((dy) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52 + (1.0 - dy) * 0.18, 0.025, 8, 28), goldMat);
      ring.position.set(0, dy, 0);
      ring.rotation.x = Math.PI / 2;
      bellRoot.add(ring);
    });

    // Quả lắc trong lòng chuông
    const clapper = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 0.65, 10), agedBronzeMat);
    clapper.position.set(0, -0.35, 0);
    bellRoot.add(clapper);

    // Định danh để tương tác click vào chuông
    bellUpper.name = "grand_bell";
    bellLower.name = "grand_bell";
    bellRoot.name = "grand_bell";
    this.grandBellMesh = bellRoot as unknown as THREE.Mesh;

    // Hào quang vàng kim mờ ảo tôn nghiêm
    const bellAura = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.04, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.28 })
    );
    bellAura.rotation.x = Math.PI / 2;
    bellAura.position.set(0, -0.70, 0);
    bellRoot.add(bellAura);

    // ==========================================
    // 5. CHÀY THỈNH CHUÔNG GỖ LIM (KÌNH TRÙ)
    // ==========================================
    const malletGroup = new THREE.Group();
    malletGroup.position.set(0, 2.75, 1.15); // Đặt ngang tầm núm chuông phía trước
    group.add(malletGroup);

    // Thân chày gỗ lim tiện tròn
    const malletWood = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 1.75, 16), woodMat);
    malletWood.rotation.x = Math.PI / 2;
    malletWood.castShadow = true;
    malletGroup.add(malletWood);

    // Đầu gõ chày bịt đồng vàng sáng
    const malletTip = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.28, 16), goldMat);
    malletTip.rotation.x = Math.PI / 2;
    malletTip.position.set(0, 0, -0.76);
    malletGroup.add(malletTip);

    // Dây thừng đỏ treo chày từ xà xuống
    [-0.5, 0.5].forEach((mz) => {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.55, 6), redSilkMat);
      rope.position.set(0, 0.78, mz);
      malletGroup.add(rope);
    });

    // Dải lụa đỏ thắm phất phơ ở đuôi chày
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.75, 0.015), redSilkMat);
    ribbon.position.set(0, -0.38, 0.88);
    ribbon.rotation.x = 0.2;
    malletGroup.add(ribbon);

    // ==========================================
    // 6. MÁI LẦU CHUÔNG CHỒNG DIÊM 2 TẦNG CONG VÚT
    // ==========================================
    // TẦNG MÁI HẠ (Mái dưới rộng 5.8m x 5.8m)
    const lowerRoofY = 4.45;
    this.buildBellPavilionRoofTier(group, lowerRoofY, 5.8, 0.85, 5.8, roofTileMat, roofRidgeMat, goldMat, false);

    // CỔ DIÊM (Tầng lửng thông gió có hàng song con tiện tròn, y = 4.85 -> 5.65)
    const clerestoryGroup = new THREE.Group();
    clerestoryGroup.position.set(0, 5.25, 0);
    group.add(clerestoryGroup);

    const clereCore = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.75, 3.2), darkWoodMat);
    clerestoryGroup.add(clereCore);

    // Hàng song con tiện cổ diêm thông thoáng
    [-1.62, 1.62].forEach((cx) => {
      for (let i = -3; i <= 3; i++) {
        const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8), woodMat);
        baluster.position.set(cx, 0, i * 0.42);
        clerestoryGroup.add(baluster);
      }
    });
    [-1.62, 1.62].forEach((cz) => {
      for (let i = -3; i <= 3; i++) {
        const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8), woodMat);
        baluster.position.set(i * 0.42, 0, cz);
        clerestoryGroup.add(baluster);
      }
    });

    // TẦNG MÁI THƯỢNG (Mái trên 4.4m x 4.4m)
    const upperRoofY = 5.65;
    this.buildBellPavilionRoofTier(group, upperRoofY, 4.4, 1.05, 4.4, roofTileMat, roofRidgeMat, goldMat, true);

    // 4 ĐÈN LỒNG ĐỎ TREO 4 GÓC MÁI HẠ
    const lanternCorners = [
      [-2.6, 4.25, -2.6],
      [2.6, 4.25, -2.6],
      [-2.6, 4.25, 2.6],
      [2.6, 4.25, 2.6],
    ];
    lanternCorners.forEach(([lx, ly, lz]) => {
      const lGroup = new THREE.Group();
      lGroup.position.set(lx, ly, lz);

      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 6), goldMat);
      cord.position.y = 0.22;
      lGroup.add(cord);

      const lBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.38, 8), lanternRedMat);
      lBody.castShadow = true;
      lGroup.add(lBody);

      const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 8), goldMat);
      cap1.position.y = 0.20;
      lGroup.add(cap1);

      const cap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 8), goldMat);
      cap2.position.y = -0.20;
      lGroup.add(cap2);

      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 0.28, 6), redSilkMat);
      tassel.position.y = -0.35;
      lGroup.add(tassel);

      group.add(lGroup);
    });

    // ==========================================
    // 7. BÀN TRÀ ĐÁ TĨNH TÂM BÊN CẠNH LẦU CHUÔNG
    // ==========================================
    const teaGroup = new THREE.Group();
    teaGroup.position.set(-4.2, 0, 0.5);
    group.add(teaGroup);

    // Bàn đá tròn
    const teaTableFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.72, 12), darkStoneMat);
    teaTableFoot.position.y = 0.36;
    teaTableFoot.castShadow = true;
    teaGroup.add(teaTableFoot);

    const teaTableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.10, 20), stoneMat);
    teaTableTop.position.y = 0.76;
    teaTableTop.castShadow = true;
    teaGroup.add(teaTableTop);

    // Ấm trà tử sa & 3 chén trà nhỏ
    const teapot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), darkWoodMat);
    teapot.position.set(0, 0.88, 0);
    teaGroup.add(teapot);

    // 3 Đôn đá tròn xung quanh bàn
    [
      [-0.95, 0],
      [0.48, 0.85],
      [0.48, -0.85],
    ].forEach(([sx, sz]) => {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.44, 12), stoneMat);
      stool.position.set(sx, 0.22, sz);
      stool.castShadow = true;
      teaGroup.add(stool);
    });

    // Tọa độ thế giới của Lầu Chuông
    group.position.set(-10, 0, -10);
    this.scene.add(group);

    // Collider chuẩn xác cho khuôn viên Lầu Chuông
    this.colliders.push(
      new THREE.Box3(new THREE.Vector3(-12.8, 0, -12.8), new THREE.Vector3(-7.2, 7.5, -7.2))
    );
  }

  /**
   * Xây dựng tầng mái lầu chuông cong vút gắn liền mép mái (không bao giờ bị trôi lơ lửng)
   */
  private buildBellPavilionRoofTier(
    parent: THREE.Group,
    baseY: number,
    w: number,
    h: number,
    d: number,
    tileMat: THREE.Material,
    ridgeMat: THREE.Material,
    goldMat: THREE.Material,
    hasTopFinial: boolean
  ) {
    const tierGroup = new THREE.Group();
    tierGroup.position.set(0, baseY, 0);

    // 1. Trần gỗ bên dưới mái
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w * 0.90, 0.16, d * 0.90), tileMat);
    ceiling.position.y = 0.08;
    tierGroup.add(ceiling);

    // 2. 4 Mặt mái dốc cong
    const slopeAngle = Math.atan2(h * 0.85, d * 0.42);
    const slopeLen = Math.sqrt(Math.pow(h * 0.85, 2) + Math.pow(d * 0.42, 2));

    // Mái trước
    const frontRoof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.16, slopeLen), tileMat);
    frontRoof.position.set(0, h * 0.45, d * 0.22);
    frontRoof.rotation.x = slopeAngle;
    frontRoof.castShadow = true;
    tierGroup.add(frontRoof);

    // Mái sau
    const backRoof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.16, slopeLen), tileMat);
    backRoof.position.set(0, h * 0.45, -d * 0.22);
    backRoof.rotation.x = -slopeAngle;
    backRoof.castShadow = true;
    tierGroup.add(backRoof);

    // Mái trái & phải
    [-1, 1].forEach((dir) => {
      const sideRoof = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.15, d * 0.88), tileMat);
      sideRoof.position.set(dir * w * 0.22, h * 0.45, 0);
      sideRoof.rotation.z = -dir * slopeAngle;
      sideRoof.castShadow = true;
      tierGroup.add(sideRoof);
    });

    // 3. Bờ nóc chính (Main Ridge)
    const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 0.32, 0.38), ridgeMat);
    ridgeBeam.position.set(0, h + 0.12, 0);
    tierGroup.add(ridgeBeam);

    // 4. 4 Đầu đao cong vút GẮN CHẶT LIỀN VÀO 4 GÓC MÁI
    const corners = [
      [-w * 0.48, -d * 0.48],
      [w * 0.48, -d * 0.48],
      [-w * 0.48, d * 0.48],
      [w * 0.48, d * 0.48],
    ];

    corners.forEach(([ox, oz]) => {
      const eaveGroup = new THREE.Group();
      eaveGroup.position.set(ox, 0.10, oz);

      // Thân đao uốn cong lên 45 độ vươn ra ngoài
      const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.16, 0.85, 8), goldMat);
      blade.position.set(Math.sign(ox) * 0.24, 0.38, Math.sign(oz) * 0.24);
      blade.rotation.z = -Math.sign(ox) * 0.68;
      blade.rotation.x = Math.sign(oz) * 0.46;
      eaveGroup.add(blade);

      // Búp sen đỉnh đao mạ vàng
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), goldMat);
      tip.scale.set(0.8, 1.4, 0.8);
      tip.position.set(Math.sign(ox) * 0.46, 0.72, Math.sign(oz) * 0.46);
      eaveGroup.add(tip);

      tierGroup.add(eaveGroup);
    });

    // 5. Bình Cam Lồ Hồ Lô thếp vàng đỉnh tháp (nếu là tầng mái thượng)
    if (hasTopFinial) {
      const finialGroup = new THREE.Group();
      finialGroup.position.set(0, h + 0.28, 0);

      // Đài sen chân hồ lô
      const lotusBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.18, 16), goldMat);
      finialGroup.add(lotusBase);

      // Bầu hồ lô dưới
      const lowerGourd = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), goldMat);
      lowerGourd.position.y = 0.32;
      finialGroup.add(lowerGourd);

      // Cổ hồ lô
      const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.16, 12), goldMat);
      waist.position.y = 0.58;
      finialGroup.add(waist);

      // Bầu hồ lô trên
      const upperGourd = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), goldMat);
      upperGourd.position.y = 0.80;
      finialGroup.add(upperGourd);

      // Ngọn tháp đỉnh nhọn hào quang
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.45, 12), goldMat);
      spire.position.y = 1.15;
      finialGroup.add(spire);

      tierGroup.add(finialGroup);
    }

    parent.add(tierGroup);
  }

  // ─────────────────────────────────────────────
  // HỆ THỐNG CÂY CỐI CỔ THỤ CHÂN THẬT (REALISTIC TEMPLE ARBORETUM)
  // ─────────────────────────────────────────────
  private createAncientBodhiTrees() {
    // 1. CÂY BỒ ĐỀ CỔ THỤ (2 Cổ thụ đại thụ trấn tọa 2 bên Đông Uyển & Tây Uyển)
    this.createRealisticBodhiTree(17.0, 17.0, 1.4, true);
    this.createRealisticBodhiTree(-16.5, 17.0, 1.4, true);

    // 2. CÂY TÙNG LA HÁN / THÔNG DÁNG THIỀN (Cây dáng mây thanh thoát)
    this.createZenCloudPine(-21.0, 10.5, 1.15, 0.4);
    this.createZenCloudPine(21.0, 10.5, 1.15, -0.4);
    this.createZenCloudPine(-18.5, -6.0, 1.25, 0.2);
    this.createZenCloudPine(18.5, -6.5, 1.25, -0.2);

    // 3. CÂY LIỄU RỦ BÊN BỜ HỒ SEN (Tán cành tơ rủ mềm soi bóng mặt nước)
    this.createWeepingWillow(-11.8, 5.5, 1.1, 0.25);
    this.createWeepingWillow(11.8, 5.5, 1.1, -0.25);
    this.createWeepingWillow(-11.8, -3.5, 1.05, 0.22);
    this.createWeepingWillow(11.8, -3.5, 1.05, -0.22);

    // 4. CÂY HOA ĐÀO & HOA MAI CỔ TỰ (Sắc hoa thanh nhã & rải cánh hoa rụng dưới sân)
    this.createBlossomTree(-9.5, 18.5, 1.0, "peach");
    this.createBlossomTree(9.5, 18.5, 1.0, "mai");
    this.createBlossomTree(10.5, -9.5, 1.1, "peach");
  }

  // 1. CÂY BỒ ĐỀ CỔ THỤ: Thân xoắn cuộn, rễ bạnh vững chãi, rễ phụ buông rủ, tán lá bồng bềnh nhiều tầng
  private createRealisticBodhiTree(x: number, z: number, scale: number, isMain: boolean) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const barkMat = new THREE.MeshStandardMaterial({
      color: 0x3d2b1c,
      roughness: 0.92,
    });

    const rootMat = new THREE.MeshStandardMaterial({
      color: 0x342316,
      roughness: 0.95,
    });

    // Bè rễ bồ đề cổ thụ (buttress roots) cuồn cuộn bò lan trên nền đá
    const numRoots = 7;
    for (let r = 0; r < numRoots; r++) {
      const ang = (r / numRoots) * Math.PI * 2 + (r % 2) * 0.2;
      const rootLen = (1.4 + Math.random() * 0.8) * scale;
      const rootMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 * scale, 0.28 * scale, rootLen, 6),
        rootMat
      );
      rootMesh.position.set(
        Math.cos(ang) * rootLen * 0.45,
        0.14 * scale,
        Math.sin(ang) * rootLen * 0.45
      );
      rootMesh.rotation.z = Math.cos(ang) * 0.72;
      rootMesh.rotation.x = -Math.sin(ang) * 0.72;
      rootMesh.castShadow = true;
      group.add(rootMesh);
    }

    // Thân cây đa đoạn uốn lượn tự nhiên
    const h1 = 1.6 * scale;
    const trunk1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38 * scale, 0.58 * scale, h1, 10),
      barkMat
    );
    trunk1.position.set(0, h1 * 0.5, 0);
    trunk1.rotation.z = 0.08;
    trunk1.rotation.x = -0.05;
    trunk1.castShadow = true;
    group.add(trunk1);

    const h2 = 1.6 * scale;
    const trunk2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28 * scale, 0.40 * scale, h2, 9),
      barkMat
    );
    trunk2.position.set(0.12 * scale, h1 + h2 * 0.45, -0.06 * scale);
    trunk2.rotation.z = -0.14;
    trunk2.rotation.x = 0.12;
    trunk2.castShadow = true;
    group.add(trunk2);

    const trunkTopY = h1 + h2 * 0.9;

    // Rễ phụ buông rủ (hanging aerial roots) đặc trưng cây bồ đề cổ thụ
    for (let a = 0; a < 8; a++) {
      const aAng = (a / 8) * Math.PI * 2 + 0.1;
      const dist = (0.7 + Math.random() * 0.8) * scale;
      const aLen = (1.8 + Math.random() * 0.8) * scale;
      const aerial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02 * scale, 0.035 * scale, aLen, 5),
        rootMat
      );
      aerial.position.set(
        Math.cos(aAng) * dist,
        trunkTopY - aLen * 0.5 + 0.3 * scale,
        Math.sin(aAng) * dist
      );
      aerial.rotation.z = (Math.random() - 0.5) * 0.12;
      aerial.rotation.x = (Math.random() - 0.5) * 0.12;
      group.add(aerial);
    }

    // Các cành đại vươn rộng (spreading primary boughs)
    const boughs = [
      { ang: 0.2, pitch: 0.55, len: 2.2, r1: 0.16, r2: 0.26 },
      { ang: 1.4, pitch: 0.58, len: 2.0, r1: 0.15, r2: 0.25 },
      { ang: 2.7, pitch: 0.52, len: 2.3, r1: 0.17, r2: 0.27 },
      { ang: 4.0, pitch: 0.60, len: 1.9, r1: 0.14, r2: 0.24 },
      { ang: 5.2, pitch: 0.50, len: 2.1, r1: 0.16, r2: 0.25 },
    ];

    boughs.forEach((b) => {
      const bLen = b.len * scale;
      const bough = new THREE.Mesh(
        new THREE.CylinderGeometry(b.r1 * scale, b.r2 * scale, bLen, 7),
        barkMat
      );
      const bx = Math.cos(b.ang) * bLen * 0.4;
      const bz = Math.sin(b.ang) * bLen * 0.4;
      bough.position.set(bx, trunkTopY + Math.cos(b.pitch) * bLen * 0.4, bz);
      bough.rotation.z = Math.cos(b.ang) * b.pitch;
      bough.rotation.x = -Math.sin(b.ang) * b.pitch;
      bough.castShadow = true;
      group.add(bough);
    });

    // Tán lá bồ đề bồng bềnh nhiều tầng (multi-tiered organic foliage clusters)
    const matDeep = new THREE.MeshStandardMaterial({
      color: isMain ? 0x144d22 : 0x185226,
      roughness: 0.88,
    });
    const matBase = new THREE.MeshStandardMaterial({
      color: isMain ? 0x227838 : 0x27833e,
      roughness: 0.82,
    });
    const matSun = new THREE.MeshStandardMaterial({
      color: isMain ? 0x36a34c : 0x3cb354,
      roughness: 0.78,
    });
    const matHighlight = new THREE.MeshStandardMaterial({
      color: 0x5ec46c,
      roughness: 0.72,
    });

    const clusters = [
      { x: 0, y: trunkTopY + 2.2 * scale, z: 0, rx: 2.3, ry: 1.2, rz: 2.3, mat: matSun },
      { x: 0.6 * scale, y: trunkTopY + 2.6 * scale, z: -0.4 * scale, rx: 1.6, ry: 0.9, rz: 1.6, mat: matHighlight },
      { x: -0.5 * scale, y: trunkTopY + 2.4 * scale, z: 0.5 * scale, rx: 1.7, ry: 0.9, rz: 1.7, mat: matSun },
      { x: 1.8 * scale, y: trunkTopY + 1.2 * scale, z: 0.5 * scale, rx: 2.0, ry: 1.1, rz: 1.9, mat: matBase },
      { x: -1.7 * scale, y: trunkTopY + 1.3 * scale, z: 0.7 * scale, rx: 1.9, ry: 1.0, rz: 1.8, mat: matSun },
      { x: 0.4 * scale, y: trunkTopY + 1.1 * scale, z: 1.8 * scale, rx: 1.8, ry: 1.0, rz: 2.0, mat: matBase },
      { x: -0.6 * scale, y: trunkTopY + 1.4 * scale, z: -1.7 * scale, rx: 2.0, ry: 1.0, rz: 1.8, mat: matDeep },
      { x: 1.4 * scale, y: trunkTopY + 1.5 * scale, z: -1.4 * scale, rx: 1.7, ry: 0.9, rz: 1.7, mat: matSun },
      { x: 2.4 * scale, y: trunkTopY + 0.3 * scale, z: -0.3 * scale, rx: 1.6, ry: 0.8, rz: 1.5, mat: matDeep },
      { x: -2.3 * scale, y: trunkTopY + 0.4 * scale, z: -0.6 * scale, rx: 1.5, ry: 0.8, rz: 1.6, mat: matBase },
      { x: 0.8 * scale, y: trunkTopY + 0.2 * scale, z: 2.3 * scale, rx: 1.5, ry: 0.8, rz: 1.5, mat: matBase },
      { x: -1.2 * scale, y: trunkTopY + 0.5 * scale, z: 2.0 * scale, rx: 1.4, ry: 0.7, rz: 1.4, mat: matSun },
      { x: -1.8 * scale, y: trunkTopY + 0.3 * scale, z: -1.6 * scale, rx: 1.5, ry: 0.8, rz: 1.5, mat: matDeep },
      { x: 2.1 * scale, y: trunkTopY + 0.4 * scale, z: 1.5 * scale, rx: 1.4, ry: 0.7, rz: 1.4, mat: matSun },
    ];

    clusters.forEach((c, idx) => {
      const geo = new THREE.SphereGeometry(1.0, 8, 7);
      const mesh = new THREE.Mesh(geo, c.mat);
      mesh.position.set(c.x, c.y, c.z);
      mesh.scale.set(c.rx * scale, c.ry * scale, c.rz * scale);
      mesh.castShadow = idx < 6;
      mesh.receiveShadow = true;
      group.add(mesh);
    });

    this.scene.add(group);
    this.colliders.push(
      new THREE.Box3(
        new THREE.Vector3(x - 0.7 * scale, 0, z - 0.7 * scale),
        new THREE.Vector3(x + 0.7 * scale, 6 * scale, z + 0.7 * scale)
      )
    );
  }

  // 2. CÂY TÙNG LA HÁN / THÔNG DÁNG THIỀN: Dáng uốn chữ S, đĩa tán mây tầng tầng lớp lớp
  private createZenCloudPine(x: number, z: number, scale: number, rotY: number = 0) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x3a2c20,
      roughness: 0.95,
    });
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0x15432a,
      roughness: 0.82,
    });
    const cloudHighlightMat = new THREE.MeshStandardMaterial({
      color: 0x1f5c3a,
      roughness: 0.78,
    });

    // Thân uốn chữ S dáng trực huyền
    const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 1.4 * scale, 8), trunkMat);
    s1.position.set(0, 0.7 * scale, 0);
    s1.rotation.z = 0.22;
    s1.castShadow = true;
    group.add(s1);

    const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.18 * scale, 1.3 * scale, 8), trunkMat);
    s2.position.set(-0.25 * scale, 1.8 * scale, 0);
    s2.rotation.z = -0.28;
    s2.castShadow = true;
    group.add(s2);

    const s3 = new THREE.Mesh(new THREE.CylinderGeometry(0.10 * scale, 0.14 * scale, 1.2 * scale, 7), trunkMat);
    s3.position.set(-0.15 * scale, 2.9 * scale, 0);
    s3.rotation.z = 0.18;
    s3.castShadow = true;
    group.add(s3);

    // 7 tầng tán mây (cloud pads)
    const pads = [
      { x: -0.9 * scale, y: 1.6 * scale, z: 0.3 * scale, r: 1.2 * scale, mat: cloudMat },
      { x: 0.8 * scale, y: 2.2 * scale, z: -0.2 * scale, r: 1.3 * scale, mat: cloudHighlightMat },
      { x: -1.1 * scale, y: 2.7 * scale, z: -0.3 * scale, r: 1.1 * scale, mat: cloudMat },
      { x: 0.7 * scale, y: 3.3 * scale, z: 0.4 * scale, r: 1.2 * scale, mat: cloudHighlightMat },
      { x: -0.4 * scale, y: 3.8 * scale, z: -0.2 * scale, r: 1.3 * scale, mat: cloudMat },
      { x: 0.3 * scale, y: 4.3 * scale, z: 0.1 * scale, r: 1.0 * scale, mat: cloudHighlightMat },
      { x: 0, y: 4.7 * scale, z: 0, r: 0.85 * scale, mat: cloudHighlightMat },
    ];

    pads.forEach((p, idx) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.07 * scale, 0.8 * scale, 5), trunkMat);
      arm.position.set(p.x * 0.5, p.y - 0.15 * scale, p.z * 0.5);
      arm.rotation.z = Math.atan2(p.x, 0.8);
      group.add(arm);

      const pad = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 1.15, 0.28 * scale, 12), p.mat);
      pad.position.set(p.x, p.y, p.z);
      pad.castShadow = idx < 4;
      pad.receiveShadow = true;
      group.add(pad);
    });

    this.scene.add(group);
    this.colliders.push(
      new THREE.Box3(
        new THREE.Vector3(x - 0.5, 0, z - 0.5),
        new THREE.Vector3(x + 0.5, 4.5 * scale, z + 0.5)
      )
    );
  }

  // 3. CÂY LIỄU RỦ BỜ HỒ SEN: Thân mềm nghiêng, chuỗi cành tơ rủ thướt tha xuống mặt nước
  private createWeepingWillow(x: number, z: number, scale: number, leanAngle: number = 0.25) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x42382f,
      roughness: 0.9,
    });
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x3d7e48,
      roughness: 0.75,
    });
    const leafHighlightMat = new THREE.MeshStandardMaterial({
      color: 0x589e63,
      roughness: 0.7,
    });

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * scale, 0.32 * scale, 3.2 * scale, 8),
      trunkMat
    );
    trunk.position.set(0, 1.5 * scale, 0);
    trunk.rotation.z = leanAngle;
    trunk.castShadow = true;
    group.add(trunk);

    const crownTopY = 3.0 * scale;
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(1.6 * scale, 8, 6),
      leafMat
    );
    crown.position.set(Math.sin(leanAngle) * 1.5 * scale, crownTopY, 0);
    crown.scale.set(1.4, 0.65, 1.4);
    group.add(crown);

    // 16 chuỗi cành tơ rủ mềm
    for (let t = 0; t < 16; t++) {
      const ang = (t / 16) * Math.PI * 2;
      const r = (1.1 + Math.random() * 0.7) * scale;
      const tx = Math.sin(leanAngle) * 1.5 * scale + Math.cos(ang) * r;
      const tz = Math.sin(ang) * r;
      const strandLen = (1.6 + Math.random() * 1.0) * scale;

      const tendril = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015 * scale, 0.035 * scale, strandLen, 5),
        t % 2 === 0 ? leafMat : leafHighlightMat
      );
      tendril.position.set(tx, crownTopY - strandLen * 0.5, tz);
      tendril.rotation.z = (Math.random() - 0.5) * 0.15;
      group.add(tendril);

      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 * scale, 5, 5),
        leafHighlightMat
      );
      tip.position.set(tx, crownTopY - strandLen, tz);
      tip.scale.set(1.0, 1.8, 1.0);
      group.add(tip);
    }

    this.scene.add(group);
    this.colliders.push(
      new THREE.Box3(
        new THREE.Vector3(x - 0.5, 0, z - 0.5),
        new THREE.Vector3(x + 0.5, 4.0 * scale, z + 0.5)
      )
    );
  }

  // 4. CÂY HOA MAI & HOA ĐÀO CỔ TỰ: Tán hoa rực rỡ, cánh hoa rơi rụng trên nền gạch đá
  private createBlossomTree(x: number, z: number, scale: number, type: "peach" | "mai") {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x36251b,
      roughness: 0.95,
    });

    const isPeach = type === "peach";
    const cMain = isPeach ? 0xf48fb1 : 0xf9ca24;
    const cLight = isPeach ? 0xfce4ec : 0xfff9c4;
    const cDeep = isPeach ? 0xec407a : 0xf39c12;

    const bMatMain = new THREE.MeshStandardMaterial({ color: cMain, roughness: 0.65 });
    const bMatLight = new THREE.MeshStandardMaterial({ color: cLight, roughness: 0.6 });
    const bMatDeep = new THREE.MeshStandardMaterial({ color: cDeep, roughness: 0.7 });

    const trunkH = 2.4 * scale;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14 * scale, 0.26 * scale, trunkH, 8),
      trunkMat
    );
    trunk.position.set(0, trunkH * 0.5, 0);
    trunk.rotation.z = -0.15;
    trunk.castShadow = true;
    group.add(trunk);

    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.1 * scale, 1.2 * scale, 6), trunkMat);
    b1.position.set(0.4 * scale, trunkH * 0.8, 0.2 * scale);
    b1.rotation.z = -0.65;
    group.add(b1);

    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.1 * scale, 1.1 * scale, 6), trunkMat);
    b2.position.set(-0.35 * scale, trunkH * 0.85, -0.2 * scale);
    b2.rotation.z = 0.7;
    group.add(b2);

    const clusters = [
      { x: 0, y: trunkH + 0.6 * scale, z: 0, r: 1.2 * scale, mat: bMatMain },
      { x: 0.7 * scale, y: trunkH + 0.3 * scale, z: 0.4 * scale, r: 0.95 * scale, mat: bMatLight },
      { x: -0.6 * scale, y: trunkH + 0.4 * scale, z: -0.3 * scale, r: 0.9 * scale, mat: bMatDeep },
      { x: 0.2 * scale, y: trunkH + 1.1 * scale, z: -0.2 * scale, r: 0.85 * scale, mat: bMatLight },
      { x: -0.2 * scale, y: trunkH + 0.8 * scale, z: 0.6 * scale, r: 0.8 * scale, mat: bMatMain },
      { x: 0.9 * scale, y: trunkH + 0.1 * scale, z: -0.4 * scale, r: 0.75 * scale, mat: bMatDeep },
    ];

    clusters.forEach((c) => {
      const cl = new THREE.Mesh(new THREE.SphereGeometry(c.r, 7, 6), c.mat);
      cl.position.set(c.x, c.y, c.z);
      cl.scale.set(1.2, 0.8, 1.2);
      cl.castShadow = true;
      group.add(cl);
    });

    // Cánh hoa rụng rải rác trên phiến đá lát sân
    for (let p = 0; p < 28; p++) {
      const pDist = (0.5 + Math.random() * 2.2) * scale;
      const pAng = Math.random() * Math.PI * 2;
      const petal = new THREE.Mesh(
        new THREE.CircleGeometry(0.05 * scale, 5),
        p % 2 === 0 ? bMatMain : bMatLight
      );
      petal.rotation.x = -Math.PI / 2;
      petal.position.set(
        Math.cos(pAng) * pDist,
        0.045,
        Math.sin(pAng) * pDist
      );
      group.add(petal);
    }

    this.scene.add(group);
    this.colliders.push(
      new THREE.Box3(
        new THREE.Vector3(x - 0.4, 0, z - 0.4),
        new THREE.Vector3(x + 0.4, 3.5 * scale, z + 0.4)
      )
    );
  }

  // ─────────────────────────────────────────────
  // ĐÈN ĐÁ LỤC GIÁC CỔ KÍNH & QUẦNG SÁNG TỎA RA MẶT ĐẤT
  // ─────────────────────────────────────────────
  private lampLightHaloTex?: THREE.CanvasTexture;
  private getLampLightHaloTexture(): THREE.CanvasTexture {
    if (this.lampLightHaloTex) return this.lampLightHaloTex;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255, 215, 120, 0.75)");
    grad.addColorStop(0.35, "rgba(255, 175, 60, 0.38)");
    grad.addColorStop(0.7, "rgba(255, 140, 30, 0.12)");
    grad.addColorStop(1, "rgba(255, 120, 20, 0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    this.lampLightHaloTex = new THREE.CanvasTexture(canvas);
    return this.lampLightHaloTex;
  }

  private createHexagonalStoneLanterns() {
    const coords = [
      [-3.5, 20.5], [3.5, 20.5],
      [-3.5, 12], [3.5, 12],
      [-3.5, -8], [3.5, -8],
      [-8.5, -11], [8.5, -11],
    ];

    coords.forEach(([x, z]) => this.createStoneLamp(x, z));

    // Thêm các nguồn sáng ấm áp dịu dàng dọc theo lối đi và cầu hồ sen để ban đêm lung linh huyền ảo
    const pathLight1 = new THREE.PointLight(0xffbe6b, 1.8, 26, 1.2);
    pathLight1.position.set(0, 3.8, 16.0);
    this.scene.add(pathLight1);

    const pathLight2 = new THREE.PointLight(0xffbe6b, 1.8, 26, 1.2);
    pathLight2.position.set(0, 3.8, 6.0);
    this.scene.add(pathLight2);

    const bridgeLight = new THREE.PointLight(0xffaa44, 1.6, 20, 1.2);
    bridgeLight.position.set(0, 2.5, 0.0);
    this.scene.add(bridgeLight);

    const gateLight = new THREE.PointLight(0xffa834, 1.8, 22, 1.2);
    gateLight.position.set(0, 4.5, 26.5);
    this.scene.add(gateLight);
  }

  private createStoneLamp(x: number, z: number) {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9fa8a3, roughness: 0.8 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xffd180,
      emissive: 0xffa022,
      emissiveIntensity: 2.2,
      transparent: true,
      opacity: 0.95,
    });

    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.18, 6), stoneMat);
    base1.position.y = 0.09;
    group.add(base1);

    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.14, 6), stoneMat);
    base2.position.y = 0.25;
    group.add(base2);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.75, 6), stoneMat);
    pillar.position.y = 0.68;
    group.add(pillar);

    const lotusBase = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.18, 0.14, 6), stoneMat);
    lotusBase.position.y = 1.12;
    group.add(lotusBase);

    const lanternBox = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.38), glowMat);
    lanternBox.position.y = 1.36;
    group.add(lanternBox);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.28, 6), stoneMat);
    roof.position.y = 1.68;
    group.add(roof);

    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), stoneMat);
    gem.position.y = 1.84;
    group.add(gem);

    // Quầng sáng vàng tỏa ra trên mặt đất quanh chân đèn đá (Ground Light Pool)
    const haloGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const haloMat = new THREE.MeshBasicMaterial({
      map: this.getLampLightHaloTexture(),
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.02;
    group.add(halo);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  // ─────────────────────────────────────────────
  // RẶNG TRE & TRÚC QUÂN TỬ CHÂN THẬT (REALISTIC BAMBOO GROVES)
  // ─────────────────────────────────────────────
  private createBambooGroves() {
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0x6e8e41, roughness: 0.6 });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x4a6328, roughness: 0.7 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.7 });

    const groves = [
      { cx: -18, cz: -16, count: 12 },
      { cx: 18, cz: -18, count: 10 },
      { cx: -18, cz: 8, count: 8 },
    ];

    groves.forEach((g) => {
      for (let i = 0; i < g.count; i++) {
        const ox = g.cx + (Math.random() - 0.5) * 4.5;
        const oz = g.cz + (Math.random() - 0.5) * 4.5;
        const h = 4.0 + Math.random() * 2.5;

        // Thân tre có đốt (segmented culm with nodes)
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, h, 8), stalkMat);
        stalk.position.set(ox, h * 0.5, oz);
        stalk.castShadow = true;
        this.scene.add(stalk);

        // Các đốt trúc nổi (culm rings)
        const numNodes = Math.floor(h / 0.7);
        for (let n = 1; n < numNodes; n++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.015, 5, 8), ringMat);
          ring.position.set(ox, n * 0.7, oz);
          ring.rotation.x = Math.PI / 2;
          this.scene.add(ring);
        }

        // Tán lá xòe hình quạt mềm mại
        const leafClump = new THREE.Mesh(new THREE.SphereGeometry(0.75, 6, 6), leafMat);
        leafClump.position.set(ox + 0.15, h, oz + 0.1);
        leafClump.scale.set(1.5, 0.45, 1.5);
        this.scene.add(leafClump);
      }
    });
  }

  // ─────────────────────────────────────────────
  // LƯ HƯƠNG ĐỒNG NGOẠI SÂN
  // ─────────────────────────────────────────────
  private createIncenseDingAndSmoke() {
    const group = new THREE.Group();
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xb7950b,
      roughness: 0.3,
      metalness: 0.8,
    });

    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.45, 8), bronzeMat);
      leg.position.set(Math.cos(a) * 0.38, 0.22, Math.sin(a) * 0.38);
      group.add(leg);
    }

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.38, 0.65, 16), bronzeMat);
    body.position.y = 0.68;
    body.castShadow = true;
    body.name = "courtyard_incense_ding";
    this.incenseDingMesh = body;
    group.add(body);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 20), bronzeMat);
    rim.position.y = 1.0;
    rim.rotation.x = Math.PI / 2;
    group.add(rim);

    const ash = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.08, 12),
      new THREE.MeshStandardMaterial({ color: 0x424949, roughness: 1.0 })
    );
    ash.position.y = 0.95;
    group.add(ash);

    for (let i = 0; i < 3; i++) {
      const inc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6),
        new THREE.MeshStandardMaterial({ color: 0xc0392b, emissive: 0xe74c3c, emissiveIntensity: 0.6 })
      );
      inc.position.set((i - 1) * 0.08, 1.18, 0);
      group.add(inc);
    }

    group.position.set(0, 0, -13.2);
    this.scene.add(group);
  }

  // ─────────────────────────────────────────────
  // CÁC KHÓM HOA SEN CẠN & HOA DẠI SÂN VƯỜN (DETAILED TEMPLE FLORA)
  // ─────────────────────────────────────────────
  private createFlowerPatches() {
    const patches = [
      { x: -6, z: 18, color: 0xf06292 },
      { x: 6, z: 18, color: 0xfdd835 },
      { x: -6, z: 8, color: 0xab47bc },
      { x: 6, z: 8, color: 0xff7043 },
      { x: -8, z: -6, color: 0xfdd835 },
      { x: 8, z: -6, color: 0x42a5f5 },
      { x: -4.5, z: 14, color: 0xffffff },
      { x: 4.5, z: 14, color: 0xf06292 },
    ];

    patches.forEach((p) => {
      const group = new THREE.Group();
      group.position.set(p.x, 0.04, p.z);

      const fMat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.55 });
      const gMat = new THREE.MeshStandardMaterial({ color: 0x227838, roughness: 0.75 });
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.8 });

      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), gMat);
      bush.scale.set(1.5, 0.42, 1.5);
      group.add(bush);

      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const rad = 0.22 + (i % 2) * 0.12;
        const fx = Math.cos(a) * rad;
        const fz = Math.sin(a) * rad;

        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 4), stemMat);
        stem.position.set(fx, 0.18, fz);
        group.add(stem);

        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 7), fMat);
        fl.position.set(fx, 0.27, fz);
        fl.scale.set(1.2, 0.7, 1.2);
        group.add(fl);

        const pistil = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 5, 5),
          new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffd54f, emissiveIntensity: 0.3 })
        );
        pistil.position.set(fx, 0.32, fz);
        group.add(pistil);
      }

      this.scene.add(group);
    });
  }

  // ─────────────────────────────────────────────
  // VƯỜN THIỀN AN LẠC CẢNH SẮC (ZEN TEMPLE SANCTUARY GARDENS)
  // ─────────────────────────────────────────────
  private createZenGardens() {
    this.createWestZenGarden();
    this.createEastZenGarden();
    this.createShorelineGardenDetails();
  }

  // 1. TÂY UYỂN: Vườn Thiền Bồ Đề, Vườn Cát Trắng & Bàn Trà Đạo Cổ
  private createWestZenGarden() {
    const group = new THREE.Group();

    // Gò cỏ xanh mướt (Tâm x: -14.5, z: 16.0, kích thước 15m x 13m)
    const lawnMat = new THREE.MeshStandardMaterial({
      color: 0x2e6636,
      roughness: 0.85,
    });
    const kerbMat = new THREE.MeshStandardMaterial({
      color: 0x767064,
      roughness: 0.88,
    });

    const lawnGeo = new THREE.BoxGeometry(15.0, 0.07, 13.0);
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.position.set(-14.5, 0.035, 16.0);
    lawn.receiveShadow = true;
    group.add(lawn);

    // Viền bờ đá bao quanh gò vườn
    const borderThickness = 0.22;
    const borderH = 0.11;
    const kNorth = new THREE.Mesh(new THREE.BoxGeometry(15.2, borderH, borderThickness), kerbMat);
    kNorth.position.set(-14.5, 0.055, 9.5);
    group.add(kNorth);

    const kSouth = new THREE.Mesh(new THREE.BoxGeometry(15.2, borderH, borderThickness), kerbMat);
    kSouth.position.set(-14.5, 0.055, 22.5);
    group.add(kSouth);

    const kWest = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, borderH, 13.2), kerbMat);
    kWest.position.set(-22.0, 0.055, 16.0);
    group.add(kWest);

    const kEast = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, borderH, 13.2), kerbMat);
    kEast.position.set(-7.0, 0.055, 16.0);
    group.add(kEast);

    // VƯỜN SỎI TRẮNG CÀO SÓNG & TAM SƠN THẠCH CẢNH (Raked White Gravel Zen Garden)
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xe6e4db,
      roughness: 0.95,
    });
    const sandBed = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.9, 0.03, 24), sandMat);
    sandBed.position.set(-17.5, 0.08, 14.0);
    sandBed.receiveShadow = true;
    group.add(sandBed);

    const rippleMat = new THREE.MeshStandardMaterial({ color: 0xd6d3c8, roughness: 0.9 });
    [1.0, 1.8, 2.5].forEach((r) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 6, 24), rippleMat);
      ring.position.set(-17.5, 0.096, 14.0);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    });

    const stoneZenMat = new THREE.MeshStandardMaterial({ color: 0x5a5f57, roughness: 0.9 });
    const mossStoneMat = new THREE.MeshStandardMaterial({ color: 0x485842, roughness: 0.92 });

    const heavenStone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), mossStoneMat);
    heavenStone.position.set(-17.5, 0.75, 14.0);
    heavenStone.scale.set(0.8, 1.8, 0.7);
    heavenStone.rotation.y = 0.4;
    heavenStone.castShadow = true;
    group.add(heavenStone);

    const earthStone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 1), stoneZenMat);
    earthStone.position.set(-18.3, 0.45, 14.6);
    earthStone.scale.set(1.1, 1.2, 0.9);
    earthStone.rotation.y = -0.3;
    earthStone.castShadow = true;
    group.add(earthStone);

    const humanStone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 1), mossStoneMat);
    humanStone.position.set(-16.8, 0.35, 13.5);
    humanStone.scale.set(0.9, 1.0, 1.1);
    humanStone.castShadow = true;
    group.add(humanStone);

    // BÀN TRÀ ĐẠO ĐÁ CỔ & 4 GHẾ ĐÔN ĐÁ (Ancient Stone Tea Set)
    const polishedStoneMat = new THREE.MeshStandardMaterial({
      color: 0x82887e,
      roughness: 0.45,
      metalness: 0.1,
    });
    const drumMat = new THREE.MeshStandardMaterial({
      color: 0x6e736a,
      roughness: 0.65,
    });
    const teaPotMat = new THREE.MeshStandardMaterial({
      color: 0x8d4925,
      roughness: 0.5,
    });
    const teaCupMat = new THREE.MeshStandardMaterial({
      color: 0x3d7054,
      roughness: 0.35,
    });

    const tableX = -10.5;
    const tableZ = 13.5;

    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.62, 0.52, 16), polishedStoneMat);
    table.position.set(tableX, 0.33, tableZ);
    table.castShadow = true;
    table.receiveShadow = true;
    group.add(table);

    const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.14, 16), drumMat);
    tableBase.position.set(tableX, 0.14, tableZ);
    group.add(tableBase);

    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.35), new THREE.MeshStandardMaterial({ color: 0x3b2314 }));
    tray.position.set(tableX, 0.60, tableZ);
    group.add(tray);

    const teapot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), teaPotMat);
    teapot.position.set(tableX, 0.68, tableZ);
    teapot.scale.set(1.2, 0.8, 1.0);
    group.add(teapot);

    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.08, 6), teaPotMat);
    spout.position.set(tableX + 0.09, 0.69, tableZ);
    spout.rotation.z = -0.6;
    group.add(spout);

    [
      [0.12, 0.08], [-0.12, 0.08],
      [0.12, -0.08], [-0.12, -0.08],
    ].forEach(([cx, cz]) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.035, 8), teaCupMat);
      cup.position.set(tableX + cx, 0.625, tableZ + cz);
      group.add(cup);
    });

    [
      [0, 1.0], [0, -1.0],
      [1.0, 0], [-1.0, 0],
    ].forEach(([sx, sz]) => {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.20, 0.34, 12), drumMat);
      stool.position.set(tableX + sx, 0.24, tableZ + sz);
      stool.castShadow = true;
      group.add(stool);
    });

    // LỐI ĐI BẰNG PHIẾN ĐÁ TỰ NHIÊN (Slate Stepping Stones)
    const stepStoneMat = new THREE.MeshStandardMaterial({
      color: 0x7c8177,
      roughness: 0.8,
    });
    const steps = [
      { x: -7.6, z: 16.0 },
      { x: -8.5, z: 15.2 },
      { x: -9.5, z: 14.7 },
      { x: -10.5, z: 15.0 },
      { x: -11.8, z: 14.8 },
      { x: -13.0, z: 14.5 },
      { x: -14.2, z: 14.2 },
      { x: -15.5, z: 14.0 },
      { x: -9.5, z: 12.0 },
      { x: -10.5, z: 11.8 },
      { x: -11.8, z: 12.2 },
      { x: -14.5, z: 17.5 },
      { x: -15.0, z: 19.0 },
      { x: -16.0, z: 20.2 },
    ];

    steps.forEach((st, idx) => {
      const r = 0.42 + (idx % 3) * 0.06;
      const sMesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, 0.04, 7), stepStoneMat);
      sMesh.position.set(st.x, 0.085, st.z);
      sMesh.rotation.y = idx * 0.6;
      sMesh.scale.set(1.1, 1.0, 0.9);
      sMesh.receiveShadow = true;
      group.add(sMesh);
    });

    // ĐÔN CHẬU CÂY CẢNH BONSAI CỔ THỤ (Bonsai on Carved Lotus Pedestals)
    this.createBonsaiPedestal(-7.5, 19.5, group);
    this.createBonsaiPedestal(-7.5, 10.8, group);

    this.scene.add(group);

    // Vật cản tránh người chơi đi xuyên qua bàn trà và tam sơn thạch cảnh
    this.colliders.push(
      new THREE.Box3(
        new THREE.Vector3(tableX - 0.75, 0, tableZ - 0.75),
        new THREE.Vector3(tableX + 0.75, 1.2, tableZ + 0.75)
      )
    );
    this.colliders.push(
      new THREE.Box3(
        new THREE.Vector3(-18.6, 0, 13.0),
        new THREE.Vector3(-16.4, 2.0, 15.2)
      )
    );
  }

  // 2. ĐÔNG UYỂN: Vườn Hòn Non Bộ Sơn Thủy, Chậu Sen Cổ & Ghế Đá
  private createEastZenGarden() {
    const group = new THREE.Group();

    // Gò cỏ xanh mướt (Tâm x: 14.5, z: 16.0, kích thước 15m x 13m)
    const lawnMat = new THREE.MeshStandardMaterial({
      color: 0x2e6636,
      roughness: 0.85,
    });
    const kerbMat = new THREE.MeshStandardMaterial({
      color: 0x767064,
      roughness: 0.88,
    });

    const lawnGeo = new THREE.BoxGeometry(15.0, 0.07, 13.0);
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.position.set(14.5, 0.035, 16.0);
    lawn.receiveShadow = true;
    group.add(lawn);

    const borderThickness = 0.22;
    const borderH = 0.11;
    const kNorth = new THREE.Mesh(new THREE.BoxGeometry(15.2, borderH, borderThickness), kerbMat);
    kNorth.position.set(14.5, 0.055, 9.5);
    group.add(kNorth);

    const kSouth = new THREE.Mesh(new THREE.BoxGeometry(15.2, borderH, borderThickness), kerbMat);
    kSouth.position.set(14.5, 0.055, 22.5);
    group.add(kSouth);

    const kWest = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, borderH, 13.2), kerbMat);
    kWest.position.set(7.0, 0.055, 16.0);
    group.add(kWest);

    const kEast = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, borderH, 13.2), kerbMat);
    kEast.position.set(22.0, 0.055, 16.0);
    group.add(kEast);

    // HÒN NON BỘ SƠN THỦY ĐẠI CẢNH (Karst Rockery Mountain & Cascade Pool)
    const rockeryX = 14.5;
    const rockeryZ = 13.5;

    const poolRimMat = new THREE.MeshStandardMaterial({ color: 0x5a574f, roughness: 0.8 });
    const poolWaterMat = new THREE.MeshStandardMaterial({
      color: 0x1a524c,
      roughness: 0.15,
      metalness: 0.6,
      transparent: true,
      opacity: 0.88,
    });

    const poolRim = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.18, 8, 20), poolRimMat);
    poolRim.position.set(rockeryX, 0.16, rockeryZ);
    poolRim.rotation.x = Math.PI / 2;
    poolRim.scale.set(1.3, 1.0, 1.0);
    group.add(poolRim);

    const poolWater = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.35, 0.04, 20), poolWaterMat);
    poolWater.position.set(rockeryX, 0.14, rockeryZ);
    poolWater.scale.set(1.3, 1.0, 1.0);
    group.add(poolWater);

    const rockMat1 = new THREE.MeshStandardMaterial({ color: 0x4e544c, roughness: 0.9 });
    const rockMat2 = new THREE.MeshStandardMaterial({ color: 0x3d483b, roughness: 0.92 });
    const mossTopMat = new THREE.MeshStandardMaterial({ color: 0x345a30, roughness: 0.85 });

    const crags = [
      { dx: 0, y: 1.6, dz: 0, sx: 0.8, sy: 2.4, sz: 0.8, mat: rockMat1 },
      { dx: 0.8, y: 1.1, dz: 0.3, sx: 0.7, sy: 1.8, sz: 0.7, mat: rockMat2 },
      { dx: -0.7, y: 1.2, dz: -0.2, sx: 0.75, sy: 1.9, sz: 0.7, mat: mossTopMat },
      { dx: 0.2, y: 0.8, dz: 0.9, sx: 0.6, sy: 1.4, sz: 0.6, mat: rockMat1 },
      { dx: -0.3, y: 0.9, dz: -0.8, sx: 0.65, sy: 1.5, sz: 0.65, mat: mossTopMat },
      { dx: 1.3, y: 0.6, dz: -0.2, sx: 0.55, sy: 1.1, sz: 0.6, mat: rockMat2 },
      { dx: -1.2, y: 0.7, dz: 0.4, sx: 0.6, sy: 1.2, sz: 0.55, mat: rockMat1 },
    ];

    crags.forEach((c) => {
      const cragMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0, 1), c.mat);
      cragMesh.position.set(rockeryX + c.dx, c.y, rockeryZ + c.dz);
      cragMesh.scale.set(c.sx, c.sy, c.sz);
      cragMesh.rotation.y = c.dx * 1.5;
      cragMesh.castShadow = true;
      group.add(cragMesh);
    });

    const miniPagodaMat = new THREE.MeshStandardMaterial({ color: 0xb5a489, roughness: 0.7 });
    const miniBase = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.25), miniPagodaMat);
    miniBase.position.set(rockeryX + 0.4, 2.1, rockeryZ + 0.1);
    group.add(miniBase);

    const miniRoof = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.2, 4), miniPagodaMat);
    miniRoof.position.set(rockeryX + 0.4, 2.3, rockeryZ + 0.1);
    group.add(miniRoof);

    const miniBridge = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.05, 6, 12, Math.PI * 0.7),
      new THREE.MeshStandardMaterial({ color: 0x8a382b })
    );
    miniBridge.position.set(rockeryX - 0.2, 0.45, rockeryZ + 0.8);
    miniBridge.rotation.z = Math.PI * 0.15;
    group.add(miniBridge);

    for (let l = 0; l < 5; l++) {
      const la = (l / 5) * Math.PI * 2;
      const pad = new THREE.Mesh(
        new THREE.CircleGeometry(0.12, 8),
        new THREE.MeshStandardMaterial({ color: 0x27ae60, side: THREE.DoubleSide })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(rockeryX + Math.cos(la) * 1.6, 0.165, rockeryZ + Math.sin(la) * 1.2);
      group.add(pad);
    }

    // ĐẠI CHẬU SEN SÀNH BÁT TRÀNG TRÊN ĐÔN ĐÁ (Ceramic Lotus Urns)
    this.createCeramicLotusUrn(7.5, 19.5, group);
    this.createCeramicLotusUrn(7.5, 10.8, group);

    // GHẾ ĐÁ SÂN VƯỜN CỔ KÍNH (Garden Stone Benches)
    this.createGardenStoneBench(10.5, 17.5, 0.3, group);
    this.createGardenStoneBench(10.5, 12.0, -0.3, group);

    // LỐI ĐI BẰNG ĐÁ CUỘI DẠO BƯỚC (East Stepping Stones)
    const stepStoneMat = new THREE.MeshStandardMaterial({ color: 0x7c8177, roughness: 0.8 });
    const eastSteps = [
      { x: 7.6, z: 16.0 },
      { x: 8.6, z: 15.5 },
      { x: 9.6, z: 14.8 },
      { x: 10.8, z: 14.5 },
      { x: 12.0, z: 15.0 },
      { x: 13.0, z: 16.5 },
      { x: 14.0, z: 18.0 },
      { x: 15.2, z: 19.5 },
      { x: 12.0, z: 13.5 },
      { x: 12.5, z: 12.0 },
      { x: 13.5, z: 11.2 },
    ];

    eastSteps.forEach((st, idx) => {
      const r = 0.42 + (idx % 3) * 0.05;
      const sMesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, 0.04, 7), stepStoneMat);
      sMesh.position.set(st.x, 0.085, st.z);
      sMesh.rotation.y = idx * 0.5;
      sMesh.receiveShadow = true;
      group.add(sMesh);
    });

    this.scene.add(group);

    // Vật cản tránh người chơi đi xuyên qua hòn non bộ
    this.colliders.push(
      new THREE.Box3(
        new THREE.Vector3(rockeryX - 2.2, 0, rockeryZ - 1.8),
        new THREE.Vector3(rockeryX + 2.2, 3.5, rockeryZ + 1.8)
      )
    );
  }

  private createBonsaiPedestal(x: number, z: number, parent: THREE.Group) {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8479, roughness: 0.8 });
    const potMat = new THREE.MeshStandardMaterial({ color: 0x3d4a41, roughness: 0.5 });
    const plantBarkMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1f5c32, roughness: 0.75 });

    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.16, 8), stoneMat);
    base1.position.set(x, 0.16, z);
    parent.add(base1);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 8), stoneMat);
    pillar.position.set(x, 0.48, z);
    parent.add(pillar);

    const lotusCap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.22, 0.18, 8), stoneMat);
    lotusCap.position.set(x, 0.82, z);
    parent.add(lotusCap);

    const pot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.15, 0.42), potMat);
    pot.position.set(x, 0.98, z);
    parent.add(pot);

    const bTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.45, 6), plantBarkMat);
    bTrunk.position.set(x + 0.08, 1.15, z);
    bTrunk.rotation.z = -0.65;
    parent.add(bTrunk);

    [
      { dx: -0.15, dy: 1.35, dz: 0, r: 0.22 },
      { dx: 0.18, dy: 1.25, dz: 0.08, r: 0.26 },
      { dx: 0.02, dy: 1.45, dz: -0.06, r: 0.20 },
    ].forEach((f) => {
      const cloud = new THREE.Mesh(new THREE.CylinderGeometry(f.r, f.r * 1.1, 0.08, 8), foliageMat);
      cloud.position.set(x + f.dx, f.dy, z + f.dz);
      parent.add(cloud);
    });
  }

  private createCeramicLotusUrn(x: number, z: number, parent: THREE.Group) {
    const urnMat = new THREE.MeshStandardMaterial({
      color: 0x8a4522,
      roughness: 0.55,
      metalness: 0.2,
    });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x827d73, roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.7 });
    const lotusMat = new THREE.MeshStandardMaterial({ color: 0xf48fb1, roughness: 0.6 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.25, 8), stoneMat);
    base.position.set(x, 0.205, z);
    parent.add(base);

    const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.32, 0.55, 16), urnMat);
    urn.position.set(x, 0.58, z);
    urn.castShadow = true;
    parent.add(urn);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 16), urnMat);
    rim.position.set(x, 0.86, z);
    rim.rotation.x = Math.PI / 2;
    parent.add(rim);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 5), leafMat);
      stalk.position.set(x + Math.cos(a) * 0.22, 0.98, z + Math.sin(a) * 0.22);
      parent.add(stalk);

      const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.16, 8), leafMat);
      leaf.rotation.x = -Math.PI / 2 + 0.2;
      leaf.position.set(x + Math.cos(a) * 0.24, 1.14, z + Math.sin(a) * 0.24);
      parent.add(leaf);
    }

    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 7), lotusMat);
    flower.position.set(x, 1.2, z);
    parent.add(flower);
  }

  private createGardenStoneBench(x: number, z: number, rotY: number, parent: THREE.Group) {
    const benchMat = new THREE.MeshStandardMaterial({
      color: 0x9fa499,
      roughness: 0.72,
    });
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x767a71,
      roughness: 0.85,
    });

    const group = new THREE.Group();
    group.position.set(x, 0.08, z);
    group.rotation.y = rotY;

    [-0.55, 0.55].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.42), legMat);
      leg.position.set(lx, 0.19, 0);
      leg.castShadow = true;
      group.add(leg);
    });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.55), benchMat);
    seat.position.set(0, 0.42, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 0.08), benchMat);
    back.position.set(0, 0.65, -0.24);
    back.castShadow = true;
    group.add(back);

    parent.add(group);
  }

  private createShorelineGardenDetails() {
    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x555a52,
      roughness: 0.9,
    });
    const mossBoulderMat = new THREE.MeshStandardMaterial({
      color: 0x43543d,
      roughness: 0.92,
    });

    const boulderClusters = [
      { cx: -12.2, cz: 5.8 },
      { cx: 12.2, cz: 5.8 },
      { cx: -12.2, cz: -3.8 },
      { cx: 12.2, cz: -3.8 },
    ];

    boulderClusters.forEach((bc) => {
      for (let i = 0; i < 4; i++) {
        const ox = bc.cx + (Math.random() - 0.5) * 1.5;
        const oz = bc.cz + (Math.random() - 0.5) * 1.5;
        const r = 0.28 + Math.random() * 0.35;
        const b = new THREE.Mesh(
          new THREE.DodecahedronGeometry(r, 1),
          i % 2 === 0 ? mossBoulderMat : boulderMat
        );
        b.position.set(ox, r * 0.5, oz);
        b.scale.set(1.2, 0.8, 1.1);
        b.rotation.y = Math.random() * Math.PI;
        b.castShadow = true;
        this.scene.add(b);
      }
    });
  }

  // ─────────────────────────────────────────────
  // TƯỜNG BAO GẠCH, CỔNG NGUYỆT MÔN & KHUÔN VIÊN MỞ RỘNG QUANH CHÙA
  // ─────────────────────────────────────────────
  private createEnclosureWalls() {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe5d8be, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xa93226, roughness: 0.65 });
    const stonePillarMat = new THREE.MeshStandardMaterial({ color: 0x8a9296, roughness: 0.72 });
    const goldCapMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.7 });

    // Tường bao phía sau cùng: z = -56.0m (chặn x in [-28.5, 28.5])
    this.addWall(wallMat, roofMat, 0, -56.0, 57.0, 0);

    // Tường bao Tả & Hữu 2 bên (x = ±28.5m), mở Cổng Nguyệt Môn dẫn ra hoa viên ngoại cảnh tại z in [-2.0, 2.0]
    [-28.5, 28.5].forEach((wx) => {
      // Đoạn Bắc: từ z = -56 đến z = -2 (dài 54m, tâm z = -29.0)
      this.addWall(wallMat, roofMat, wx, -29.0, 54.0, Math.PI / 2);
      this.colliders.push(new THREE.Box3(new THREE.Vector3(wx - 0.7, 0, -56.5), new THREE.Vector3(wx + 0.7, 6.0, -2.0)));

      // Đoạn Nam: từ z = 2 đến z = 25.5 (dài 23.5m, tâm z = 13.75)
      this.addWall(wallMat, roofMat, wx, 13.75, 23.5, Math.PI / 2);
      this.colliders.push(new THREE.Box3(new THREE.Vector3(wx - 0.7, 0, 2.0), new THREE.Vector3(wx + 0.7, 6.0, 25.8)));

      // Cặp trụ cổng hoa văn đá hai bên lối mở z = ±2.0
      [-2.1, 2.1].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 3.2, 12), stonePillarMat);
        post.position.set(wx, 1.6, pz);
        post.castShadow = true;
        this.scene.add(post);

        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), goldCapMat);
        finial.position.set(wx, 3.35, pz);
        this.scene.add(finial);
      });

      // Đèn đá thắp sáng lối đi cổng phụ
      this.createStoneLamp(wx + (wx > 0 ? 2.5 : -2.5), 0);
    });

    // Tường bao mặt tiền kết nối từ 2 góc khuôn viên về hai bên Cổng Tam Quan (x = ±7.5, z = 25.5)
    // Cánh trái: từ x = -28.5 đến x = -7.5 (dài 21.0m, tâm x = -18.0, z = 25.5)
    this.addWall(wallMat, roofMat, -18.0, 25.5, 21.0, 0);
    this.colliders.push(new THREE.Box3(new THREE.Vector3(-28.6, 0, 25.0), new THREE.Vector3(-7.4, 4.0, 26.0)));

    // Cánh phải: từ x = 7.5 đến x = 28.5 (dài 21.0m, tâm x = 18.0, z = 25.5)
    this.addWall(wallMat, roofMat, 18.0, 25.5, 21.0, 0);
    this.colliders.push(new THREE.Box3(new THREE.Vector3(7.4, 0, 25.0), new THREE.Vector3(28.6, 4.0, 26.0)));

    // ─────────────────────────────────────────────
    // ĐẠI LỘ TIỀN CẢNH & KHUÔN VIÊN MỞ RỘNG NGOẠI THÀNH
    // ─────────────────────────────────────────────
    // Đại lộ đá nối dài từ Cổng Tam Quan ra thẳng bờ biển phía trước (z = 26.5m đến 54.0m)
    const outerAvenue = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.08, 28.0),
      new THREE.MeshStandardMaterial({ color: 0xcdc7bd, roughness: 0.72 })
    );
    outerAvenue.position.set(0, 0.04, 40.0);
    outerAvenue.receiveShadow = true;
    this.scene.add(outerAvenue);

    // Dãy đèn đá thắp sáng đại lộ dẫn ra biển
    [33, 41, 49].forEach((lz) => {
      this.createStoneLamp(-3.8, lz);
      this.createStoneLamp(3.8, lz);
    });

    // Lan can đá hoa sen ngắm biển phía trước (z = 55.5m, x in [-55, 55])
    const seaRailMat = new THREE.MeshStandardMaterial({ color: 0xa8b0b5, roughness: 0.65 });
    const seaRail = new THREE.Mesh(new THREE.BoxGeometry(110.0, 0.95, 0.35), seaRailMat);
    seaRail.position.set(0, 0.48, 55.5);
    seaRail.castShadow = true;
    seaRail.receiveShadow = true;
    this.scene.add(seaRail);

    // Cây cảnh dáng thiền ngoài hoa viên quanh chùa
    [-42, 42].forEach((tx) => {
      this.createZenCloudPine(tx, 38.0, 1.2, tx > 0 ? -0.3 : 0.3);
      this.createZenCloudPine(tx, 0.0, 1.3, tx > 0 ? -0.4 : 0.4);
      this.createZenCloudPine(tx, -35.0, 1.25, tx > 0 ? -0.2 : 0.2);
    });

    // Rào chắn mép nước biển quanh đảo chùa (ngăn người chơi rơi khỏi bờ đá xuống biển)
    this.colliders.push(new THREE.Box3(new THREE.Vector3(-60.0, 0, 55.8), new THREE.Vector3(60.0, 6.0, 58.0)));
    this.colliders.push(new THREE.Box3(new THREE.Vector3(-60.0, 0, -58.0), new THREE.Vector3(60.0, 6.0, -55.8)));
    this.colliders.push(new THREE.Box3(new THREE.Vector3(-58.0, 0, -60.0), new THREE.Vector3(-55.2, 6.0, 60.0)));
    this.colliders.push(new THREE.Box3(new THREE.Vector3(55.2, 0, -60.0), new THREE.Vector3(58.0, 6.0, 60.0)));
  }

  private addWall(wMat: THREE.Material, rMat: THREE.Material, x: number, z: number, len: number, rotY: number) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, 2.2, 0.4), wMat);
    wall.position.set(x, 1.1, z);
    wall.rotation.y = rotY;
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(len + 0.3, 0.2, 0.7), rMat);
    roof.position.set(x, 2.28, z);
    roof.rotation.y = rotY;
    roof.castShadow = true;
    this.scene.add(roof);
  }

  // ─────────────────────────────────────────────
  // ĐÔI HẠC NGỰ LƯNG RÙA ĐỒNG CỔ TRUYỀN (SACRED BRONZE CRANES ON TORTOISES)
  // Biểu tượng cao quý trường tồn & thanh tịnh chầu trước Tòa Tam Thế Phật
  // ─────────────────────────────────────────────
  private createCraneOnTurtleStatues(parent: THREE.Group) {
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x9a7b38,
      roughness: 0.38,
      metalness: 0.78,
    });
    const goldCandleMat = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      roughness: 0.25,
      metalness: 0.85,
    });
    const stoneBaseMat = new THREE.MeshStandardMaterial({
      color: 0x717d7e,
      roughness: 0.75,
    });

    [-9.2, 9.2].forEach((cx) => {
      const craneGroup = new THREE.Group();
      craneGroup.position.set(cx, 0.65, -41.2);
      craneGroup.rotation.y = cx < 0 ? 0.35 : -0.35;

      // 1. Chân đế hoa sen đá xanh
      const lotusBase = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.18, 16), stoneBaseMat);
      lotusBase.position.set(0, 0.09, 0);
      lotusBase.receiveShadow = true;
      craneGroup.add(lotusBase);

      // 2. Tôn tượng Kim Quy (Rùa Vàng Bằng Đồng vững chãi)
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), bronzeMat);
      shell.scale.set(1.15, 0.44, 1.45);
      shell.position.set(0, 0.35, 0);
      craneGroup.add(shell);

      // Đầu & cổ rùa vươn về phía trước
      const turtleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.45, 10), bronzeMat);
      turtleNeck.position.set(0, 0.48, 0.78);
      turtleNeck.rotation.x = 0.55;
      craneGroup.add(turtleNeck);

      const turtleHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), bronzeMat);
      turtleHead.scale.set(0.9, 0.7, 1.3);
      turtleHead.position.set(0, 0.65, 0.98);
      craneGroup.add(turtleHead);

      // 4 Chân rùa bám vững vào đài sen
      const legOffsets = [
        { x: -0.45, z: 0.48 },
        { x: 0.45, z: 0.48 },
        { x: -0.48, z: -0.48 },
        { x: 0.48, z: -0.48 },
      ];
      legOffsets.forEach((lo) => {
        const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.26, 8), bronzeMat);
        tLeg.position.set(lo.x, 0.22, lo.z);
        craneGroup.add(tLeg);
      });

      // Đuôi rùa
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 8), bronzeMat);
      tail.position.set(0, 0.28, -0.92);
      tail.rotation.x = -1.2;
      craneGroup.add(tail);

      // 3. Tôn Tượng Bạch Hạc / Hạc Đồng Vươn Cao
      const cranePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.09, 14), goldCandleMat);
      cranePedestal.position.set(0, 0.52, 0);
      craneGroup.add(cranePedestal);

      // Đôi chân hạc mảnh mai, gân guốc uy nghi (cao 1.45m)
      [-0.08, 0.08].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 1.45, 8), bronzeMat);
        leg.position.set(lx, 1.25, 0);
        craneGroup.add(leg);

        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), bronzeMat);
        knee.position.set(lx, 1.45, 0);
        craneGroup.add(knee);
      });

      // Thân mình hạc hình thoi lông vũ xếp tầng
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), bronzeMat);
      body.scale.set(0.68, 0.72, 1.15);
      body.position.set(0, 2.08, -0.05);
      body.rotation.x = 0.22;
      craneGroup.add(body);

      // Cánh hạc khép dọc hai bên sườn
      [-0.24, 0.24].forEach((wx) => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.82), bronzeMat);
        wing.position.set(wx, 2.05, -0.15);
        wing.rotation.x = 0.3;
        craneGroup.add(wing);
      });

      // Cổ hạc uốn lượn hình chữ S thanh thoát vươn cao
      const neckLower = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.65, 10), bronzeMat);
      neckLower.position.set(0, 2.45, 0.22);
      neckLower.rotation.x = -0.32;
      craneGroup.add(neckLower);

      const neckUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.65, 10), bronzeMat);
      neckUpper.position.set(0, 2.85, 0.32);
      neckUpper.rotation.x = 0.28;
      craneGroup.add(neckUpper);

      // Đầu hạc & Mỏ ngậm hoa sen
      const craneHead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), bronzeMat);
      craneHead.scale.set(0.85, 0.95, 1.4);
      craneHead.position.set(0, 3.18, 0.38);
      craneGroup.add(craneHead);

      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.42, 8), bronzeMat);
      beak.position.set(0, 3.16, 0.62);
      beak.rotation.x = Math.PI / 2;
      craneGroup.add(beak);

      // Hoa sen thếp vàng ngậm trong miệng hạc thắp nến thiêng
      const lotusFlower = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.05, 0.16, 12), goldCandleMat);
      lotusFlower.position.set(0, 3.24, 0.82);
      craneGroup.add(lotusFlower);

      // Ngọn lửa nến nhỏ ấm áp
      const candleFlame = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe680 })
      );
      candleFlame.scale.set(0.7, 1.4, 0.7);
      candleFlame.position.set(0, 3.36, 0.82);
      craneGroup.add(candleFlame);

      parent.add(craneGroup);
    });
  }

  // ─────────────────────────────────────────────
  // ĐỒ TRANG HOÀNG CỬA ĐIỆN: ĐÔI LỤC BÌNH BÁT TRÀNG, CỬA VÕNG & TRÀNG PHAN
  // ─────────────────────────────────────────────
  private createMainHallEntranceDecorations(parent: THREE.Group) {
    const batTrangTex = this.createBatTrangPorcelainTexture();
    const porcelainMat = new THREE.MeshStandardMaterial({
      map: batTrangTex,
      roughness: 0.18,
      metalness: 0.08,
    });
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x3d1208,
      roughness: 0.45,
    });
    const goldCarveMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.28,
      metalness: 0.75,
    });

    // 1. ĐÔI LỤC BÌNH SỨ MEN LAM BÁT TRÀNG ĐẠI THỤ (Cao 2.3m uy nghiêm trước cửa chính điện)
    [-7.4, 7.4].forEach((vx) => {
      const vaseGroup = new THREE.Group();
      vaseGroup.position.set(vx, 0.65, -14.4);

      // Đôn gỗ gụ bát giác chạm hoa văn
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.66, 0.52, 8), standMat);
      stand.position.set(0, 0.26, 0);
      stand.receiveShadow = true;
      vaseGroup.add(stand);

      // Chân lục bình
      const baseVase = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.42, 0.42, 24), porcelainMat);
      baseVase.position.set(0, 0.73, 0);
      vaseGroup.add(baseVase);

      // Thân bụng lục bình nở căng đầy đặn (chứa đựng vượng khí, phúc đức)
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.68, 24, 16), porcelainMat);
      belly.scale.set(1.0, 1.35, 1.0);
      belly.position.set(0, 1.48, 0);
      belly.castShadow = true;
      vaseGroup.add(belly);

      // Cổ thon thanh nhã
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, 0.72, 24), porcelainMat);
      neck.position.set(0, 2.15, 0);
      vaseGroup.add(neck);

      // Miệng lục bình loe rộng đón tài lộc
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.28, 0.32, 24), porcelainMat);
      rim.position.set(0, 2.62, 0);
      vaseGroup.add(rim);

      // Lòng miệng bình tối màu
      const innerMouth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.05, 0.25, 20),
        new THREE.MeshBasicMaterial({ color: 0x111625 })
      );
      innerMouth.position.set(0, 2.68, 0);
      vaseGroup.add(innerMouth);

      parent.add(vaseGroup);
    });

    // 2. CỬA VÕNG THẾP VÀNG CHẠM LỘNG HOA SEN VÀ MÂY CUỘN (Spanning x: -6.5 to 6.5, y: 13.5 to 15.2m)
    const canopyGroup = new THREE.Group();
    canopyGroup.position.set(0, 14.5, -13.25);

    // Xà ngang cửa võng chính
    const mainBar = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.55, 0.32), goldCarveMat);
    canopyGroup.add(mainBar);

    // Vòm cong chạm lộng 2 bên
    [-4.5, 4.5].forEach((bx) => {
      const dropBracket = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.28), goldCarveMat);
      dropBracket.position.set(bx, -0.65, 0);
      canopyGroup.add(dropBracket);
    });

    // Bánh xe Pháp Luân hoặc Bông sen trung tâm cửa võng
    const centerLotus = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.12, 12, 24), goldCarveMat);
    centerLotus.position.set(0, -0.3, 0.05);
    canopyGroup.add(centerLotus);

    // Dải tua rua vàng óng buông rủ
    for (let tx = -5.0; tx <= 5.0; tx += 1.65) {
      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 0.75, 8), goldCarveMat);
      tassel.position.set(tx, -1.2, 0);
      canopyGroup.add(tassel);
    }
    parent.add(canopyGroup);

    // 3. TRÀNG PHAN NGŨ SẮC PHẬT GIÁO (SILK BUDDHIST BANNERS)
    // Treo dọc từ các xà gồ hai bên lối đi chính điện (x = ±6.5, z = -22.0 và z = -32.0)
    const bannerMat = new THREE.MeshStandardMaterial({
      color: 0xda9100,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    const bannerPoints = [
      { x: -6.5, z: -22.0 },
      { x: 6.5, z: -22.0 },
      { x: -6.5, z: -32.0 },
      { x: 6.5, z: -32.0 },
    ];
    bannerPoints.forEach((bp) => {
      const bannerGroup = new THREE.Group();
      bannerGroup.position.set(bp.x, 17.5, bp.z);

      // Bảo cái (chóp ô che tràng phan)
      const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.35, 14), goldCarveMat);
      bannerGroup.add(canopy);

      // Thân dải lụa dài buông xuống (dài 7.5m)
      const silkStreamer = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 7.5), bannerMat);
      silkStreamer.position.set(0, -4.0, 0);
      bannerGroup.add(silkStreamer);

      parent.add(bannerGroup);
    });
  }

  // ─────────────────────────────────────────────
  // VÙNG NÚI NON SƯƠNG MỜ NGOẠI CẢNH (SCENIC MISTY MOUNTAIN PERIMETER)
  // Đưa toàn bộ đồi núi non bộ ra thật xa ngoài biển xanh (R > 95m - 180m),
  // giải phóng hoàn toàn vùng đất nền xung quanh chùa để thông thoáng mở rộng chùa sau này!
  // ─────────────────────────────────────────────
  private createScenicMistyMountainPerimeter() {
    const mountainGroup = new THREE.Group();
    mountainGroup.name = "scenic_misty_mountain_perimeter";

    // 1. DÃY NÚI NON ĐIỆP TRÙNG NƠI ĐẢO XA (DISTANT HORIZON MOUNTAINS)
    // Toàn bộ đỉnh núi ngự trên biển xanh bao la ngoài xa (R > 175m - 280m),
    // giải phóng hoàn toàn vùng gạch nền và khuôn viên để mở rộng chùa sau này!
    const peakConfigs = [
      // Hậu cảnh xa phía Bắc (sau lưng chùa, ngự trên biển biếc z in [-180, -280])
      { x: 0, z: -195, r: 60, h: 105, col: 0x14281c },
      { x: -75, z: -190, r: 52, h: 95, col: 0x193023 },
      { x: 75, z: -190, r: 52, h: 95, col: 0x193023 },
      { x: -150, z: -210, r: 65, h: 110, col: 0x112117 },
      { x: 150, z: -210, r: 65, h: 110, col: 0x112117 },
      { x: -40, z: -245, r: 70, h: 125, col: 0x0f1d14 },
      { x: 40, z: -245, r: 70, h: 125, col: 0x0f1d14 },
      { x: -110, z: -255, r: 68, h: 115, col: 0x101f16 },
      { x: 110, z: -255, r: 68, h: 115, col: 0x101f16 },

      // Cánh Tả phía Tây (bên trái ngoài khơi xa x in [-180, -260])
      { x: -185, z: -80, r: 55, h: 88, col: 0x182e21 },
      { x: -205, z: -20, r: 60, h: 96, col: 0x13251a },
      { x: -190, z: 45, r: 52, h: 85, col: 0x172c20 },
      { x: -235, z: -50, r: 65, h: 108, col: 0x112017 },
      { x: -225, z: 25, r: 58, h: 98, col: 0x122218 },

      // Cánh Hữu phía Đông (bên phải ngoài khơi xa x in [180, 260])
      { x: 185, z: -80, r: 55, h: 88, col: 0x182e21 },
      { x: 205, z: -20, r: 60, h: 96, col: 0x13251a },
      { x: 190, z: 45, r: 52, h: 85, col: 0x172c20 },
      { x: 235, z: -50, r: 65, h: 108, col: 0x112017 },
      { x: 225, z: 25, r: 58, h: 98, col: 0x122218 },

      // Tiền cảnh xa phía Nam (ngoài xa cổng chùa z in [180, 260])
      { x: -95, z: 195, r: 54, h: 78, col: 0x1b3325 },
      { x: 95, z: 195, r: 54, h: 78, col: 0x1b3325 },
      { x: -175, z: 215, r: 62, h: 92, col: 0x14271c },
      { x: 175, z: 215, r: 62, h: 92, col: 0x14271c },
    ];

    peakConfigs.forEach((pk) => {
      const mMat = new THREE.MeshStandardMaterial({
        color: pk.col,
        roughness: 0.95,
        flatShading: true,
      });
      const peak = new THREE.Mesh(new THREE.ConeGeometry(pk.r, pk.h, 8, 3), mMat);
      peak.position.set(pk.x, pk.h * 0.5 - 2.0, pk.z);
      peak.receiveShadow = true;
      mountainGroup.add(peak);
    });

    // 2. DẢI SƯƠNG MÙ BẢNG LẢNG XA XĂM (DISTANT FLOATING HORIZON MIST)
    const mistTex = this.createMountainMistTexture();
    const mistMat = new THREE.MeshBasicMaterial({
      map: mistTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mistLayers = [
      // Sương xa sau lưng chính điện
      { x: 0, y: 18.0, z: -175, w: 220, h: 42, rotY: 0 },
      { x: -70, y: 22.0, z: -195, w: 230, h: 45, rotY: 0.1 },
      { x: 70, y: 21.5, z: -195, w: 230, h: 45, rotY: -0.1 },

      // Sương xa cánh tả (trái)
      { x: -170, y: 20.0, z: -20, w: 200, h: 40, rotY: Math.PI / 2 },

      // Sương xa cánh hữu (phải)
      { x: 170, y: 20.0, z: -20, w: 200, h: 40, rotY: -Math.PI / 2 },

      // Sương xa tiền cảnh
      { x: 0, y: 16.0, z: 175, w: 190, h: 36, rotY: 0 },
    ];

    mistLayers.forEach((ml) => {
      const mistPlane = new THREE.Mesh(new THREE.PlaneGeometry(ml.w, ml.h), mistMat);
      mistPlane.position.set(ml.x, ml.y, ml.z);
      mistPlane.rotation.y = ml.rotY;
      mountainGroup.add(mistPlane);
    });

    this.scene.add(mountainGroup);
  }

  // Texture sương mù mờ ảo tự nhiên
  private createMountainMistTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, 512, 256);

    // Dải sương gradient mờ dần về các mép
    const grad = ctx.createRadialGradient(256, 128, 20, 256, 128, 240);
    grad.addColorStop(0, "rgba(225, 240, 235, 0.75)");
    grad.addColorStop(0.4, "rgba(215, 232, 228, 0.45)");
    grad.addColorStop(0.7, "rgba(200, 220, 218, 0.18)");
    grad.addColorStop(1, "rgba(200, 220, 218, 0.0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }
}
