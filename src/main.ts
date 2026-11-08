/**
 * main.ts - Game CHÙA AN LẠC ONLINE 3D
 * - Camera 3D Orbit tự do 360 độ (kéo chuột / vuốt chạm để xoay góc nhìn, cuộn chuột để zoom)
 * - Nhân vật Chibi 3D thiết kế sắc nét: mắt anime to tròn lấp lánh, má hồng, áo tràng thướt tha
 * - Động tác: Đi bộ sải bước có nhún người, thở nhẹ, thiền kiết già có hào quang, chắp tay cúi lạy bái Phật
 * - Chu kỳ Ngày / Đêm & Ánh sáng thời gian thực (Bình minh, Ban ngày, Hoàng hôn, Đêm rằm ngàn sao & đom đóm)
 * - Khu Vườn An Lạc: Trồng sen, tưới nước, búp non lớn lên và nở hoa
 */

import * as THREE from "three";
import "./style.css";

import { TempleWorld } from "./world/TempleWorld";
import { Player } from "./world/Player";
import { Water } from "./world/Water";
import { LanternSystem } from "./world/Lanterns";
import { LeafParticles, IncenseSmoke } from "./world/Particles";
import { RemotePlayersManager } from "./world/RemotePlayers";
import { SpeechBubbleManager } from "./world/SpeechBubble";
import { DayNightSystem, detectInitialTimeOfDay } from "./world/DayNightSystem";
import { GardenSystem } from "./world/GardenSystem";
import { GateNPCSystem } from "./world/GateNPCSystem";
import { QuestZoneSystem } from "./world/QuestZoneSystem";
import { network } from "./services/network";
import { zenAudio } from "./utils/audio";
import { dailyActivities, getSavedMeritPoints, saveMeritPoints } from "./utils/dailyActivities";
import { GameUI } from "./ui/GameUI";
import { generateUniqueGuestName } from "./utils/nameGenerator";
import { authService } from "./services/authService";
import { templeQuestManager } from "./utils/templeQuestSystem";

class ChuaAnLacGame {
  // Three.js Core
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  // World Systems
  private world!: TempleWorld;
  private water!: Water;
  private lanterns!: LanternSystem;
  private leaves!: LeafParticles;
  private incenseSmoke!: IncenseSmoke;
  private altarSmoke!: IncenseSmoke;
  private dayNight!: DayNightSystem;
  private garden!: GardenSystem;
  private questZones!: QuestZoneSystem;

  // Characters
  private player!: Player;
  private remotePlayers!: RemotePlayersManager;
  private speechBubbles!: SpeechBubbleManager;
  private gateNPCs!: GateNPCSystem;

  // Orbit Camera 3D Controller
  private cameraYaw = 0;              // Góc xoay ngang quanh nhân vật (radian)
  private targetYaw = 0;
  private cameraPitch = 0.52;         // Góc nâng nghiêng (elevation, radian ~30 độ)
  private targetPitch = 0.52;
  private cameraDistance = 13.5;       // Khoảng cách camera đến nhân vật
  private targetDistance = 13.5;

  // Dragging & Mouse State
  private isPointerDown = false;
  private activeCameraPointerId: number | null = null;
  private isDragging = false;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private lastPointerY = 0;
  private pinchStartDist = 0;

  // Input Keys
  private keys = { w: false, a: false, s: false, d: false };
  private mobileMove = { up: false, down: false, left: false, right: false };
  private joystickVector = { x: 0, y: 0 };
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // UI & Seating
  private gameUI!: GameUI;
  private currentOccupiedSeat: string | null = null;

  constructor() {
    // 1. Renderer - Tối ưu hóa hiệu năng 60 FPS theo từng thiết bị (Mobile vs PC)
    const isMobileDevice =
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.innerWidth <= 960 && window.innerHeight <= 600);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isMobileDevice, // Trên mobile tắt MSAA nặng để GPU tăng 40% FPS
      powerPreference: "high-performance",
      precision: isMobileDevice ? "mediump" : "highp",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Trên mobile render tối đa 1.6 (thay vì 1.0) để đạt độ nét cao chuẩn Retina, không bị mờ nhòe chữ và mô hình
    this.renderer.setPixelRatio(isMobileDevice ? Math.min(window.devicePixelRatio, 1.6) : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    const container = document.getElementById("app")!;
    container.appendChild(this.renderer.domElement);

    // 2. Scene
    this.scene = new THREE.Scene();

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      250
    );

    // 4. Khởi tạo Thế giới Chùa 3D
    this.initWorld();

    // Tối ưu hóa hiệu năng cực đại: Đóng băng ma trận cho tất cả Mesh kiến trúc tĩnh
    this.freezeStaticObjects(this.scene);

    // 5. Khởi tạo Hệ thống Điều khiển Camera & Input
    this.setupOrbitCameraControls();
    this.setupKeyboardInput();

    // 6. Giao diện UI
    this.setupUI();

    // 6.1. Khởi tạo NPC Đón Tiếp & Tri Khách Trước Cổng Chùa An Lạc
    this.gateNPCs = new GateNPCSystem(this.scene, this.speechBubbles, this.gameUI);
    this.gateNPCs.setOnOrdainRequest(() => {
      this.gameUI.openOrdinationModal();
    });

    this.gateNPCs.setOnQuestRequest(() => {
      this.gameUI.openQuestModal();
    });

    // 7. Kết nối Mạng Realtime
    this.setupNetworking();

    // 8. Resize Handler
    window.addEventListener("resize", () => this.onResize());

    // 10. Game Loop
    this.animate();
  }

  // ─────────────────────────────────────────────
  // KHỞI TẠO CÁC ĐỐI TƯỢNG THẾ GIỚI
  // ─────────────────────────────────────────────
  private initWorld() {
    this.world = new TempleWorld(this.scene);
    this.world.build();

    // Chu kỳ Ngày / Đêm & Ánh sáng (Tự động đồng bộ theo giờ thực tế)
    this.dayNight = new DayNightSystem(this.scene);
    this.world.stoneLampLights.forEach((l) => this.dayNight.registerStoneLamp(l));

    const initialTime = detectInitialTimeOfDay();
    this.dayNight.setTime(initialTime);

    // Mặt nước hồ sen chân thật
    this.water = new Water(24.8, 10.8, 0, -0.16, 1.0);
    this.water.setTimeOfDay(initialTime);
    this.scene.add(this.water.group);

    // Hoa đăng
    this.lanterns = new LanternSystem(this.scene);
    this.lanterns.addLantern("lan_1", "Diệu Tâm", "Cầu chúc cha mẹ sống lâu trăm tuổi, thân tâm an lạc.", -5, 2, 8);
    this.lanterns.addLantern("lan_2", "Minh Trí", "Nguyện cho thế giới hòa bình, vạn sự hanh thông.", 6, 3, 15);

    // Lá bồ đề bay
    this.leaves = new LeafParticles(this.scene, 100, 50);

    // Khói trầm hương nghi ngút từ lư hương đỉnh đồng sân chùa & đại bát hương chính điện
    this.incenseSmoke = new IncenseSmoke(this.scene);
    this.altarSmoke = new IncenseSmoke(this.scene, new THREE.Vector3(0, 2.85, -42.45), 3.8, 32);

    // Khu Vườn An Lạc (Garden System)
    this.garden = new GardenSystem(this.scene);

    // Hệ Thống Khu Vực Nhiệm Vụ 3D & Chỉ Dẫn Người Chơi
    this.questZones = new QuestZoneSystem(this.scene);
    const initialQuest = templeQuestManager.getActiveQuest();
    this.questZones.updateActiveQuest(initialQuest, templeQuestManager.isWorkDone());

    // Nhân vật chính Chibi:
    let initialPlayerName: string;
    if (authService.isLoggedIn()) {
      let savedCustomName = (localStorage.getItem("chua_an_lac_player_name") || "").replace(/\s*#\d+$/, "").trim();
      let dharma = (authService.getDharmaName() || "").replace(/\s*#\d+$/, "").trim();
      let userName = (authService.getCurrentUser()?.name || "").replace(/\s*#\d+$/, "").trim();
      initialPlayerName =
        dharma ||
        (savedCustomName && savedCustomName !== "Đạo Hữu An Nhiên" ? savedCustomName : "") ||
        userName ||
        "Đạo Hữu";
      try {
        localStorage.setItem("chua_an_lac_player_name", initialPlayerName);
        if (dharma) localStorage.setItem("chua_an_lac_dharma_name", dharma);
      } catch {}
    } else {
      // Khách chưa đăng nhập: Mỗi lần vào lại web luôn tạo mới nhân vật và bắt đầu từ 0 điểm công đức
      initialPlayerName = generateUniqueGuestName();
      try {
        localStorage.setItem("chua_an_lac_player_name", initialPlayerName);
        localStorage.removeItem("chua_an_lac_is_monk");
        localStorage.removeItem("chua_an_lac_dharma_name");
      } catch {}
      saveMeritPoints(initialPlayerName, 0);
      dailyActivities.resetForNewCharacter();
      templeQuestManager.resetForNewCharacter();
    }

    this.player = new Player(0, 10, initialPlayerName, 0x5b7aa6);
    if (authService.isMonk() || initialPlayerName.startsWith("Thích ")) {
      const userRobe = authService.getCurrentUser()?.robeColor || 0xd97706;
      this.player.ordainAsMonk(initialPlayerName, userRobe);
    }
    this.player.setCollisionChecker((x, z) => this.world.isBlocked(x, z, 0.35));
    this.scene.add(this.player.group);

    this.remotePlayers = new RemotePlayersManager(this.scene);
    this.speechBubbles = new SpeechBubbleManager(this.scene);
  }

  /**
   * Tối ưu hóa hiệu năng 60 FPS: Đóng băng ma trận cho tất cả Mesh kiến trúc tĩnh
   * Triệt tiêu hoàn toàn CPU cost duyệt và tính toán lại ma trận cho hàng nghìn mesh mỗi frame!
   */
  private freezeStaticObjects(scene: THREE.Scene) {
    scene.traverse((obj) => {
      const name = obj.name || "";
      if (
        name.includes("player") ||
        name.includes("lantern") ||
        name.includes("smoke") ||
        name.includes("firefly") ||
        name.includes("leaf") ||
        name.includes("quest_zone") ||
        name.includes("water") ||
        name.includes("joystick") ||
        obj.userData?.isDynamic
      ) {
        return;
      }
      if (obj instanceof THREE.Mesh) {
        obj.matrixAutoUpdate = false;
        obj.updateMatrix();
      }
    });
  }

  // ─────────────────────────────────────────────
  // CAMERA ORBIT 360 ĐỘ TỰ DO
  // ─────────────────────────────────────────────
  private setupOrbitCameraControls() {
    const canvas = this.renderer.domElement;

    // Pointer Down (Mouse hoặc Touch)
    canvas.addEventListener("pointerdown", (e) => {
      if (this.activeCameraPointerId !== null) return;
      this.activeCameraPointerId = e.pointerId;
      this.isPointerDown = true;
      this.isDragging = false;
      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;
      this.lastPointerY = e.clientY;
    });

    // Pointer Move (Kéo chuột / Vuốt để xoay góc nhìn)
    window.addEventListener("pointermove", (e) => {
      if (!this.isPointerDown || e.pointerId !== this.activeCameraPointerId) return;

      const deltaY = e.clientY - this.lastPointerY;

      const totalMoved = Math.hypot(e.clientX - this.pointerStartX, e.clientY - this.pointerStartY);
      if (totalMoved > 6) {
        this.isDragging = true;
      }

      if (this.isDragging) {
        // Camera cố định tự động quay theo hướng đi của nhân vật; cho phép kéo nhẹ góc nâng (pitch)
        this.targetPitch = THREE.MathUtils.clamp(
          this.targetPitch + deltaY * 0.0035,
          0.20,
          0.85
        );
      }

      this.lastPointerY = e.clientY;
    });

    // Pointer Up
    window.addEventListener("pointerup", (e) => {
      if (!this.isPointerDown || e.pointerId !== this.activeCameraPointerId) return;
      this.isPointerDown = false;
      this.activeCameraPointerId = null;

      if (!this.isDragging) {
        this.handlePointerClick(e);
      }
    });

    window.addEventListener("pointercancel", (e) => {
      if (e.pointerId === this.activeCameraPointerId) {
        this.isPointerDown = false;
        this.activeCameraPointerId = null;
      }
    });

    // Cuộn chuột phóng to / thu nhỏ (Zoom)
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.targetDistance = THREE.MathUtils.clamp(
          this.targetDistance + e.deltaY * 0.015,
          5.0,
          30.0
        );
      },
      { passive: false }
    );

    // Xử lý cử chỉ 2 ngón tay Pinch Zoom trên Mobile
    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.pinchStartDist = Math.hypot(dx, dy);
      }
    });

    canvas.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          const diff = this.pinchStartDist - dist;
          this.targetDistance = THREE.MathUtils.clamp(
            this.targetDistance + diff * 0.05,
            5.0,
            30.0
          );
          this.pinchStartDist = dist;
        }
      },
      { passive: false }
    );
  }

  /**
   * Xử lý Click khi người dùng không kéo camera
   */
  private handlePointerClick(e: PointerEvent) {
    const target = e.target as HTMLElement;
    if (target !== this.renderer.domElement) return;

    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 1. Kiểm tra click vào Hoa Đăng
    const lanternMeshes = this.lanterns.getAllLanterns().map((l) => l.group);
    const lanternHits = this.raycaster.intersectObjects(lanternMeshes, true);
    if (lanternHits.length > 0) {
      let obj: THREE.Object3D | null = lanternHits[0].object;
      while (obj && obj.parent !== this.scene) {
        obj = obj.parent;
      }
      if (obj) {
        const entity = this.lanterns.getAllLanterns().find((l) => l.group === obj);
        if (entity) {
          this.gameUI.showInspectLanternModal(
            entity.id,
            entity.author,
            entity.wishText,
            entity.rejoices
          );
          return;
        }
      }
    }

    // 1.5. Kiểm tra click vào Chú Tiểu Đón Tiếp Trước Cổng Chùa (NPCs)
    if (this.gateNPCs && this.gateNPCs.interactableMeshes.length > 0) {
      const npcHits = this.raycaster.intersectObjects(this.gateNPCs.interactableMeshes, true);
      if (npcHits.length > 0) {
        if (this.gateNPCs.handleRaycastClick(npcHits[0].object)) {
          return;
        }
      }
    }

    // 2. Kiểm tra click vào ô đất Vườn Sen (Garden Plot)
    const plotMeshes = this.garden.plots.map((p) => p.soilMesh);
    const plotHits = this.raycaster.intersectObjects(plotMeshes);
    if (plotHits.length > 0) {
      const clickedPlot = this.garden.plots.find((p) => p.soilMesh === plotHits[0].object);
      if (clickedPlot) {
        if (clickedPlot.stage === "empty") {
          this.garden.plantSeed(clickedPlot.id);
          this.speechBubbles.show(this.player.group, "🌸 Đã gieo hạt sen lành vào đất!");
          const activeQuest = templeQuestManager.getActiveQuest();
          if (activeQuest && activeQuest.id === "plant_flower") {
            this.gameUI.completeQuest();
          }
        } else if (clickedPlot.stage === "sprout" || clickedPlot.stage === "bud") {
          this.garden.waterPlot(clickedPlot.id);
          this.speechBubbles.show(this.player.group, "💧 Tưới nước thanh tịnh cho hoa sen lớn!");
          const activeQuest = templeQuestManager.getActiveQuest();
          if (activeQuest && activeQuest.id === "water_garden") {
            this.gameUI.completeQuest();
          }
        } else if (clickedPlot.stage === "bloom") {
          this.garden.harvestPlot(clickedPlot.id);
          this.gameUI.incrementCamLo(25, "Thu hoạch sen hồng");
          this.speechBubbles.show(this.player.group, "🪷 Thu hoạch đóa sen hồng thơm ngát (+25 Điểm Công Đức)!");
        }
        return;
      }
    }

    // 2.5. Kiểm tra click vào Hòm Công Đức (Cúng Dường Tam Bảo)
    if (this.world.donationBoxMeshes && this.world.donationBoxMeshes.length > 0) {
      const boxHits = this.raycaster.intersectObjects(this.world.donationBoxMeshes, true);
      if (boxHits.length > 0) {
        this.gameUI.openDonationModal();
        return;
      }
    }

    // 3. Kiểm tra click vào Bồ Đoàn / Pháp Tòa trong Chính Điện
    if (this.player.action === "meditate" || this.gameUI.getIsMeditating()) {
      // Đang ngồi thiền mà click chạm màn hình -> Xả thiền, đứng dậy thoát khỏi chỗ ngồi
      this.player.setAction("idle");
      this.exitCushionSeat();
      this.gameUI.stopMeditation();
    } else if (this.world.cushionMeshes && this.world.cushionMeshes.length > 0) {
      const cushionHits = this.raycaster.intersectObjects(this.world.cushionMeshes, true);
      if (cushionHits.length > 0) {
        let obj: THREE.Object3D | null = cushionHits[0].object;
        while (obj && !obj.name.startsWith("cushion_") && !obj.name.startsWith("seat_") && obj.parent) {
          obj = obj.parent;
        }
        if (obj) {
          if (
            obj.name === "seat_abbot" ||
            obj.name.startsWith("seat_senior_monk_") ||
            obj.name.startsWith("cushion_")
          ) {
            let fbX: number | undefined;
            let fbZ: number | undefined;
            if (obj.name.startsWith("cushion_")) {
              const parts = obj.name.replace("cushion_", "").split("_");
              fbX = parseFloat(parts[0]);
              fbZ = parseFloat(parts[1]);
            }
            this.tryOccupySeat(obj.name, fbX, fbZ);
            return;
          }
        }
      }
    }

    // 4. Kiểm tra click vào Đại Hồng Chung (Lầu Chuông)
    if (this.world.grandBellMesh) {
      const bellHits = this.raycaster.intersectObject(this.world.grandBellMesh, true);
      if (bellHits.length > 0) {
        zenAudio.playGrandBell();
        if (dailyActivities.canRingGrandBell()) {
          dailyActivities.recordRingGrandBell();
          this.gameUI.incrementCamLo(10, "Thỉnh Đại Hồng Chung");
          this.speechBubbles.show(this.player.group, "🔔 Tiếng Chuông Đại Hồng ngân vang khắp cõi nhân gian! (+10 Điểm Công Đức)");
        } else {
          this.speechBubbles.show(this.player.group, "🔔 Tiếng Chuông Đại Hồng ngân vang khắp cõi! (Hôm nay bạn đã thỉnh chuông nhận công đức rồi 🙏)");
        }
        return;
      }
    }

    // 5. Kiểm tra click vào Lư Hương Đồng Sân Tiền Tế
    if (this.world.incenseDingMesh) {
      const dingHits = this.raycaster.intersectObject(this.world.incenseDingMesh, true);
      if (dingHits.length > 0) {
        this.player.stopMoving();
        this.player.facingAngle = Math.PI;
        this.player.group.rotation.y = Math.PI;
        this.player.setAction("pray");
        zenAudio.playLotusSound();
        if (dailyActivities.canOfferIncense()) {
          dailyActivities.recordOfferIncense();
          this.gameUI.incrementCamLo(10, "Dâng nén tâm hương");
          this.speechBubbles.show(this.player.group, "🪔 Dâng một nén tâm hương cầu nguyện an lành trước Tam Bảo! (+10 Điểm Công Đức)");
        } else {
          this.speechBubbles.show(this.player.group, "🪔 Lòng thành kính dâng hương trước Tam Bảo. (Hôm nay bạn đã dâng hương nhận công đức rồi 🙏)");
        }
        return;
      }
    }

    // 6. Kiểm tra click vào Tôn Tượng Phật hoặc Ban Thờ trong Chính Điện
    if (this.world.buddhaStatues && this.world.buddhaStatues.length > 0) {
      const statueHits = this.raycaster.intersectObjects(this.world.buddhaStatues, true);
      if (statueHits.length > 0) {
        this.player.stopMoving();
        this.player.facingAngle = Math.PI;
        this.player.group.rotation.y = Math.PI;
        this.player.setAction("pray");
        zenAudio.playSingingBowl(528);
        this.speechBubbles.show(this.player.group, "Nam Mô Tam Thế Phật từ bi gia hộ 🙏");
        return;
      }
    }

    // 7. Click-to-Move trên mặt đất & sàn Chính Điện & Cầu Gỗ
    const walkableMeshes: THREE.Object3D[] = [this.world.groundMesh];
    if (this.world.hallFloorMesh) walkableMeshes.push(this.world.hallFloorMesh);
    if (this.world.bridgeDeckMesh) walkableMeshes.push(this.world.bridgeDeckMesh);

    const groundHits = this.raycaster.intersectObjects(walkableMeshes);
    if (groundHits.length > 0) {
      const pt = groundHits[0].point;

      // Kiểm tra vị trí đích đến có bị chặn bởi tường, ban thờ hay hồ nước không
      if (!this.world.isBlocked(pt.x, pt.z, 0.35)) {
        if (this.player.action === "meditate" || this.gameUI.getIsMeditating()) {
          this.player.setAction("idle");
          this.exitCushionSeat();
          this.gameUI.stopMeditation();
        }
        this.player.moveTo(pt.x, pt.z);
      }
    }
  }

  // ─────────────────────────────────────────────
  // XỬ LÝ PHÍM BÀN PHÍM
  // ─────────────────────────────────────────────
  private setupKeyboardInput() {
    window.addEventListener("keydown", (e) => {
      // Khi người chơi đang nhập text trong input hoặc textarea, tuyệt đối không can thiệp phím gõ chữ
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName.toUpperCase() === "INPUT" ||
          target.tagName.toUpperCase() === "TEXTAREA" ||
          target.isContentEditable ||
          Boolean(target.closest("input, textarea")))
      ) {
        return;
      }

      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup") this.keys.w = true;
      if (k === "a" || k === "arrowleft") this.keys.a = true;
      if (k === "s" || k === "arrowdown") this.keys.s = true;
      if (k === "d" || k === "arrowright") this.keys.d = true;

      if (k === "c") {
        this.resetCameraBehindPlayer();
      }
    });

    window.addEventListener("keyup", (e) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName.toUpperCase() === "INPUT" ||
          target.tagName.toUpperCase() === "TEXTAREA" ||
          target.isContentEditable ||
          Boolean(target.closest("input, textarea")))
      ) {
        return;
      }

      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup") this.keys.w = false;
      if (k === "a" || k === "arrowleft") this.keys.a = false;
      if (k === "s" || k === "arrowdown") this.keys.s = false;
      if (k === "d" || k === "arrowright") this.keys.d = false;
    });
  }

  public resetCameraBehindPlayer() {
    this.targetYaw = this.player.facingAngle - Math.PI;
    this.cameraYaw = this.targetYaw;
    this.targetPitch = 0.52;
    this.targetDistance = 13.5;
  }

  // ─────────────────────────────────────────────
  // UI & NETWORKING
  // ─────────────────────────────────────────────
  private setupUI() {
    this.gameUI = new GameUI({
      onActionSelect: (action) => this.handleAction(action),
      onSendChat: (msg) => this.handleChat(msg),
      onReleaseLantern: (wish, type) => this.handleReleaseLantern(wish, type),
      onRejoiceLantern: (lanternId) => network.rejoiceLantern(lanternId),
      onMoveCommand: (dir, isPressed) => {
        this.mobileMove[dir] = isPressed;
      },
      onJoystickMove: (vector) => {
        this.joystickVector = vector;
      },
      onToggleDayNight: (newTime) => {
        this.dayNight.setTime(newTime);
        this.water.setTimeOfDay(newTime);
      },
      onTeleport: (location) => {
        if (location === "main_hall") {
          // Bước vào chính điện đại thụ: đứng trang nghiêm trên đại lộ trung tâm trước Tam Thế Phật
          this.player.teleportTo(0, -18.0, 0.65, Math.PI);
          this.player.setAction("pray");
          this.cameraYaw = 0;
          this.targetYaw = 0;
          this.targetDistance = 11.0;
          this.targetPitch = 0.35;
          zenAudio.playSingingBowl(528);
          this.speechBubbles.show(this.player.group, "A Di Đà Phật! Chiêm bái Tam Thế Phật trong Đại Hùng Bảo Điện 🙏");
        } else if (location === "courtyard") {
          this.player.teleportTo(0, 10, 0, Math.PI);
          this.cameraYaw = 0;
          this.targetYaw = 0;
          this.targetDistance = 13.5;
        } else if (location === "gate") {
          // Đến trước Cổng Tam Quan, hướng nhìn vào chùa
          this.player.teleportTo(0, 28.5, 0, Math.PI);
          this.cameraYaw = 0;
          this.targetYaw = 0;
          this.targetDistance = 12.0;
          this.targetPitch = 0.32;
          zenAudio.playSingingBowl(528);
          this.speechBubbles.show(this.player.group, "A Di Đà Phật! Quang lâm Cổng Tam Quan Chùa An Lạc 🙏");
        } else if (location === "pond") {
          this.player.teleportTo(0, 1, 0.22, Math.PI);
          this.cameraYaw = 0;
          this.targetYaw = 0;
          this.targetDistance = 11;
        } else if (location === "garden") {
          // Đến trước lối vào Vườn An Lạc & Chú Tiểu Tịnh Tâm (gần Cổng Tam Quan, trước Hồ Sen)
          this.player.teleportTo(4.8, 15.5, 0, Math.PI / 2);
          this.cameraYaw = -Math.PI / 2;
          this.targetYaw = -Math.PI / 2;
          this.targetDistance = 9.0;
          this.targetPitch = 0.28;
          zenAudio.playSingingBowl(528);
          this.speechBubbles.show(this.player.group, "A Di Đà Phật! Quang lâm Vườn An Lạc & Chú Tiểu Tịnh Tâm 🙏");
        } else if (location === "bell") {
          // Đến trước bậc thềm Lầu Chuông Đại Hồng Chung & Chú Tiểu Trí Tuệ
          this.player.teleportTo(-10, -6.5, 0, Math.PI);
          this.cameraYaw = 0;
          this.targetYaw = 0;
          this.targetDistance = 9.5;
          this.targetPitch = 0.28;
          zenAudio.playSingingBowl(528);
          this.speechBubbles.show(this.player.group, "A Di Đà Phật! Chiêm bái Lầu Chuông Đại Hồng Chung 🙏");
        }
      },
      onTeleportToCoords: (x, z, y = 0, locationName) => {
        this.player.teleportTo(x, z, y, Math.PI);
        this.cameraYaw = 0;
        this.targetYaw = 0;
        this.targetDistance = 9.5;
        this.targetPitch = 0.28;
        zenAudio.playSingingBowl(528);
        if (locationName) {
          this.speechBubbles.show(this.player.group, `Đã đến ${locationName} chấp tác công quả! 🙏`);
        }
      },
      getPlayerPosition: () => ({ x: this.player.worldX, z: this.player.worldZ }),
      onChangeGender: (gender) => {
        this.player.setGender(gender);
        this.gameUI.setPlayerInfo(this.player.name, gender);
        const title = gender === "female" ? "Tín Nữ" : "Thiện Nam";
        this.speechBubbles.show(this.player.group, `A Di Đà Phật! Đã chọn hóa thân ${title} trang nghiêm 🙏`);
        network.sendAction("gender:" + gender);
      },
      onChangePlayerName: (newName: string) => {
        this.player.createNameTag(newName);
        // Bảo lưu trọn vẹn danh hiệu Trụ Trì & Cao Tăng hiện tại của nhân vật
        network.sendRename(newName);
        this.speechBubbles.show(this.player.group, `A Di Đà Phật! Đạo hữu vừa đổi pháp danh: ${newName} 🙏`, 4000);
      },
      onChangeRobeColor: (color) => {
        this.player.setRobeColor(color);
        this.speechBubbles.show(this.player.group, "Đã khoác lên mình tấm y phục mới! ✨");
      },
      onOrdainPlayer: (dharmaName: string, robeColor: number) => {
        this.player.ordainAsMonk(dharmaName, robeColor);
        network.sendOrdain(dharmaName, robeColor);
        zenAudio.playSingingBowl(528);
        this.speechBubbles.show(
          this.player.group,
          `🪷 A Di Đà Phật! Đạo hữu đã xả tục xuất gia, pháp danh: ${dharmaName}! Đầu cạo thanh tịnh, đắp y Cà Sa tôn nghiêm! 🙏`,
          6000,
        );
        this.gameUI.appendChatMessage(
          "Chùa",
          `🎉 Cung thỉnh Thầy [${dharmaName}] chính thức gia nhập Tăng Đoàn! Đoạn trừ phiền não, đắp y giải thoát, đủ duyên thăng tòa Trụ Trì và Chư Tôn Cao Tăng! 🙏`,
        );
      },
      onAltarAction: (action) => {
        if (action === "bow") {
          this.player.stopMoving();
          // QUAY MẶT HƯỚNG VỀ BÀN THỜ PHẬT (Math.PI)
          this.player.facingAngle = Math.PI;
          this.player.group.rotation.y = Math.PI;
          this.player.setAction("pray");
          zenAudio.playSingingBowl(528);
          this.speechBubbles.show(this.player.group, "Cung kính đảnh lễ Tam Thế Phật từ bi gia hộ 🙏");
        } else if (action === "incense") {
          this.player.stopMoving();
          // QUAY MẶT HƯỚNG VỀ BÀN THỜ PHẬT (Math.PI)
          this.player.facingAngle = Math.PI;
          this.player.group.rotation.y = Math.PI;
          this.player.setAction("pray");
          zenAudio.playLotusSound();
          if (dailyActivities.canOfferIncense()) {
            dailyActivities.recordOfferIncense();
            this.gameUI.incrementCamLo(10, "Dâng tâm hương cúng Phật");
            this.speechBubbles.show(this.player.group, "🪔 Dâng một nén tâm hương cúng dường Tam Bảo! (+10 Điểm Công Đức)");
          } else {
            this.speechBubbles.show(this.player.group, "🪔 Lòng thành kính dâng hương cúng dường Tam Bảo. (Hôm nay bạn đã dâng hương nhận công đức rồi 🙏)");
          }
        } else if (action === "cushion") {
          // Nếu đang ngồi thiền -> Xả thiền và đứng dậy
          if (this.player.action === "meditate" || this.gameUI.getIsMeditating()) {
            this.player.setAction("idle");
            this.exitCushionSeat();
            this.gameUI.stopMeditation();
            return;
          }
          // TÌM PHÁP TÒA HOẶC BỒ ĐOÀN ĐƯỢC PHÉP NGỒI GẦN NHẤT MÀ CHƯA CÓ NGƯỜI NGỒI
          const allowedSeats = this.getPermittedCushions();
          const myId = network.getSocketId();
          const availableSeats = allowedSeats.filter((pos) => {
            const occ = network.getSeatOccupant(pos.name || "");
            return !occ || occ.socketId === myId;
          });

          if (availableSeats.length === 0) {
            zenAudio.playSingingBowl(396);
            this.speechBubbles.show(
              this.player.group,
              "⚠️ Toàn bộ bồ đoàn trong Chính Điện hiện đều đã có đạo hữu tĩnh tọa! Đạo hữu hoan hỷ chờ giây lát. 🙏",
              4500
            );
            this.gameUI.appendChatMessage(
              "Chùa",
              "⚠️ Toàn bộ chỗ ngồi trong Đại Hùng Bảo Điện hiện đều đã có đạo hữu tĩnh tọa. Xin chờ có chỗ trống."
            );
            return;
          }

          let nearest = availableSeats[0];
          let minDist = Infinity;
          for (const pos of availableSeats) {
            const d = Math.hypot(this.player.worldX - pos.x, this.player.worldZ - pos.z);
            if (d < minDist) {
              minDist = d;
              nearest = pos;
            }
          }

          this.tryOccupySeat(nearest.name || "cushion", nearest.x, nearest.z, nearest.y);
        } else if (action === "bell") {
          this.player.setAction("bell");
          zenAudio.playTempleBell();
          if (dailyActivities.canRingGrandBell()) {
            dailyActivities.recordRingGrandBell();
            this.gameUI.incrementCamLo(10, "Thỉnh chuông gia trì");
            this.speechBubbles.show(this.player.group, "🔔 Tiếng chuông gia trì ngân vang khắp cõi! (+10 Điểm Công Đức)");
          } else {
            this.speechBubbles.show(this.player.group, "🔔 Tiếng chuông thanh tịnh xua tan muộn phiền. (Hôm nay bạn đã thỉnh chuông nhận công đức rồi 🙏)");
          }
          setTimeout(() => { if (this.player.action === "bell") this.player.setAction("idle"); }, 3500);
        } else if (action === "fish") {
          this.player.setAction("wooden_fish");
          this.gameUI.openChantingModal();
        } else if (action === "flower") {
          this.player.stopMoving();
          this.player.facingAngle = Math.PI;
          this.player.group.rotation.y = Math.PI;
          this.player.setAction("pray");
          zenAudio.playLotusSound();
          if (dailyActivities.canOfferFlowers()) {
            dailyActivities.recordOfferFlowers();
            this.gameUI.incrementCamLo(15, "Dâng hoa cúng Phật");
            this.speechBubbles.show(this.player.group, "🪷 Thành tâm dâng đóa sen thơm thanh tịnh cúng dường Tam Bảo! (+15 Điểm Công Đức)");
            this.gameUI.appendChatMessage("Chùa", "🪷 Đạo hữu vừa thành kính dâng hoa sen thơm cúng dường Tam Thế Phật (+15 Điểm Công Đức).");
          } else {
            this.speechBubbles.show(this.player.group, "🌸 Đóa sen thanh tịnh cúng dường Tam Bảo. (Hôm nay bạn đã dâng hoa nhận công đức rồi 🙏)");
          }
        } else if (action === "oracle") {
          this.gameUI.openOracleModal();
        }
      },
      onToggleGraphicsQuality: (mode: "balanced" | "ultra" | "fast") => {
        if (mode === "fast") {
          this.renderer.setPixelRatio(1.0);
          this.renderer.shadowMap.enabled = false;
        } else if (mode === "ultra") {
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
          this.renderer.shadowMap.enabled = true;
          this.renderer.shadowMap.type = THREE.PCFShadowMap;
        } else {
          // balanced
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
          this.renderer.shadowMap.enabled = true;
          this.renderer.shadowMap.type = THREE.PCFShadowMap;
        }
      },
      onRequireHall: (action: "meditate" | "pray") => {
        if (action === "meditate") {
          this.speechBubbles.show(
            this.player.group,
            "🧘 Đạo hữu hãy vào trong Đại Hùng Bảo Điện để tọa thiền trang nghiêm nhé! 🙏",
          );
          this.gameUI.appendChatMessage(
            "Chùa",
            "🧘 Nghi thức Tọa Thiền chỉ thực hiện được bên trong Đại Hùng Bảo Điện (bạn có thể bấm nút 'Vào Chính Điện' trên thanh trên cùng).",
          );
        } else {
          this.speechBubbles.show(
            this.player.group,
            "🙏 Đạo hữu hãy vào trong Đại Hùng Bảo Điện trước Tam Thế Phật để chiêm bái và đảnh lễ nhé!",
          );
          this.gameUI.appendChatMessage(
            "Chùa",
            "🙏 Nghi thức Lễ Phật chỉ thực hiện được trước Tam Thế Phật bên trong Đại Hùng Bảo Điện.",
          );
        }
      },
      onRequirePond: () => {
        this.speechBubbles.show(
          this.player.group,
          "🌸 Đạo hữu hãy đến Cầu Hồ Sen hoặc ven bờ hồ nước để thả hoa đăng nhé! 🪷",
        );
        this.gameUI.appendChatMessage(
          "Chùa",
          "🌸 Nghi thức Thả Hoa Đăng chỉ thực hiện được tại Cầu Hồ Sen hoặc ven bờ hồ nước (bạn có thể bấm nút 'Cầu Hồ Sen' trên thanh trên cùng).",
        );
      },
      onChantVerse: (verseText, chantName) => {
        this.player.setAction("wooden_fish");
        this.speechBubbles.show(
          this.player.group,
          `📿 [${chantName}] ${verseText}`,
          4500,
        );
        network.sendAction("wooden_fish");
      },
      onStartChanting: () => {
        // Tìm bồ đoàn hoặc pháp tòa được phép ngồi gần nhất trong Chính Điện để ngồi thiền tụng kinh
        const allowedSeats = this.getPermittedCushions();
        let nearest = allowedSeats[0] || { x: 0, y: 0.74, z: -18.0, type: "lay" as const };
        let minDist = Infinity;
        for (const pos of allowedSeats) {
          const d = Math.hypot(this.player.worldX - pos.x, this.player.worldZ - pos.z);
          if (d < minDist) {
            minDist = d;
            nearest = pos;
          }
        }
        const facing = nearest.type === "abbot" ? 0 : Math.PI;
        // Di chuyển nhân vật ngồi đúng vị trí trên bồ đoàn trang nghiêm
        this.player.teleportTo(nearest.x, nearest.z, nearest.y, facing);
        this.player.setAction("wooden_fish");
        network.sendAction("wooden_fish");

        // Điều chỉnh camera vừa vặn: nhìn thấy nhân vật đang ngồi, thấy Tam Thế Phật và thấy những đạo hữu xung quanh
        this.targetDistance = 7.5;
        this.targetPitch = 0.28;
        this.targetYaw = (facing === 0) ? Math.PI : 0;
      },
      onStopChanting: () => {
        this.player.targetY = 0;
        this.player.setAction("idle");
        network.sendAction("idle");
      },
      onStartQuestWork: (quest, durationSeconds) => {
        if (quest.id === "sweep_temple") {
          this.player.setAction("sweep");
          network.sendAction("sweep");
        } else if (quest.id === "clean_altar" || quest.id === "tidy_cushions") {
          this.player.setAction("pray");
          network.sendAction("pray");
        } else if (quest.id === "polish_bell") {
          this.player.setAction("bell");
          network.sendAction("bell");
        } else {
          this.player.setAction("pray");
          network.sendAction("pray");
        }
        this.speechBubbles.show(
          this.player.group,
          `Đang ${quest.actionLabel.toLowerCase()} (${durationSeconds}s)... 🧹✨`,
          durationSeconds * 1000
        );
      },
      onStopQuestWork: () => {
        this.player.setAction("idle");
        network.sendAction("idle");
      },
      onQuestStateChange: () => {
        const curQ = templeQuestManager.getActiveQuest();
        this.questZones.updateActiveQuest(curQ, templeQuestManager.isWorkDone());
      },
    });

    this.gameUI.setPlayerInfo(this.player.name, this.player.gender);
    const initTime = detectInitialTimeOfDay();
    this.gameUI.setTimeBadge(initTime === "night" ? "night" : "day");
  }

  private handleAction(action: string) {
    if (this.player.action === "meditate" && action !== "meditate") {
      this.player.setAction("idle");
      this.exitCushionSeat();
      this.gameUI.stopMeditation();
      return;
    }

    if (action === "idle") {
      this.player.stopMoving();
      this.player.setAction("idle");
    } else if (action === "meditate") {
      // Nếu đang ngồi thiền rồi mà gọi meditate -> Xả thiền và đứng dậy
      if (this.player.action === "meditate" || this.gameUI.getIsMeditating()) {
        this.player.setAction("idle");
        this.exitCushionSeat();
        this.gameUI.stopMeditation();
        return;
      }
      const inHall = this.player.worldZ <= -13.0 && this.player.worldZ >= -48.5 && Math.abs(this.player.worldX) <= 19.5;
      if (!inHall) {
        this.speechBubbles.show(
          this.player.group,
          "🧘 Đạo hữu hãy vào trong Đại Hùng Bảo Điện để tọa thiền trang nghiêm nhé! 🙏",
        );
        this.gameUI.appendChatMessage(
          "Chùa",
          "🧘 Nghi thức Tọa Thiền chỉ thực hiện được bên trong Đại Hùng Bảo Điện.",
        );
        return;
      }
      // Tìm bồ đoàn hoặc pháp tòa được phép ngồi gần nhất trong Chính Điện MÀ CHƯA CÓ NGƯỜI NGỒI
      const allowedSeats = this.getPermittedCushions();
      const myId = network.getSocketId();
      const availableSeats = allowedSeats.filter((pos) => {
        const occ = network.getSeatOccupant(pos.name || "");
        return !occ || occ.socketId === myId;
      });

      if (availableSeats.length === 0) {
        zenAudio.playSingingBowl(396);
        this.speechBubbles.show(
          this.player.group,
          "⚠️ Toàn bộ bồ đoàn trong Chính Điện hiện đều đã có đạo hữu tĩnh tọa! Đạo hữu hoan hỷ chờ giây lát. 🙏",
          4500
        );
        this.gameUI.appendChatMessage(
          "Chùa",
          "⚠️ Toàn bộ chỗ ngồi trong Đại Hùng Bảo Điện hiện đều đã có đạo hữu tĩnh tọa. Xin chờ có chỗ trống."
        );
        return;
      }

      let nearest = availableSeats[0];
      let minDist = Infinity;
      for (const pos of availableSeats) {
        const d = Math.hypot(this.player.worldX - pos.x, this.player.worldZ - pos.z);
        if (d < minDist) {
          minDist = d;
          nearest = pos;
        }
      }

      this.tryOccupySeat(nearest.name || "cushion", nearest.x, nearest.z, nearest.y);
    } else if (action === "pray") {
      const inHall = this.player.worldZ <= -13.0 && this.player.worldZ >= -48.5 && Math.abs(this.player.worldX) <= 19.5;
      if (!inHall) {
        this.speechBubbles.show(
          this.player.group,
          "🙏 Đạo hữu hãy vào trong Đại Hùng Bảo Điện trước Tam Thế Phật để chiêm bái và đảnh lễ nhé!",
        );
        this.gameUI.appendChatMessage(
          "Chùa",
          "🙏 Nghi thức Lễ Phật chỉ thực hiện được trước Tam Thế Phật bên trong Đại Hùng Bảo Điện.",
        );
        return;
      }
      this.player.stopMoving();
      this.player.facingAngle = Math.PI; // Hướng mặt về phía Tam Thế Phật!
      this.player.group.rotation.y = Math.PI;
      this.player.setAction("pray");
      this.speechBubbles.show(this.player.group, "Nam Mô Tam Thế Phật từ bi gia hộ 🙏");
      zenAudio.playSingingBowl(528);
    } else if (action === "bell") {
      this.player.setAction("bell");
      zenAudio.playTempleBell();
      if (dailyActivities.canRingGrandBell()) {
        dailyActivities.recordRingGrandBell();
        this.gameUI.incrementCamLo(10, "Thỉnh Đại Hồng Chung");
        this.speechBubbles.show(this.player.group, "🔔 Tiếng Chuông Đại Hồng ngân vang khắp cõi nhân gian! (+10 Điểm Công Đức)");
      } else {
        this.speechBubbles.show(this.player.group, "🔔 Tiếng chuông thanh tịnh ngân vang... (Hôm nay bạn đã thỉnh chuông nhận công đức rồi 🙏)");
      }
      setTimeout(() => {
        if (this.player.action === "bell") this.player.setAction("idle");
      }, 3500);
    } else if (action === "chanting" || action === "wooden_fish") {
      this.player.setAction("wooden_fish");
      this.gameUI.openChantingModal();
    } else if (action === "wave") {
      this.player.setAction("wave");
      this.speechBubbles.show(this.player.group, "Xin chào đạo hữu! 👋");
      setTimeout(() => {
        if (this.player.action === "wave") this.player.setAction("idle");
      }, 2500);
    }

    network.sendAction(action);
  }

  private handleChat(msg: string) {
    network.sendChat(msg);
    this.speechBubbles.show(this.player.group, msg);
  }

  private handleReleaseLantern(wishText: string, _type: string) {
    const isNearPond = Math.abs(this.player.worldX) <= 15.5 && this.player.worldZ >= -6.5 && this.player.worldZ <= 8.5;
    if (!isNearPond) {
      this.speechBubbles.show(
        this.player.group,
        "🌸 Đạo hữu hãy đến Cầu Hồ Sen hoặc ven bờ hồ nước để thả hoa đăng nhé! 🪷",
      );
      this.gameUI.appendChatMessage(
        "Chùa",
        "🌸 Nghi thức Thả Hoa Đăng chỉ có thể thực hiện tại Cầu Hồ Sen hoặc ven bờ hồ nước.",
      );
      return;
    }
    const gx = -8 + Math.random() * 16;
    const gz = -2 + Math.random() * 6;
    const id = "lan_" + Date.now();
    network.releaseLantern(wishText, _type, gx, gz);
    this.lanterns.addLantern(id, "Bạn", wishText, gx, gz, 1);
    this.speechBubbles.show(this.player.group, "🌸 Đóa hoa đăng thanh tịnh nhẹ trôi trên dòng nước biếc... 🙏");
  }

  private setupNetworking() {
    const avatarType = this.player.gender === "female" ? "chibi_female" : "chibi_gray";
    const initialCamLo = authService.isLoggedIn() ? getSavedMeritPoints(this.player.name) : 0;
    network.joinWorld(
      this.player.name,
      avatarType,
      this.player.worldX,
      this.player.worldZ,
      this.player.isMonk || this.player.name.startsWith("Thích "),
      authService.isLoggedIn(),
      initialCamLo
    );

    network.onPlayerJoined((remote) => {
      this.remotePlayers.addPlayer(remote.id, remote.name, remote.avatar, remote.gx, remote.gy);
      this.gameUI.appendChatMessage("Chùa", `🌸 Đạo hữu ${remote.name} vừa bước vào cửa chùa.`);
    });

    network.onPlayerMoved((data) => {
      this.remotePlayers.setTarget(data.id, data.gx, data.gy, data.action);
    });

    network.onPlayerAction((data) => {
      if (data.action && data.action.startsWith("gender:")) {
        const g = data.action.replace("gender:", "") as "male" | "female";
        this.remotePlayers.setPlayerGender(data.id, g);
      } else {
        this.remotePlayers.setAction(data.id, data.action);
      }
    });

    network.onPlayerLeft((id) => {
      this.remotePlayers.removePlayer(id);
    });

    network.onPlayerRenamed((data) => {
      this.remotePlayers.setPlayerName(data.id, data.name);
      this.gameUI.appendChatMessage(
        "Chùa",
        `🌸 Đạo hữu ${data.oldName || "Đồng tu"} vừa đổi pháp danh là: ${data.name}`,
      );
    });

    network.onPlayerNameAdjusted((data) => {
      this.player.createNameTag(data.name);
      this.gameUI.setPlayerInfo(data.name, this.player.gender);
      try {
        localStorage.setItem("chua_an_lac_player_name", data.name);
        if (data.name.startsWith("Thích ")) {
          localStorage.setItem("chua_an_lac_dharma_name", data.name);
        }
      } catch {}
      this.gameUI.appendChatMessage(
        "Hệ Thống",
        `ℹ️ Tên của đạo hữu đã được đồng bộ: [${data.name}]! 🙏`,
      );
    });

    network.onPlayerRenameFailed((data) => {
      alert(`❌ Đổi tên không thành công: ${data.reason}`);
    });

    network.onRoomPlayerCount((data) => {
      this.gameUI.updateRoomPlayerCount(data.current, data.max);
    });

    network.onRoomFull((data) => {
      this.gameUI.showRoomFullModal(data.message, data.max);
    });

    network.onPlayerOrdained((data) => {
      this.remotePlayers.setPlayerMonk(data.id, data.name, data.robeColor);
      this.gameUI.appendChatMessage(
        "Chùa",
        `🪷 Toàn thể đại chúng hoan hỷ chúc mừng Thầy [${data.name}] vừa xuất gia thụ giới trang nghiêm! 🙏`,
      );
    });

    network.onChatBubble((data) => {
      if (data.id === network.playerId) {
        // Local speech bubble already shown
      } else {
        const p = this.remotePlayers.getPlayer(data.id);
        if (p) {
          this.speechBubbles.show(p.group, data.text);
          this.gameUI.appendChatMessage(p.name, data.text);
        }
      }
    });

    network.onLanternSpawned((lantern) => {
      this.lanterns.addLantern(
        lantern.id,
        lantern.author,
        lantern.wishText,
        lantern.gx,
        lantern.gy,
        lantern.rejoices
      );
    });

    network.onLanternRejoiced((data) => {
      const l = this.lanterns.getLantern(data.id);
      if (l) l.rejoices = data.count;
    });

    network.onLeaderboardUpdate((payload) => {
      this.gameUI.updateLeaderboardData(payload);

      const isMonk = this.player.isMonk || this.player.name.startsWith("Thích ");
      const monkList = payload.monasticLeaderboard || [];
      const monkIdx = monkList.findIndex((e) => e.name === this.player.name);
      const monkRank = monkIdx !== -1 ? monkIdx + 1 : 999;

      const isAppointedAbbot = Boolean(payload.currentAbbot && payload.currentAbbot.name === this.player.name);
      const isTopMonkToday = monkRank === 1 && monkList[0].camLoToday > 0;
      const isLocalPlayerAbbot = isMonk && (isAppointedAbbot || isTopMonkToday || this.player.isAbbot);

      this.player.setIsAbbot(isLocalPlayerAbbot);

      let effectiveSeniorRank = 0;
      if (isMonk && !isLocalPlayerAbbot) {
        if (monkRank >= 2 && monkRank <= 13) {
          effectiveSeniorRank = monkRank;
        } else {
          const seniorFromList = payload.seniorMonks?.find((m) => m.name === this.player.name);
          if (seniorFromList) {
            effectiveSeniorRank = seniorFromList.rank;
          }
        }
      }

      this.player.setSeniorRank(effectiveSeniorRank);

      // Bản đồ thứ hạng Cao Tăng cho người chơi từ xa
      const seniorMap = new Map<string, number>();
      if (payload.seniorMonks) {
        payload.seniorMonks.forEach((m) => seniorMap.set(m.name, m.rank));
      }
      monkList.forEach((entry, idx) => {
        const rank = idx + 1;
        if (rank >= 2 && rank <= 13 && !seniorMap.has(entry.name)) {
          seniorMap.set(entry.name, rank);
        }
      });
      const abbotDisplayName = payload.currentAbbot?.name || (monkList[0]?.camLoToday > 0 ? monkList[0].name : "");
      this.remotePlayers.setLeaderboardRanks(abbotDisplayName, seniorMap);
    });

    // Ban đầu gửi yêu cầu dữ liệu bảng xếp hạng
    network.requestLeaderboard();

    // Hook thông báo cập nhật phiên bản máy chủ mới (Zero-downtime client notification)
    const CLIENT_VERSION = "1.0.0";
    network.setOnUpdateAvailable((data) => {
      this.gameUI.showUpdateBanner(data.version, data.message);
    });

    const checkServerVersion = async () => {
      try {
        const res = await fetch("/api/version");
        if (res.ok) {
          const data = await res.json();
          if (data && data.version && data.version !== CLIENT_VERSION) {
            this.gameUI.showUpdateBanner(data.version);
          }
        }
      } catch {
        // Bỏ qua nếu network offline
      }
    };
    setTimeout(checkServerVersion, 45000);
    setInterval(checkServerVersion, 180000);
  }

  /**
   * Phân quyền chỗ ngồi trong Đại Hùng Bảo Điện:
   * - Trụ Trì: Ngự Đại Pháp Tòa tối cao (bục cao nhất) và toàn bộ các chỗ khác.
   * - 12 Vị Cao Tăng: Ngự 2 bục Pháp Tòa bên cạnh (hoặc bồ đoàn dưới). Không được ngồi bục Trụ Trì.
   * - Còn lại (Tăng Chúng thông thường, Cư sĩ Phật tử): Chỉ được ngồi các bồ đoàn phía dưới.
   */
  private getPermittedCushions() {
    const isMonk = this.player.isMonk || this.player.name.startsWith("Thích ");
    const isAbbot = isMonk && (this.player.isAbbot || network.latestLeaderboard?.currentAbbot?.name === this.player.name);
    const isSenior = isMonk && (isAbbot || (this.player.seniorRank >= 2 && this.player.seniorRank <= 13));

    if (isAbbot) {
      return this.world.cushionPositions;
    }
    if (isSenior) {
      return this.world.cushionPositions.filter((c) => c.type !== "abbot");
    }
    return this.world.cushionPositions.filter((c) => c.type === "lay");
  }

  /**
   * Thử đăng tọa / ngồi vào một vị trí (Pháp Tòa hoặc Bồ Đoàn)
   * Kiểm tra quyền hạn + Đảm bảo chỗ ngồi duy nhất (mỗi người 1 chỗ, ai ngồi rồi người khác không được ngồi)
   */
  private async tryOccupySeat(seatName: string, fallbackX?: number, fallbackZ?: number, fallbackY?: number) {
    const isMonk = this.player.isMonk || this.player.name.startsWith("Thích ");
    const isAbbot = isMonk && (this.player.isAbbot || network.latestLeaderboard?.currentAbbot?.name === this.player.name);
    const isSenior = isMonk && (isAbbot || (this.player.seniorRank >= 2 && this.player.seniorRank <= 13));

    // 1. Kiểm tra phân quyền Trụ Trì / Cao Tăng
    if (seatName === "seat_abbot" && !isAbbot) {
      zenAudio.playSingingBowl(396);
      this.speechBubbles.show(
        this.player.group,
        "👑 [GIỚI LUẬT] Chỉ Đức Hòa Thượng Trụ Trì mới được ngự tọa trên Đại Pháp Tòa tối cao này! Đạo hữu vui lòng chọn bồ đoàn phía dưới. 🙏",
        5000
      );
      this.gameUI.appendChatMessage(
        "Chùa",
        "👑 Nghiêm cấm vượt quyền hạn: Đại Pháp Tòa tối cao chỉ dành riêng cho Đức Hòa Thượng Trụ Trì."
      );
      return false;
    }

    if (seatName.startsWith("seat_senior_monk_") && !isSenior) {
      zenAudio.playSingingBowl(396);
      this.speechBubbles.show(
        this.player.group,
        "🪷 [GIỚI LUẬT] Chỉ Chư Tôn Đức trong 12 Vị Cao Tăng mới được ngự tọa tại Pháp Tòa này! Đạo hữu vui lòng chọn bồ đoàn phía dưới. 🙏",
        5000
      );
      this.gameUI.appendChatMessage(
        "Chùa",
        "🪷 Nghiêm cấm vượt quyền hạn: Hai bục Pháp Tòa bên cạnh chỉ dành cho 12 Vị Cao Tăng đã xuất gia."
      );
      return false;
    }

    // 2. KIỂM TRA CHỖ ĐÃ CÓ NGƯỜI NGỒI CHƯA (Mỗi người 1 chỗ ngồi duy nhất)
    const occupant = network.getSeatOccupant(seatName);
    const myId = network.getSocketId();
    if (occupant && occupant.socketId !== myId) {
      zenAudio.playSingingBowl(396);
      this.speechBubbles.show(
        this.player.group,
        `⚠️ Chỗ ngồi này đã có đạo hữu [${occupant.playerName}] đang tĩnh tọa! Đạo hữu vui lòng chọn chỗ khác. 🙏`,
        4500
      );
      this.gameUI.appendChatMessage(
        "Chùa",
        `⚠️ [Chính Điện] Chỗ ngồi này đã có đạo hữu [${occupant.playerName}] đang tĩnh tọa. Xin chọn chỗ khác.`
      );
      return false;
    }

    // 3. Gửi yêu cầu giữ chỗ lên server
    const claimRes = await network.claimSeat(seatName);
    if (!claimRes.success) {
      zenAudio.playSingingBowl(396);
      this.speechBubbles.show(
        this.player.group,
        `⚠️ ${claimRes.message || "Chỗ ngồi này đã có người ngồi trước!"} 🙏`,
        4500
      );
      return false;
    }

    // 4. Tìm tọa độ và teleport ngồi thiền
    const seat = this.world.cushionPositions.find((p) => p.name === seatName);
    const targetX = seat ? seat.x : (fallbackX ?? 0);
    const targetZ = seat ? seat.z : (fallbackZ ?? -18.0);
    const targetY = seat ? seat.y : (fallbackY ?? 0.74);
    const facing = seatName === "seat_abbot" ? 0 : Math.PI;

    this.currentOccupiedSeat = seatName;
    this.player.teleportTo(targetX, targetZ, targetY, facing);
    this.player.setAction("meditate");
    this.gameUI.startMeditation();
    zenAudio.playSingingBowl(528);

    if (seatName === "seat_abbot") {
      this.speechBubbles.show(this.player.group, "👑 Đương Kim Hòa Thượng Trụ Trì quang lâm Đại Pháp Tòa - Phổ độ chúng sanh! 🙏");
    } else if (seatName.startsWith("seat_senior_monk_")) {
      const rank = seat?.seniorRank || 2;
      if (this.player.seniorRank === rank) {
        this.speechBubbles.show(this.player.group, `🪷 Bạn đang ngự đúng Pháp Tòa Cao Tăng #${rank} của mình - Trí tuệ viên minh! 🙏`);
      } else if (this.player.seniorRank >= 2 && this.player.seniorRank <= 13) {
        this.speechBubbles.show(this.player.group, `🧘 Đệ ${this.player.seniorRank - 1} Cao Tăng tọa thiền cùng Chư Tôn Đức Pháp Tòa #${rank}! 🙏`);
      } else if (this.player.isAbbot) {
        this.speechBubbles.show(this.player.group, `👑 Hòa Thượng Trụ Trì quang lâm thăm hỏi Chư Tôn Đức Cao Tăng! 🙏`);
      } else {
        this.speechBubbles.show(this.player.group, `🪷 Tọa thiền trang nghiêm tại Pháp Tòa Cao Tăng #${rank}! 🙏`);
      }
    } else {
      this.speechBubbles.show(this.player.group, "🧘 Tọa thiền an nhiên trên bồ đoàn trước Tam Thế Phật...");
      const activeQuest = templeQuestManager.getActiveQuest();
      if (activeQuest && activeQuest.id === "tidy_cushions") {
        this.gameUI.completeQuest();
      }
    }

    return true;
  }

  /**
   * Rời khỏi chỗ ngồi bồ đoàn hoặc pháp tòa an toàn, đứng dậy trả lại chỗ ngồi trên server
   */
  private exitCushionSeat() {
    const prevSeat = this.currentOccupiedSeat;
    this.currentOccupiedSeat = null;
    network.leaveSeat();

    const groundH = this.player.getGroundHeight(this.player.worldX, this.player.worldZ);
    this.player.worldY = groundH;
    this.player.targetY = groundH;

    // Đưa nhân vật bước xuống sàn an toàn, tránh bị kẹt góc bệ hoặc bàn kinh
    if (prevSeat === "seat_abbot") {
      this.player.worldX = 0;
      this.player.worldZ = -30.5;
      this.player.worldY = 0.65;
      this.player.targetY = 0.65;
      this.player.facingAngle = Math.PI;
    } else if (prevSeat && prevSeat.startsWith("seat_senior_monk_")) {
      const isLeft = prevSeat.includes("left");
      this.player.worldX = isLeft ? -9.5 : 9.5;
      this.player.worldZ = -29.8;
      this.player.worldY = 0.65;
      this.player.targetY = 0.65;
      this.player.facingAngle = Math.PI;
    } else if (prevSeat) {
      // Bồ đoàn thường: bước lùi nhẹ 0.35m để thoát hẳn ra ngoài bồ đoàn
      this.player.worldZ = Math.min(-14.5, this.player.worldZ + 0.35);
      this.player.worldY = 0.65;
      this.player.targetY = 0.65;
    }

    this.player.setAction("idle");
    this.player.stopMoving();
    this.speechBubbles.show(this.player.group, "A Di Đà Phật! Đã xả thiền thanh tịnh 🙏", 2500);
  }

  // ─────────────────────────────────────────────
  // GAME LOOP CHÍNH & TỐI ƯU HIỆU NĂNG 60 FPS
  // ─────────────────────────────────────────────
  private frameCount = 0;
  private lastFpsUpdate = performance.now();

  private animate = () => {
    requestAnimationFrame(this.animate);

    // Tính toán FPS thực tế
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      const currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.gameUI.updateFps(currentFps);
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    // 1. Di chuyển nhân vật tương đối theo góc nhìn Camera
    this.handleCameraRelativeMovement(dt);

    // 2. Cập nhật nhân vật chính (chạy animations khớp xương)
    this.player.update(dt);

    // 3. Cập nhật vị trí & góc nhìn Camera Orbit
    this.updateOrbitCamera();

    // 4. Cập nhật chu kỳ Ngày/Đêm & Đom đóm
    this.dayNight.update(dt, elapsed);

    // 5. Cập nhật mặt nước gợn sóng
    this.water.update(elapsed);

    // 6. Cập nhật hoa đăng nhấp nhô
    this.lanterns.update(elapsed);

    // 7. Cập nhật lá bồ đề bay
    this.leaves.update(dt);

    // 8. Cập nhật khói trầm hương nghi ngút (sân tiền tế & đại hùng bảo điện)
    this.incenseSmoke.update(dt, elapsed);
    this.altarSmoke.update(dt, elapsed);

    // 9. Cập nhật HUD & Phân vùng Chính Điện / Hồ Sen
    const inHall = this.player.worldZ <= -13.0 && this.player.worldZ >= -48.5 && Math.abs(this.player.worldX) <= 19.5;
    this.gameUI.setInsideMainHall(inHall);

    const isNearPond = Math.abs(this.player.worldX) <= 15.5 && this.player.worldZ >= -6.5 && this.player.worldZ <= 8.5;
    this.gameUI.setNearPond(isNearPond);

    // Nếu người chơi đang thiền mà di chuyển ra ngoài Chính Điện thì tự động xả thiền
    if (!inHall && (this.gameUI.getIsMeditating() || this.player.action === "meditate")) {
      this.player.setAction("idle");
      this.exitCushionSeat();
      this.gameUI.stopMeditation();
      this.speechBubbles.show(this.player.group, "Đã rời Chính Điện, xả thiền an nhiên... 🙏");
    }

    // 10. Cập nhật người chơi khác (nội suy & animation)
    this.remotePlayers.update(dt);

    // 10.5. Cập nhật NPC Đón Tiếp & Tri Khách Trước Cổng Chùa (Animation, nhịp thở & bái chào)
    if (this.gateNPCs) {
      this.gateNPCs.update(dt, elapsed, this.player.group.position);
    }

    // 10.8. Cập nhật Khu Vực Thực Hiện Nhiệm Vụ 3D & Prompt Nhận Việc
    if (this.questZones) {
      const zoneCheck = this.questZones.update(
        dt,
        elapsed,
        this.player.worldX,
        this.player.worldZ
      );
      this.gameUI.updateQuestZonePrompt(
        zoneCheck.inZone,
        zoneCheck.distance,
        zoneCheck.quest,
        zoneCheck.isWorkDone
      );
    }

    // 11. Cập nhật bong bóng thoại
    this.speechBubbles.update();

    // 12. Đồng bộ mạng
    this.syncNetwork();

    // 13. Render khung hình
    this.renderer.render(this.scene, this.camera);
  };

  private handleCameraRelativeMovement(dt: number) {
    // Khi đang chấp tác 10 giây (quét sân, lau dọn), tạm thời khóa di chuyển để hoàn tất cử chỉ
    if (this.gameUI && this.gameUI.getIsWorkingOnQuest()) {
      return;
    }

    let inputForward = 0;
    let inputRight = 0;

    if (this.keys.w || this.mobileMove.up) inputForward += 1;
    if (this.keys.s || this.mobileMove.down) inputForward -= 1;
    if (this.keys.d || this.mobileMove.right) inputRight += 1;
    if (this.keys.a || this.mobileMove.left) inputRight -= 1;

    // Cần gạt cảm ứng ảo phong cách Liên Quân Mobile (360 độ analog mượt mà)
    const joyDist = Math.hypot(this.joystickVector.x, this.joystickVector.y);
    if (joyDist > 0.08) {
      inputForward = this.joystickVector.y;
      inputRight = this.joystickVector.x;
    }

    if (inputForward === 0 && inputRight === 0) {
      if (this.player.action === "walk" && !this.player.isNavigatingToTarget) {
        this.player.stopMoving();
      }
      return;
    }

    if (this.player.action === "meditate" || this.gameUI.getIsMeditating()) {
      this.player.setAction("idle");
      this.exitCushionSeat();
      this.gameUI.stopMeditation();
    }

    const forwardX = -Math.sin(this.cameraYaw);
    const forwardZ = -Math.cos(this.cameraYaw);
    const rightX = Math.cos(this.cameraYaw);
    const rightZ = -Math.sin(this.cameraYaw);

    const moveVector = new THREE.Vector3(
      forwardX * inputForward + rightX * inputRight,
      0,
      forwardZ * inputForward + rightZ * inputRight
    ).normalize();

    // Di chuyển nhân vật kèm cơ chế trượt vách tường thông minh
    this.player.moveByDirectionVector(moveVector, dt);
  }

  private updateOrbitCamera() {
    // Camera cố định tự động quay mượt mà theo hướng đi / hướng nhìn của nhân vật
    this.targetYaw = this.player.facingAngle - Math.PI;

    // Tính khoảng cách góc ngắn nhất theo cung tròn (tránh xoay vòng 360 độ khi qua mốc PI)
    let angleDiff = (this.targetYaw - this.cameraYaw) % (Math.PI * 2);
    if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    // Tốc độ bám theo êm ái, chậm rãi, đồng bộ với hướng quay của nhân vật (không chóng mặt)
    const followSpeed = this.player.isMoving ? 0.042 : 0.025;
    this.cameraYaw += angleDiff * followSpeed;

    this.cameraPitch = THREE.MathUtils.lerp(this.cameraPitch, this.targetPitch, 0.05);
    this.cameraDistance = THREE.MathUtils.lerp(this.cameraDistance, this.targetDistance, 0.05);

    const playerPos = this.player.getPosition();
    const lookTarget = new THREE.Vector3(playerPos.x, playerPos.y + 1.15, playerPos.z);

    const horizontalDist = this.cameraDistance * Math.cos(this.cameraPitch);
    const verticalDist = this.cameraDistance * Math.sin(this.cameraPitch);

    const camX = lookTarget.x + Math.sin(this.cameraYaw) * horizontalDist;
    const camY = lookTarget.y + verticalDist;
    const camZ = lookTarget.z + Math.cos(this.cameraYaw) * horizontalDist;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(lookTarget);
  }

  private lastNetworkSync = 0;
  private syncNetwork() {
    const now = performance.now();
    if (now - this.lastNetworkSync < 60) return;
    this.lastNetworkSync = now;

    network.sendMove(
      this.player.worldX,
      this.player.worldZ,
      this.player.action,
      this.player.direction
    );
  }

  private onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    const isMobileDevice =
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (w <= 960 && h <= 600) ||
      (w <= 600 && h <= 960);
    this.renderer.setPixelRatio(isMobileDevice ? Math.min(window.devicePixelRatio, 1.6) : Math.min(window.devicePixelRatio, 1.5));
  }
}

// Khởi chạy ứng dụng
window.addEventListener("DOMContentLoaded", () => {
  new ChuaAnLacGame();
});
