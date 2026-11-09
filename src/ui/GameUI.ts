/**
 * GameUI - Lớp giao diện HTML5/CSS3 tương tác người dùng
 * Responsive cho cả Desktop và Mobile/Tablet
 */

import { zenAudio } from "../utils/audio";
import { zenBackgroundMusic } from "../utils/zenBackgroundMusic";
import {
  ORACLE_CATEGORIES,
  getOracleStickByCategory,
  type OracleCategory,
  type OracleStick,
} from "../utils/oracleSystem";
import {
  dailyActivities,
  getSavedMeritPoints,
  saveMeritPoints,
} from "../utils/dailyActivities";
import {
  network,
  type LeaderboardPayload,
  getClientSessionToken,
} from "../services/network";
import {
  CHANT_DATABASE,
  chantingVoiceEngine,
} from "../utils/chantingSystem";
import { authService, type UserAccount } from "../services/authService";
import { isNameTakenInGame } from "../utils/nameGenerator";
import {
  templeQuestManager,
  MAX_DAILY_QUESTS,
  QUEST_REWARD_POINTS,
  type TempleQuest,
} from "../utils/templeQuestSystem";
import {
  SUTRA_DATABASE,
  type Sutra,
  type SutraChapter,
  sutraAudio,
} from "../utils/sutraLibrary";

export interface UIEventCallbacks {
  onActionSelect: (action: string) => void;
  onSendChat: (message: string) => void;
  onReleaseLantern: (wishText: string, type: string) => void;
  onRejoiceLantern: (lanternId: string) => void;
  onMoveCommand: (
    dir: "up" | "down" | "left" | "right",
    isPressed: boolean,
  ) => void;
  onToggleDayNight?: (newTime: "day" | "night") => void;
  onPlantSeed?: () => void;
  onWaterGarden?: () => void;
  onHarvestGarden?: () => void;
  onTeleport?: (
    location: "main_hall" | "courtyard" | "gate" | "pond" | "garden" | "bell" | "tang_kinh_cac",
  ) => void;
  onTeleportToCoords?: (x: number, z: number, y?: number, locationName?: string) => void;
  getPlayerPosition?: () => { x: number; z: number };
  onChangeGender?: (gender: "male" | "female") => void;
  onChangeRobeColor?: (color: number) => void;
  onAltarAction?: (
    action:
      | "bow"
      | "incense"
      | "cushion"
      | "bell"
      | "fish"
      | "flower"
      | "oracle",
  ) => void;
  onToggleGraphicsQuality?: (mode: "balanced" | "ultra" | "fast") => void;
  onRequireHall?: (action: "meditate" | "pray") => void;
  onRequirePond?: () => void;
  onChantVerse?: (verseText: string, chantName: string) => void;
  onStartChanting?: () => void;
  onStopChanting?: () => void;
  onChangePlayerName?: (newName: string) => void;
  onOrdainPlayer?: (dharmaName: string, robeColor: number) => void;
  onStartQuestWork?: (quest: TempleQuest, durationSeconds: number) => void;
  onStopQuestWork?: () => void;
  onQuestStateChange?: () => void;
  onJoystickMove?: (vector: { x: number; y: number }, distance: number) => void;
}

export interface DonationPackageClient {
  id: string;
  amount: number;
  meritPoints: number;
  title: string;
  badge: string;
  desc: string;
  pointsTag: string;
  highlight?: boolean;
}

export const DONATION_PACKAGES_CLIENT: DonationPackageClient[] = [
  {
    id: "pkg_10k",
    amount: 10000,
    meritPoints: 100,
    title: "Gói Tâm Hương",
    badge: "🌸 Khởi Tâm Lành",
    desc: "Thành tâm gieo hạt giống lành nơi Tam Bảo",
    pointsTag: "+100 Điểm Công Đức",
    highlight: false,
  },
  {
    id: "pkg_20k",
    amount: 20000,
    meritPoints: 250,
    title: "Gói Thanh Tịnh",
    badge: "🪷 Hương Sen",
    desc: "Tâm sen thanh tịnh không vướng trần ai",
    pointsTag: "+250 Điểm Công Đức",
    highlight: false,
  },
  {
    id: "pkg_50k",
    amount: 50000,
    meritPoints: 700,
    title: "Gói Bồ Đề",
    badge: "🌿 Bồ Đề Tâm",
    desc: "Trí tuệ quang minh, dũng mãnh tinh tấn",
    pointsTag: "+700 Điểm Công Đức",
    highlight: true,
  },
  {
    id: "pkg_100k",
    amount: 100000,
    meritPoints: 1600,
    title: "Gói Tịnh Tâm",
    badge: "🕯️ Đăng Hoa Chiếu",
    desc: "Ngọn đèn chánh niệm xua tan vô minh",
    pointsTag: "+1.600 Điểm Công Đức",
    highlight: false,
  },
  {
    id: "pkg_200k",
    amount: 200000,
    meritPoints: 3600,
    title: "Gói Đại Từ Bi",
    badge: "✨ Từ Bi Hỷ Xả",
    desc: "Rộng mở lòng từ bi hỷ xả chở che",
    pointsTag: "+3.600 Điểm Công Đức",
    highlight: false,
  },
  {
    id: "pkg_500k",
    amount: 500000,
    meritPoints: 10000,
    title: "Gói Vạn Duyên Tịnh Lạc",
    badge: "👑 Phúc Báo Vô Biên",
    desc: "Đại thí chủ hộ trì Tam Bảo thường trụ",
    pointsTag: "+10.000 Điểm Công Đức",
    highlight: true,
  },
];

export class GameUI {
  private container: HTMLDivElement;
  private callbacks: UIEventCallbacks;
  public isInsideHall: boolean = false;
  public isNearPond: boolean = false;
  private isMeditating: boolean = false;
  private meditateTimer: number = 0;
  private meditateInterval: number | null = null;
  private isMuted: boolean = false;
  private selectedOracleCategory: OracleCategory = "love";

  // Tàng Kinh Các (Scripture Library & Audio) State
  private selectedSutra: Sutra | null = null;
  private currentSutraCategory: string = "all";
  private sutraFontSize: number = 18;
  private isSutraParchmentTheme: boolean = true;
  public isNearTangKinhCac: boolean = false;
  private currentReaderChapterIdx: number = 0;
  private currentOracleStick: OracleStick | null = null;
  private isShakingOracle: boolean = false;
  public playerName: string = authService.isLoggedIn()
    ? (authService.getDharmaName() || (localStorage.getItem("chua_an_lac_player_name") || "").replace(/\s*#\d+$/, "").trim() || authService.getCurrentUser()?.name || "Đạo Hữu")
    : "Đạo Hữu An Nhiên";
  public playerGender: "male" | "female" = "male";
  public latestLeaderboard?: LeaderboardPayload;
  public activeLeaderboardTab: "monk" | "lay" | "donor" = "monk";
  public currentTimeMode: "day" | "night" = "night";
  private countdownTimerInterval?: number;
  private secondsUntilMidnight: number = 0;

  // Trạng thái Tụng Kinh & Trì Chú
  private currentChantIndex: number = 0;
  private currentVerseIndex: number = 0;
  private chantLoopCount: number = 0;
  private isAutoChanting: boolean = false;
  private isChantVoiceEnabled: boolean = true;
  private chantSpeedMode: "slow" | "normal" | "fast" = "normal";
  private autoChantTimer?: number;

  // Trạng thái Khung Đàm Luận (Chat Box)
  private isChatCollapsed: boolean = false;

  // Trạng thái Xuất Gia & Y Cà Sa
  private selectedRobeColor: number = 0xd97706;

  // Trạng thái Làm Việc Công Quả 10s
  private isWorkingOnQuest: boolean = false;
  private currentNearQuest: TempleQuest | null = null;
  private questWorkInterval?: number;

  // Trạng thái Hòm Công Đức & Cúng Dường Tam Bảo (VietQR)
  private selectedDonationPackageId: string = "pkg_10k";
  private activeDonationOrder: any = null;
  private donationPollTimer: any = null;

  constructor(callbacks: UIEventCallbacks) {
    this.callbacks = callbacks;
    this.container = document.createElement("div");
    this.container.id = "game-ui-overlay";
    document.body.appendChild(this.container);
    this.render();
    this.initMeritPoints();
  }

  private initMeritPoints() {
    if (!authService.isLoggedIn()) {
      // Khách chưa đăng nhập: Luôn bắt đầu từ 0 điểm công đức
      saveMeritPoints(this.playerName, 0);
      this.setMeritPoints(0);
      return;
    }
    const saved = getSavedMeritPoints(this.playerName);
    this.setMeritPoints(saved);
  }

  private render() {
    this.container.innerHTML = `
      <!-- TOP STATUS & TELEPORT NAVIGATION BAR -->
      <header class="top-nav-bar" id="top-nav-bar">
        <div class="top-nav">
          <div class="brand-wrap">
            <div class="brand">
              <span class="temple-icon">🛕</span>
              <div class="brand-text">
                <h1 class="temple-title"><span class="title-chua">CHÙA </span>AN LẠC <span class="title-online">ONLINE</span></h1>
                <span class="temple-subtitle">Digital Zen Sanctuary</span>
              </div>
            </div>

            <!-- NÚT MỞ / ĐÓNG MENU DANH MỤC -->
            <div class="teleport-menu-wrapper" id="teleport-menu-wrapper">
              <button type="button" class="teleport-menu-trigger clickable-badge" id="btn-teleport-menu-toggle" title="Mở Danh Mục Địa Điểm & Tiện Ích">
                <span class="menu-icon">🧭</span>
                <b class="menu-label-text"><span class="menu-text-long">Danh Mục</span><span class="menu-text-short">Menu</span></b>
                <span class="menu-arrow" id="teleport-menu-arrow">▾</span>
              </button>

              <div class="teleport-dropdown-panel hidden" id="teleport-dropdown-panel">
                <div class="teleport-dropdown-header">
                  <div class="teleport-dropdown-title">
                    <span>🧭</span>
                    <b>DANH MỤC TIỆN ÍCH & ĐỊA ĐIỂM</b>
                  </div>
                  <button type="button" class="teleport-panel-close" id="btn-close-teleport-menu" title="Đóng menu">✕</button>
                </div>
                <div class="teleport-grid">
                  <button class="nav-btn" data-teleport="main_hall" title="Đến ngay trước bàn thờ Tam Thế Phật">🏛️ Vào Chính Điện</button>
                  <button class="nav-btn" data-teleport="courtyard" title="Ra sân chùa Tam Quan">⛩️ Ra Sân Chùa</button>
                  <button class="nav-btn" data-teleport="gate" title="Đến Cổng Tam Quan và gặp Chú Tiểu đón tiếp">🚪 Cổng Chùa</button>
                  <button class="nav-btn" data-teleport="pond" title="Ra cầu gỗ hồ sen">🪷 Cầu Hồ Sen</button>
                  <button class="nav-btn" data-teleport="garden" title="Đến khu vườn hoa">🌿 Vườn An Lạc</button>
                  <button class="nav-btn" data-teleport="bell" title="Đến Lầu Chuông Đại Hồng Chung & Chú Tiểu Trí Tuệ">🔔 Lầu Chuông</button>
                  <button class="nav-btn highlight-gold" data-teleport="tang_kinh_cac" title="Đến Tòa Tàng Kinh Các - Đọc & Nghe Kinh Điển Phật Giáo">📚 Tàng Kinh Các</button>
                  <button class="nav-btn" id="btn-wardrobe" title="Chọn nhân vật Nam / Nữ và Y phục Phật tử">👤 Nhân Vật</button>
                  <button class="nav-btn highlight-gold" id="btn-leaderboard" title="Bảng Xếp Hạng Công Đức & Vị Trí Trụ Trì">🏆 Bảng Xếp Hạng</button>
                  <button class="nav-btn highlight-gold" id="btn-menu-donation" title="Cúng Dường Hòm Công Đức Tam Bảo - Mua Điểm Công Đức">🪷 Hòm Công Đức</button>
                  <button class="nav-btn highlight-green" id="btn-open-quests" title="Nhiệm Vụ Chấp Tác Công Quả - Chú Tiểu Tịnh Tâm">🌿 Nhiệm Vụ Công Quả</button>
                </div>
              </div>
            </div>
          </div>

          <div class="user-stats">
            <!-- SỐ NGƯỜI ĐANG CÙNG CHIÊM BÁI ONLINE -->
            <div class="stat-badge room-badge clickable-badge" id="btn-room-count-badge" title="Số lượng đạo hữu đang cùng chiêm bái, tu học tại Chùa An Lạc Online">
              <span class="room-icon">👥</span> <b id="room-player-count">1</b> <span class="room-label-tag">Đạo Hữu</span>
            </div>

            <!-- NÚT ĐĂNG NHẬP GOOGLE & HỒ SƠ -->
            <button class="stat-badge auth-badge clickable-badge" id="btn-user-auth" title="Đăng Nhập Tài Khoản Google">
              <span id="auth-btn-icon">🔑</span> <b id="auth-btn-text">Đăng Nhập</b>
            </button>

            <!-- ĐIỂM CÔNG ĐỨC -->
            <div class="stat-badge clickable-badge" id="btn-camlo-badge" title="Điểm Công Đức - Nhấp xem Bảng Xếp Hạng & Vị Trí Trụ Trì">
              <span>🪷</span> <b id="camlo-counter">0</b> <span class="camlo-label-tag">Công Đức</span>
            </div>
            <div class="stat-badge fps-badge" id="fps-badge" title="Tốc độ khung hình (FPS) - Nhấp để đổi Chế độ Đồ họa">
              <span>⚡</span> <b id="fps-counter">60</b> <span class="fps-mode-tag" id="fps-mode-label">FPS</span>
            </div>
            <button id="btn-audio-toggle" class="icon-btn" title="Bật/Tắt Toàn Bộ Âm Thanh">
              🔊
            </button>

            <!-- NHẠC NỀN THIỀN ĐỊNH MP3 CHÍNH THỨC -->
            <div class="music-player-wrap" id="music-player-wrap">
              <button id="btn-music-toggle" class="icon-btn music-toggle-btn active" title="Bật/Tắt Nhạc Thiền Tịnh Tâm (MP3)">
                <span class="music-icon-pulse">🎵</span>
              </button>
              <button id="btn-music-menu" class="music-menu-btn" title="Điều chỉnh âm lượng nhạc thiền">
                ▾
              </button>
              <div id="music-quick-panel" class="music-quick-panel hidden">
                <div class="music-panel-header">
                  <span class="music-panel-title">🌸 Nhạc Thiền An Nhiên Tự Tại</span>
                  <span class="music-badge-hz">MP3</span>
                </div>
                <div class="music-track-card" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(0,0,0,0.3); border-radius: 8px; margin-top: 6px;">
                  <span style="font-size: 18px;">🪷</span>
                  <div style="display: flex; flex-direction: column; text-align: left;">
                    <b style="font-size: 12px; color: #fde68a;">Bản Nhạc Thiền Chính</b>
                    <span style="font-size: 10px; color: #cbd5e1;">Tĩnh Tâm - An Nhiên Tự Tại</span>
                  </div>
                </div>
                <div class="music-volume-row" style="margin-top: 8px;">
                  <span class="vol-icon">🔉</span>
                  <input type="range" id="music-volume-slider" min="0" max="100" value="38" class="music-vol-slider" title="Âm lượng nhạc thiền" />
                  <span class="vol-percent" id="music-vol-percent">38%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- 🌸 BANNER THÔNG BÁO BẢN CẬP NHẬT MỚI (ZERO-DOWNTIME UPDATE) -->
      <div id="game-update-banner" class="game-update-banner hidden">
        <span>🌸</span>
        <span id="update-banner-text">Đã có bản cập nhật mới! Nhấn để làm mới trang.</span>
        <button type="button" id="btn-update-reload" class="update-reload-btn">Tải Lại Ngay</button>
        <button type="button" id="btn-update-dismiss" class="update-dismiss-btn" title="Đóng">✕</button>
      </div>

      <!-- FLOATING QUEST TRACKER HUD (THEO DÕI NHIỆM VỤ CÔNG QUẢ) -->
      <div id="floating-quest-tracker" class="floating-quest-tracker" title="Nhấp để mở Bảng Nhiệm Vụ Chấp Tác Công Quả">
        <div class="fqt-icon">📜</div>
        <div class="fqt-content">
          <div class="fqt-title-row">
            <span class="fqt-label">Công Quả:</span>
            <span class="fqt-progress" id="fqt-progress">0/10</span>
          </div>
          <div class="fqt-name" id="fqt-quest-name">Gặp Chú Tiểu Tịnh Tâm tại Vườn An Lạc</div>
        </div>
        <button type="button" class="fqt-action-btn" id="fqt-open-btn" title="Mở bảng nhiệm vụ">Nhiệm Vụ</button>
      </div>

      <!-- FLOATING ACTION PROMPT (XUẤT HIỆN KHI ĐẾN KHU VỰC THỰC HIỆN NHIỆM VỤ) -->
      <div id="quest-action-prompt" class="quest-action-prompt hidden">
        <div class="qap-bubble">
          <div class="qap-icon" id="qap-icon">🧹</div>
          <div class="qap-info">
            <div class="qap-title" id="qap-title">Quét Sân Chùa</div>
            <div class="qap-sub" id="qap-sub">Nhấn phím [F] hoặc bấm nút bên dưới</div>
          </div>
          <button type="button" class="qap-btn" id="btn-qap-start">
            <span class="qap-btn-icon">⚡</span>
            <span class="qap-btn-text" id="qap-btn-text">Thực Hiện (10s)</span>
          </button>
        </div>
      </div>

      <!-- FLOATING TÀNG KINH CÁC PROMPT (XUẤT HIỆN KHI ĐẾN GẦN TÒA TÀNG KINH CÁC) -->
      <div id="tang-kinh-cac-prompt" class="quest-action-prompt tkc-floating-prompt hidden">
        <div class="qap-bubble">
          <div class="qap-icon">📚</div>
          <div class="qap-info">
            <div class="qap-title">Tòa Tàng Kinh Các · 藏經閣</div>
            <div class="qap-sub">Nhấn phím [E] hoặc bấm nút để mở Kinh Điển</div>
          </div>
          <button type="button" class="qap-btn tkc-prompt-btn" id="btn-tkc-prompt-open">
            <span class="qap-btn-icon">📜</span>
            <span class="qap-btn-text">Đọc & Nghe Kinh</span>
          </button>
        </div>
      </div>

      <!-- QUEST WORKING PROGRESS OVERLAY (ĐANG THỰC HIỆN NHIỆM VỤ 10 GIÂY) -->
      <div id="quest-working-overlay" class="quest-working-overlay hidden">
        <div class="qwo-box">
          <div class="qwo-header">
            <span class="qwo-icon" id="qwo-icon">🧹</span>
            <div class="qwo-headings">
              <h4 id="qwo-title">Đang Quét Dọn Sân Chùa...</h4>
              <span id="qwo-sub">Tâm an tĩnh, thân chuyên cần thiền môn chấp tác</span>
            </div>
            <div class="qwo-timer-badge" id="qwo-timer-badge">10s</div>
          </div>
          <div class="qwo-bar-track">
            <div class="qwo-bar-fill" id="qwo-progress-fill" style="width: 0%;"></div>
          </div>
          <div class="qwo-hint">⏳ Vui lòng kiên nhẫn trong 10 giây để hoàn thành công quả</div>
        </div>
      </div>

      <!-- MAIN HALL INTERACTIVE HUD (ĐẶT Ở DƯỚI, GỌN GÀNG, KHÔNG CHE TƯỢNG PHẬT, CÓ NÚT THU GỌN) -->
      <div id="mainhall-hud" class="mainhall-hud hidden">
        <div class="mainhall-title" id="mainhall-title-bar" title="Nhấp để thu gọn / mở rộng bảng hành lễ">
          <div class="mainhall-title-text">
            <span class="gold-sparkle">✨</span>
            <b>ĐẠI HÙNG BẢO ĐIỆN — TAM THẾ PHẬT</b>
            <span class="gold-sparkle">✨</span>
          </div>
          <button class="hall-toggle-btn" id="btn-toggle-hall-hud" title="Thu gọn / Mở rộng bảng">➖ Thu gọn</button>
        </div>
        <div class="mainhall-actions" id="mainhall-actions-body">
          <button class="hall-btn" id="btn-hall-bow">🙏 Quỳ Lạy Lễ Phật</button>
          <button class="hall-btn" id="btn-hall-incense">🪔 Dâng Nén Tâm Hương</button>
          <button class="hall-btn" id="btn-hall-cushion">🧘 Ngồi Bồ Đoàn Thiền</button>
          <button class="hall-btn" id="btn-hall-bell">🔔 Thỉnh Chuông Gia Trì</button>
          <button class="hall-btn highlight-gold" id="btn-hall-fish">📿 Tụng Kinh & Trì Chú</button>
          <button class="hall-btn highlight-lotus" id="btn-hall-flower">🪷 Dâng Hoa Cúng Phật</button>
          <button class="hall-btn highlight-gold" id="btn-hall-oracle">📜 Xin Quẻ Pháp Cú</button>
          <button class="hall-btn highlight-monk" id="btn-hall-ordain" title="Gặp Hòa Thượng Thích Trí Giác để Xuống Tóc Đi Tu">🪒 Xuất Gia Đi Tu</button>
        </div>
      </div>



      <!-- MEDITATION TIMER POPUP -->
      <div id="meditate-timer-card" class="hidden-card">
        <div class="zen-circle-anim"></div>
        <h3>Tĩnh Tâm Thiền Định</h3>
        <p class="timer-display" id="zen-time">00:00</p>
        <p class="timer-desc">Hãy hít sâu, thở chậm và buông xả muộn phiền...</p>
        <button id="btn-stop-meditate" class="zen-action-btn small">Dừng Thiền</button>
      </div>

      <!-- CHAT BOX (BOTTOM LEFT - SẮC NÉT, RÕ RÀNG, CÓ THỂ THU GỌN / MỞ RỘNG) -->
      <div class="chat-container" id="chat-container">
        <div class="chat-header-bar" id="chat-header-bar" title="Nhấp để thu gọn / mở rộng khung đàm luận">
          <div class="chat-header-title">
            <span class="chat-header-icon">🍃</span>
            <span>ĐẠO HỮU ĐÀM LUẬN</span>
          </div>
          <div class="chat-header-actions">
            <button type="button" class="chat-toggle-btn" id="btn-toggle-chat" title="Thu gọn khung đàm luận">➖</button>
          </div>
        </div>
        <div class="chat-messages" id="chat-messages">
          <div class="chat-msg system">🍃 Chào mừng đạo hữu đến với Chùa An Lạc. Chúc bạn một ngày thân tâm an lạc, vạn sự cát tường!</div>
        </div>
        <form class="chat-input-row" id="chat-form">
          <input type="text" id="chat-input" placeholder="Gửi lời an lành... (Nhấn Enter)" maxlength="120" autocomplete="off" />
          <button type="submit" class="chat-send-btn">Gửi</button>
        </form>
      </div>

      <!-- FLOATING CHAT PILL (HIỂN THỊ KHI THU GỌN KHUNG ĐÀM LUẬN) -->
      <button type="button" id="btn-open-chat-floating" class="floating-chat-pill hidden" title="Mở khung Đàm Luận">
        <span class="pill-chat-icon">💬</span>
        <span class="pill-chat-text">Đàm Luận</span>
        <span id="chat-unread-dot" class="chat-unread-dot hidden" title="Có tin nhắn mới"></span>
      </button>

      <!-- ACTION BUTTON BAR (BOTTOM CENTER) -->
      <div class="bottom-action-bar">
        <button class="action-btn" data-action="meditate" title="Ngồi thiền tịnh tâm">
          <span class="btn-icon">🧘</span>
          <span class="btn-label">Thiền Định</span>
        </button>
        <button class="action-btn" data-action="pray" title="Chắp tay búp sen">
          <span class="btn-icon">🙏</span>
          <span class="btn-label">Lễ Phật</span>
        </button>
        <button class="action-btn" data-action="bell" title="Thỉnh đại hồng chung">
          <span class="btn-icon">🔔</span>
          <span class="btn-label">Thỉnh Chuông</span>
        </button>
        <button class="action-btn highlight-gold" data-action="chanting" title="Tụng kinh & trì chú (Mõ gia trì, giọng đọc AI)">
          <span class="btn-icon">📿</span>
          <span class="btn-label">Tụng Kinh</span>
        </button>
        <button class="action-btn highlight" id="btn-open-lantern" title="Thả hoa đăng trên hồ sen">
          <span class="btn-icon">🌸</span>
          <span class="btn-label">Thả Hoa Đăng</span>
        </button>
        <button class="action-btn highlight-gold" id="btn-open-oracle" title="Xin Quẻ Lời Phật Dạy (Kinh Pháp Cú)">
          <span class="btn-icon">📜</span>
          <span class="btn-label">Xin Quẻ</span>
        </button>
        <button class="action-btn" data-action="wave" title="Vẫy tay chào bạn">
          <span class="btn-icon">👋</span>
          <span class="btn-label">Chào Hỏi</span>
        </button>
      </div>

      <!-- MODAL: THẢ HOA ĐĂNG -->
      <div id="modal-lantern" class="modal-backdrop hidden">
        <div class="modal-box">
          <div class="modal-header">
            <h3>🌸 Thả Hoa Đăng Cầu An</h3>
            <button class="modal-close" id="modal-lantern-close">✕</button>
          </div>
          <div class="modal-body">
            <p>Viết một điều nguyện ước tốt lành gửi gắm vào đóa sen thả trôi trên mặt hồ tĩnh lặng:</p>
            <textarea id="lantern-wish-text" rows="3" placeholder="Nguyện cho cha mẹ bình an, mọi người vạn sự cát tường..." maxlength="150"></textarea>
            <div class="lantern-type-picker">
              <label><input type="radio" name="lantern-type" value="lotus_pink" checked /> 🌸 Sen Hồng Tịnh Tâm</label>
              <label><input type="radio" name="lantern-type" value="lotus_white" /> 🤍 Bạch Liên Thanh Khiết</label>
              <label><input type="radio" name="lantern-type" value="lotus_gold" /> 🌟 Kim Đăng Trí Tuệ</label>
            </div>
          </div>
          <div class="modal-footer">
            <button class="modal-cancel-btn" id="modal-lantern-cancel">Hủy</button>
            <button class="zen-action-btn" id="modal-lantern-submit">Thắp Sáng & Thả Đèn</button>
          </div>
        </div>
      </div>



      <!-- MODAL: CHIÊM NGƯỠNG HOA ĐĂNG -->
      <div id="modal-inspect-lantern" class="modal-backdrop hidden">
        <div class="modal-box">
          <div class="modal-header">
            <h3>🪷 Hoa Đăng Nguyện Ước</h3>
            <button class="modal-close" id="modal-inspect-close">✕</button>
          </div>
          <div class="modal-body">
            <p class="inspect-author">Người thả: <b id="inspect-author-name">Đồng tu</b></p>
            <blockquote class="inspect-wish" id="inspect-wish-content">...</blockquote>
            <div class="rejoice-row">
              <span>Đã có <b id="inspect-rejoice-count">0</b> lượt cùng cầu nguyện</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="zen-action-btn highlight" id="btn-rejoice-action">🙏 Tùy Hỷ Công Đức</button>
          </div>
        </div>
      </div>



      <!-- MODAL: TÙY BIẾN NHÂN VẬT & Y PHỤC PHẬT TỬ -->
      <div id="modal-wardrobe" class="modal-backdrop hidden">
        <div class="modal-box wardrobe-modal-box">
          <div class="modal-header">
            <h3>👤 Tùy Biến Nhân Vật & Y Phục</h3>
            <button class="modal-close" id="modal-wardrobe-close">✕</button>
          </div>
          <div class="modal-body">
            <!-- 0. ĐẶT PHÁP DANH / TÊN NHÂN VẬT -->
            <div class="modal-section-title">
              <span>✍️</span> <b>Pháp Danh / Tên Nhân Vật:</b>
            </div>
            <div class="character-name-section">
              <div class="name-input-wrapper">
                <input
                  type="text"
                  id="input-character-name"
                  class="character-name-input"
                  placeholder="Nhập tên hoặc pháp danh của bạn..."
                  maxlength="24"
                  autocomplete="off"
                />
                <button type="button" class="btn-save-name-inline" id="btn-save-name-inline" title="Lưu pháp danh mới">
                  Lưu Tên
                </button>
              </div>
              <div class="name-limit-note available" id="name-limit-note">
                <span>✨</span> <span>Mỗi ngày được đổi pháp danh 1 lần. Danh hiệu tu tập (Trụ Trì / Cao Tăng) luôn được giữ nguyên trọn vẹn!</span>
              </div>
              <div class="name-quick-suggestions">
                <span class="quick-suggest-label">Gợi ý Pháp Danh:</span>
                <button type="button" class="name-suggest-tag" data-name="Đạo Hữu An Nhiên">An Nhiên</button>
                <button type="button" class="name-suggest-tag" data-name="Thiện Tâm">Thiện Tâm</button>
                <button type="button" class="name-suggest-tag" data-name="Tuệ Minh">Tuệ Minh</button>
                <button type="button" class="name-suggest-tag" data-name="Diệu Âm">Diệu Âm</button>
                <button type="button" class="name-suggest-tag" data-name="Phúc Lạc">Phúc Lạc</button>
                <button type="button" class="name-suggest-tag" data-name="Thanh Tịnh">Thanh Tịnh</button>
                <button type="button" class="name-suggest-tag" data-name="Như Nguyện">Như Nguyện</button>
                <button type="button" class="name-suggest-tag" data-name="Trí Dũng">Trí Dũng</button>
              </div>
            </div>

            <!-- 1. CHỌN GIỚI TÍNH NHÂN VẬT -->
            <div class="modal-section-title">
              <span>🌸</span> <b>Chọn Giới Tính Nhân Vật:</b>
            </div>
            <div class="gender-selection-row">
              <div class="gender-card active" id="gender-card-male" data-gender="male">
                <div class="gender-avatar-wrap">
                  <span class="gender-icon">👦</span>
                </div>
                <div class="gender-info">
                  <div class="gender-title">
                    <span>Thiện Nam</span>
                    <span class="gender-badge male">Nam</span>
                  </div>
                  <div class="gender-desc">Búi tóc đạo đồng, phong thái trang nghiêm, dũng mãnh tinh tấn</div>
                </div>
                <div class="gender-check-circle">✓</div>
              </div>

              <div class="gender-card" id="gender-card-female" data-gender="female">
                <div class="gender-avatar-wrap">
                  <span class="gender-icon">👧</span>
                </div>
                <div class="gender-info">
                  <div class="gender-title">
                    <span>Tín Nữ</span>
                    <span class="gender-badge female">Nữ</span>
                  </div>
                  <div class="gender-desc">Song hoàn kế, trâm cài hoa sen hồng, hoa tai ngọc, từ ái an nhiên</div>
                </div>
                <div class="gender-check-circle">✓</div>
              </div>
            </div>

            <!-- 2. CHỌN SẮC ÁO TU TẬP -->
            <div class="modal-section-title" style="margin-top: 10px;">
              <span>👘</span> <b>Sắc Áo Tu Tập Thanh Tịnh:</b>
            </div>
            <div class="wardrobe-palette">
              <div class="robe-option active" data-color="0x5b7aa6" title="Áo Lam Khói - Thanh nhã, thanh tịnh">
                <div class="color-swatch" style="background: #5b7aa6;"></div>
                <span class="robe-label">Lam Khói</span>
              </div>
              <div class="robe-option" data-color="0x7a4b28" title="Áo Nâu Sồng - Giản dị, thoát tục">
                <div class="color-swatch" style="background: #7a4b28;"></div>
                <span class="robe-label">Nâu Sồng</span>
              </div>
              <div class="robe-option" data-color="0xc45c7b" title="Hồng Sen Tịnh Độ - Dịu mát, từ bi">
                <div class="color-swatch" style="background: #c45c7b;"></div>
                <span class="robe-label">Hồng Sen</span>
              </div>
              <div class="robe-option" data-color="0xd48822" title="Huỳnh Y Cà Sa - Rực rỡ, trang nghiêm">
                <div class="color-swatch" style="background: #d48822;"></div>
                <span class="robe-label">Huỳnh Y</span>
              </div>
              <div class="robe-option" data-color="0xe8ecf0" title="Bạch Y Cư Sĩ - Thuần khiết, vô nhiễm">
                <div class="color-swatch" style="background: #e8ecf0; border-color: #aaa;"></div>
                <span class="robe-label">Bạch Y</span>
              </div>
              <div class="robe-option" data-color="0x34495e" title="Chàm Trầm - Định tĩnh, trầm mặc">
                <div class="color-swatch" style="background: #34495e;"></div>
                <span class="robe-label">Chàm Trầm</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="zen-action-btn highlight" id="btn-confirm-wardrobe" style="width: 100%; font-size: 14.5px; padding: 11px 20px; border-radius: 14px;">
              🙏 Hoàn Tất Tùy Biến
            </button>
          </div>
        </div>
      </div>



      <!-- MODAL: XIN QUẺ NGUYỆN ƯỚC AN LẠC -->
      <div id="modal-oracle" class="modal-backdrop hidden">
        <div class="modal-box oracle-box">
          <div class="modal-header">
            <div class="oracle-header-title-wrap">
              <h3>🎋 Xin Quẻ Nguyện Ước An Lạc</h3>
              <div class="oracle-header-counter" id="oracle-header-counter">
                Hôm nay đã thỉnh: <b id="oracle-counter-num">0/5</b> quẻ
              </div>
            </div>
            <button class="modal-close" id="modal-oracle-close">✕</button>
          </div>
          <div class="modal-body text-center">
            <!-- THANH CHỌN DANH MỤC NGUYỆN ƯỚC (NHÂN DUYÊN, HỌC HÀNH, SỰ NGHIỆP, BÌNH AN, PHÁP CÚ) -->
            <div class="oracle-cat-bar" id="oracle-cat-bar">
              <button class="oracle-cat-btn active" data-oracle-cat="love">🌸 Nhân Duyên</button>
              <button class="oracle-cat-btn" data-oracle-cat="study">📚 Học Hành</button>
              <button class="oracle-cat-btn" data-oracle-cat="career">💼 Sự Nghiệp</button>
              <button class="oracle-cat-btn" data-oracle-cat="peace">🌿 Bình An</button>
              <button class="oracle-cat-btn" data-oracle-cat="dhammapada">📜 Lời Phật Dạy</button>
            </div>

            <!-- GIAO DIỆN LẮC ỐNG XĂM -->
            <div id="oracle-shake-view" class="oracle-shake-zone">
              <div class="bamboo-tube" id="bamboo-tube">
                <div class="bamboo-rim"></div>
                <div class="sticks-bundle">
                  <div class="stick s1"></div>
                  <div class="stick s2"></div>
                  <div class="stick s3"></div>
                </div>
                <div class="tube-text" id="bamboo-tube-text">NHÂN DUYÊN</div>
              </div>
              <p id="oracle-prayer-prompt" class="oracle-prayer-prompt">
                Chắp tay thành kính nguyện cầu nhân duyên hòa hợp, tri kỷ tương phùng, thiện duyên kết trái lành...
              </p>
              <button class="zen-action-btn highlight" id="btn-shake-tube" style="font-size: 14px; padding: 10px 26px; border-radius: 20px;">
                🎋 Thành Tâm Lắc Ống Xăm
              </button>
            </div>

            <!-- GIAO DIỆN KẾT QUẢ QUẺ XĂM -->
            <div id="oracle-result-view" class="hidden">
              <div class="ancient-scroll">
                <div class="oracle-card-badge" id="oracle-card-badge">✨ QUẺ ĐẠI CÁT</div>
                <div class="scroll-number" id="oracle-card-number">QUẺ NHÂN DUYÊN SỐ 1</div>
                <div class="scroll-title" id="oracle-card-title">Hạnh Ngộ Duyên Lành</div>
                <div class="scroll-verse" id="oracle-card-verse"></div>
                <div class="scroll-meaning" id="oracle-card-meaning"></div>
                <div class="scroll-blessing" id="oracle-card-advice"></div>
              </div>
              <div class="oracle-actions-row">
                <button class="zen-action-btn" id="btn-re-shake-oracle" style="flex: 1; font-size: 13px; padding: 10px 14px; border-radius: 12px; background: rgba(0,0,0,0.5); border: 1px solid rgba(212,175,55,0.4);">
                  🎋 Thỉnh Danh Mục Khác
                </button>
                <button class="zen-action-btn gold" id="btn-accept-oracle" style="flex: 1.8; font-size: 13.5px; padding: 10px 14px; border-radius: 12px;">
                  🙏 Hoan Hỷ Thọ Nhận (+20 Điểm Công Đức)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- HUD COMPACT: TỤNG KINH & TRÌ CHÚ (BẢNG NHỎ GỌN NỔI DƯỚI ĐÁY, KHÔNG CHE TẦM NHÌN 3D) -->
      <div id="modal-chanting" class="modal-backdrop chanting-backdrop hidden">
        <div class="chanting-box compact-hud">
          <!-- HÀNG TIÊU ĐỀ & CHỌN BÀI KINH -->
          <div class="chant-hud-header">
            <div class="chant-selector-wrap">
              <span class="gold-sparkle">📿</span>
              <select class="chant-select-dropdown" id="chant-select-dropdown" title="Chọn bài kinh hoặc thần chú">
                <!-- Tự động load 12 bài kinh & chú -->
              </select>
            </div>
            <div class="chant-progress-tag">
              <span class="verse-progress-badge" id="chant-verse-counter">1 / 84</span>
              <span class="loop-progress-badge" id="chant-loop-counter">0 biến</span>
            </div>
            <button class="chant-standup-btn" id="modal-chanting-close" title="Dừng tụng kinh và đứng dậy">
              ✕ Đứng dậy
            </button>
          </div>

          <!-- KHUNG HIỆN CÂU KINH (TELEPROMPTER GỌN GÀNG, SẮC NÉT) -->
          <div class="chant-teleprompter compact">
            <div class="verse-line prev" id="chant-verse-prev">...</div>
            <div class="verse-line current" id="chant-verse-current">
              <span class="verse-lotus">🪷</span>
              <span class="verse-text" id="chant-verse-text">Nam mô Hắc ra đát na đa ra dạ da</span>
              <span class="verse-lotus">🪷</span>
            </div>
            <div class="verse-line next" id="chant-verse-next">Nam mô a rị da</div>
            <!-- Hiệu ứng chữ nổi +1 Công Đức khi gõ -->
            <div class="merit-float-anchor" id="merit-float-anchor"></div>
          </div>

          <!-- HÀNG PHÍM ĐIỀU KHIỂN & GÕ MÕ GỌN GÀNG -->
          <div class="chanting-controls-bar compact">
            <button class="strike-fish-btn compact" id="btn-strike-fish" title="Nhấp hoặc bấm phím Space để gõ mõ qua câu">
              <span class="fish-icon-bounce">🪵</span>
              <b>Gõ Mõ</b>
              <span class="hotkey-pill">Space</span>
            </button>

            <button class="chant-ctrl-btn auto-chant-btn" id="btn-toggle-auto-chant" title="Tự động gõ mõ và AI đọc từng câu kinh">
              <span class="ctrl-icon" id="auto-chant-icon">▶️</span>
              <span class="ctrl-text" id="auto-chant-text">Tự Động</span>
            </button>

            <button class="chant-ctrl-btn voice-toggle-btn active" id="btn-toggle-chant-voice" title="Bật/Tắt giọng AI">
              <span class="ctrl-icon" id="chant-voice-icon">🔊</span>
              <span class="ctrl-text" id="chant-voice-text">AI Đọc</span>
            </button>

            <div class="chant-speed-group">
              <span class="speed-label">Tốc độ:</span>
              <button class="speed-btn" data-speed="slow">Chậm</button>
              <button class="speed-btn active" data-speed="normal">Vừa</button>
              <button class="speed-btn" data-speed="fast">Nhanh</button>
            </div>

            <button class="chant-ctrl-btn restart-btn" id="btn-restart-chant" title="Tụng lại từ câu đầu">
              <span>🔄</span>
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: ĐĂNG NHẬP GOOGLE -->
      <div id="modal-auth" class="modal-backdrop hidden">
        <div class="modal-box auth-modal-box">
          <div class="modal-header">
            <h3>🔑 Đăng Nhập Tài Khoản Đạo Hữu</h3>
            <button class="modal-close" id="modal-auth-close">✕</button>
          </div>
          <div class="modal-body">
            <div id="auth-unlogged-view">
              <p class="auth-intro-desc">
                🌸 Đăng nhập tài khoản để lưu giữ công đức tu tập, ghi danh vào <b>Sổ Giới Điệp Tam Bảo</b> khi <b>Xuống Tóc Đi Tu</b> và nhận quyền tấn phong <b>Hòa Thượng Trụ Trì</b> hoặc <b>12 Vị Cao Tăng</b>.
              </p>

              <div class="auth-buttons-group">
                <!-- NÚT GOOGLE SIGN IN -->
                <button type="button" class="btn-oauth btn-google" id="btn-login-google">
                  <svg class="oauth-svg-icon" viewBox="0 0 24 24" width="22" height="22">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Tiếp tục với Google</span>
                </button>
              </div>
            </div>

            <!-- VIEW KHI ĐÃ ĐĂNG NHẬP -->
            <div id="auth-logged-view" class="hidden">
              <div class="auth-profile-card">
                <div class="auth-profile-avatar" id="auth-profile-avatar">🪷</div>
                <div class="auth-profile-info">
                  <div class="auth-profile-name" id="auth-profile-name">Đạo Hữu</div>
                  <div class="auth-profile-email" id="auth-profile-email">email@gmail.com</div>
                  <div class="auth-profile-badge" id="auth-profile-badge">
                    <span id="auth-profile-provider-tag" class="tag-provider">Google</span>
                    <span id="auth-profile-monk-tag" class="tag-monk">Cư Sĩ Tại Gia</span>
                  </div>
                </div>
              </div>

              <div class="auth-ordination-status" id="auth-ordination-status">
                <!-- Nội dung trạng thái xuất gia -->
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="modal-cancel-btn" id="modal-auth-close-btn">Đóng</button>
            <button class="modal-danger-btn hidden" id="btn-auth-logout">Đăng Xuất</button>
          </div>
        </div>
      </div>

      <!-- MODAL: NGHI LỄ XUẤT GIA THỤ GIỚI (XUỐNG TÓC ĐI TU) -->
      <div id="modal-ordination" class="modal-backdrop hidden">
        <div class="modal-box ordination-modal-box">
          <div class="modal-header">
            <h3>🪷 Nghi Lễ Xuất Gia Thụ Giới — Xuống Tóc Đi Tu</h3>
            <button class="modal-close" id="modal-ordination-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="ordination-banner">
              <div class="ordination-icon">✂️🪷</div>
              <div class="ordination-banner-text">
                <b>ĐẠI THÙ THẮNG NHÂN DUYÊN — XẢ TỤC XUẤT GIA</b>
                <p>Quy y Tam Bảo, xả bỏ mái tóc phiền não, đắp y Cà Sa tôn quý và tiến tu đạo quả giải thoát.</p>
              </div>
            </div>

            <div class="ordination-rules-card">
              <div class="rule-item">
                <span class="rule-icon">🪒</span>
                <div class="rule-text"><b>Xuống Tóc (Cạo Đầu):</b> Mái tóc thế tục sẽ mất đi hoàn toàn, đầu cạo tròn thanh tịnh với 6 chấm hương giới điệp thiêng liêng.</div>
              </div>
              <div class="rule-item">
                <span class="rule-icon">👘</span>
                <div class="rule-text"><b>Đắp Áo Cà Sa:</b> Nhân vật mặc áo Cà Sa hoàng y (hoặc nâu sồng), vai vắt dải y giải thoát.</div>
              </div>
              <div class="rule-item">
                <span class="rule-icon">📜</span>
                <div class="rule-text"><b>Bắt Buộc Họ "Thích":</b> Pháp danh xuất gia bắt buộc phải mang họ Thích của Đức Thế Tôn Thích Ca Mâu Ni.</div>
              </div>
              <div class="rule-item highlight-rule">
                <span class="rule-icon">👑</span>
                <div class="rule-text"><b>Quyền Tấn Phong:</b> <b>Chỉ người đã Xuất Gia Đi Tu mới được phép tấn phong làm Hòa Thượng Trụ Trì hoặc 12 Vị Cao Tăng!</b></div>
              </div>
            </div>

            <!-- KHUNG THÔNG BÁO CHO NGƯỜI ĐÃ XUẤT GIA (CHỈ THAY Y CÀ SA, KHÔNG ĐỔI PHÁP DANH) -->
            <div id="ordination-already-monk-section" class="hidden">
              <div class="ordination-card-success" style="margin-bottom: 12px; background: rgba(217, 119, 6, 0.12); border: 1px solid rgba(217, 119, 6, 0.35); border-radius: 12px; padding: 12px 16px;">
                <span class="ord-icon" style="font-size: 28px;">📜</span>
                <div class="ord-info" style="margin-left: 12px;">
                  <b style="color: #ffd700; font-size: 15px; letter-spacing: 0.5px;">GIỚI ĐIỆP XUẤT GIA ĐÃ THỌ NHẬN</b>
                  <p style="margin: 4px 0; color: #fff; font-size: 14px;">Pháp danh hiện tại: <b id="ordination-current-dharma-text" style="color: #f6ad55; font-size: 15px;">Thích ...</b></p>
                  <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.4;">Theo quy chế thiền môn, nghi lễ thế phát thụ giới chỉ thực hiện một lần. Thầy hoan hỷ chọn sắc áo Cà Sa tương ứng phẩm vị hiện tại dưới đây để hoằng pháp độ sanh.</p>
                </div>
              </div>
            </div>

            <!-- PHẦN ĐẶT PHÁP DANH (CHỈ DÀNH CHO CƯ SĨ CHƯA XUẤT GIA) -->
            <div id="ordination-dharma-naming-section">
              <div class="modal-section-title" style="margin-top: 10px;">
                <span>✍️</span> <b>Đặt Pháp Danh Tự Chọn (Bắt buộc mang họ Thích):</b>
              </div>
              <div class="dharma-input-wrap" id="dharma-input-wrap">
                <span class="dharma-prefix">Thích</span>
                <input
                  type="text"
                  id="input-dharma-subname"
                  class="dharma-subname-input"
                  placeholder="Nhấp vào đây gõ tên tùy ý (ví dụ: Minh Tuệ, Tâm An...)"
                  maxlength="20"
                  value="Tâm An"
                  autocomplete="off"
                  spellcheck="false"
                />
                <button type="button" class="btn-clear-dharma-input" id="btn-clear-dharma-input" title="Xóa tên nhanh để gõ lại">✕</button>
              </div>
              <div class="dharma-full-preview">
                <span>Pháp danh chính thức sau khi xuất gia: </span><b id="dharma-preview-text">Thích Tâm An</b>
              </div>

              <!-- GỢI Ý PHÁP DANH HAY -->
              <div class="name-quick-suggestions">
                <span class="quick-suggest-label">Hoặc nhấp chọn nhanh Pháp Danh gợi ý:</span>
                <button type="button" class="dharma-suggest-chip" data-sub="Tâm An">Tâm An</button>
                <button type="button" class="dharma-suggest-chip" data-sub="Thiện Thông">Thiện Thông</button>
                <button type="button" class="dharma-suggest-chip" data-sub="Minh Tuệ">Minh Tuệ</button>
                <button type="button" class="dharma-suggest-chip" data-sub="Trí Dũng">Trí Dũng</button>
                <button type="button" class="dharma-suggest-chip" data-sub="Đạt Ma">Đạt Ma</button>
                <button type="button" class="dharma-suggest-chip" data-sub="Pháp Hạnh">Pháp Hạnh</button>
                <button type="button" class="dharma-suggest-chip" data-sub="Chơn Không">Chơn Không</button>
                <button type="button" class="dharma-suggest-chip" data-sub="Diệu Định">Diệu Định</button>
              </div>
            </div>

            <!-- CHỌN SẮC ÁO CÀ SA THEO PHẨM VỊ -->
            <div class="modal-section-title" style="margin-top: 12px;">
              <span>👘</span> <b>Chọn Sắc Áo Cà Sa Hoằng Pháp (Theo Phẩm Vị):</b>
            </div>
            <div class="robe-selection-row">
              <div class="robe-choice-card active" data-robe="0xd97706" id="robe-choice-yellow">
                <span class="robe-color-sample" style="background: #d97706;"></span>
                <div class="robe-choice-info">
                  <b>Hoàng Y Cà Sa</b>
                  <span>Vàng nghệ saffron truyền thống tôn nghiêm</span>
                  <span class="robe-lock-tag tag-unlocked">🟢 Mới Xuất Gia (Mặc Định)</span>
                </div>
              </div>
              <div class="robe-choice-card locked" data-robe="0x8b5a2b" id="robe-choice-brown">
                <span class="robe-color-sample" style="background: #8b5a2b;"></span>
                <div class="robe-choice-info">
                  <b>Nâu Sồng Giải Thoát</b>
                  <span>Màu nâu đất giản dị, thanh bần, từ bi</span>
                  <span class="robe-lock-tag tag-locked" id="robe-brown-tag">🔒 Chỉ Mở Cho Cao Tăng</span>
                </div>
              </div>
              <div class="robe-choice-card locked" data-robe="0x991b1b" id="robe-choice-red">
                <span class="robe-color-sample" style="background: #991b1b;"></span>
                <div class="robe-choice-info">
                  <b>Cà Sa Son Đỏ</b>
                  <span>Sắc đỏ mận của Hòa Thượng Trụ Trì</span>
                  <span class="robe-lock-tag tag-locked" id="robe-red-tag">👑 Chỉ Mở Cho Trụ Trì</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="modal-cancel-btn" id="modal-ordination-cancel">Để Sau</button>
            <button class="zen-action-btn highlight-gold" id="btn-confirm-ordination">🙏 Thành Tâm Xuống Tóc Đi Tu</button>
          </div>
        </div>
      </div>

      <!-- MODAL: BẢNG XẾP HẠNG CÔNG ĐỨC & TRỤ TRÌ -->
      <div id="modal-leaderboard" class="modal-backdrop hidden">
        <div class="modal-box leaderboard-modal-box">
          <div class="modal-header">
            <div class="leaderboard-header-title">
              <span class="gold-sparkle">🏆</span>
              <h3>BẢNG VÀNG CÔNG ĐỨC</h3>
              <span class="gold-sparkle">✨</span>
            </div>
            <button class="modal-close" id="modal-leaderboard-close">✕</button>
          </div>
          <div class="modal-body leaderboard-modal-body">
            <!-- 1. BANNER ĐẾM NGƯỢC RESET 00H00 -->
            <div class="leaderboard-reset-banner">
              <div class="reset-timer-row">
                <span class="timer-icon">⏳</span>
                <span class="timer-label">Reset Bảng Xếp Hạng sau:</span>
                <b class="timer-countdown" id="leaderboard-countdown">08h 00m 00s</b>
              </div>
              <div class="reset-rule-note" id="leaderboard-rule-note">
                🪷 <b>Quy chế thiền môn:</b> Bảng Vàng phân làm 2 giới phận: <b>Tăng Đoàn Xuất Gia (Họ Thích)</b> và <b>Cư Sĩ Tại Gia</b>. Điểm Công Đức được cập nhật thời gian thực từ database và reset sắc phong lúc 00:00 hằng ngày.
              </div>
            </div>

            <!-- 2. TAB SWITCHER 3 BẢNG XẾP HẠNG -->
            <div class="leaderboard-tab-bar">
              <button type="button" class="lb-tab-btn active" id="tab-lb-monk" data-tab="monk">
                <span class="tab-icon">🪷</span>
                <span class="tab-text">Tăng Ni Xuất Gia</span>
                <span class="tab-count" id="monk-count-badge">0</span>
              </button>
              <button type="button" class="lb-tab-btn" id="tab-lb-lay" data-tab="lay">
                <span class="tab-icon">🌸</span>
                <span class="tab-text">Cư Sĩ Tại Gia</span>
                <span class="tab-count" id="lay-count-badge">0</span>
              </button>
              <button type="button" class="lb-tab-btn highlight-gold-tab" id="tab-lb-donor" data-tab="donor">
                <span class="tab-icon">👑</span>
                <span class="tab-text">Đại Thí Chủ Cúng Dường</span>
                <span class="tab-count" id="donor-count-badge">0</span>
              </button>
            </div>

            <!-- TAB 1: TĂNG ĐOÀN XUẤT GIA -->
            <div id="leaderboard-tab-monk-content" class="lb-tab-content">
              <!-- CARD ĐƯƠNG KIM HÒA THƯỢNG TRỤ TRÌ -->
              <div class="abbot-spotlight-card" id="abbot-spotlight-card">
                <div class="abbot-card-badge">👑 ĐƯƠNG KIM HÒA THƯỢNG TRỤ TRÌ</div>
                <div class="abbot-card-content">
                  <div class="abbot-avatar-wrap">
                    <span class="abbot-avatar-icon" id="abbot-avatar-icon">🪷</span>
                  </div>
                  <div class="abbot-details">
                    <h4 class="abbot-name" id="abbot-display-name">Chưa có Trụ Trì</h4>
                    <div class="abbot-score-row">
                      <span>Công đức hôm qua:</span>
                      <b class="abbot-score" id="abbot-score-val">0</b>
                      <span>Điểm Công Đức 🪷</span>
                    </div>
                    <div class="abbot-privilege" id="abbot-privilege-text">
                      ✨ Đặc quyền: Ngự Đại Pháp Tòa tại Chính Điện & mang Đại Hào Quang Kim Sắc
                    </div>
                  </div>
                </div>
              </div>

              <!-- DANH SÁCH TĂNG ĐOÀN HÔM NAY -->
              <div class="leaderboard-list-section">
                <div class="leaderboard-list-title">
                  <span>🪷 Bảng Vàng Tăng Ni (<span id="leaderboard-monk-date">--/--/----</span>)</span>
                  <span class="auto-refresh-badge">🟢 Trực tiếp</span>
                </div>
                <div class="leaderboard-items-container" id="leaderboard-monk-items-container">
                  <div class="leaderboard-loading" style="text-align: center; color: #cbd5e1; padding: 16px 0;">
                    Đang đồng bộ dữ liệu thiền môn...
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 2: CƯ SĨ TẠI GIA -->
            <div id="leaderboard-tab-lay-content" class="lb-tab-content hidden">
              <!-- SPOTLIGHT CHÁNH HỘ PHÁP CƯ SĨ -->
              <div class="lay-spotlight-card" id="lay-spotlight-card">
                <div class="lay-card-badge">🌟 ĐẠI HỘ PHÁP CƯ SĨ TIÊU BIỂU</div>
                <div class="lay-card-content">
                  <div class="lay-avatar-wrap">
                    <span class="lay-avatar-icon" id="lay-avatar-icon">🌸</span>
                  </div>
                  <div class="lay-details">
                    <h4 class="lay-name" id="lay-display-name">Chưa có Chánh Hộ Pháp</h4>
                    <div class="lay-score-row">
                      <span>Công đức hôm nay:</span>
                      <b class="lay-score" id="lay-score-val">0</b>
                      <span>Điểm Công Đức 🪷</span>
                    </div>
                    <div class="lay-privilege">
                      ✨ Cư sĩ hộ trì Tam Bảo, hộ trì đạo tràng trang nghiêm thanh tịnh
                    </div>
                  </div>
                </div>
              </div>

              <!-- DANH SÁCH CƯ SĨ HÔM NAY -->
              <div class="leaderboard-list-section">
                <div class="leaderboard-list-title">
                  <span>🌸 Bảng Vàng Thiện Nam Tín Nữ (<span id="leaderboard-lay-date">--/--/----</span>)</span>
                  <span class="auto-refresh-badge">🟢 Trực tiếp</span>
                </div>
                <div class="leaderboard-items-container" id="leaderboard-lay-items-container">
                  <div class="leaderboard-loading" style="text-align: center; color: #cbd5e1; padding: 16px 0;">
                    Đang đồng bộ dữ liệu phật tử...
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 3: ĐẠI THÍ CHỦ CÚNG DƯỜNG TAM BẢO (NẠP NHIỀU NHẤT) -->
            <div id="leaderboard-tab-donor-content" class="lb-tab-content hidden">
              <!-- CARD ĐỆ NHẤT ĐẠI THÍ CHỦ -->
              <div class="donor-spotlight-card" id="donor-spotlight-card">
                <div class="donor-card-badge">👑 ĐỆ NHẤT ĐẠI THÍ CHỦ CÚNG DƯỜNG TAM BẢO</div>
                <div class="donor-card-content">
                  <div class="donor-avatar-wrap">
                    <span class="donor-avatar-icon" id="donor-avatar-icon">👑</span>
                  </div>
                  <div class="donor-details">
                    <h4 class="donor-name" id="donor-top1-name">Chưa có Thí Chủ</h4>
                    <div class="donor-score-row">
                      <span>Tổng tịnh tài cúng dường:</span>
                      <b class="donor-score" id="donor-top1-amount">0 đ</b>
                    </div>
                    <div class="donor-privilege" id="donor-top1-desc">
                      ✨ Tán Thán: Đại Thí Chủ Kim Cương • Hộ Trì Thiền Môn Thường Trụ • Phúc Lạc Vô Biên
                    </div>
                  </div>
                </div>
              </div>

              <!-- DANH SÁCH BẢNG VÀNG THÍ CHỦ -->
              <div class="leaderboard-list-section">
                <div class="leaderboard-list-title">
                  <span>👑 Bảng Vàng Đại Thí Chủ Hộ Trì Chùa An Lạc</span>
                  <button type="button" class="btn-quick-donate-gold" id="btn-lb-open-donation">
                    🪷 Phát Tâm Cúng Dường
                  </button>
                </div>
                <div class="leaderboard-items-container" id="leaderboard-donor-items-container">
                  <div class="leaderboard-loading" style="text-align: center; color: #cbd5e1; padding: 16px 0;">
                    Đang đồng bộ danh sách Thí Chủ cúng dường...
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. THÔNG TIN CÔNG ĐỨC CỦA BẠN -->
            <div class="my-standing-card">
              <div class="my-standing-info">
                <span>👤 <b id="my-standing-name">Đạo Hữu</b></span>
                <span class="my-rank-tag" id="my-standing-rank">Chưa xếp hạng</span>
              </div>
              <div class="my-drops-val">
                <span>Hôm nay:</span> <b id="my-standing-drops">0</b> <span>Điểm</span>
              </div>
            </div>

            <!-- 5. HƯỚNG DẪN TÍCH LŨY ĐIỂM CÔNG ĐỨC -->
            <div class="earn-guide-box">
              <div class="earn-guide-title">💡 Cách Tích Lũy Thêm Điểm Công Đức:</div>
              <div class="earn-guide-grid">
                <div class="earn-guide-item">🌿 <b>Nhiệm vụ công quả:</b> +10 Điểm Công Đức / việc (Tối đa 10 việc/ngày tại Vườn An Lạc)</div>
                <div class="earn-guide-item">🌸 <b>Thu hoạch sen hồng:</b> +25 Điểm Công Đức (mỗi đóa nở)</div>
                <div class="earn-guide-item">🪷 <b>Dâng hoa cúng Phật:</b> +15 Điểm Công Đức (1 lần/ngày)</div>
                <div class="earn-guide-item">🪔 <b>Dâng nén tâm hương:</b> +10 Điểm Công Đức (1 lần/ngày)</div>
                <div class="earn-guide-item">🔔 <b>Thỉnh Đại Hồng Chung:</b> +10 Điểm Công Đức (1 lần/ngày)</div>
                <div class="earn-guide-item">📜 <b>Xin quẻ nguyện ước:</b> +20 Điểm Công Đức/quẻ (tối đa 5 quẻ khác nhau/ngày)</div>
                <div class="earn-guide-item">👶 <b>Chú Tiểu chúc phúc:</b> +5 Điểm Công Đức (1 lần/ngày)</div>
                <div class="earn-guide-item">🧘 <b>Thiền định tĩnh tâm:</b> +1 Điểm Công Đức mỗi 30s</div>
                <div class="earn-guide-item highlight-gold">🪷 <b>Hòm Công Đức Tam Bảo:</b> Cúng dường gieo duyên phước đức vô lượng (10k - 500k)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: HÒM CÔNG ĐỨC - CÚNG DƯỜNG TAM BẢO (VIETQR) -->
      <div id="modal-donation" class="modal-backdrop hidden">
        <div class="modal-box donation-modal-box">
          <div class="modal-header donation-modal-header">
            <div class="donation-header-title">
              <span class="donation-lotus-icon">🪷</span>
              <div class="donation-headings">
                <h3>HÒM CÔNG ĐỨC TAM BẢO</h3>
                <span class="donation-sub">Phát Tâm Cúng Dường • Tích Lũy Phước Đức • Hộ Trì Thiền Môn</span>
              </div>
            </div>
            <div class="donation-header-right-tools">
              <button type="button" class="btn-header-view-leaderboard" id="btn-view-donor-leaderboard" title="Xem Bảng Vàng Đại Thí Chủ Cúng Dường">
                🏆 Bảng Vàng Thí Chủ
              </button>
              <button class="modal-close" id="modal-donation-close">✕</button>
            </div>
          </div>

          <div class="modal-body donation-modal-body">
            <!-- VIEW 1: CHỌN GÓI CÔNG ĐỨC -->
            <div id="donation-view-select" class="donation-view">
              <div class="donation-banner">
                <div class="donation-banner-text">
                  ✨ Quý đạo hữu hoan hỷ phát tâm cúng dường Tam Bảo. Hệ thống tích hợp <b>Mã QR Tự Động</b>: sau khi chuyển khoản, công đức sẽ được <b>tự động cộng ngay lập tức</b> vào tài khoản và cập nhật Bảng Vàng!
                </div>
              </div>

              <div class="donation-packages-grid" id="donation-packages-grid">
                <!-- Danh sách 6 gói nạp từ 10k đến 500k -->
              </div>

              <div class="donation-bank-summary-card">
                <div class="dbsc-title">🏦 Tài Khoản Thụ Hưởng Chùa An Lạc:</div>
                <div class="dbsc-grid">
                  <div>Ngân hàng: <b>MB Bank (Ngân Hàng TMCP Quân Đội)</b></div>
                  <div>Số tài khoản: <b>0969856119</b></div>
                  <div>Chủ tài khoản: <b>LE THANH TUNG</b></div>
                </div>
              </div>
            </div>

            <!-- VIEW 2: QUÉT MÃ VIETQR -->
            <div id="donation-view-qr" class="donation-view hidden">
              <div class="donation-qr-container">
                <div class="donation-qr-left">
                  <div class="qr-image-wrapper">
                    <img id="donation-qr-img" src="" alt="Mã VietQR Cúng Dường" class="donation-qr-image" />
                    <div class="qr-loading-spinner hidden" id="donation-qr-loading">Đang kết nối ngân hàng...</div>
                  </div>
                  <div class="qr-scan-hint">📲 Mở App Ngân Hàng hoặc Ví Điện Tử quét mã để hoàn tất chuyển khoản</div>
                </div>

                <div class="donation-qr-right">
                  <div class="donation-package-summary" id="donation-selected-summary">
                    <!-- Tóm tắt gói đang chọn -->
                  </div>

                  <div class="bank-details-card">
                    <div class="bd-row">
                      <span class="bd-label">Ngân hàng:</span>
                      <span class="bd-val" id="bd-bank-name">MB Bank (Ngân hàng Quân Đội)</span>
                    </div>
                    <div class="bd-row">
                      <span class="bd-label">Số tài khoản:</span>
                      <div class="bd-val-copy">
                        <b class="bd-highlight" id="bd-acc-num">0969856119</b>
                        <button type="button" class="btn-copy-small" id="btn-copy-acc" data-copy="0969856119">📋 Sao chép</button>
                      </div>
                    </div>
                    <div class="bd-row">
                      <span class="bd-label">Chủ tài khoản:</span>
                      <b class="bd-val" id="bd-acc-name">LE THANH TUNG</b>
                    </div>
                    <div class="bd-row">
                      <span class="bd-label">Số tiền:</span>
                      <div class="bd-val-copy">
                        <b class="bd-highlight-gold" id="bd-amount">10.000 đ</b>
                        <button type="button" class="btn-copy-small" id="btn-copy-amount">📋 Sao chép</button>
                      </div>
                    </div>
                    <div class="bd-row bd-order-code-row">
                      <span class="bd-label">Nội dung CK:</span>
                      <div class="bd-val-copy">
                        <b class="bd-highlight-code" id="bd-order-code">CD123456</b>
                        <button type="button" class="btn-copy-small highlight" id="btn-copy-code">📋 Sao chép</button>
                      </div>
                    </div>
                  </div>

                  <div class="donation-alert-box">
                    ⚠️ <b>LƯU Ý QUAN TRỌNG:</b> Quý đạo hữu vui lòng giữ nguyên nội dung chuyển khoản <b><span id="bd-alert-code">CD123456</span></b> để hệ thống tự động cộng công đức ngay lập tức!
                  </div>

                  <div class="donation-qr-actions">
                    <button type="button" class="zen-action-btn highlight-gold" id="btn-check-donation">
                      <span class="btn-pulse-icon">✅</span> Tôi Đã Chuyển Khoản Xong
                    </button>
                    <button type="button" class="zen-action-btn" id="btn-back-packages">
                      ← Chọn Gói Khác
                    </button>
                  </div>

                  <div class="donation-polling-status" id="donation-polling-status">
                    <span class="polling-dot"></span> Đang chờ tín hiệu xác nhận từ ngân hàng...
                  </div>
                </div>
              </div>
            </div>

            <!-- VIEW 3: CÚNG DƯỜNG THÀNH CÔNG -->
            <div id="donation-view-success" class="donation-view hidden">
              <div class="donation-success-card">
                <div class="success-lotus-sparkle">🪷 ✨ 🪷</div>
                <h3 class="success-title">CÔNG ĐỨC VIÊN MÃN</h3>
                <div class="success-mantra">NAM MÔ CÔNG ĐỨC LÂM BỒ TÁT MA HA TÁT 🙏</div>
                <div class="success-details" id="donation-success-details">
                  <!-- Rendered dynamically -->
                </div>
                <div class="success-thanks">
                  🌸 Nguyện đem công đức thù thắng này, hướng về khắp tất cả chúng sinh, thân tâm an lạc, phúc huệ song tu, vạn sự hanh thông cát tường!
                </div>
                <button type="button" class="zen-action-btn highlight-gold btn-close-success" id="btn-donation-done">
                  🙏 Hoan Hỷ Quay Lại Chùa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: NHIỆM VỤ CHẤP TÁC CÔNG QUẢ (CHÚ TIỂU TỊNH TÂM • VƯỜN AN LẠC) -->
      <div id="modal-quests" class="modal-backdrop hidden">
        <div class="modal-box quest-modal-box">
          <div class="modal-header">
            <div class="quest-modal-title-wrap">
              <span class="quest-modal-title-icon">🌿</span>
              <div class="quest-modal-headings">
                <h3>Chấp Tác Công Quả Thiền Môn</h3>
                <span class="quest-modal-sub">Chú Tiểu Tịnh Tâm • Quản Lý Vườn An Lạc</span>
              </div>
            </div>
            <button class="modal-close" id="modal-quests-close">✕</button>
          </div>

          <div class="modal-body quest-modal-body">
            <!-- DAILY PROGRESS HEADER -->
            <div class="quest-progress-header-card">
              <div class="qph-top-row">
                <div class="qph-label">
                  <span class="qph-lotus">🪷</span>
                  <span>Tiến Độ Công Quả Hôm Nay:</span>
                </div>
                <div class="qph-count-badge">
                  <b id="quest-daily-count-num">0</b> / 10 <span class="qph-unit">Nhiệm Vụ</span>
                </div>
              </div>

              <div class="qph-progress-track">
                <div class="qph-progress-bar" id="quest-daily-progress-bar" style="width: 0%;"></div>
              </div>

              <div class="qph-rules-row">
                <div class="qph-rule-pill reward">
                  <span>✨</span> <b>Hoàn thành:</b> +10 Điểm Công Đức
                </div>
                <div class="qph-rule-pill penalty">
                  <span>⚠️</span> <b>Hủy nhiệm vụ:</b> -10 Điểm Công Đức
                </div>
                <div class="qph-rule-pill reset">
                  <span>⏳</span> <b>Tối đa:</b> 10 việc/ngày (Reset 00:00)
                </div>
              </div>
            </div>

            <!-- ACTIVE QUEST DISPLAY (NẾU ĐANG CÓ NHIỆM VỤ) -->
            <div class="active-quest-container" id="active-quest-container">
              <!-- Dynamically populated -->
            </div>

            <!-- AVAILABLE QUESTS CATALOG -->
            <div class="available-quests-wrapper">
              <div class="quests-section-header">
                <span class="qsh-icon">📜</span>
                <b>Danh Sách Nhiệm Vụ Công Quả Trong Ngày</b>
                <span class="qsh-hint">(Mỗi ngày nhận tối đa 10 nhiệm vụ)</span>
              </div>
              <div class="quests-grid" id="available-quests-grid">
                <!-- Dynamically populated -->
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: XÁC NHẬN HỦY NHIỆM VỤ (TRỪ 10 ĐIỂM CÔNG ĐỨC) -->
      <div id="modal-quest-confirm-cancel" class="modal-backdrop hidden">
        <div class="modal-box quest-confirm-modal-box">
          <div class="modal-header">
            <h3>⚠️ Xác Nhận Hủy Nhiệm Vụ</h3>
            <button class="modal-close" id="modal-quest-cancel-close">✕</button>
          </div>
          <div class="modal-body quest-confirm-body">
            <div class="quest-confirm-icon">⚠️</div>
            <h4 class="quest-confirm-title">Cảnh Báo Giảm Điểm Công Đức</h4>
            <p id="quest-cancel-confirm-msg" class="quest-confirm-desc">
              Đạo hữu có chắc chắn muốn hủy nhiệm vụ này không?<br>
              <b class="penalty-text">Lưu ý: Hủy nhiệm vụ sẽ bị trừ 10 Điểm Công Đức!</b>
            </p>
            <div class="quest-confirm-actions">
              <button type="button" class="zen-action-btn secondary" id="btn-quest-cancel-no">Giữ Lại Nhiệm Vụ</button>
              <button type="button" class="zen-action-btn danger" id="btn-quest-cancel-yes">Xác Nhận Hủy (-10 Công Đức)</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: PHÒNG ĐÃ ĐẦY (71/71) -->
      <div id="modal-room-full" class="modal-backdrop hidden">
        <div class="modal-box modal-room-full-box">
          <div class="modal-header">
            <h3>🛕 Đạo Tràng Đã Đủ Đạo Hữu</h3>
          </div>
          <div class="modal-body" style="text-align: center; padding: 24px 18px;">
            <div style="font-size: 52px; margin-bottom: 12px; filter: drop-shadow(0 4px 12px rgba(212,175,55,0.4));">🛕</div>
            <h4 style="color: #f1c40f; margin-bottom: 8px; font-size: 16px;">Phòng Chùa Đã Đạt Giới Hạn Tối Đa (71 Người)</h4>
            <p id="room-full-message" style="font-size: 14px; line-height: 1.6; color: #f1f2f6; margin-bottom: 12px;">
              Phòng chiêm bái Chùa An Lạc hiện đã đủ <b>71 / 71</b> đạo hữu cùng tu học.
            </p>
            <p style="font-size: 12.5px; color: #a3b899; line-height: 1.5; margin-bottom: 20px;">
              Xin quý đạo hữu hoan hỷ tịnh tâm chờ giây lát hoặc làm mới trang khi có đạo hữu rời bước để vào chiêm bái! 🙏
            </p>
            <div style="display: flex; justify-content: center; gap: 12px;">
              <button type="button" class="zen-action-btn" id="btn-room-full-retry" style="padding: 10px 24px; font-size: 13.5px;">🔄 Thử Kết Nối Lại</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: TÀNG KINH CÁC — KHO TÀNG PHÁP BẢO PHẬT GIÁO -->
      <div id="modal-tang-kinh-cac" class="modal-backdrop hidden">
        <div class="modal-box tang-kinh-cac-modal-box">
          <!-- MODAL HEADER -->
          <div class="modal-header tkc-modal-header">
            <div class="tkc-title-group">
              <span class="tkc-icon-badge">📚</span>
              <div class="tkc-titles">
                <h3>TÀNG KINH CÁC · 藏 經 閣</h3>
                <span class="tkc-sub">Kho Tàng Pháp Bảo Phật Giáo · Đọc Kinh & Lắng Nghe Pháp Âm</span>
              </div>
            </div>
            <div class="tkc-header-tools">
              <button class="modal-close" id="modal-tang-kinh-cac-close">✕</button>
            </div>
          </div>

          <!-- MODAL BODY -->
          <div class="modal-body tkc-modal-body">
            <!-- VIEW A: DANH MỤC CÁC BỘ KINH (CATALOG VIEW) -->
            <div id="tkc-catalog-view" class="tkc-view">
              <div class="tkc-banner">
                <div class="tkc-banner-icon">📜</div>
                <div class="tkc-banner-content">
                  <div class="tkc-banner-heading">Pháp Bảo Bất Diệt — Ngọn Đèn Soi Sáng Thế Gian</div>
                  <div class="tkc-banner-desc">
                    Tòa Tàng Kinh Các lưu trữ những bộ kinh điển tối thượng của Đức Bổn Sư Thích Ca Mâu Ni và chư Đại Bồ Tát. Quý đạo hữu có thể chọn đọc từng phẩm kinh thiền vị hoặc lắng nghe giọng đọc thanh tịnh truyền cảm kết hợp tiếng chuông mõ gia trì.
                  </div>
                </div>
              </div>

              <!-- BỘ LỌC THỂ LOẠI -->
              <div class="tkc-filter-bar" id="tkc-filter-bar">
                <button type="button" class="tkc-filter-chip active" data-category="all">✨ Tất Cả (8)</button>
                <button type="button" class="tkc-filter-chip" data-category="wisdom">💎 Trí Tuệ Bát Nhã</button>
                <button type="button" class="tkc-filter-chip" data-category="dharma">🪷 Kinh Căn Bản</button>
                <button type="button" class="tkc-filter-chip" data-category="compassion">🌊 Cứu Khổ Cứu Nạn</button>
                <button type="button" class="tkc-filter-chip" data-category="pureland">🛕 Tịnh Độ Cực Lạc</button>
                <button type="button" class="tkc-filter-chip" data-category="healing">🌿 Tiêu Tai Diên Thọ</button>
                <button type="button" class="tkc-filter-chip" data-category="filial_piety">🕯️ Đạo Hiếu Vu Lan</button>
              </div>

              <!-- LƯỚI DANH SÁCH BỘ KINH -->
              <div class="tkc-sutra-grid" id="tkc-sutra-grid">
                <!-- SUTRA CARDS RENDERED DYNAMICALLY -->
              </div>
            </div>

            <!-- VIEW B: PHÒNG ĐỌC KINH & NGHE PHÁP ÂM (READER & AUDIO VIEW) -->
            <div id="tkc-reader-view" class="tkc-view hidden">
              <!-- TOP BREADCRUMB & CONTROLS -->
              <div class="tkc-reader-top-bar">
                <button type="button" class="tkc-back-btn" id="btn-tkc-back-catalog">
                  <span>←</span> Quay Lại Danh Mục Kinh
                </button>
                <div class="tkc-reader-actions">
                  <button type="button" class="tkc-font-btn" id="btn-tkc-font-decrease" title="Giảm cỡ chữ">A-</button>
                  <button type="button" class="tkc-font-btn" id="btn-tkc-font-increase" title="Tăng cỡ chữ">A+</button>
                  <button type="button" class="tkc-font-btn" id="btn-tkc-theme-toggle" title="Đổi màu nền Giấy Cổ / Đêm">📜 Nền Giấy</button>
                </div>
              </div>

              <!-- READER CONTENT CONTAINER -->
              <div class="tkc-reader-scrollable" id="tkc-reader-scrollable">
                <div class="tkc-parchment-sheet" id="tkc-parchment-sheet">
                  <!-- SUTRA METADATA HEADER -->
                  <div class="tkc-sheet-header">
                    <div class="tkc-sheet-lotus-ornament">❖ ❖ ❖</div>
                    <h2 class="tkc-sheet-title" id="tkc-reader-title">Bát Nhã Ba La Mật Đa Tâm Kinh</h2>
                    <div class="tkc-sheet-sanskrit" id="tkc-reader-sanskrit">Prajñāpāramitā Hṛdaya Sūtra</div>
                    <div class="tkc-sheet-desc" id="tkc-reader-desc">...</div>
                    <div class="tkc-sheet-divider"></div>
                  </div>

                  <!-- CHAPTER TABS IF MULTI-CHAPTER -->
                  <div class="tkc-chapter-tabs" id="tkc-chapter-tabs">
                    <!-- Dynamic Chapter Tabs -->
                  </div>

                  <!-- CHAPTER HEADING -->
                  <div class="tkc-current-chapter-title" id="tkc-current-chapter-title">
                    Phẩm I: Song Yếu
                  </div>

                  <!-- VERSES LIST -->
                  <div class="tkc-verses-flow" id="tkc-verses-flow">
                    <!-- Dynamic verse paragraphs with click-to-play -->
                  </div>

                  <!-- MERIT REWARD CARD AT END OF SUTRA -->
                  <div class="tkc-merit-card">
                    <div class="tkc-merit-icon">🌸</div>
                    <div class="tkc-merit-content">
                      <div class="tkc-merit-title">Công Đức Thù Thắng</div>
                      <div class="tkc-merit-text" id="tkc-merit-text">...</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- FLOATING AUDIO CONTROLLER DOCK -->
              <div class="tkc-audio-dock" id="tkc-audio-dock">
                <div class="tkc-audio-info">
                  <span class="tkc-audio-pulse" id="tkc-audio-pulse">🔊</span>
                  <div class="tkc-audio-meta">
                    <div class="tkc-audio-sutra-name" id="tkc-audio-name">Đang nghe kinh...</div>
                    <div class="tkc-audio-verse-text" id="tkc-audio-current-verse">Nhấn Phát để nghe đọc kinh</div>
                  </div>
                </div>

                <div class="tkc-audio-controls">
                  <button type="button" class="tkc-audio-btn tkc-prev-btn" id="btn-tkc-audio-prev" title="Câu trước">⏮</button>
                  <button type="button" class="tkc-audio-btn tkc-play-btn" id="btn-tkc-audio-play" title="Phát / Dừng">▶</button>
                  <button type="button" class="tkc-audio-btn tkc-next-btn" id="btn-tkc-audio-next" title="Câu tiếp theo">⏭</button>
                </div>

                <div class="tkc-audio-extras">
                  <button type="button" class="tkc-speed-btn" id="btn-tkc-audio-speed" title="Tốc độ đọc">0.95x</button>
                  <button type="button" class="tkc-chime-btn active" id="btn-tkc-audio-chime" title="Bật/Tắt chuông mõ">🔔 Chuông</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CẦN GẠT DI CHUYỂN CẢM ỨNG ẢO (VIRTUAL ANALOG JOYSTICK - PHONG CÁCH LIÊN QUÂN MOBILE) -->
      <div class="virtual-joystick-zone" id="virtual-joystick-zone">
        <div class="joystick-base" id="joystick-base">
          <div class="joystick-ring-glow"></div>
          <div class="joystick-arrows">
            <span class="j-arr up">▲</span>
            <span class="j-arr left">◄</span>
            <span class="j-arr right">►</span>
            <span class="j-arr down">▼</span>
          </div>
          <div class="joystick-thumb" id="joystick-thumb">
            <div class="joystick-thumb-inner">
              <span class="thumb-lotus">🪷</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
    // Tự động theo dõi trạng thái mở modal: gán class 'modal-open' lên body để ẩn trọn vẹn top-nav-bar
    const syncModalState = () => {
      const openModal = this.container.querySelector(".modal-backdrop:not(.hidden):not(.chanting-backdrop)");
      if (openModal) {
        document.body.classList.add("modal-open");
      } else {
        document.body.classList.remove("modal-open");
      }
    };
    const modalObserver = new MutationObserver(() => syncModalState());
    modalObserver.observe(this.container, {
      attributes: true,
      subtree: true,
      attributeFilter: ["class"],
    });
    syncModalState();

    // 0a. Nút tải lại và đóng Banner Cập Nhật Phiên Bản Mới
    const btnUpdateReload = document.getElementById("btn-update-reload");
    btnUpdateReload?.addEventListener("click", () => {
      window.location.reload();
    });

    const btnUpdateDismiss = document.getElementById("btn-update-dismiss");
    btnUpdateDismiss?.addEventListener("click", () => {
      const banner = document.getElementById("game-update-banner");
      if (banner) banner.classList.add("hidden");
    });

    // 1. Âm thanh Toggle (Toàn bộ hiệu ứng & nhạc)
    const audioBtn = document.getElementById("btn-audio-toggle");
    if (audioBtn) {
      audioBtn.addEventListener("click", () => {
        this.isMuted = zenAudio.toggleMute();
        audioBtn.innerText = this.isMuted ? "🔇" : "🔊";
      });
    }

    // 1a. Nhạc Nền Thiền Tịnh Tâm (432Hz)
    const musicBtn = document.getElementById("btn-music-toggle");
    const musicMenuBtn = document.getElementById("btn-music-menu");
    const musicQuickPanel = document.getElementById("music-quick-panel");
    const musicPlayerWrap = document.getElementById("music-player-wrap");
    const volSlider = document.getElementById("music-volume-slider") as HTMLInputElement | null;
    const volPercent = document.getElementById("music-vol-percent");

    musicBtn?.addEventListener("click", () => {
      const isNowPlaying = zenBackgroundMusic.toggle();
      zenAudio.playLotusSound();
      this.appendChatMessage(
        "Hệ Thống",
        isNowPlaying
          ? "🎵 Đã bật Nhạc Thiền An Nhiên Tự Tại."
          : "🔇 Đã tạm dừng Nhạc Thiền.",
      );
    });

    musicMenuBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      musicQuickPanel?.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (musicPlayerWrap && !musicPlayerWrap.contains(e.target as Node)) {
        musicQuickPanel?.classList.add("hidden");
      }
    });

    volSlider?.addEventListener("input", () => {
      const v = parseInt(volSlider.value, 10) / 100;
      zenBackgroundMusic.setVolume(v);
    });

    // Lắng nghe cập nhật trạng thái từ ZenBackgroundMusic
    zenBackgroundMusic.onStateChange((isPlaying, _currentTheme, volume) => {
      if (musicBtn) {
        musicBtn.classList.toggle("active", isPlaying);
        musicBtn.classList.toggle("paused", !isPlaying);
        musicBtn.title = isPlaying
          ? "Đang phát Nhạc Thiền MP3 - Nhấp để tạm dừng"
          : "Nhạc Thiền đang tắt - Nhấp để bật lại";
      }

      if (volSlider) {
        volSlider.value = Math.round(volume * 100).toString();
      }
      if (volPercent) {
        volPercent.innerText = `${Math.round(volume * 100)}%`;
      }
    });

    // 1b. Nút đổi Chế độ Đồ họa (FPS Badge Toggle)
    const fpsBadge = document.getElementById("fps-badge");
    const qualityModes: Array<"balanced" | "ultra" | "fast"> = [
      "balanced",
      "fast",
      "ultra",
    ];
    let qualityIdx = 0;
    if (fpsBadge) {
      fpsBadge.addEventListener("click", () => {
        qualityIdx = (qualityIdx + 1) % qualityModes.length;
        const mode = qualityModes[qualityIdx];
        const labelEl = document.getElementById("fps-mode-label");
        const modeText =
          mode === "balanced"
            ? "Mượt"
            : mode === "fast"
              ? "Siêu nhẹ"
              : "Sắc nét";
        if (labelEl) labelEl.textContent = modeText;
        if (this.callbacks.onToggleGraphicsQuality) {
          this.callbacks.onToggleGraphicsQuality(mode);
        }
        this.appendChatMessage(
          "Hệ Thống",
          `⚙️ Đã chuyển cấu hình đồ họa: [${modeText.toUpperCase()}]`,
        );
      });
    }

    // 2. Action buttons (Thiền, Bái, Chuông, Mõ, Chào)
    const actionBtns = this.container.querySelectorAll(
      ".action-btn[data-action]",
    );
    actionBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        if (!action) return;

        if (action === "meditate") {
          if (!this.isInsideHall) {
            if (this.callbacks.onRequireHall) {
              this.callbacks.onRequireHall("meditate");
            } else {
              this.appendChatMessage("Chùa", "🧘 Nghi thức Tọa Thiền chỉ thực hiện được bên trong Đại Hùng Bảo Điện.");
            }
            return;
          }
          this.toggleMeditation();
        } else if (action === "pray") {
          if (!this.isInsideHall) {
            if (this.callbacks.onRequireHall) {
              this.callbacks.onRequireHall("pray");
            } else {
              this.appendChatMessage("Chùa", "🙏 Nghi thức Lễ Phật chỉ thực hiện được trước Tam Thế Phật bên trong Đại Hùng Bảo Điện.");
            }
            return;
          }
          this.callbacks.onActionSelect("pray");
        } else if (action === "bell") {
          zenAudio.playTempleBell();
          this.callbacks.onActionSelect("bell");
        } else if (action === "chanting" || action === "wooden_fish") {
          this.openChantingModal();
          this.callbacks.onActionSelect("chanting");
        } else {
          this.callbacks.onActionSelect(action);
        }
      });
    });

    // 4. Stop Meditate
    const stopMedBtn = document.getElementById("btn-stop-meditate");
    if (stopMedBtn) {
      stopMedBtn.addEventListener("click", () => this.stopMeditation());
    }

    // 5. Chat Box & Toggle
    const chatForm = document.getElementById("chat-form") as HTMLFormElement;
    const chatInput = document.getElementById("chat-input") as HTMLInputElement;
    const toggleChatBtn = document.getElementById("btn-toggle-chat");
    const chatHeaderBar = document.getElementById("chat-header-bar");
    const openChatFloatingBtn = document.getElementById("btn-open-chat-floating");

    if (chatForm && chatInput) {
      chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const msg = chatInput.value.trim();
        if (msg) {
          this.callbacks.onSendChat(msg);
          this.appendChatMessage("Bạn", msg);
          chatInput.value = "";
        }
      });
    }

    toggleChatBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleChatBox(true);
    });

    chatHeaderBar?.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest("#btn-toggle-chat")) return;
      this.toggleChatBox(true);
    });

    openChatFloatingBtn?.addEventListener("click", () => {
      this.toggleChatBox(false);
    });

    // Tự động kiểm tra trạng thái thu gọn trước đó hoặc màn hình nhỏ/mobile
    const savedChatCollapsed = localStorage.getItem("chua_chat_collapsed");
    const shouldCollapseChat =
      savedChatCollapsed === "true" ||
      (savedChatCollapsed === null && window.innerWidth <= 768);
    if (shouldCollapseChat) {
      this.toggleChatBox(true);
    }

    // 6. Modal Thả Hoa Đăng
    const openLanternBtn = document.getElementById("btn-open-lantern");
    const modalLantern = document.getElementById("modal-lantern");
    const closeLanternBtn = document.getElementById("modal-lantern-close");
    const cancelLanternBtn = document.getElementById("modal-lantern-cancel");
    const submitLanternBtn = document.getElementById("modal-lantern-submit");
    const wishInput = document.getElementById(
      "lantern-wish-text",
    ) as HTMLTextAreaElement;

    if (openLanternBtn && modalLantern) {
      openLanternBtn.addEventListener("click", () => {
        if (!this.isNearPond) {
          if (this.callbacks.onRequirePond) {
            this.callbacks.onRequirePond();
          } else {
            this.appendChatMessage(
              "Chùa",
              "🌸 Nghi thức Thả Hoa Đăng chỉ thực hiện được tại Cầu Hồ Sen hoặc ven bờ hồ nước.",
            );
          }
          return;
        }
        modalLantern.classList.remove("hidden");
        wishInput.focus();
      });
    }
    const hideLanternModal = () => modalLantern?.classList.add("hidden");
    closeLanternBtn?.addEventListener("click", hideLanternModal);
    cancelLanternBtn?.addEventListener("click", hideLanternModal);

    submitLanternBtn?.addEventListener("click", () => {
      const wish = wishInput.value.trim();
      if (!wish) {
        alert("Xin hãy nhập lời chúc hoặc ước nguyện an lành.");
        return;
      }
      const typeRadio = document.querySelector(
        'input[name="lantern-type"]:checked',
      ) as HTMLInputElement;
      const type = typeRadio ? typeRadio.value : "lotus_pink";

      this.callbacks.onReleaseLantern(wish, type);
      zenAudio.playLotusSound();
      wishInput.value = "";
      hideLanternModal();
    });

    // 7. Modal Chiêm Ngưỡng Hoa Đăng
    const modalInspect = document.getElementById("modal-inspect-lantern");
    const closeInspectBtn = document.getElementById("modal-inspect-close");
    closeInspectBtn?.addEventListener("click", () =>
      modalInspect?.classList.add("hidden"),
    );

    // 8. Cần gạt di chuyển cảm ứng ảo (Virtual Analog Joystick phong cách Liên Quân Mobile)
    this.setupVirtualJoystick();

    // 8b. Mobile D-Pad Buttons (dự phòng)
    const dpadBtns = this.container.querySelectorAll(".dpad-btn");
    dpadBtns.forEach((btn) => {
      const dir = btn.getAttribute("data-dir") as
        | "up"
        | "down"
        | "left"
        | "right";
      const start = (e: Event) => {
        e.preventDefault();
        this.callbacks.onMoveCommand(dir, true);
      };
      const end = (e: Event) => {
        e.preventDefault();
        this.callbacks.onMoveCommand(dir, false);
      };
      btn.addEventListener("touchstart", start, { passive: false });
      btn.addEventListener("touchend", end);
      btn.addEventListener("mousedown", start);
      btn.addEventListener("mouseup", end);
      btn.addEventListener("mouseleave", end);
    });

    // 9. Nút dịch chuyển tức thời (Teleport Shortcuts) & Menu Viếng Chùa Đóng/Mở
    const btnToggleTeleport = document.getElementById("btn-teleport-menu-toggle");
    btnToggleTeleport?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleTeleportMenu();
    });

    const btnCloseTeleport = document.getElementById("btn-close-teleport-menu");
    btnCloseTeleport?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeTeleportMenu();
    });

    // Đóng menu viếng cảnh chùa khi nhấp chuột ra ngoài
    document.addEventListener("click", (e) => {
      const wrap = document.getElementById("teleport-menu-wrapper");
      if (wrap && !wrap.contains(e.target as Node)) {
        this.closeTeleportMenu();
      }
    });

    // Đóng menu khi chạm tay ra ngoài trên màn hình cảm ứng di động
    document.addEventListener("pointerdown", (e) => {
      const panel = document.getElementById("teleport-dropdown-panel");
      if (panel && !panel.classList.contains("hidden")) {
        const wrap = document.getElementById("teleport-menu-wrapper");
        if (wrap && !wrap.contains(e.target as Node)) {
          this.closeTeleportMenu();
        }
      }
    });

    // Đóng menu khi nhấn phím Escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeTeleportMenu();
      }
    });

    const teleBtns = this.container.querySelectorAll(".nav-btn[data-teleport]");
    teleBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.closeTeleportMenu();
        const loc = btn.getAttribute("data-teleport") as
          | "main_hall"
          | "courtyard"
          | "gate"
          | "pond"
          | "garden"
          | "bell"
          | "tang_kinh_cac";
        if (loc && this.callbacks.onTeleport) {
          this.callbacks.onTeleport(loc);
        }
      });
    });

    // 10. Tùy biến Nhân Vật & Y Phục Phật Tử
    const btnWardrobe = document.getElementById("btn-wardrobe");
    btnWardrobe?.addEventListener("click", () => {
      this.closeTeleportMenu();
    });
    const modalWardrobe = document.getElementById("modal-wardrobe");
    const closeWardrobe = document.getElementById("modal-wardrobe-close");
    const btnConfirmWardrobe = document.getElementById("btn-confirm-wardrobe");
    const nameInput = document.getElementById("input-character-name") as HTMLInputElement | null;

    const applyNewName = () => {
      if (!nameInput) return;
      let raw = nameInput.value.trim();
      if (!raw || raw === this.playerName) return;

      // Người xuất gia tu hành bắt buộc mang họ Thích của Đức Thế Tôn
      const isMonk = authService.isMonk() || localStorage.getItem("chua_an_lac_is_monk") === "true";
      if (isMonk) {
        if (!raw.startsWith("Thích ") && !raw.startsWith("Thích")) {
          raw = "Thích " + raw;
        } else if (raw.startsWith("Thích") && !raw.startsWith("Thích ")) {
          raw = "Thích " + raw.substring(5).trim();
        }
      }

      // KIỂM TRA TRÙNG TÊN: Tên không được trùng nhau với bất kỳ ai trong chùa
      if (isNameTakenInGame(raw, this.playerName, this.latestLeaderboard)) {
        alert(`❌ Tên "${raw}" đã có người sử dụng trong chùa! Đạo hữu vui lòng chọn một tên khác.`);
        nameInput.value = this.playerName;
        return;
      }

      if (!dailyActivities.canRenameToday()) {
        this.appendChatMessage(
          "Chùa",
          "⏳ Mỗi ngày chỉ được đổi pháp danh 1 lần. Đạo hữu đã đổi hôm nay rồi, xin hẹn lại sau 00:00 đêm nay! 🙏",
        );
        alert("Mỗi ngày chỉ được đổi pháp danh 1 lần. Đạo hữu đã đổi hôm nay rồi, xin hẹn lại sau 00:00 đêm nay! 🙏");
        nameInput.value = this.playerName;
        this.updateRenameUIStatus();
        return;
      }

      dailyActivities.recordRename();
      this.playerName = raw;
      nameInput.value = raw;
      localStorage.setItem("chua_an_lac_player_name", raw);
      if (isMonk) {
        localStorage.setItem("chua_an_lac_dharma_name", raw);
      }
      if (authService.isLoggedIn()) {
        authService.updateUser({ name: raw, dharmaName: isMonk ? raw : undefined });
      }

      // BẢO LƯU TRỌN VẸN ĐIỂM CÔNG ĐỨC KHI ĐỔI TÊN / PHÁP DANH
      const currentPoints = this.getMeritPoints();
      saveMeritPoints(raw, currentPoints);

      this.callbacks.onChangePlayerName?.(raw);
      const myNameEl = document.getElementById("my-standing-name");
      if (myNameEl) myNameEl.innerText = raw;

      // Cập nhật lại Bảng Xếp Hạng mới nhất từ máy chủ
      network.requestLeaderboard();

      zenAudio.playLotusSound();
      this.appendChatMessage(
        "Hệ Thống",
        `✨ Đạo hữu vừa đổi pháp danh thành: [${raw}]. Toàn bộ Điểm Công Đức và Danh Hiệu được bảo lưu trọn vẹn! 🙏`,
      );
      this.updateRenameUIStatus();
    };

    btnWardrobe?.addEventListener("click", () => {
      if (nameInput) nameInput.value = this.playerName;
      this.updateRenameUIStatus();
      modalWardrobe?.classList.remove("hidden");
    });
    closeWardrobe?.addEventListener("click", () => {
      if (nameInput && nameInput.value.trim() !== this.playerName && dailyActivities.canRenameToday()) {
        applyNewName();
      }
      modalWardrobe?.classList.add("hidden");
    });
    btnConfirmWardrobe?.addEventListener("click", () => {
      if (nameInput && nameInput.value.trim() !== this.playerName && dailyActivities.canRenameToday()) {
        applyNewName();
      }
      modalWardrobe?.classList.add("hidden");
    });
    modalWardrobe?.addEventListener("click", (e) => {
      if (e.target === modalWardrobe) {
        if (nameInput && nameInput.value.trim() !== this.playerName && dailyActivities.canRenameToday()) {
          applyNewName();
        }
        modalWardrobe?.classList.add("hidden");
      }
    });
    document.getElementById("btn-save-name-inline")?.addEventListener("click", () => {
      applyNewName();
    });
    nameInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyNewName();
      }
    });

    const suggestTags = this.container.querySelectorAll(".name-suggest-tag");
    suggestTags.forEach((tag) => {
      tag.addEventListener("click", () => {
        if (!dailyActivities.canRenameToday()) {
          alert("Mỗi ngày chỉ được đổi pháp danh 1 lần. Đạo hữu đã đổi hôm nay rồi, xin hẹn lại sau 00:00 đêm nay! 🙏");
          return;
        }
        const n = tag.getAttribute("data-name");
        if (n && nameInput) {
          nameInput.value = n;
          applyNewName();
        }
      });
    });

    // Khởi tạo trạng thái Giới Tính từ localStorage
    const savedGender = localStorage.getItem("chua_an_lac_gender") || "male";
    const genderCards = this.container.querySelectorAll(".gender-card");
    genderCards.forEach((card) => {
      const g = card.getAttribute("data-gender");
      if (g === savedGender) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
      }

      card.addEventListener("click", () => {
        genderCards.forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        const selectedGender = card.getAttribute("data-gender") as "male" | "female";
        if (selectedGender && this.callbacks.onChangeGender) {
          this.callbacks.onChangeGender(selectedGender);
        }
      });
    });

    // Khởi tạo trạng thái Màu Áo từ localStorage
    const savedRobe = localStorage.getItem("chua_an_lac_robe_color") || "0x5b7aa6";
    const robeOptions = this.container.querySelectorAll(".robe-option");
    robeOptions.forEach((opt) => {
      const hexStr = opt.getAttribute("data-color");
      if (hexStr && hexStr.toLowerCase() === savedRobe.toLowerCase()) {
        opt.classList.add("active");
      } else if (hexStr && parseInt(hexStr, 16) === parseInt(savedRobe, 16)) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }

      opt.addEventListener("click", () => {
        robeOptions.forEach((o) => o.classList.remove("active"));
        opt.classList.add("active");
        const val = opt.getAttribute("data-color") || "0x5b7aa6";
        const colorNum = parseInt(val, 16);
        if (this.callbacks.onChangeRobeColor) {
          this.callbacks.onChangeRobeColor(colorNum);
        }
      });
    });

    // 11. Tương tác trong Đại Hùng Bảo Điện
    document.getElementById("btn-hall-bow")?.addEventListener("click", () => {
      this.callbacks.onAltarAction?.("bow");
    });
    document
      .getElementById("btn-hall-incense")
      ?.addEventListener("click", () => {
        this.callbacks.onAltarAction?.("incense");
      });
    document
      .getElementById("btn-hall-cushion")
      ?.addEventListener("click", () => {
        this.callbacks.onAltarAction?.("cushion");
      });
    document.getElementById("btn-hall-bell")?.addEventListener("click", () => {
      zenAudio.playTempleBell();
      this.callbacks.onAltarAction?.("bell");
    });
    document.getElementById("btn-hall-fish")?.addEventListener("click", () => {
      this.openChantingModal();
      this.callbacks.onAltarAction?.("fish");
    });
    document
      .getElementById("btn-hall-flower")
      ?.addEventListener("click", () => {
        this.callbacks.onAltarAction?.("flower");
      });
    document
      .getElementById("btn-hall-oracle")
      ?.addEventListener("click", () => {
        this.openOracleModal();
      });

    // Nút Thu gọn / Mở rộng Bảng Hành Lễ Chính Điện
    const toggleHallBtn = document.getElementById("btn-toggle-hall-hud");
    const mainhallHud = document.getElementById("mainhall-hud");
    const toggleAction = () => {
      if (mainhallHud) {
        const isCollapsed = mainhallHud.classList.toggle("collapsed");
        if (toggleHallBtn) {
          toggleHallBtn.innerText = isCollapsed ? "➕ Mở rộng" : "➖ Thu gọn";
        }
      }
    };
    toggleHallBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleAction();
    });
    document.getElementById("mainhall-title-bar")?.addEventListener("click", toggleAction);

    // 12. Xin Quẻ Pháp Cú từ thanh công cụ dưới
    document
      .getElementById("btn-open-oracle")
      ?.addEventListener("click", () => {
        this.openOracleModal();
      });

    // 13. Modal Xin Quẻ Nguyện Ước An Lạc
    document
      .getElementById("modal-oracle-close")
      ?.addEventListener("click", () => {
        this.closeOracleModal();
      });

    // Lắng nghe chọn danh mục quẻ (Nhân Duyên, Học Hành, Sự Nghiệp, Bình An, Pháp Cú)
    const catBtns = this.container.querySelectorAll(".oracle-cat-btn[data-oracle-cat]");
    catBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const cat = btn.getAttribute("data-oracle-cat") as OracleCategory;
        if (cat) {
          this.selectOracleCategory(cat);
        }
      });
    });

    document.getElementById("btn-shake-tube")?.addEventListener("click", () => {
      this.shakeOracleTube();
    });

    document.getElementById("btn-re-shake-oracle")?.addEventListener("click", () => {
      const available = ORACLE_CATEGORIES.find((c) => !dailyActivities.hasDrawnOracleCategory(c.id));
      if (available) {
        this.selectOracleCategory(available.id);
      } else {
        // Cả 5 quẻ đều đã thỉnh: chuyển về màn hình tổng kết
        const shakeView = document.getElementById("oracle-shake-view");
        const resultView = document.getElementById("oracle-result-view");
        if (shakeView) shakeView.classList.remove("hidden");
        if (resultView) resultView.classList.add("hidden");
        this.updateOracleUI();
      }
    });

    document
      .getElementById("btn-accept-oracle")
      ?.addEventListener("click", () => {
        // Nếu đang ở chế độ xem lại quẻ đã thỉnh hôm nay:
        if (dailyActivities.hasDrawnOracleCategory(this.selectedOracleCategory)) {
          this.closeOracleModal();
          return;
        }

        if (this.currentOracleStick) {
          // Ghi nhận và lưu lại toàn bộ nội dung quẻ để xem lại bất cứ lúc nào trong ngày
          dailyActivities.recordDrawOracleStick(this.currentOracleStick);
          this.incrementCamLo(20, `Xin quẻ ${this.currentOracleStick.categoryName}`);
          zenAudio.playLotusSound();
          this.appendChatMessage(
            "Hệ Thống",
            `📜 Bạn đã tiếp nhận Quẻ [${this.currentOracleStick.categoryName}] #${this.currentOracleStick.id}: "${this.currentOracleStick.title}" - ${this.currentOracleStick.rank} (+20 Điểm Công Đức). Thân tâm an lạc! 🙏`,
          );

          const count = dailyActivities.getDrawnOracleCount();
          if (count >= 5) {
            this.appendChatMessage(
              "Chùa",
              "🎋 Chúc mừng đạo hữu đã thỉnh trọn vẹn cả 5 quẻ cát tường hôm nay (+100 Điểm Công Đức)! Kính chúc vạn sự cát tường, hẹn gặp lại đạo hữu sau 00:00 đêm nay.",
            );
          }
        }
        this.updateOracleUI();
        this.closeOracleModal();
      });

    // 14. Bảng Vàng Công Đức & Vị Trí Trụ Trì
    const openLeaderboard = () => {
      this.closeTeleportMenu();
      this.openLeaderboardModal();
    };
    document.getElementById("btn-leaderboard")?.addEventListener("click", openLeaderboard);
    document.getElementById("btn-camlo-badge")?.addEventListener("click", openLeaderboard);
    document.getElementById("modal-leaderboard-close")?.addEventListener("click", () => {
      this.closeLeaderboardModal();
    });
    const modalLb = document.getElementById("modal-leaderboard");
    modalLb?.addEventListener("click", (e) => {
      if (e.target === modalLb) {
        this.closeLeaderboardModal();
      }
    });

    // Chuyển đổi giữa 3 bảng xếp hạng: Tăng Ni Xuất Gia & Cư Sĩ Tại Gia & Đại Thí Chủ Cúng Dường
    document.getElementById("tab-lb-monk")?.addEventListener("click", () => {
      this.switchLeaderboardTab("monk");
    });
    document.getElementById("tab-lb-lay")?.addEventListener("click", () => {
      this.switchLeaderboardTab("lay");
    });
    document.getElementById("tab-lb-donor")?.addEventListener("click", () => {
      this.switchLeaderboardTab("donor");
    });
    document.getElementById("btn-lb-open-donation")?.addEventListener("click", () => {
      this.closeLeaderboardModal();
      this.openDonationModal();
    });
    document.getElementById("btn-view-donor-leaderboard")?.addEventListener("click", () => {
      this.closeDonationModal();
      this.openLeaderboardModal();
      this.switchLeaderboardTab("donor");
    });

    // 14.05. Hòm Công Đức & Cúng Dường Tam Bảo (VietQR Tự Động)
    document.getElementById("btn-menu-donation")?.addEventListener("click", () => {
      this.closeTeleportMenu();
      this.openDonationModal();
    });
    document.getElementById("modal-donation-close")?.addEventListener("click", () => {
      this.closeDonationModal();
    });
    const modalDonation = document.getElementById("modal-donation");
    modalDonation?.addEventListener("click", (e) => {
      if (e.target === modalDonation) {
        this.closeDonationModal();
      }
    });

    document.getElementById("btn-back-packages")?.addEventListener("click", () => {
      this.switchDonationView("select");
    });
    document.getElementById("btn-check-donation")?.addEventListener("click", () => {
      this.handleCheckDonation();
    });
    document.getElementById("btn-donation-done")?.addEventListener("click", () => {
      this.closeDonationModal();
    });

    document.getElementById("btn-copy-acc")?.addEventListener("click", () => {
      this.copyToClipboard("0969856119", "Đã sao chép số tài khoản MB Bank: 0969856119");
    });
    document.getElementById("btn-copy-amount")?.addEventListener("click", () => {
      const amtStr = document.getElementById("bd-amount")?.innerText.replace(/\D/g, "") || "";
      if (amtStr) this.copyToClipboard(amtStr, `Đã sao chép số tiền: ${amtStr} đ`);
    });
    document.getElementById("btn-copy-code")?.addEventListener("click", () => {
      const code = document.getElementById("bd-order-code")?.innerText || "";
      if (code) this.copyToClipboard(code, `Đã sao chép nội dung chuyển khoản: ${code}`);
    });

    network.onDonationCompleted((data) => {
      this.handleDonationCompletedRemote(data);
    });

    // Lắng nghe đồng bộ điểm công đức chính xác từ MongoDB Cloud
    network.onPlayerMeritSync((data) => {
      if (data && typeof data.camLoToday === "number") {
        this.setMeritPoints(data.camLoToday);
      }
    });

    // 14.1. Badge Số Lượng Người Trong Phòng Chiêm Bái
    document.getElementById("btn-room-count-badge")?.addEventListener("click", () => {
      this.appendChatMessage(
        "Chùa",
        `👥 Hiện có ${this.currentRoomPlayerCount} đạo hữu đang cùng chiêm bái, tu học tại Chùa An Lạc Online. 🙏`
      );
    });

    // 14.2. Nút Thử Kết Nối Lại Khi Phòng Đầy
    document.getElementById("btn-room-full-retry")?.addEventListener("click", () => {
      window.location.reload();
    });

    // 15. Tụng Kinh & Trì Chú (Mõ Gia Trì & Voice AI)
    document.getElementById("modal-chanting-close")?.addEventListener("click", () => {
      this.closeChantingModal();
    });

    const modalChant = document.getElementById("modal-chanting");
    modalChant?.addEventListener("click", (e) => {
      if (e.target === modalChant) {
        this.closeChantingModal();
      }
    });

    // Nhấp vào Mõ Gỗ hoặc Dùi hoặc nút Gõ Mõ
    document.getElementById("wooden-fish-interactive")?.addEventListener("click", () => {
      this.strikeWoodenFish();
    });
    document.getElementById("btn-strike-fish")?.addEventListener("click", () => {
      this.strikeWoodenFish();
    });

    // Nút Bật/Tắt Tự Động Tụng
    document.getElementById("btn-toggle-auto-chant")?.addEventListener("click", () => {
      this.toggleAutoChanting();
    });

    // Nút Bật/Tắt Giọng Đọc AI
    document.getElementById("btn-toggle-chant-voice")?.addEventListener("click", () => {
      this.toggleChantVoice();
    });

    // Các nút chọn tốc độ tụng kinh
    const speedBtns = this.container.querySelectorAll(".speed-btn[data-speed]");
    speedBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const speed = btn.getAttribute("data-speed") as "slow" | "normal" | "fast";
        if (speed) this.setChantSpeed(speed);
      });
    });

    // Nút Tụng Lại Từ Đầu
    document.getElementById("btn-restart-chant")?.addEventListener("click", () => {
      this.restartChant();
    });

    // Phím Spacebar gõ mõ khi Modal đang mở
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.key === " ") {
        const modal = document.getElementById("modal-chanting");
        if (modal && !modal.classList.contains("hidden")) {
          const chatInput = document.getElementById("chat-input");
          if (document.activeElement === chatInput) return;
          e.preventDefault();
          this.strikeWoodenFish();
        }
      }
    });

    // 16. ĐĂNG NHẬP GOOGLE THẬT 100%
    const btnUserAuth = document.getElementById("btn-user-auth");
    const modalAuth = document.getElementById("modal-auth");
    const closeAuth = document.getElementById("modal-auth-close");
    const closeAuthBtn = document.getElementById("modal-auth-close-btn");
    const btnLoginGoogle = document.getElementById("btn-login-google");
    const btnAuthLogout = document.getElementById("btn-auth-logout");

    btnUserAuth?.addEventListener("click", () => {
      this.openAuthModal();
    });

    const hideAuthModal = () => {
      modalAuth?.classList.add("hidden");
    };
    closeAuth?.addEventListener("click", hideAuthModal);
    closeAuthBtn?.addEventListener("click", hideAuthModal);
    modalAuth?.addEventListener("click", (e) => {
      if (e.target === modalAuth) hideAuthModal();
    });

    const handleLoginSuccess = (user: UserAccount, providerName: string) => {
      const prevPoints = this.getMeritPoints();
      zenAudio.playLotusSound();
      this.appendChatMessage(
        "Hệ Thống",
        `🎉 Đăng nhập ${providerName} thành công! Xin chào đạo hữu [${user.name}]. Dữ liệu tu tập thật đã được kết nối trực tiếp! 🙏`,
      );
      this.updateAuthUI();

      const newName = (user.dharmaName || user.name || "").replace(/\s*#\d+$/, "").trim();
      if (newName && newName !== this.playerName) {
        this.playerName = newName;
        this.callbacks.onChangePlayerName?.(newName);
        const myNameEl = document.getElementById("my-standing-name");
        if (myNameEl) myNameEl.innerText = newName;
      }

      // Giữ nguyên điểm công đức và lưu vào tài khoản mới đăng nhập
      const userSaved = getSavedMeritPoints(this.playerName);
      const combined = Math.max(prevPoints, userSaved);
      this.setMeritPoints(combined);

      network.sendAuthLogin({
        name: this.playerName,
        isMonk: authService.isMonk() || this.playerName.startsWith("Thích "),
        email: user.email,
        clientToken: getClientSessionToken(),
        camLoToday: combined,
      });

      hideAuthModal();
    };

    // ĐĂNG NHẬP GOOGLE THẬT (Mở popup accounts.google.com chính thức)
    btnLoginGoogle?.addEventListener("click", async () => {
      try {
        if (btnLoginGoogle) {
          btnLoginGoogle.setAttribute("disabled", "true");
          btnLoginGoogle.style.opacity = "0.7";
        }
        const user = await authService.loginWithRealGoogle();
        handleLoginSuccess(user, "Google");
      } catch (err: any) {
        if (err.message === "MISSING_GOOGLE_CLIENT_ID") {
          alert(
            "⚠️ CHƯA CẤU HÌNH GOOGLE CLIENT ID TRONG FILE .ENV\n\n" +
            "Để mở cửa sổ Google đăng nhập tài khoản Gmail thật 100%, bạn cần điền VITE_GOOGLE_CLIENT_ID vào file .env."
          );
        } else {
          alert(`Thông báo Google Login: ${err.message || err}`);
        }
      } finally {
        if (btnLoginGoogle) {
          btnLoginGoogle.removeAttribute("disabled");
          btnLoginGoogle.style.opacity = "1";
        }
      }
    });

    btnAuthLogout?.addEventListener("click", () => {
      authService.logout();
      this.updateAuthUI();
      this.appendChatMessage("Hệ Thống", "👋 Đã đăng xuất tài khoản. Bạn hiện đang ở chế độ khách viếng chùa.");
      hideAuthModal();
    });

    authService.onAuthChange(() => {
      this.updateAuthUI();
    });
    this.updateAuthUI();

    // 17. NGHI LỄ XUẤT GIA THỤ GIỚI (XUỐNG TÓC ĐI TU)
    const btnHallOrdain = document.getElementById("btn-hall-ordain");
    const modalOrdination = document.getElementById("modal-ordination");
    const closeOrdination = document.getElementById("modal-ordination-close");
    const cancelOrdination = document.getElementById("modal-ordination-cancel");
    const inputDharmaSubname = document.getElementById("input-dharma-subname") as HTMLInputElement | null;
    const dharmaPreviewText = document.getElementById("dharma-preview-text");
    const btnConfirmOrdination = document.getElementById("btn-confirm-ordination");

    btnHallOrdain?.addEventListener("click", () => {
      this.openOrdinationModal();
    });

    const hideOrdinationModal = () => {
      modalOrdination?.classList.add("hidden");
    };
    closeOrdination?.addEventListener("click", hideOrdinationModal);
    cancelOrdination?.addEventListener("click", hideOrdinationModal);
    modalOrdination?.addEventListener("click", (e) => {
      if (e.target === modalOrdination) hideOrdinationModal();
    });

    const updateDharmaPreview = () => {
      const raw = inputDharmaSubname?.value.trim() || "";
      const cleanSub = raw.replace(/^(thích\s*)+/i, "").trim();
      if (dharmaPreviewText) {
        dharmaPreviewText.innerText = `Thích ${cleanSub || "Tâm An"}`;
      }
    };

    inputDharmaSubname?.addEventListener("input", updateDharmaPreview);
    inputDharmaSubname?.addEventListener("keyup", updateDharmaPreview);
    inputDharmaSubname?.addEventListener("change", updateDharmaPreview);
    inputDharmaSubname?.addEventListener("paste", () => setTimeout(updateDharmaPreview, 10));

    // Nút xóa nhanh tên để gõ lại dễ dàng
    const btnClearDharma = document.getElementById("btn-clear-dharma-input");
    btnClearDharma?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (inputDharmaSubname) {
        inputDharmaSubname.value = "";
        updateDharmaPreview();
        inputDharmaSubname.focus();
      }
    });

    document.getElementById("dharma-input-wrap")?.addEventListener("click", () => {
      inputDharmaSubname?.focus();
    });

    inputDharmaSubname?.addEventListener("focus", () => {
      inputDharmaSubname.select();
    });

    // Gợi ý pháp danh
    const suggestChips = this.container.querySelectorAll(".dharma-suggest-chip");
    suggestChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        suggestChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        const sub = chip.getAttribute("data-sub");
        if (sub && inputDharmaSubname) {
          inputDharmaSubname.value = sub;
          updateDharmaPreview();
          inputDharmaSubname.focus();
        }
      });
    });

    // Chọn sắc áo Cà Sa theo phẩm vị tu học
    const robeCards = this.container.querySelectorAll(".robe-choice-card");
    robeCards.forEach((card) => {
      card.addEventListener("click", () => {
        if (card.classList.contains("locked")) {
          const isRed = card.id === "robe-choice-red";
          if (isRed) {
            alert(
              "👑 Phẩm phục Cà Sa Son Đỏ tôn quý chỉ dành riêng cho Đức Hòa Thượng Trụ Trì!\n\n" +
              "Đạo hữu hãy tinh tấn tu tập và dẫn đầu Bảng Vàng Công Đức mỗi ngày để đắc chứng ngôi vị Trụ Trì nhé! 🙏"
            );
          } else {
            alert(
              "🔒 Phẩm phục Nâu Sồng Giải Thoát chỉ mở cho 12 Vị Cao Tăng của Chùa!\n\n" +
              "Đạo hữu hãy tích lũy công đức và lọt vào Top 12 Bảng Vàng để được tấn phong Cao Tăng nhé! 🙏"
            );
          }
          return;
        }

        robeCards.forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        const colorHex = card.getAttribute("data-robe");
        if (colorHex) {
          this.selectedRobeColor = parseInt(colorHex, 16);
        }
      });
    });

    // Xác nhận Xuất Gia Thụ Giới / Thay Y Cà Sa
    btnConfirmOrdination?.addEventListener("click", () => {
      const isAlreadyMonk = authService.isMonk() || this.playerName.startsWith("Thích ");

      // TRƯỜNG HỢP 1: ĐÃ XUẤT GIA -> CHỈ ĐƯỢC THAY Y CÀ SA THEO PHẨM VỊ, KHÔNG CHO ĐỔI PHÁP DANH LẠI!
      if (isAlreadyMonk) {
        const isAbbot = this.isPlayerAbbot();
        const isCaoTang = this.isPlayerCaoTang();

        if (this.selectedRobeColor === 0x991b1b && !isAbbot) {
          alert("👑 Phẩm phục Cà Sa Son Đỏ tôn quý chỉ dành riêng cho Đức Hòa Thượng Trụ Trì! 🙏");
          return;
        }
        if (this.selectedRobeColor === 0x8b5a2b && !isCaoTang) {
          alert("🔒 Phẩm phục Nâu Sồng Giải Thoát chỉ mở cho 12 Vị Cao Tăng của Chùa! 🙏");
          return;
        }

        try {
          localStorage.setItem("chua_an_lac_robe_color", "0x" + this.selectedRobeColor.toString(16));
          if (authService.isLoggedIn()) {
            authService.updateUser({ robeColor: this.selectedRobeColor });
          }
          this.callbacks.onChangeRobeColor?.(this.selectedRobeColor);
          network.sendRobeChange(this.selectedRobeColor);

          hideOrdinationModal();
          zenAudio.playSingingBowl(528);
          this.appendChatMessage(
            "Chùa",
            `👘 A Di Đà Phật! Thầy [${this.playerName}] đã khoác lên mình tấm y Cà Sa mới trang nghiêm! 🙏`
          );
          this.updateAuthUI();
        } catch (err: any) {
          alert(err.message || "Có lỗi xảy ra khi thay đổi sắc áo Cà Sa.");
        }
        return;
      }

      // TRƯỜNG HỢP 2: CƯ SĨ LẦN ĐẦU XUẤT GIA THỤ GIỚI
      if (!authService.isLoggedIn()) {
        const wantLogin = confirm(
          "Đạo hữu chưa Đăng Nhập tài khoản Google.\n\n" +
          "👉 Bấm 'OK' để mở khung Đăng Nhập (khuyên dùng để lưu danh vào Giới Điệp Tam Bảo lâu dài).\n" +
          "👉 Bấm 'Cancel' để tiếp tục Xuất Gia ngay trên thiết bị này."
        );
        if (wantLogin) {
          this.openAuthModal();
          return;
        }
      }

      const rawSub = inputDharmaSubname?.value.trim() || "";
      const cleanSub = rawSub.replace(/^(thích\s*)+/i, "").trim();
      if (!cleanSub || cleanSub.length < 2) {
        alert("Xin vui lòng nhập phần pháp danh hợp lệ (ít nhất 2 ký tự, ví dụ: Tâm An, Minh Tuệ...). 🙏");
        inputDharmaSubname?.focus();
        return;
      }

      const fullDharmaName = `Thích ${cleanSub}`;

      // KIỂM TRA TRÙNG PHÁP DANH: Không cho phép trùng tên với người khác trong chùa
      if (isNameTakenInGame(fullDharmaName, this.playerName, this.latestLeaderboard)) {
        alert(`❌ Pháp danh "${fullDharmaName}" đã có sư thầy/đạo hữu sử dụng trong chùa! Đạo hữu vui lòng chọn một pháp danh khác.`);
        inputDharmaSubname?.focus();
        return;
      }

      // Mới xuống tóc tu hành chỉ được mặc Hoàng Y Cà Sa (0xd97706)
      this.selectedRobeColor = 0xd97706;

      try {
        authService.ordain(fullDharmaName, this.selectedRobeColor);
        this.playerName = fullDharmaName;
        localStorage.setItem("chua_an_lac_player_name", fullDharmaName);
        localStorage.setItem("chua_an_lac_is_monk", "true");
        localStorage.setItem("chua_an_lac_dharma_name", fullDharmaName);
        localStorage.setItem("chua_an_lac_robe_color", "0xd97706");

        const myNameEl = document.getElementById("my-standing-name");
        if (myNameEl) myNameEl.innerText = fullDharmaName;
        const nameInput = document.getElementById("player-name-input") as HTMLInputElement | null;
        if (nameInput) nameInput.value = fullDharmaName;

        this.callbacks.onOrdainPlayer?.(fullDharmaName, this.selectedRobeColor);
        this.callbacks.onChangePlayerName?.(fullDharmaName);

        hideOrdinationModal();
        zenAudio.playSingingBowl(528);
        this.appendChatMessage(
          "Chùa",
          `🎉 Cung thỉnh Thầy [${fullDharmaName}] chính thức xuất gia nhập chúng! Tóc phiền não đã đoạn trừ, đắp y Cà Sa giải thoát, đủ duyên thăng tòa Trụ Trì và Chư Tôn Cao Tăng! 🙏`,
        );
        this.updateAuthUI();
      } catch (err: any) {
        alert(err.message || "Có lỗi xảy ra trong quá trình thụ giới xuất gia.");
      }
    });

    // 18. NHIỆM VỤ CHẤP TÁC CÔNG QUẢ (CHÚ TIỂU TỊNH TÂM • VƯỜN AN LẠC)
    const openQuestsHandler = () => {
      this.closeTeleportMenu();
      this.openQuestModal();
    };
    document.getElementById("btn-open-quests")?.addEventListener("click", openQuestsHandler);
    document.getElementById("fqt-open-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      openQuestsHandler();
    });
    document.getElementById("floating-quest-tracker")?.addEventListener("click", () => {
      openQuestsHandler();
    });

    document.getElementById("modal-quests-close")?.addEventListener("click", () => {
      this.closeQuestModal();
    });
    const modalQuests = document.getElementById("modal-quests");
    modalQuests?.addEventListener("click", (e) => {
      if (e.target === modalQuests) {
        this.closeQuestModal();
      }
    });

    // Hủy nhiệm vụ xác nhận
    document.getElementById("modal-quest-cancel-close")?.addEventListener("click", () => {
      this.closeCancelConfirmModal();
    });
    document.getElementById("btn-quest-cancel-no")?.addEventListener("click", () => {
      this.closeCancelConfirmModal();
    });
    document.getElementById("btn-quest-cancel-yes")?.addEventListener("click", () => {
      this.confirmCancelQuest();
    });

    // Sự kiện Nút Thực Hiện Nhiệm Vụ 10s nổi tại hiện trường
    document.getElementById("btn-qap-start")?.addEventListener("click", () => {
      const q = this.currentNearQuest || templeQuestManager.getActiveQuest();
      if (!q) return;
      if (templeQuestManager.isWorkDone()) {
        this.openQuestModal();
      } else {
        this.startQuestWork(q);
      }
    });

    // Phím tắt F: Thực hiện nhiệm vụ khi đứng trong vùng chấp tác
    window.addEventListener("keydown", (e) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          Boolean(target.closest("input, textarea")))
      ) {
        return;
      }

      if (e.key.toLowerCase() === "f") {
        const promptEl = document.getElementById("quest-action-prompt");
        if (promptEl && !promptEl.classList.contains("hidden")) {
          const q = this.currentNearQuest || templeQuestManager.getActiveQuest();
          if (q) {
            if (templeQuestManager.isWorkDone()) {
              this.openQuestModal();
            } else {
              this.startQuestWork(q);
            }
          }
        }
      }

      // Phím tắt E: Mở Tàng Kinh Các khi đứng gần tòa tháp
      if (e.key.toLowerCase() === "e") {
        if (this.isNearTangKinhCac) {
          const modal = document.getElementById("modal-tang-kinh-cac");
          if (!modal || modal.classList.contains("hidden")) {
            this.openTangKinhCacModal();
          }
        }
      }
    });

    // Khởi tạo hiển thị tracker ban đầu
    this.updateFloatingQuestTracker();

    // Khởi tạo sự kiện Tàng Kinh Các & Audio đọc kinh
    this.bindTangKinhCacEvents();
    this.setupSutraAudioSync();
  }

  // ─────────────────────────────────────────────
  // MODAL XIN QUẺ NGUYỆN ƯỚC AN LẠC
  // ─────────────────────────────────────────────
  // ─────────────────────────────────────────────
  // MODAL XIN QUẺ NGUYỆN ƯỚC AN LẠC
  // ─────────────────────────────────────────────
  public updateOracleUIButtonsOnly() {
    const count = dailyActivities.getDrawnOracleCount();
    const counterNumEl = document.getElementById("oracle-counter-num");
    if (counterNumEl) {
      counterNumEl.innerText = `${count}/5`;
      counterNumEl.style.color = count >= 5 ? "#ff7675" : "#2ecc71";
    }

    const catBtns = this.container.querySelectorAll(".oracle-cat-btn[data-oracle-cat]");
    catBtns.forEach((btn) => {
      const cat = btn.getAttribute("data-oracle-cat") as OracleCategory;
      const meta = ORACLE_CATEGORIES.find((c) => c.id === cat);
      if (!meta) return;

      const isDrawn = dailyActivities.hasDrawnOracleCategory(cat);
      const isActive = (cat === this.selectedOracleCategory);

      if (isDrawn) {
        btn.classList.add("drawn");
        btn.innerHTML = `${meta.icon} ${meta.name} <span class="cat-check-badge">✓</span>`;
      } else {
        btn.classList.remove("drawn");
        btn.innerHTML = `${meta.icon} ${meta.name}`;
      }

      if (isActive) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  public displayOracleStick(stick: any, isPreviouslyDrawn: boolean) {
    this.currentOracleStick = stick;

    const badgeEl = document.getElementById("oracle-card-badge");
    const numEl = document.getElementById("oracle-card-number");
    const titleEl = document.getElementById("oracle-card-title");
    const verseEl = document.getElementById("oracle-card-verse");
    const meaningEl = document.getElementById("oracle-card-meaning");
    const adviceEl = document.getElementById("oracle-card-advice");

    if (badgeEl)
      badgeEl.innerText = `✨ QUẺ ${stick.rank.toUpperCase()}`;
    if (numEl)
      numEl.innerText = `QUẺ ${stick.categoryName.toUpperCase()} SỐ ${stick.id}`;
    if (titleEl) titleEl.innerText = stick.title;
    if (verseEl) verseEl.innerText = `"${stick.poem}"`;
    if (meaningEl)
      meaningEl.innerText = `💡 Ý nghĩa & Vận thế: ${stick.interpretation}`;
    if (adviceEl)
      adviceEl.innerText = `🌿 Lời khuyên tu tập: ${stick.advice}`;

    const shakeView = document.getElementById("oracle-shake-view");
    const resultView = document.getElementById("oracle-result-view");
    if (shakeView) shakeView.classList.add("hidden");
    if (resultView) resultView.classList.remove("hidden");

    const acceptBtn = document.getElementById("btn-accept-oracle") as HTMLButtonElement | null;
    const reShakeBtn = document.getElementById("btn-re-shake-oracle") as HTMLButtonElement | null;

    if (isPreviouslyDrawn) {
      if (acceptBtn) {
        acceptBtn.innerText = "✓ Đã Tiếp Nhận Quẻ Hôm Nay (Reset lúc 00:00)";
        acceptBtn.disabled = true;
        acceptBtn.style.opacity = "0.75";
      }
      if (reShakeBtn) {
        reShakeBtn.innerText = "🎋 Xem / Thỉnh Quẻ Khác";
      }
    } else {
      if (acceptBtn) {
        acceptBtn.innerText = "🙏 Hoan Hỷ Thọ Nhận (+20 Điểm Công Đức)";
        acceptBtn.disabled = false;
        acceptBtn.style.opacity = "1";
      }
      if (reShakeBtn) {
        reShakeBtn.innerText = "🎋 Thỉnh Danh Mục Khác";
      }
    }

    this.updateOracleUIButtonsOnly();
  }

  public updateOracleUI() {
    this.updateOracleUIButtonsOnly();

    // Kiểm tra danh mục hiện tại và tổng số quẻ
    const isCurrentDrawn = dailyActivities.hasDrawnOracleCategory(this.selectedOracleCategory);
    const isAllDrawn = dailyActivities.hasDrawnAllOracleCategories();
    const curMeta = ORACLE_CATEGORIES.find((c) => c.id === this.selectedOracleCategory);

    const tubeTextEl = document.getElementById("bamboo-tube-text");
    const prayerPromptEl = document.getElementById("oracle-prayer-prompt");
    const shakeBtn = document.getElementById("btn-shake-tube") as HTMLButtonElement | null;

    if (isAllDrawn) {
      if (tubeTextEl) tubeTextEl.innerText = "HOÀN TẤT";
      if (prayerPromptEl) {
        prayerPromptEl.innerHTML = `🎉 <b>Công đức viên mãn!</b> Đạo hữu đã thỉnh trọn vẹn <b>5/5 quẻ</b> cát tường hôm nay (+100 Điểm Công Đức). Thân tâm an lạc, vạn sự hanh thông! Xin hẹn đạo hữu sau <b>00:00</b> đêm nay nhé. 🙏`;
        prayerPromptEl.style.color = "#ffe082";
      }
      if (shakeBtn) {
        shakeBtn.disabled = true;
        shakeBtn.classList.add("disabled");
        shakeBtn.innerText = "🎋 Đã thỉnh đủ 5 quẻ hôm nay (Hẹn ngày mai)";
      }
    } else if (isCurrentDrawn) {
      if (tubeTextEl) tubeTextEl.innerText = "ĐÃ THỈNH";
      if (prayerPromptEl) {
        prayerPromptEl.innerHTML = `🌸 Đạo hữu đã thỉnh Quẻ <b>${curMeta ? curMeta.name : ""}</b> hôm nay rồi! Nhấp vào để xem lại quẻ hoặc chọn các chủ đề còn lại phía trên nhé! 🙏`;
        prayerPromptEl.style.color = "#a8e6cf";
      }
      if (shakeBtn) {
        shakeBtn.disabled = false;
        shakeBtn.classList.remove("disabled");
        shakeBtn.innerText = `📜 Xem lại Quẻ ${curMeta ? curMeta.name : ""} đã thỉnh`;
      }
    } else {
      if (tubeTextEl) tubeTextEl.innerText = curMeta ? curMeta.tubeText : "AN LẠC";
      if (prayerPromptEl) {
        prayerPromptEl.innerText = curMeta ? curMeta.prayerPrompt : "";
        prayerPromptEl.style.color = "#ffffff";
      }
      if (shakeBtn) {
        shakeBtn.disabled = false;
        shakeBtn.classList.remove("disabled");
        shakeBtn.innerText = "🎋 Thành Tâm Lắc Ống Xăm";
      }
    }
  }

  public openOracleModal() {
    const modal = document.getElementById("modal-oracle");
    this.isShakingOracle = false;

    // Nếu danh mục hiện tại đã thỉnh, hiển thị luôn chi tiết thẻ quẻ đã xin!
    if (dailyActivities.hasDrawnOracleCategory(this.selectedOracleCategory)) {
      const savedStick = dailyActivities.getDrawnOracleStick(this.selectedOracleCategory);
      if (savedStick) {
        this.displayOracleStick(savedStick, true);
        if (modal) modal.classList.remove("hidden");
        return;
      }
      // Nếu chưa có stick lưu nhưng có danh mục còn trống, ưu tiên chọn danh mục trống
      const available = ORACLE_CATEGORIES.find((c) => !dailyActivities.hasDrawnOracleCategory(c.id));
      if (available) {
        this.selectedOracleCategory = available.id;
      }
    }

    const shakeView = document.getElementById("oracle-shake-view");
    const resultView = document.getElementById("oracle-result-view");
    if (shakeView) shakeView.classList.remove("hidden");
    if (resultView) resultView.classList.add("hidden");

    this.updateOracleUI();
    if (modal) modal.classList.remove("hidden");
  }

  public closeOracleModal() {
    const modal = document.getElementById("modal-oracle");
    if (modal) modal.classList.add("hidden");
  }

  public selectOracleCategory(category: OracleCategory) {
    this.selectedOracleCategory = category;

    // Nếu category này đã thỉnh, hiện ngay quẻ đã xin để người dùng đọc lại bất kỳ lúc nào!
    if (dailyActivities.hasDrawnOracleCategory(category)) {
      const savedStick = dailyActivities.getDrawnOracleStick(category);
      if (savedStick) {
        this.displayOracleStick(savedStick, true);
        return;
      }
    }

    // Nếu chưa thỉnh, chuyển về màn hình lắc ống xăm
    const shakeView = document.getElementById("oracle-shake-view");
    const resultView = document.getElementById("oracle-result-view");
    if (shakeView) shakeView.classList.remove("hidden");
    if (resultView) resultView.classList.add("hidden");

    this.updateOracleUI();
  }

  public shakeOracleTube() {
    if (this.isShakingOracle) return;

    // Nếu category này đã thỉnh và người dùng bấm nút xem lại:
    if (dailyActivities.hasDrawnOracleCategory(this.selectedOracleCategory)) {
      const savedStick = dailyActivities.getDrawnOracleStick(this.selectedOracleCategory);
      if (savedStick) {
        this.displayOracleStick(savedStick, true);
        return;
      }
    }

    // Kiểm tra giới hạn 5 quẻ khác nhau mỗi ngày
    if (dailyActivities.hasDrawnAllOracleCategories()) {
      alert("Đạo hữu đã thỉnh đủ 5 quẻ cát tường hôm nay rồi! Kính chúc vạn sự như ý, hẹn gặp lại đạo hữu sau 00:00 đêm nay. 🙏");
      return;
    }

    this.isShakingOracle = true;

    const tube = document.getElementById("bamboo-tube");
    const shakeBtn = document.getElementById(
      "btn-shake-tube",
    ) as HTMLButtonElement | null;
    if (tube) tube.classList.add("shaking");
    if (shakeBtn) {
      shakeBtn.disabled = true;
      shakeBtn.innerText = "🎋 Đang lắc quẻ...";
    }

    zenAudio.playBambooRattle();

    setTimeout(() => {
      if (tube) tube.classList.remove("shaking");
      this.currentOracleStick = getOracleStickByCategory(this.selectedOracleCategory);
      this.displayOracleStick(this.currentOracleStick, false);

      if (shakeBtn) {
        shakeBtn.disabled = false;
        shakeBtn.innerText = "🎋 Thành Tâm Lắc Ống Xăm";
      }
      this.isShakingOracle = false;
    }, 1100);
  }

  // ─────────────────────────────────────────────
  // HỆ THỐNG TỤNG KINH & TRÌ CHÚ (MÕ GỖ & VOICE AI)
  // ─────────────────────────────────────────────
  public openChantingModal() {
    const modal = document.getElementById("modal-chanting");
    if (modal) {
      modal.classList.remove("hidden");
      zenAudio.playLotusSound();
    }
    // Dịu bớt nhạc nền để tiếng tụng kinh và tiếng gõ mõ rõ ràng nhất
    zenBackgroundMusic.setDucked(true);
    document.body.classList.add("chanting-mode-active");
    this.callbacks.onStartChanting?.();
    this.renderChantTabs();
    this.updateChantingUI();
  }

  public closeChantingModal() {
    const modal = document.getElementById("modal-chanting");
    if (modal) {
      modal.classList.add("hidden");
    }
    document.body.classList.remove("chanting-mode-active");
    this.stopAutoChanting();
    // Phục hồi âm lượng nhạc nền bình thường
    zenBackgroundMusic.setDucked(false);
    this.callbacks.onStopChanting?.();
  }

  public renderChantTabs() {
    const dropdown = document.getElementById("chant-select-dropdown") as HTMLSelectElement | null;
    if (!dropdown) return;
    dropdown.innerHTML = CHANT_DATABASE.map((item, idx) => `
      <option value="${idx}" ${idx === this.currentChantIndex ? "selected" : ""}>
        ${item.icon} ${item.name} (${item.verses.length} câu)
      </option>
    `).join("");

    dropdown.onchange = () => {
      const idx = parseInt(dropdown.value || "0", 10);
      this.selectChant(idx);
    };
  }

  public selectChant(index: number) {
    if (index < 0 || index >= CHANT_DATABASE.length) return;
    this.stopAutoChanting();
    this.currentChantIndex = index;
    this.currentVerseIndex = 0;
    this.chantLoopCount = 0;

    const dropdown = document.getElementById("chant-select-dropdown") as HTMLSelectElement | null;
    if (dropdown && dropdown.value !== index.toString()) {
      dropdown.value = index.toString();
    }

    this.updateChantingUI();
  }

  public updateChantingUI() {
    const chant = CHANT_DATABASE[this.currentChantIndex];
    if (!chant) return;

    const dropdown = document.getElementById("chant-select-dropdown") as HTMLSelectElement | null;
    if (dropdown && dropdown.value !== this.currentChantIndex.toString()) {
      dropdown.value = this.currentChantIndex.toString();
    }

    const verseCounter = document.getElementById("chant-verse-counter");
    const loopCounter = document.getElementById("chant-loop-counter");

    if (verseCounter) verseCounter.innerText = `${this.currentVerseIndex + 1} / ${chant.verses.length}`;
    if (loopCounter) loopCounter.innerText = `${this.chantLoopCount} biến`;

    // Teleprompter lines
    const prevEl = document.getElementById("chant-verse-prev");
    const currTextEl = document.getElementById("chant-verse-text");
    const nextEl = document.getElementById("chant-verse-next");

    const prevVerse = this.currentVerseIndex > 0 ? chant.verses[this.currentVerseIndex - 1] : "(Khởi đầu bài kinh)";
    const currVerse = chant.verses[this.currentVerseIndex] || "";
    const nextVerse = this.currentVerseIndex < chant.verses.length - 1 ? chant.verses[this.currentVerseIndex + 1] : "(Hoàn thành biến kinh - hồi hướng)";

    if (prevEl) prevEl.innerText = prevVerse;
    if (currTextEl) currTextEl.innerText = currVerse;
    if (nextEl) nextEl.innerText = nextVerse;
  }

  public triggerStrikeVisualEffects() {
    zenAudio.playWoodenFish();

    const fishBtn = document.getElementById("btn-strike-fish");
    const anchor = document.getElementById("merit-float-anchor");

    if (fishBtn) {
      fishBtn.classList.remove("bouncing");
      void fishBtn.offsetWidth;
      fishBtn.classList.add("bouncing");
    }

    if (anchor) {
      const floatEl = document.createElement("div");
      floatEl.className = "merit-float-text";
      floatEl.innerText = "+1 Công Đức ✨";
      anchor.appendChild(floatEl);
      setTimeout(() => {
        floatEl.remove();
      }, 750);
    }
  }

  public strikeWoodenFish() {
    const currentChant = CHANT_DATABASE[this.currentChantIndex];
    if (!currentChant) return;

    const verseText = currentChant.verses[this.currentVerseIndex];

    this.triggerStrikeVisualEffects();

    // Thông báo cho nhân vật 3D và SpeechBubble
    this.callbacks.onChantVerse?.(verseText, currentChant.name);

    // Nếu bật giọng đọc AI và đang bấm thủ công (không trong chế độ auto)
    if (this.isChantVoiceEnabled && !this.isAutoChanting) {
      chantingVoiceEngine.speak(verseText);
    }

    // Chuyển sang câu tiếp theo
    this.advanceVerse();
  }

  public advanceVerse() {
    const currentChant = CHANT_DATABASE[this.currentChantIndex];
    if (!currentChant) return;

    this.currentVerseIndex++;

    if (this.currentVerseIndex >= currentChant.verses.length) {
      this.chantLoopCount++;
      this.currentVerseIndex = 0;
      zenAudio.playTempleBell();
      this.incrementCamLo(5, `Hoàn thành 1 biến ${currentChant.name}`);
      this.appendChatMessage(
        "Chùa",
        `📿 Đạo hữu vừa hoàn thành trọn vẹn 1 biến kinh ${currentChant.name} (+5 Điểm Công Đức). Thân tâm an lạc, công đức vô lượng! 🙏`
      );
    }

    this.updateChantingUI();
  }

  public toggleAutoChanting() {
    if (this.isAutoChanting) {
      this.stopAutoChanting();
    } else {
      this.startAutoChanting();
    }
  }

  public startAutoChanting() {
    this.isAutoChanting = true;
    const btn = document.getElementById("btn-toggle-auto-chant");
    const icon = document.getElementById("auto-chant-icon");
    const text = document.getElementById("auto-chant-text");
    if (btn) btn.classList.add("active");
    if (icon) icon.innerText = "⏸️";
    if (text) text.innerText = "Tạm Dừng";

    this.runAutoChantStep();
  }

  public stopAutoChanting() {
    this.isAutoChanting = false;
    if (this.autoChantTimer) {
      clearTimeout(this.autoChantTimer);
      this.autoChantTimer = undefined;
    }
    chantingVoiceEngine.stop();

    const btn = document.getElementById("btn-toggle-auto-chant");
    const icon = document.getElementById("auto-chant-icon");
    const text = document.getElementById("auto-chant-text");
    if (btn) btn.classList.remove("active");
    if (icon) icon.innerText = "▶️";
    if (text) text.innerText = "Tự Động Tụng";
  }

  public runAutoChantStep() {
    if (!this.isAutoChanting) return;

    const currentChant = CHANT_DATABASE[this.currentChantIndex];
    if (!currentChant) return;

    const verseText = currentChant.verses[this.currentVerseIndex];

    this.triggerStrikeVisualEffects();
    this.callbacks.onChantVerse?.(verseText, currentChant.name);

    if (this.isChantVoiceEnabled) {
      chantingVoiceEngine.speak(
        verseText,
        () => {
          if (!this.isAutoChanting) return;
          const breathDelay =
            this.chantSpeedMode === "slow"
              ? 500
              : this.chantSpeedMode === "fast"
              ? 150
              : 280;
          this.autoChantTimer = window.setTimeout(() => {
            if (this.isAutoChanting) {
              this.advanceVerse();
              this.runAutoChantStep();
            }
          }, breathDelay);
        },
        () => {
          if (!this.isAutoChanting) return;
          this.autoChantTimer = window.setTimeout(() => {
            if (this.isAutoChanting) {
              this.advanceVerse();
              this.runAutoChantStep();
            }
          }, 900);
        }
      );
    } else {
      const intervalDelay =
        this.chantSpeedMode === "slow"
          ? 2200
          : this.chantSpeedMode === "fast"
          ? 950
          : 1500;
      this.autoChantTimer = window.setTimeout(() => {
        if (this.isAutoChanting) {
          this.advanceVerse();
          this.runAutoChantStep();
        }
      }, intervalDelay);
    }
  }

  public toggleChantVoice() {
    this.isChantVoiceEnabled = !this.isChantVoiceEnabled;
    chantingVoiceEngine.setVoiceEnabled(this.isChantVoiceEnabled);

    const btn = document.getElementById("btn-toggle-chant-voice");
    const icon = document.getElementById("chant-voice-icon");
    const text = document.getElementById("chant-voice-text");
    if (btn) {
      btn.classList.toggle("active", this.isChantVoiceEnabled);
    }
    if (icon) icon.innerText = this.isChantVoiceEnabled ? "🔊" : "🔇";
    if (text) text.innerText = this.isChantVoiceEnabled ? "AI Đọc" : "AI Tắt";
  }

  public setChantSpeed(speed: "slow" | "normal" | "fast") {
    this.chantSpeedMode = speed;
    const rate = speed === "slow" ? 0.95 : speed === "fast" ? 1.35 : 1.15;
    chantingVoiceEngine.setRate(rate);

    const speedBtns = this.container.querySelectorAll(".speed-btn[data-speed]");
    speedBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-speed") === speed);
    });
  }

  public restartChant() {
    this.stopAutoChanting();
    this.currentVerseIndex = 0;
    this.updateChantingUI();
  }

  public setInsideMainHall(isInside: boolean) {
    if (this.isInsideHall === isInside) return;
    this.isInsideHall = isInside;
    const hud = document.getElementById("mainhall-hud");
    if (hud) {
      if (isInside) {
        hud.classList.remove("hidden");
      } else {
        hud.classList.add("hidden");
      }
    }

    const medBtn = this.container.querySelector('.action-btn[data-action="meditate"]');
    const prayBtn = this.container.querySelector('.action-btn[data-action="pray"]');
    if (medBtn) {
      medBtn.classList.toggle("area-restricted", !isInside);
      medBtn.setAttribute(
        "title",
        isInside
          ? "Tọa thiền tĩnh tâm trên bồ đoàn"
          : "Ngồi thiền (Chỉ thực hiện trong Chính Điện)",
      );
    }
    if (prayBtn) {
      prayBtn.classList.toggle("area-restricted", !isInside);
      prayBtn.setAttribute(
        "title",
        isInside
          ? "Chắp tay đảnh lễ Tam Thế Phật"
          : "Lễ Phật (Chỉ thực hiện trong Chính Điện)",
      );
    }
  }

  public setNearPond(isNear: boolean) {
    if (this.isNearPond === isNear) return;
    this.isNearPond = isNear;
    const lanternBtn = document.getElementById("btn-open-lantern");
    if (lanternBtn) {
      lanternBtn.classList.toggle("area-restricted", !isNear);
      lanternBtn.setAttribute(
        "title",
        isNear
          ? "Thả hoa đăng trên hồ sen"
          : "Thả hoa đăng (Chỉ thực hiện tại khu vực Hồ Sen)",
      );
    }
  }

  public getIsMeditating(): boolean {
    return this.isMeditating;
  }

  public toggleMeditation() {
    if (this.isMeditating) {
      this.stopMeditation();
    } else {
      // Yêu cầu main chọn bồ đoàn và bắt đầu tọa thiền
      this.callbacks.onActionSelect("meditate");
    }
  }

  public startMeditation() {
    // Nếu đang trong trạng thái thiền và đã có timer chạy thì không khởi tạo lặp
    if (this.isMeditating && this.meditateInterval) {
      return;
    }
    this.isMeditating = true;
    if (this.meditateInterval) {
      clearInterval(this.meditateInterval);
      this.meditateInterval = null;
    }
    this.meditateTimer = 0;
    const timeDisplay = document.getElementById("zen-time");
    if (timeDisplay) timeDisplay.innerText = "00:00";
    const card = document.getElementById("meditate-timer-card");
    if (card) card.classList.remove("hidden-card");

    if (!zenBackgroundMusic.getIsPlaying()) {
      zenBackgroundMusic.start();
    }
    zenAudio.playSingingBowl(432);

    this.meditateInterval = window.setInterval(() => {
      this.meditateTimer++;
      const mins = Math.floor(this.meditateTimer / 60)
        .toString()
        .padStart(2, "0");
      const secs = (this.meditateTimer % 60).toString().padStart(2, "0");
      const el = document.getElementById("zen-time");
      if (el) el.innerText = `${mins}:${secs}`;
    }, 1000);
  }

  public stopMeditation() {
    if (!this.isMeditating && this.meditateInterval === null) return;
    this.isMeditating = false;
    if (this.meditateInterval) {
      clearInterval(this.meditateInterval);
      this.meditateInterval = null;
    }
    this.meditateTimer = 0;
    const timeDisplay = document.getElementById("zen-time");
    if (timeDisplay) timeDisplay.innerText = "00:00";
    const card = document.getElementById("meditate-timer-card");
    if (card) card.classList.add("hidden-card");
    this.callbacks.onActionSelect("idle");
  }

  // ─────────────────────────────────────────────
  // MODAL BẢNG VÀNG CÔNG ĐỨC & TRỤ TRÌ
  // ─────────────────────────────────────────────
  public openLeaderboardModal() {
    const modal = document.getElementById("modal-leaderboard");
    if (modal) {
      modal.classList.remove("hidden");
      zenAudio.playLotusSound();
    }
    // Gửi yêu cầu cập nhật dữ liệu bảng xếp hạng mới nhất từ máy chủ
    network.requestLeaderboard();
  }

  public closeLeaderboardModal() {
    const modal = document.getElementById("modal-leaderboard");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  public setPlayerInfo(name: string, gender: "male" | "female") {
    const cleanName = (name || "").replace(/\s*#\d+$/, "").trim();
    this.playerName = cleanName;
    this.playerGender = gender;
    const myNameEl = document.getElementById("my-standing-name");
    if (myNameEl) myNameEl.innerText = cleanName;
    const nameInput = document.getElementById("input-character-name") as HTMLInputElement | null;
    if (nameInput) nameInput.value = cleanName;

    const saved = getSavedMeritPoints(cleanName);
    if (saved > 0 || this.getMeritPoints() === 0) {
      this.setMeritPoints(saved);
    }
  }

  public setPlayerName(name: string) {
    const cleanName = (name || "").replace(/\s*#\d+$/, "").trim();
    this.playerName = cleanName;
    const myNameEl = document.getElementById("my-standing-name");
    if (myNameEl) myNameEl.innerText = cleanName;
    const nameInput = document.getElementById("input-character-name") as HTMLInputElement | null;
    if (nameInput) nameInput.value = cleanName;

    const saved = getSavedMeritPoints(cleanName);
    if (saved > 0 || this.getMeritPoints() === 0) {
      this.setMeritPoints(saved);
    }
  }

  public updateRenameUIStatus() {
    const noteEl = document.getElementById("name-limit-note");
    const saveBtn = document.getElementById("btn-save-name-inline") as HTMLButtonElement | null;
    const nameInput = document.getElementById("input-character-name") as HTMLInputElement | null;
    const canRename = dailyActivities.canRenameToday();

    if (noteEl) {
      if (canRename) {
        noteEl.className = "name-limit-note available";
        noteEl.innerHTML = `<span>✨</span> <span>Mỗi ngày được đổi pháp danh 1 lần (Hôm nay có thể đổi). Danh hiệu Trụ Trì / Cao Tăng luôn được giữ nguyên trọn vẹn!</span>`;
      } else {
        noteEl.className = "name-limit-note used";
        noteEl.innerHTML = `<span>⏳</span> <span>Hôm nay đạo hữu đã đổi pháp danh rồi (Đổi lại sau 00:00). Danh hiệu hiện tại vẫn giữ nguyên!</span>`;
      }
    }

    if (saveBtn) {
      if (canRename) {
        saveBtn.classList.remove("disabled");
        saveBtn.innerText = "Lưu Tên";
        saveBtn.title = "Lưu pháp danh mới";
      } else {
        saveBtn.classList.add("disabled");
        saveBtn.innerText = "Đã Đổi Hôm Nay";
        saveBtn.title = "Mỗi ngày chỉ được đổi pháp danh 1 lần. Hôm nay đạo hữu đã đổi rồi.";
      }
    }

    if (nameInput) {
      if (canRename) {
        nameInput.classList.remove("disabled");
        nameInput.readOnly = false;
      } else {
        nameInput.classList.add("disabled");
        nameInput.readOnly = true;
      }
    }
  }

  public switchLeaderboardTab(tab: "monk" | "lay" | "donor") {
    this.activeLeaderboardTab = tab;
    const tabMonk = document.getElementById("tab-lb-monk");
    const tabLay = document.getElementById("tab-lb-lay");
    const tabDonor = document.getElementById("tab-lb-donor");
    const contentMonk = document.getElementById("leaderboard-tab-monk-content");
    const contentLay = document.getElementById("leaderboard-tab-lay-content");
    const contentDonor = document.getElementById("leaderboard-tab-donor-content");
    const ruleNote = document.getElementById("leaderboard-rule-note");

    tabMonk?.classList.toggle("active", tab === "monk");
    tabLay?.classList.toggle("active", tab === "lay");
    tabDonor?.classList.toggle("active", tab === "donor");

    contentMonk?.classList.toggle("hidden", tab !== "monk");
    contentLay?.classList.toggle("hidden", tab !== "lay");
    contentDonor?.classList.toggle("hidden", tab !== "donor");

    if (ruleNote) {
      if (tab === "monk") {
        ruleNote.innerHTML = "🪷 <b>Quy chế thiền môn:</b> Chỉ người <b>ĐÃ XUẤT GIA ĐI TU (Họ Thích)</b> mới được tấn phong <b>HÒA THƯỢNG TRỤ TRÌ</b> (Hạng 1) và <b>12 VỊ CAO TĂNG</b> (Hạng 2-13). Hạng 14 trở đi là <b>Hòa Thượng Tăng Chúng</b>. (Reset 00:00 hằng ngày).";
      } else if (tab === "lay") {
        ruleNote.innerHTML = "🌸 <b>Phước Báu Cư Sĩ:</b> Thiện Nam Tín Nữ tu học tại gia tích lũy Điểm Công Đức được tấn phong: <b>Chánh Hộ Pháp</b> (#1), <b>Phó Hộ Pháp & Đại Thiện Tri Thức</b> (#2-3), <b>Tinh Tấn Cư Sĩ</b> (#4-10), và <b>Thiện Tín Cư Sĩ</b>. (Reset 00:00 hằng ngày).";
      } else {
        ruleNote.innerHTML = "👑 <b>Bảng Vàng Đại Thí Chủ:</b> Tôn vinh các đạo hữu phát tâm cúng dường Tam Bảo nhiều nhất qua Hòm Công Đức. Tịnh tài hộ trì thiền môn thường trụ, phước đức lưu danh muôn thuở! 🙏✨";
      }
    }
  }

  public updateLeaderboardData(payload: LeaderboardPayload) {
    this.latestLeaderboard = payload;

    // 1. Ngày hôm nay (format YYYY-MM-DD -> DD/MM/YYYY)
    const dateFormatted = (() => {
      const parts = (payload.currentDate || "").split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return payload.currentDate || "";
    })();

    const monkDateEl = document.getElementById("leaderboard-monk-date");
    if (monkDateEl) monkDateEl.innerText = dateFormatted;
    const layDateEl = document.getElementById("leaderboard-lay-date");
    if (layDateEl) layDateEl.innerText = dateFormatted;

    // 2. Bắt đầu đếm ngược thời gian reset lúc 00:00
    this.startCountdown(payload.resetCountdownSec);

    // Lọc 3 danh sách riêng biệt
    const monasticList = payload.monasticLeaderboard ||
      payload.leaderboard?.filter((e) => e.isMonk || (e.name && e.name.startsWith("Thích "))) || [];
    const layList = payload.layLeaderboard ||
      payload.leaderboard?.filter((e) => !(e.isMonk || (e.name && e.name.startsWith("Thích ")))) || [];
    const donorList = payload.donationLeaderboard || [];

    // Cập nhật số lượng trên 3 tab
    const monkCountBadge = document.getElementById("monk-count-badge");
    if (monkCountBadge) monkCountBadge.innerText = monasticList.length.toString();
    const layCountBadge = document.getElementById("lay-count-badge");
    if (layCountBadge) layCountBadge.innerText = layList.length.toString();
    const donorCountBadge = document.getElementById("donor-count-badge");
    if (donorCountBadge) donorCountBadge.innerText = donorList.length.toString();

    // 3. ĐƯƠNG KIM HÒA THƯỢNG TRỤ TRÌ (BẢNG XUẤT GIA)
    const abbotNameEl = document.getElementById("abbot-display-name");
    const abbotScoreEl = document.getElementById("abbot-score-val");
    const abbotAvatarEl = document.getElementById("abbot-avatar-icon");
    const abbotPrivilegeEl = document.getElementById("abbot-privilege-text");

    if (payload.currentAbbot) {
      if (abbotNameEl) abbotNameEl.innerText = payload.currentAbbot.name;
      if (abbotScoreEl) abbotScoreEl.innerText = (payload.currentAbbot.camLoYesterday || 0).toLocaleString();
      if (abbotAvatarEl) abbotAvatarEl.innerText = payload.currentAbbot.avatar === "female" ? "🧕" : "🪷";
      if (abbotPrivilegeEl) abbotPrivilegeEl.innerText = "✨ Đặc quyền: Ngự Đại Pháp Tòa tối cao tại Chính Điện & mang Đại Hào Quang Kim Sắc";
    } else if (monasticList.length > 0 && monasticList[0].camLoToday > 0) {
      if (abbotNameEl) abbotNameEl.innerText = `${monasticList[0].name} (Dự kiến)`;
      if (abbotScoreEl) abbotScoreEl.innerText = monasticList[0].camLoToday.toLocaleString();
      if (abbotAvatarEl) abbotAvatarEl.innerText = "🪷";
      if (abbotPrivilegeEl) abbotPrivilegeEl.innerText = "🌟 Đang dẫn đầu Điểm Công Đức hôm nay - Dự kiến tấn phong Trụ Trì lúc 00:00 đêm nay";
    } else {
      if (abbotNameEl) abbotNameEl.innerText = "Đang Chờ Tấn Phong";
      if (abbotScoreEl) abbotScoreEl.innerText = "0";
      if (abbotAvatarEl) abbotAvatarEl.innerText = "🪷";
      if (abbotPrivilegeEl) abbotPrivilegeEl.innerText = "Chư Tăng tích lũy Điểm Công Đức cao nhất sẽ được tấn phong làm Hòa Thượng Trụ Trì!";
    }

    // 4. SPOTLIGHT CƯ SĨ TIÊU BIỂU (BẢNG CƯ SĨ)
    const layDisplayNameEl = document.getElementById("lay-display-name");
    const layScoreValEl = document.getElementById("lay-score-val");
    const layAvatarIconEl = document.getElementById("lay-avatar-icon");
    if (layList.length > 0) {
      if (layDisplayNameEl) layDisplayNameEl.innerText = layList[0].name;
      if (layScoreValEl) layScoreValEl.innerText = layList[0].camLoToday.toLocaleString();
      if (layAvatarIconEl) layAvatarIconEl.innerText = layList[0].avatar === "female" ? "🧕" : "🧘";
    } else {
      if (layDisplayNameEl) layDisplayNameEl.innerText = "Chưa có Chánh Hộ Pháp";
      if (layScoreValEl) layScoreValEl.innerText = "0";
      if (layAvatarIconEl) layAvatarIconEl.innerText = "🌸";
    }

    // 5. RENDER BẢNG 1: TĂNG ĐOÀN XUẤT GIA
    const monkContainer = document.getElementById("leaderboard-monk-items-container");
    if (monkContainer) {
      if (monasticList.length === 0) {
        monkContainer.innerHTML = `
          <div class="leaderboard-empty" style="text-align: center; color: #94a3b8; padding: 24px 0; font-size: 13.5px;">
            🪷 Hiện chưa có đạo hữu nào xuất gia đi tu.<br/>Hãy đến gặp Hòa Thượng Thích Trí Giác tại cửa chùa để làm lễ Xuống Tóc Xuất Gia! 🙏
          </div>
        `;
      } else {
        let monkHtml = "";
        monasticList.forEach((entry, idx) => {
          const rank = idx + 1;
          const displayName = (entry.name || "").replace(/\s*#\d+$/, "").trim();
          const isSelf = displayName === this.playerName || entry.name === this.playerName;
          const isSeniorMonk = rank >= 2 && rank <= 13;
          const rowClass = `leaderboard-row rank-${rank === 1 ? "1" : isSeniorMonk ? "senior" : "other"} ${isSelf ? "is-self" : ""}`;

          let rankBadge = `<span class="rank-num">#${rank}</span>`;
          let crownTag = "";

          if (rank === 1) {
            rankBadge = `<span class="rank-crown" title="Hòa Thượng Trụ Trì">👑 #1</span>`;
            crownTag = `<span class="top1-crown-tag monk-abbot-tag">👑 Hòa Thượng Trụ Trì</span>`;
          } else if (rank === 2) {
            rankBadge = `<span class="rank-medal silver">🥈 #2</span>`;
            crownTag = `<span class="senior-monk-tag">🪷 Đệ Nhất Cao Tăng</span>`;
          } else if (rank === 3) {
            rankBadge = `<span class="rank-medal bronze">🥉 #3</span>`;
            crownTag = `<span class="senior-monk-tag">🪷 Đệ Nhị Cao Tăng</span>`;
          } else if (rank <= 13) {
            rankBadge = `<span class="rank-num senior-rank">#${rank}</span>`;
            crownTag = `<span class="senior-monk-tag">🪷 Đệ ${rank - 1} Cao Tăng</span>`;
          } else {
            rankBadge = `<span class="rank-num">#${rank}</span>`;
            crownTag = `<span class="lay-disciple-tag monk-general-tag">🙏 Hòa Thượng Tăng Chúng</span>`;
          }

          const avatarIcon = "🧘";
          const selfTag = isSelf ? `<span class="self-tag">(Bạn)</span>` : "";

          monkHtml += `
            <div class="${rowClass}">
              <div class="lb-left">
                ${rankBadge}
                <span class="lb-avatar">${avatarIcon}</span>
                <div class="lb-name-group">
                  <span class="lb-player-name">${displayName} ${selfTag}</span>
                  ${crownTag}
                </div>
              </div>
              <div class="lb-right">
                <b class="lb-drops">${entry.camLoToday.toLocaleString()}</b>
                <span class="lb-unit">🪷</span>
              </div>
            </div>
          `;
        });
        monkContainer.innerHTML = monkHtml;
      }
    }

    // 6. RENDER BẢNG 2: CƯ SĨ TẠI GIA
    const layContainer = document.getElementById("leaderboard-lay-items-container");
    if (layContainer) {
      if (layList.length === 0) {
        layContainer.innerHTML = `
          <div class="leaderboard-empty" style="text-align: center; color: #94a3b8; padding: 24px 0; font-size: 13.5px;">
            🌸 Hôm nay chưa có cư sĩ nào tích lũy Điểm Công Đức.<br/>Hãy dâng hương, bái Phật hoặc thỉnh chuông để gieo duyên lành đầu tiên! 🙏
          </div>
        `;
      } else {
        let layHtml = "";
        layList.forEach((entry, idx) => {
          const rank = idx + 1;
          const displayName = (entry.name || "").replace(/\s*#\d+$/, "").trim();
          const isSelf = displayName === this.playerName || entry.name === this.playerName;
          const rowClass = `leaderboard-row rank-${rank === 1 ? "1" : rank <= 3 ? "2" : "other"} ${isSelf ? "is-self" : ""}`;

          let rankBadge = `<span class="rank-num">#${rank}</span>`;
          let titleTag = "";

          if (rank === 1) {
            rankBadge = `<span class="rank-crown lay-top-crown" title="Chánh Hộ Pháp">🌟 #1</span>`;
            titleTag = `<span class="top1-crown-tag lay-top1-tag">🌟 Chánh Hộ Pháp Cư Sĩ</span>`;
          } else if (rank === 2) {
            rankBadge = `<span class="rank-medal silver">🥈 #2</span>`;
            titleTag = `<span class="senior-monk-tag lay-top2-tag">🥈 Phó Hộ Pháp Cư Sĩ</span>`;
          } else if (rank === 3) {
            rankBadge = `<span class="rank-medal bronze">🥉 #3</span>`;
            titleTag = `<span class="senior-monk-tag lay-top3-tag">🥉 Đại Thiện Tri Thức</span>`;
          } else if (rank <= 10) {
            rankBadge = `<span class="rank-num lay-rank">#${rank}</span>`;
            titleTag = `<span class="lay-disciple-tag lay-top10-tag">🏵️ Tinh Tấn Cư Sĩ</span>`;
          } else {
            rankBadge = `<span class="rank-num">#${rank}</span>`;
            titleTag = `<span class="lay-disciple-tag lay-general-tag">🌿 Thiện Tín Cư Sĩ</span>`;
          }

          const avatarIcon = entry.avatar === "female" ? "🧕" : "🧘";
          const selfTag = isSelf ? `<span class="self-tag">(Bạn)</span>` : "";

          layHtml += `
            <div class="${rowClass}">
              <div class="lb-left">
                ${rankBadge}
                <span class="lb-avatar">${avatarIcon}</span>
                <div class="lb-name-group">
                  <span class="lb-player-name">${displayName} ${selfTag}</span>
                  ${titleTag}
                </div>
              </div>
              <div class="lb-right">
                <b class="lb-drops">${entry.camLoToday.toLocaleString()}</b>
                <span class="lb-unit">🪷</span>
              </div>
            </div>
          `;
        });
        layContainer.innerHTML = layHtml;
      }
    }

    // 6.5. RENDER BẢNG 3: ĐẠI THÍ CHỦ CÚNG DƯỜNG TAM BẢO (NẠP NHIỀU NHẤT)
    const donorContainer = document.getElementById("leaderboard-donor-items-container");
    const donorTop1NameEl = document.getElementById("donor-top1-name");
    const donorTop1AmountEl = document.getElementById("donor-top1-amount");
    const donorTop1DescEl = document.getElementById("donor-top1-desc");

    if (donorList.length > 0) {
      const top1 = donorList[0];
      const amtStr = Number(top1.totalDonated || 0).toLocaleString("vi-VN");
      if (donorTop1NameEl) donorTop1NameEl.innerText = top1.name;
      if (donorTop1AmountEl) donorTop1AmountEl.innerText = `${amtStr} VNĐ`;
      if (donorTop1DescEl) {
        donorTop1DescEl.innerHTML = `✨ Danh hiệu: <b>Đệ Nhất Kim Cương Đại Thí Chủ</b> • Đã cúng dường <b>${top1.donationCount || 1}</b> lần (+${(top1.totalCamLo || 0).toLocaleString()} Điểm Công Đức)`;
      }
    } else {
      if (donorTop1NameEl) donorTop1NameEl.innerText = "Chưa có Thí Chủ";
      if (donorTop1AmountEl) donorTop1AmountEl.innerText = "0 đ";
      if (donorTop1DescEl) {
        donorTop1DescEl.innerText = "Hãy là người đầu tiên phát tâm cúng dường nơi Hòm Công Đức để được lưu danh Bảng Vàng!";
      }
    }

    if (donorContainer) {
      if (donorList.length === 0) {
        donorContainer.innerHTML = `
          <div class="leaderboard-empty" style="text-align: center; color: #94a3b8; padding: 24px 0; font-size: 13.5px;">
            🪷 Hiện chưa có đạo hữu nào cúng dường Tam Bảo.<br/>Hãy chạm vào <b>Hòm Công Đức</b> bên cạnh bục Pháp Tòa để gieo duyên lành và lưu danh Bảng Vàng! 🙏✨
          </div>
        `;
      } else {
        let donorHtml = "";
        donorList.forEach((entry, idx) => {
          const rank = idx + 1;
          const displayName = (entry.name || "").replace(/\s*#\d+$/, "").trim();
          const isSelf = displayName === this.playerName || entry.name === this.playerName;
          const rowClass = `leaderboard-row rank-${rank === 1 ? "1" : rank <= 3 ? "senior" : "other"} ${isSelf ? "is-self" : ""}`;

          let rankBadge = `<span class="rank-num">#${rank}</span>`;
          let titleTag = "";

          if (rank === 1) {
            rankBadge = `<span class="rank-crown" title="Đệ Nhất Kim Cương Đại Thí Chủ">👑 #1</span>`;
            titleTag = `<span class="top1-crown-tag donor-top1-tag">👑 Đệ Nhất Đại Thí Chủ</span>`;
          } else if (rank === 2) {
            rankBadge = `<span class="rank-medal silver">🥈 #2</span>`;
            titleTag = `<span class="senior-monk-tag donor-top2-tag">🪷 Kim Cương Đại Thí Chủ</span>`;
          } else if (rank === 3) {
            rankBadge = `<span class="rank-medal bronze">🥉 #3</span>`;
            titleTag = `<span class="senior-monk-tag donor-top3-tag">✨ Vạn Duyên Thí Chủ</span>`;
          } else if (rank <= 10) {
            rankBadge = `<span class="rank-num senior-rank">#${rank}</span>`;
            titleTag = `<span class="lay-disciple-tag donor-top10-tag">🌸 Thượng Đẳng Thí Chủ</span>`;
          } else {
            rankBadge = `<span class="rank-num">#${rank}</span>`;
            titleTag = `<span class="lay-disciple-tag">🌿 Thí Chủ Hộ Trì</span>`;
          }

          const avatarIcon = "👑";
          const selfTag = isSelf ? `<span class="self-tag">(Bạn)</span>` : "";
          const amountStr = Number(entry.totalDonated || 0).toLocaleString("vi-VN");

          donorHtml += `
            <div class="${rowClass}">
              <div class="lb-left">
                ${rankBadge}
                <span class="lb-avatar">${avatarIcon}</span>
                <div class="lb-name-group">
                  <span class="lb-player-name">${displayName} ${selfTag}</span>
                  ${titleTag}
                </div>
              </div>
              <div class="lb-right donor-right">
                <b class="lb-drops donor-amount">${amountStr}</b>
                <span class="lb-unit donor-currency">VNĐ</span>
              </div>
            </div>
          `;
        });
        donorContainer.innerHTML = donorHtml;
      }
    }

    // 7. CẬP NHẬT THẺ CÔNG ĐỨC CÁ NHÂN (MY STANDING)
    const myNameEl = document.getElementById("my-standing-name");
    const myRankEl = document.getElementById("my-standing-rank");
    const myDropsEl = document.getElementById("my-standing-drops");

    const cleanName = (this.playerName || "").replace(/\s*#\d+$/, "").trim();
    if (myNameEl) myNameEl.innerText = cleanName;

    const isCurrentMonk = this.playerName.startsWith("Thích ") || cleanName.startsWith("Thích ") || authService.isMonk();
    const isLogged = authService.isLoggedIn();

    if (isCurrentMonk) {
      const myMonkIdx = monasticList.findIndex((e) => {
        const entryClean = (e.name || "").replace(/\s*#\d+$/, "").trim();
        return entryClean === cleanName || e.name === this.playerName;
      });
      if (myMonkIdx !== -1) {
        const rank = myMonkIdx + 1;
        const entry = monasticList[myMonkIdx];
        if (myRankEl) {
          if (rank === 1) {
            myRankEl.innerText = "👑 Hạng #1 - Hòa Thượng Trụ Trì";
          } else if (rank === 2) {
            myRankEl.innerText = "🪷 Hạng #2 - Đệ Nhất Cao Tăng";
          } else if (rank === 3) {
            myRankEl.innerText = "🪷 Hạng #3 - Đệ Nhị Cao Tăng";
          } else if (rank <= 13) {
            myRankEl.innerText = `🪷 Hạng #${rank} - Đệ ${rank - 1} Cao Tăng`;
          } else {
            myRankEl.innerText = `🙏 Hạng #${rank} - Hòa Thượng Tăng Chúng`;
          }
        }
        const serverPoints = typeof entry.camLoToday === "number" ? entry.camLoToday : 0;
        if (myDropsEl) myDropsEl.innerText = serverPoints.toLocaleString();
        this.setMeritPoints(serverPoints);
      } else {
        if (myRankEl) myRankEl.innerText = "🪷 Tăng Đoàn: Chưa có điểm hôm nay";
        const curPoints = isLogged ? getSavedMeritPoints(this.playerName) : 0;
        if (myDropsEl) myDropsEl.innerText = curPoints.toLocaleString();
        this.setMeritPoints(curPoints);
      }
    } else {
      const myLayIdx = layList.findIndex((e) => {
        const entryClean = (e.name || "").replace(/\s*#\d+$/, "").trim();
        return entryClean === cleanName || e.name === this.playerName;
      });
      if (myLayIdx !== -1) {
        const rank = myLayIdx + 1;
        const entry = layList[myLayIdx];
        if (myRankEl) {
          if (rank === 1) {
            myRankEl.innerText = "🌟 Hạng #1 - Chánh Hộ Pháp Cư Sĩ";
          } else if (rank === 2) {
            myRankEl.innerText = "🥈 Hạng #2 - Phó Hộ Pháp Cư Sĩ";
          } else if (rank === 3) {
            myRankEl.innerText = "🥉 Hạng #3 - Đại Thiện Tri Thức";
          } else if (rank <= 10) {
            myRankEl.innerText = `🏵️ Hạng #${rank} - Tinh Tấn Cư Sĩ`;
          } else {
            myRankEl.innerText = `🌿 Hạng #${rank} - Thiện Tín Cư Sĩ`;
          }
        }
        const serverPoints = typeof entry.camLoToday === "number" ? entry.camLoToday : 0;
        if (myDropsEl) myDropsEl.innerText = serverPoints.toLocaleString();
        this.setMeritPoints(serverPoints);
      } else {
        if (myRankEl) myRankEl.innerText = "🌸 Cư Sĩ: Chưa có điểm hôm nay";
        const curPoints = isLogged ? getSavedMeritPoints(this.playerName) : 0;
        if (myDropsEl) myDropsEl.innerText = curPoints.toLocaleString();
        this.setMeritPoints(curPoints);
      }
    }
  }

  public startCountdown(seconds: number) {
    this.secondsUntilMidnight = Math.max(0, Math.floor(seconds));
    if (this.countdownTimerInterval) {
      clearInterval(this.countdownTimerInterval);
    }

    const updateDisplay = () => {
      const cdEl = document.getElementById("leaderboard-countdown");
      if (!cdEl) return;
      const h = Math.floor(this.secondsUntilMidnight / 3600).toString().padStart(2, "0");
      const m = Math.floor((this.secondsUntilMidnight % 3600) / 60).toString().padStart(2, "0");
      const s = (this.secondsUntilMidnight % 60).toString().padStart(2, "0");
      cdEl.innerText = `${h}h ${m}m ${s}s`;
    };

    updateDisplay();
    this.countdownTimerInterval = window.setInterval(() => {
      if (this.secondsUntilMidnight > 0) {
        this.secondsUntilMidnight--;
        updateDisplay();
      } else {
        if (this.countdownTimerInterval) clearInterval(this.countdownTimerInterval);
        network.requestLeaderboard();
      }
    }, 1000);
  }

  public getMeritPoints(): number {
    const el = document.getElementById("camlo-counter");
    if (el) {
      const parsed = parseInt(el.innerText.replace(/,/g, "") || "0", 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return getSavedMeritPoints(this.playerName);
  }

  public setMeritPoints(points: number) {
    const el = document.getElementById("camlo-counter");
    if (el) el.innerText = points.toLocaleString();
    saveMeritPoints(this.playerName, points);
    const myDropsEl = document.getElementById("my-standing-drops");
    if (myDropsEl) myDropsEl.innerText = points.toLocaleString();
  }

  public incrementCamLo(amount: number, reason?: string) {
    const cur = this.getMeritPoints();
    const newTotal = cur + amount;
    this.setMeritPoints(newTotal);

    // Gửi sự kiện kiếm Điểm Công Đức thời gian thực lên máy chủ
    const isMonk = this.playerName.startsWith("Thích ") || authService.isMonk();
    network.emitEarnCamLo(this.playerName, this.playerGender, amount, reason, isMonk);

    // Thông báo vào khung chat nếu có lý do
    if (reason) {
      this.appendChatMessage(
        "Hệ Thống",
        `🪷 Bạn vừa nhận được +${amount} Điểm Công Đức (${reason}).`,
      );
    }
  }

  public deductCamLo(amount: number, reason?: string) {
    const cur = this.getMeritPoints();
    const newTotal = Math.max(0, cur - amount);
    this.setMeritPoints(newTotal);

    // Gửi sự kiện khấu trừ Điểm Công Đức lên máy chủ
    network.emitDeductCamLo(this.playerName, amount, reason);

    // Thông báo vào khung chat nếu có lý do
    if (reason) {
      this.appendChatMessage(
        "Hệ Thống",
        `⚠️ Bạn bị trừ -${amount} Điểm Công Đức (${reason}).`,
      );
    }
  }

  public toggleChatBox(forceState?: boolean) {
    const chatContainer = document.getElementById("chat-container");
    const floatingBtn = document.getElementById("btn-open-chat-floating");
    const unreadDot = document.getElementById("chat-unread-dot");
    if (!chatContainer || !floatingBtn) return;

    const nextState = forceState !== undefined ? forceState : !this.isChatCollapsed;
    this.isChatCollapsed = nextState;

    if (this.isChatCollapsed) {
      chatContainer.classList.add("collapsed");
      floatingBtn.classList.remove("hidden");
      localStorage.setItem("chua_chat_collapsed", "true");
    } else {
      chatContainer.classList.remove("collapsed");
      floatingBtn.classList.add("hidden");
      if (unreadDot) unreadDot.classList.add("hidden");
      localStorage.setItem("chua_chat_collapsed", "false");
      const input = document.getElementById("chat-input") as HTMLInputElement;
      if (input && window.innerWidth > 768) {
        input.focus();
      }
    }
  }

  public appendChatMessage(author: string, msg: string) {
    const list = document.getElementById("chat-messages");
    if (!list) return;
    const row = document.createElement("div");
    const isSystem = author === "Hệ Thống" || author === "Chùa";
    row.className = isSystem ? "chat-msg system" : "chat-msg";

    if (isSystem) {
      row.innerHTML = `<span>🍃 <b>${author}:</b> ${msg}</span>`;
    } else {
      const isSelf = author === "Bạn";
      const authorClass = isSelf ? "chat-author self" : "chat-author";
      row.innerHTML = `<b class="${authorClass}">${author}:</b> <span>${msg}</span>`;
    }

    list.appendChild(row);
    list.scrollTop = list.scrollHeight;

    // Nếu khung chat đang thu gọn và có tin nhắn mới không phải do mình gửi, bật chấm thông báo đỏ trên nút nổi
    if (this.isChatCollapsed && author !== "Bạn") {
      const unreadDot = document.getElementById("chat-unread-dot");
      if (unreadDot) {
        unreadDot.classList.remove("hidden");
      }
    }
  }

  public showInspectLanternModal(
    lanternId: string,
    author: string,
    wish: string,
    rejoices: number,
  ) {
    const modal = document.getElementById("modal-inspect-lantern");
    const nameEl = document.getElementById("inspect-author-name");
    const wishEl = document.getElementById("inspect-wish-content");
    const countEl = document.getElementById("inspect-rejoice-count");
    const actionBtn = document.getElementById("btn-rejoice-action");

    if (nameEl) nameEl.innerText = author;
    if (wishEl) wishEl.innerText = `"${wish}"`;
    if (countEl) countEl.innerText = rejoices.toString();

    if (actionBtn) {
      actionBtn.onclick = () => {
        zenAudio.playLotusSound();
        this.callbacks.onRejoiceLantern(lanternId);
        rejoices++;
        if (countEl) countEl.innerText = rejoices.toString();
        actionBtn.innerText = "🌸 Đã Tùy Hỷ!";
        setTimeout(() => modal?.classList.add("hidden"), 1000);
      };
    }

    modal?.classList.remove("hidden");
  }

  public updateFps(fps: number) {
    const el = document.getElementById("fps-counter");
    if (el) el.textContent = fps.toString();
    const badge = document.getElementById("fps-badge");
    if (badge) {
      if (fps >= 45) {
        badge.style.color = "#2ecc71";
        badge.style.borderColor = "rgba(46, 204, 113, 0.4)";
      } else if (fps >= 28) {
        badge.style.color = "#f1c40f";
        badge.style.borderColor = "rgba(241, 196, 15, 0.4)";
      } else {
        badge.style.color = "#e74c3c";
        badge.style.borderColor = "rgba(231, 76, 60, 0.4)";
      }
    }
  }

  // ─────────────────────────────────────────────
  // MENU VIẾNG CẢNH CHÙA (ĐÓNG / MỞ GỌN GÀNG)
  // ─────────────────────────────────────────────
  public toggleTeleportMenu() {
    const panel = document.getElementById("teleport-dropdown-panel");
    if (!panel) return;
    if (panel.classList.contains("hidden")) {
      this.openTeleportMenu();
    } else {
      this.closeTeleportMenu();
    }
  }

  public openTeleportMenu() {
    const panel = document.getElementById("teleport-dropdown-panel");
    const trigger = document.getElementById("btn-teleport-menu-toggle");
    const arrow = document.getElementById("teleport-menu-arrow");
    const navBar = document.getElementById("top-nav-bar");
    if (panel) panel.classList.remove("hidden");
    if (trigger) trigger.classList.add("active");
    if (arrow) arrow.innerText = "▴";
    if (navBar) navBar.classList.add("menu-open");
  }

  public closeTeleportMenu() {
    const panel = document.getElementById("teleport-dropdown-panel");
    const trigger = document.getElementById("btn-teleport-menu-toggle");
    const arrow = document.getElementById("teleport-menu-arrow");
    const navBar = document.getElementById("top-nav-bar");
    if (panel) panel.classList.add("hidden");
    if (trigger) trigger.classList.remove("active");
    if (arrow) arrow.innerText = "▾";
    if (navBar) navBar.classList.remove("menu-open");
  }

  // ─────────────────────────────────────────────
  // PHÒNG CHIÊM BÁI ONLINE (KHÔNG GIỚI HẠN SỐ LƯỢNG)
  // ─────────────────────────────────────────────
  private currentRoomPlayerCount: number = 1;

  public updateRoomPlayerCount(current: number, _max?: number) {
    this.currentRoomPlayerCount = Math.max(1, current);
    const el = document.getElementById("room-player-count");
    const badge = document.getElementById("btn-room-count-badge");
    if (el) el.innerText = `${this.currentRoomPlayerCount}`;
    if (badge) {
      badge.title = `Số lượng đạo hữu đang cùng chiêm bái, tu học: ${this.currentRoomPlayerCount} người`;
      badge.classList.remove("room-full", "room-near-full");
    }
  }

  public showRoomFullModal(message?: string, _max?: number) {
    const msgEl = document.getElementById("room-full-message");
    if (msgEl) {
      msgEl.innerHTML = message || `Phòng chiêm bái Chùa An Lạc đang chào đón chư vị đạo hữu cùng tu học.`;
    }
    // Không ép hiển thị modal room-full nữa vì đã bỏ giới hạn phòng
  }

  public showUpdateBanner(version?: string, message?: string) {
    const banner = document.getElementById("game-update-banner");
    const textEl = document.getElementById("update-banner-text");
    if (banner) {
      if (textEl) {
        textEl.textContent = message || `🌸 Chùa An Lạc vừa có bản cập nhật mới ${version ? `(v${version})` : ""}! Nhấn để làm mới.`;
      }
      banner.classList.remove("hidden");
    }
  }

  // ─────────────────────────────────────────────
  // AUTH & ORDINATION METHODS
  // ─────────────────────────────────────────────
  public openAuthModal() {
    const modal = document.getElementById("modal-auth");
    modal?.classList.remove("hidden");
    this.updateAuthUI();
  }

  public closeAuthModal() {
    const modal = document.getElementById("modal-auth");
    modal?.classList.add("hidden");
  }

  public isPlayerAbbot(): boolean {
    const name = this.playerName.trim().toLowerCase();
    const cleanName = name.replace(/\s*#\d+$/, "");
    if (!name) return false;

    if (this.latestLeaderboard?.currentAbbot?.name) {
      const abbotName = this.latestLeaderboard.currentAbbot.name.trim().toLowerCase().replace(/\s*#\d+$/, "");
      if (abbotName === cleanName) return true;
    }

    const monastic = this.latestLeaderboard?.monasticLeaderboard;
    if (Array.isArray(monastic) && monastic.length > 0) {
      const topName = monastic[0]?.name?.trim().toLowerCase().replace(/\s*#\d+$/, "");
      if (topName === cleanName && (monastic[0]?.camLoToday > 0 || monastic[0]?.totalCamLo > 0)) {
        return true;
      }
    }
    return false;
  }

  public isPlayerCaoTang(): boolean {
    if (this.isPlayerAbbot()) return true;
    const name = this.playerName.trim().toLowerCase();
    const cleanName = name.replace(/\s*#\d+$/, "");
    if (!name) return false;

    if (Array.isArray(this.latestLeaderboard?.seniorMonks)) {
      for (const m of this.latestLeaderboard.seniorMonks) {
        if (m.name.trim().toLowerCase().replace(/\s*#\d+$/, "") === cleanName) {
          return true;
        }
      }
    }

    const monastic = this.latestLeaderboard?.monasticLeaderboard;
    if (Array.isArray(monastic)) {
      for (let i = 0; i < Math.min(13, monastic.length); i++) {
        if (monastic[i]?.name?.trim().toLowerCase().replace(/\s*#\d+$/, "") === cleanName) {
          return true;
        }
      }
    }

    const all = this.latestLeaderboard?.leaderboard;
    if (Array.isArray(all)) {
      for (let i = 0; i < Math.min(12, all.length); i++) {
        if (all[i]?.name?.trim().toLowerCase().replace(/\s*#\d+$/, "") === cleanName) {
          return true;
        }
      }
    }
    return false;
  }

  public updateOrdainButtonStatus() {
    const btn = document.getElementById("btn-hall-ordain");
    if (!btn) return;
    const isMonk = authService.isMonk() || this.playerName.startsWith("Thích ");
    if (isMonk) {
      btn.innerText = "👘 Thay Y Cà Sa";
      btn.title = "Thay đổi sắc áo Cà Sa hoằng pháp";
    } else {
      btn.innerText = "🪒 Xuất Gia Đi Tu";
      btn.title = "Gặp Hòa Thượng Thích Trí Giác để Xuống Tóc Đi Tu";
    }
  }

  public openOrdinationModal() {
    const isMonk = authService.isMonk() || this.playerName.startsWith("Thích ");

    if (!isMonk && !authService.isLoggedIn()) {
      const wantLogin = confirm(
        "Đạo hữu chưa Đăng Nhập tài khoản Google.\n\n" +
        "👉 Bấm 'OK' để mở khung Đăng Nhập (khuyên dùng để lưu danh vào Giới Điệp Tam Bảo lâu dài).\n" +
        "👉 Bấm 'Cancel' để tiếp tục Xuất Gia ngay trên thiết bị này."
      );
      if (wantLogin) {
        this.openAuthModal();
        return;
      }
    }

    const modal = document.getElementById("modal-ordination");
    modal?.classList.remove("hidden");

    const namingSection = document.getElementById("ordination-dharma-naming-section");
    const alreadyMonkSection = document.getElementById("ordination-already-monk-section");
    const currentDharmaText = document.getElementById("ordination-current-dharma-text");
    const modalTitle = modal?.querySelector(".modal-header h3") as HTMLElement | null;
    const bannerIcon = modal?.querySelector(".ordination-icon") as HTMLElement | null;
    const bannerTitle = modal?.querySelector(".ordination-banner-text b") as HTMLElement | null;
    const bannerSubtitle = modal?.querySelector(".ordination-banner-text p") as HTMLElement | null;
    const btnConfirm = document.getElementById("btn-confirm-ordination");

    if (isMonk) {
      if (namingSection) namingSection.classList.add("hidden");
      if (alreadyMonkSection) alreadyMonkSection.classList.remove("hidden");
      if (currentDharmaText) currentDharmaText.innerText = this.playerName;
      if (modalTitle) modalTitle.innerText = "👘 Phẩm Phục Cà Sa — Thay Đổi Sắc Áo Tu Hành";
      if (bannerIcon) bannerIcon.innerText = "👘🪷";
      if (bannerTitle) bannerTitle.innerText = "Phẩm Phục Cà Sa Chốn Thiền Môn";
      if (bannerSubtitle) bannerSubtitle.innerText = "Thay đổi sắc y phục tương ứng phẩm vị tu tập của Thầy";
      if (btnConfirm) btnConfirm.innerHTML = "🙏 Khoác Sắc Áo Này";
    } else {
      if (namingSection) namingSection.classList.remove("hidden");
      if (alreadyMonkSection) alreadyMonkSection.classList.add("hidden");
      if (modalTitle) modalTitle.innerText = "🪷 Nghi Lễ Xuất Gia Thụ Giới — Xuống Tóc Đi Tu";
      if (bannerIcon) bannerIcon.innerText = "✂️🪷";
      if (bannerTitle) bannerTitle.innerText = "Đại Hùng Bảo Điện • Thế Phát Thụ Giới";
      if (bannerSubtitle) bannerSubtitle.innerText = "Cắt đứt ngàn sợi phiền não, khoác áo hoằng pháp Tam Bảo";
      if (btnConfirm) btnConfirm.innerHTML = "🙏 Thành Tâm Xuống Tóc Đi Tu";
    }

    // Xác định phẩm vị để mở khóa màu áo Cà Sa
    const isAbbot = this.isPlayerAbbot();
    const isCaoTang = this.isPlayerCaoTang();

    const cardYellow = document.getElementById("robe-choice-yellow");
    const cardBrown = document.getElementById("robe-choice-brown");
    const cardRed = document.getElementById("robe-choice-red");
    const brownTag = document.getElementById("robe-brown-tag");
    const redTag = document.getElementById("robe-red-tag");

    // 1. Hoàng Y Cà Sa (Vàng nghệ): Luôn mở cho mọi Tăng chúng
    cardYellow?.classList.remove("locked");

    // 2. Nâu Sồng Giải Thoát (Nâu): Chỉ mở cho Cao Tăng (Top 12) hoặc Trụ Trì
    if (isCaoTang) {
      cardBrown?.classList.remove("locked");
      if (brownTag) {
        brownTag.className = "robe-lock-tag tag-unlocked";
        brownTag.innerText = "🟢 Cao Tăng (Đã Mở)";
      }
    } else {
      cardBrown?.classList.add("locked");
      if (brownTag) {
        brownTag.className = "robe-lock-tag tag-locked";
        brownTag.innerText = "🔒 Chỉ Mở Cho Cao Tăng";
      }
    }

    // 3. Cà Sa Son Đỏ (Đỏ): Chỉ mở cho Đương Kim Hòa Thượng Trụ Trì
    if (isAbbot) {
      cardRed?.classList.remove("locked");
      if (redTag) {
        redTag.className = "robe-lock-tag tag-unlocked";
        redTag.innerText = "👑 Trụ Trì (Đã Mở)";
      }
    } else {
      cardRed?.classList.add("locked");
      if (redTag) {
        redTag.className = "robe-lock-tag tag-locked";
        redTag.innerText = "👑 Chỉ Dành Cho Trụ Trì";
      }
    }

    // Giữ nguyên sắc áo Cà Sa hiện tại người chơi đang mặc thay vì ép về màu vàng
    let currentRobe = 0xd97706;
    const savedRobe = localStorage.getItem("chua_an_lac_robe_color");
    if (savedRobe) {
      const parsed = parseInt(savedRobe.replace("0x", ""), 16);
      if (!isNaN(parsed) && parsed > 0) currentRobe = parsed;
    } else if (authService.getCurrentUser()?.robeColor) {
      currentRobe = authService.getCurrentUser()!.robeColor!;
    }

    cardYellow?.classList.remove("active");
    cardBrown?.classList.remove("active");
    cardRed?.classList.remove("active");

    if (currentRobe === 0x991b1b && isAbbot) {
      cardRed?.classList.add("active");
      this.selectedRobeColor = 0x991b1b;
    } else if (currentRobe === 0x8b5a2b && isCaoTang) {
      cardBrown?.classList.add("active");
      this.selectedRobeColor = 0x8b5a2b;
    } else {
      cardYellow?.classList.add("active");
      this.selectedRobeColor = 0xd97706;
    }

    const subInput = document.getElementById("input-dharma-subname") as HTMLInputElement | null;
    const dharmaPreviewText = document.getElementById("dharma-preview-text");
    if (subInput && dharmaPreviewText && !isMonk) {
      let defaultSub = this.playerName.replace(/^(Thích\s*)+/i, "").trim();
      if (!defaultSub || defaultSub.toLowerCase().includes("đạo hữu")) {
        defaultSub = "Tâm An";
      }
      subInput.value = defaultSub;
      dharmaPreviewText.innerText = `Thích ${defaultSub}`;
      setTimeout(() => {
        subInput.focus();
        subInput.select();
      }, 50);
    }
  }

  public closeOrdinationModal() {
    const modal = document.getElementById("modal-ordination");
    modal?.classList.add("hidden");
  }

  public setTimeBadge(time: "day" | "night") {
    this.currentTimeMode = time;
    const timeIcon = document.getElementById("time-badge-icon");
    const timeText = document.getElementById("time-badge-text");
    if (timeIcon) timeIcon.innerText = time === "night" ? "🌙" : "☀️";
    if (timeText) timeText.innerText = time === "night" ? "Ban Đêm" : "Ban Ngày";
  }

  public updateAuthUI() {
    const user = authService.getCurrentUser();
    const isLoggedIn = authService.isLoggedIn();
    const isMonk = authService.isMonk();

    const authBtnIcon = document.getElementById("auth-btn-icon");
    const authBtnText = document.getElementById("auth-btn-text");
    const unloggedView = document.getElementById("auth-unlogged-view");
    const loggedView = document.getElementById("auth-logged-view");
    const btnLogout = document.getElementById("btn-auth-logout");

    if (isLoggedIn && user) {
      if (authBtnIcon) authBtnIcon.innerText = isMonk ? "🪷" : "👤";
      if (authBtnText) {
        const displayName = user.dharmaName || user.name;
        const shortName = displayName.split(" ").slice(-2).join(" ");
        authBtnText.innerText = isMonk ? displayName : shortName;
      }

      if (unloggedView) unloggedView.classList.add("hidden");
      if (loggedView) loggedView.classList.remove("hidden");
      if (btnLogout) btnLogout.classList.remove("hidden");

      // Profile Card Info
      const avatarEl = document.getElementById("auth-profile-avatar");
      const nameEl = document.getElementById("auth-profile-name");
      const emailEl = document.getElementById("auth-profile-email");
      const providerTag = document.getElementById("auth-profile-provider-tag");
      const monkTag = document.getElementById("auth-profile-monk-tag");
      const statusBox = document.getElementById("auth-ordination-status");

      if (avatarEl) {
        if (isMonk) {
          avatarEl.innerHTML = "🪷";
        } else if (user.avatarUrl && (user.avatarUrl.startsWith("http") || user.avatarUrl.startsWith("//"))) {
          avatarEl.innerHTML = `<img src="${user.avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" referrerpolicy="no-referrer" />`;
        } else {
          avatarEl.innerText = "G";
        }
      }
      if (nameEl) nameEl.innerText = user.dharmaName || user.name;
      if (emailEl) emailEl.innerText = user.email;
      if (providerTag) {
        providerTag.innerText = "Google";
        providerTag.className = "tag-provider google";
      }
      if (monkTag) {
        if (isMonk) {
          monkTag.innerText = "🪷 Tăng Đoàn Xuất Gia";
          monkTag.className = "tag-monk ordained";
        } else {
          monkTag.innerText = "🌸 Cư Sĩ Tại Gia";
          monkTag.className = "tag-monk lay";
        }
      }

      if (statusBox) {
        if (isMonk) {
          statusBox.innerHTML = `
            <div class="ordination-card-success">
              <span class="ord-icon">📜</span>
              <div class="ord-info">
                <b>GIỚI ĐIỆP XUẤT GIA ĐÃ THỤ</b>
                <p>Pháp danh: <b>${user.dharmaName}</b> — Đã xuống tóc cạo đầu & khoác áo Cà Sa trang nghiêm. Đủ tư cách tấn phong Hòa Thượng Trụ Trì và Chư Tôn Cao Tăng.</p>
              </div>
            </div>
          `;
        } else {
          statusBox.innerHTML = `
            <div class="ordination-card-prompt">
              <div class="ord-prompt-text">
                <b>Đạo hữu chưa Xuất Gia Thụ Giới</b>
                <p>Gặp Hòa Thượng Thích Trí Giác trong Đại Hùng Bảo Điện hoặc nhấp nút dưới đây để xuống tóc đi tu.</p>
              </div>
              <button type="button" class="btn-ordain-from-profile" id="btn-ordain-from-profile">🪒 Xuất Gia Đi Tu Ngay</button>
            </div>
          `;
          document.getElementById("btn-ordain-from-profile")?.addEventListener("click", () => {
            this.closeAuthModal();
            this.openOrdinationModal();
          });
        }
      }
    } else {
      if (authBtnIcon) authBtnIcon.innerText = "🔑";
      if (authBtnText) authBtnText.innerText = "Đăng Nhập";

      if (unloggedView) unloggedView.classList.remove("hidden");
      if (loggedView) loggedView.classList.add("hidden");
      if (btnLogout) btnLogout.classList.add("hidden");
    }

    this.updateOrdainButtonStatus();
  }

  // ─────────────────────────────────────────────
  // HỆ THỐNG NHIỆM VỤ CHẤP TÁC CÔNG QUẢ (VƯỜN AN LẠC)
  // ─────────────────────────────────────────────
  public openQuestModal() {
    const modal = document.getElementById("modal-quests");
    if (modal) {
      modal.classList.remove("hidden");
      zenAudio.playLotusSound();
    }
    this.renderQuestUI();
  }

  public closeQuestModal() {
    const modal = document.getElementById("modal-quests");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  public openCancelConfirmModal() {
    const active = templeQuestManager.getActiveQuest();
    if (!active) return;
    const msgEl = document.getElementById("quest-cancel-confirm-msg");
    if (msgEl) {
      msgEl.innerHTML = `
        Đạo hữu có chắc chắn muốn hủy nhiệm vụ <b>"${active.title}"</b> không?<br>
        <b class="penalty-text">Lưu ý: Hủy nhiệm vụ sẽ bị trừ 10 Điểm Công Đức!</b>
      `;
    }
    const modal = document.getElementById("modal-quest-confirm-cancel");
    if (modal) modal.classList.remove("hidden");
  }

  public closeCancelConfirmModal() {
    const modal = document.getElementById("modal-quest-confirm-cancel");
    if (modal) modal.classList.add("hidden");
  }

  public confirmCancelQuest() {
    if (this.isWorkingOnQuest) {
      if (this.questWorkInterval) clearInterval(this.questWorkInterval);
      this.isWorkingOnQuest = false;
      document.getElementById("quest-working-overlay")?.classList.add("hidden");
      this.callbacks.onStopQuestWork?.();
    }
    const res = templeQuestManager.cancelQuest();
    this.closeCancelConfirmModal();
    if (res.success) {
      this.deductCamLo(res.penalty, `Hủy nhiệm vụ: ${res.quest?.title || "Công quả"}`);
      zenAudio.playSingingBowl(396);
      this.renderQuestUI();
      this.updateFloatingQuestTracker();
      this.callbacks.onQuestStateChange?.();
      this.appendChatMessage("Chú Tiểu Tịnh Tâm", res.message);
    }
  }

  public acceptQuest(questId: string) {
    const res = templeQuestManager.acceptQuest(questId);
    if (res.success) {
      zenAudio.playSingingBowl(528);
      this.appendChatMessage("Chú Tiểu Tịnh Tâm", res.message);
      this.renderQuestUI();
      this.updateFloatingQuestTracker();
      this.callbacks.onQuestStateChange?.();
    } else {
      alert(res.message);
    }
  }

  public completeQuest() {
    const res = templeQuestManager.completeQuest();
    if (res.success) {
      this.incrementCamLo(res.reward, `Hoàn thành công quả: ${res.quest?.title || "Nhiệm vụ"}`);
      zenAudio.playSingingBowl(528);
      this.appendChatMessage("Chú Tiểu Tịnh Tâm", res.message);
      this.renderQuestUI();
      this.updateFloatingQuestTracker();
      this.callbacks.onQuestStateChange?.();
    } else {
      alert(res.message);
    }
  }

  public getIsWorkingOnQuest(): boolean {
    return this.isWorkingOnQuest;
  }

  public startQuestWork(quest: TempleQuest) {
    if (this.isWorkingOnQuest) return;
    this.isWorkingOnQuest = true;

    // Ẩn modal và prompt hiện trường
    this.closeQuestModal();
    const promptEl = document.getElementById("quest-action-prompt");
    if (promptEl) promptEl.classList.add("hidden");

    // Khởi tạo overlay tiến trình
    const overlay = document.getElementById("quest-working-overlay");
    const titleEl = document.getElementById("qwo-title");
    const subEl = document.getElementById("qwo-sub");
    const iconEl = document.getElementById("qwo-icon");
    const timerBadge = document.getElementById("qwo-timer-badge");
    const fillEl = document.getElementById("qwo-progress-fill");

    if (titleEl) titleEl.innerText = `Đang ${quest.actionLabel}...`;
    if (subEl) subEl.innerText = `${quest.locationName} • Thân tâm an định, chấp tác thiền môn`;
    if (iconEl) iconEl.innerText = quest.icon;
    if (timerBadge) timerBadge.innerText = `10s`;
    if (fillEl) fillEl.style.width = `0%`;
    if (overlay) overlay.classList.remove("hidden");

    // Kích hoạt hoạt ảnh nhân vật (quét sân, lau dọn, làm việc...)
    if (this.callbacks.onStartQuestWork) {
      this.callbacks.onStartQuestWork(quest, 10);
    }

    const duration = 10;
    const startTime = performance.now();

    if (this.questWorkInterval) clearInterval(this.questWorkInterval);
    this.questWorkInterval = window.setInterval(() => {
      const elapsedSec = (performance.now() - startTime) / 1000;
      const progress = Math.min(1, elapsedSec / duration);
      const remaining = Math.max(0, Math.ceil(duration - elapsedSec));

      if (fillEl) fillEl.style.width = `${progress * 100}%`;
      if (timerBadge) timerBadge.innerText = `${remaining}s`;

      if (elapsedSec >= duration) {
        if (this.questWorkInterval) clearInterval(this.questWorkInterval);
        this.isWorkingOnQuest = false;
        if (overlay) overlay.classList.add("hidden");

        // Đánh dấu đã hoàn thành việc chấp tác
        templeQuestManager.setWorkDone(true);

        // Đưa nhân vật về tư thế an tĩnh
        if (this.callbacks.onStopQuestWork) {
          this.callbacks.onStopQuestWork();
        }
        if (this.callbacks.onQuestStateChange) {
          this.callbacks.onQuestStateChange();
        }

        zenAudio.playSingingBowl(528);

        this.appendChatMessage(
          "Chú Tiểu Tịnh Tâm",
          `🎉 Hoan hỷ tán thán! Đạo hữu đã làm xong 10 giây chấp tác "${quest.title}". Bấm nhận thưởng trong bảng nhiệm vụ để nhận +${QUEST_REWARD_POINTS} Điểm Công Đức! 🙏`
        );

        this.renderQuestUI();
        this.updateFloatingQuestTracker();

        // Mở bảng nhiệm vụ để người chơi bấm nút nhận thưởng
        this.openQuestModal();
      }
    }, 100);
  }

  public updateQuestZonePrompt(
    inZone: boolean,
    distance: number,
    quest: TempleQuest | null,
    isWorkDone: boolean
  ) {
    const promptEl = document.getElementById("quest-action-prompt");
    if (!promptEl) return;

    if (this.isWorkingOnQuest || !inZone || !quest) {
      promptEl.classList.add("hidden");
      this.currentNearQuest = null;
      return;
    }

    this.currentNearQuest = quest;

    const iconEl = document.getElementById("qap-icon");
    const titleEl = document.getElementById("qap-title");
    const subEl = document.getElementById("qap-sub");
    const btnTextEl = document.getElementById("qap-btn-text");

    if (isWorkDone) {
      if (iconEl) iconEl.innerText = "✨";
      if (titleEl) titleEl.innerText = `${quest.title}`;
      if (subEl) subEl.innerText = "✓ Đã làm xong 10s! Nhấn [F] hoặc bấm để Mở Bảng Nhận Thưởng";
      if (btnTextEl) btnTextEl.innerText = "Nhận Thưởng (+10 Điểm)";
    } else {
      if (iconEl) iconEl.innerText = quest.icon;
      if (titleEl) titleEl.innerText = quest.title;
      if (subEl) subEl.innerText = `${quest.locationName} (~${Math.round(distance)}m) • Nhấn [F] hoặc bấm để thực hiện (10s)`;
      if (btnTextEl) btnTextEl.innerText = `${quest.actionLabel} (10s)`;
    }

    promptEl.classList.remove("hidden");
  }

  public updateFloatingQuestTracker() {
    const state = templeQuestManager.getState();
    const tracker = document.getElementById("floating-quest-tracker");
    const progEl = document.getElementById("fqt-progress");
    const nameEl = document.getElementById("fqt-quest-name");

    if (progEl) progEl.innerText = `${state.completedCount}/${MAX_DAILY_QUESTS}`;

    if (state.activeQuestId) {
      const quest = templeQuestManager.getActiveQuest();
      if (nameEl && quest) {
        if (state.activeQuestWorkDone) {
          nameEl.innerHTML = `✨ <b>${quest.title}</b> — <span style="color:#4ade80;font-weight:bold;">Đã xong 10s! Bấm để Nhận Thưởng</span>`;
        } else {
          nameEl.innerHTML = `${quest.icon} <b>${quest.title}</b> (${quest.locationName})`;
        }
      }
      tracker?.classList.add("has-active");
    } else if (state.completedCount >= MAX_DAILY_QUESTS) {
      if (nameEl) nameEl.innerHTML = `🎉 Đã hoàn thành 10/10 việc hôm nay (Reset 00:00)`;
      tracker?.classList.remove("has-active");
    } else {
      if (nameEl) nameEl.innerHTML = `🌿 Gặp Chú Tiểu Tịnh Tâm tại Vườn An Lạc để nhận việc`;
      tracker?.classList.remove("has-active");
    }
  }

  public renderQuestUI() {
    const state = templeQuestManager.getState();
    const countNumEl = document.getElementById("quest-daily-count-num");
    const progressBarEl = document.getElementById("quest-daily-progress-bar");
    const activeContainer = document.getElementById("active-quest-container");
    const gridContainer = document.getElementById("available-quests-grid");

    if (countNumEl) countNumEl.innerText = `${state.completedCount}`;
    if (progressBarEl) {
      const pct = Math.min(100, Math.round((state.completedCount / MAX_DAILY_QUESTS) * 100));
      progressBarEl.style.width = `${pct}%`;
    }

    // 1. Render Active Quest Section
    if (activeContainer) {
      if (state.activeQuestId) {
        const quest = templeQuestManager.getActiveQuest();
        if (quest) {
          let isNear = false;
          let distanceStr = "";
          if (this.callbacks.getPlayerPosition) {
            const pos = this.callbacks.getPlayerPosition();
            const dist = Math.hypot(pos.x - quest.targetCoords.x, pos.z - quest.targetCoords.z);
            isNear = dist <= quest.targetRadius;
            distanceStr = ` (Cách bạn: ~${Math.round(dist)}m)`;
          }

          const isWorkDone = Boolean(state.activeQuestWorkDone);

          activeContainer.innerHTML = `
            <div class="active-quest-card ${isWorkDone ? "work-completed" : ""}">
              <div class="aq-header">
                <span class="aq-icon">${quest.icon}</span>
                <div class="aq-title-wrap">
                  <div class="aq-status-badge ${isWorkDone ? "done" : "doing"}">
                    ${isWorkDone ? "✨ Đã Hoàn Thành Chấp Tác" : "⏳ Đang Chấp Tác"}
                  </div>
                  <h4 class="aq-title">${quest.title}</h4>
                  <span class="aq-loc">📍 ${quest.locationName}${distanceStr}</span>
                </div>
                <div class="aq-reward-badge">+${QUEST_REWARD_POINTS} Điểm</div>
              </div>

              <p class="aq-desc">${quest.description}</p>
              <div class="aq-instruction">
                <b>👉 Hướng dẫn:</b> ${quest.instruction}
              </div>

              <div class="aq-status-note ${isWorkDone ? "done" : isNear ? "near" : "far"}">
                ${
                  isWorkDone
                    ? `✨ <b>Đã hoàn thành 10 giây làm việc!</b> Đạo hữu hãy bấm nút màu vàng dưới đây để nhận +${QUEST_REWARD_POINTS} Điểm Công Đức.`
                    : isNear
                      ? `🟢 <b>Đã đến đúng khu vực!</b> Hãy bấm nút <b>"Bắt Đầu ${quest.actionLabel} (10s)"</b> bên dưới để chấp tác.`
                      : `🚶 <b>Chưa đến vị trí:</b> Hãy di chuyển đến <b>${quest.locationName}</b> hoặc bấm nút dịch chuyển.`
                }
              </div>

              <div class="aq-actions">
                ${
                  !isWorkDone && !isNear
                    ? `<button type="button" class="btn-aq-nav" id="btn-aq-teleport">🧭 Đến Vị Trí (${quest.locationName})</button>`
                    : ""
                }
                ${
                  !isWorkDone && isNear
                    ? `<button type="button" class="btn-aq-work" id="btn-aq-start-work">${quest.icon} Bắt Đầu ${quest.actionLabel} (10s)</button>`
                    : ""
                }
                ${
                  isWorkDone
                    ? `<button type="button" class="btn-aq-complete" id="btn-aq-complete">✨ Nhận Thưởng Công Đức (+10 Điểm)</button>`
                    : `<button type="button" class="btn-aq-locked" disabled title="Cần làm xong 10 giây chấp tác tại vị trí mới được nhận thưởng">🔒 Chưa Hoàn Thành Chấp Tác (10s)</button>`
                }
                <button type="button" class="btn-aq-cancel" id="btn-aq-cancel">✕ Hủy Nhiệm Vụ (-10 Điểm)</button>
              </div>
            </div>
          `;

          // Gắn sự kiện cho các nút trong Active Quest Card
          document.getElementById("btn-aq-teleport")?.addEventListener("click", () => {
            if (this.callbacks.onTeleportToCoords) {
              this.callbacks.onTeleportToCoords(
                quest.targetCoords.x,
                quest.targetCoords.z,
                0.2,
                quest.locationName
              );
              this.closeQuestModal();
            }
          });

          document.getElementById("btn-aq-start-work")?.addEventListener("click", () => {
            this.startQuestWork(quest);
          });

          document.getElementById("btn-aq-complete")?.addEventListener("click", () => {
            this.completeQuest();
          });

          document.getElementById("btn-aq-cancel")?.addEventListener("click", () => {
            this.openCancelConfirmModal();
          });
        }
      } else {
        if (state.completedCount >= MAX_DAILY_QUESTS) {
          activeContainer.innerHTML = `
            <div class="quest-daily-done-banner">
              <span class="qdd-icon">🎉</span>
              <div class="qdd-content">
                <h4>Đã Hoàn Thành Tối Đa 10/10 Nhiệm Vụ Hôm Nay!</h4>
                <p>Công đức vô lượng! Đạo hữu đã hoàn tất toàn bộ việc chấp tác thiền môn hôm nay (+100 Điểm Công Đức). Hệ thống sẽ tự động làm mới sau 00:00 đêm nay. Kính chúc thân tâm an lạc! 🙏</p>
              </div>
            </div>
          `;
        } else {
          activeContainer.innerHTML = `
            <div class="no-active-quest-banner">
              <span>🍃</span>
              <span>Đạo hữu chưa nhận việc công quả nào. Hãy chọn một việc lành dưới đây để bắt đầu (còn <b>${MAX_DAILY_QUESTS - state.completedCount}</b> lượt hôm nay)!</span>
            </div>
          `;
        }
      }
    }

    // 2. Render Available Quests Grid
    if (gridContainer) {
      const allQuests = templeQuestManager.getAllQuests();
      let html = "";

      allQuests.forEach((q) => {
        const isCompleted = state.completedQuestIds.includes(q.id);
        const isActive = state.activeQuestId === q.id;
        const hasOtherActive = Boolean(state.activeQuestId && !isActive);
        const isMaxDaily = state.completedCount >= MAX_DAILY_QUESTS;

        let btnClass = "btn-quest-pick";
        let btnText = "Nhận Việc Này";
        let btnDisabled = false;

        if (isMaxDaily) {
          btnClass += " disabled";
          btnText = "Đã Đủ 10/10";
          btnDisabled = true;
        } else if (isActive) {
          btnClass += " active-doing";
          btnText = "Đang Thực Hiện";
          btnDisabled = true;
        } else if (hasOtherActive) {
          btnClass += " disabled";
          btnText = "Đang Làm Việc Khác";
          btnDisabled = true;
        } else if (isCompleted) {
          btnClass += " repeat-pick";
          btnText = "Nhận Làm Thêm";
        }

        html += `
          <div class="quest-card ${isActive ? "card-active" : ""} ${isCompleted ? "card-done" : ""}">
            <div class="qc-top">
              <span class="qc-icon">${q.icon}</span>
              <div class="qc-info">
                <div class="qc-tags">
                  <span class="qc-loc-tag">📍 ${q.locationName}</span>
                  ${isCompleted ? '<span class="qc-done-tag">✓ Đã Làm Hôm Nay</span>' : ""}
                </div>
                <h4 class="qc-title">${q.title}</h4>
              </div>
              <div class="qc-reward">+10 Điểm</div>
            </div>

            <p class="qc-desc">${q.description}</p>

            <div class="qc-bottom">
              <span class="qc-penalty-note">⚠️ Hủy sẽ trừ 10 điểm</span>
              <button type="button" class="${btnClass}" data-quest-id="${q.id}" ${btnDisabled ? "disabled" : ""}>
                ${btnText}
              </button>
            </div>
          </div>
        `;
      });

      gridContainer.innerHTML = html;

      // Gắn sự kiện click Nhận Việc cho các nút
      gridContainer.querySelectorAll(".btn-quest-pick:not([disabled])").forEach((btn) => {
        btn.addEventListener("click", () => {
          const qId = btn.getAttribute("data-quest-id");
          if (qId) {
            this.acceptQuest(qId);
          }
        });
      });
    }
  }

  // ─────────────────────────────────────────────
  // CẦN GẠT DI CHUYỂN ẢO PHONG CÁCH LIÊN QUÂN MOBILE
  // ─────────────────────────────────────────────
  private setupVirtualJoystick() {
    const zone = document.getElementById("virtual-joystick-zone");
    const base = document.getElementById("joystick-base");
    const thumb = document.getElementById("joystick-thumb");
    if (!zone || !base || !thumb) return;

    let isDragging = false;
    let activeTouchId: number | null = null;
    let baseCenter = { x: 0, y: 0 };
    const maxRadius = 42;

    const updateBaseCenter = () => {
      const rect = base.getBoundingClientRect();
      baseCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    };

    const handlePointerMoveCoord = (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const deltaX = clientX - baseCenter.x;
      const deltaY = clientY - baseCenter.y;
      const dist = Math.hypot(deltaX, deltaY);

      let clampedX = deltaX;
      let clampedY = deltaY;
      if (dist > maxRadius) {
        clampedX = (deltaX / dist) * maxRadius;
        clampedY = (deltaY / dist) * maxRadius;
      }

      thumb.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
      base.classList.add("joystick-active");

      const normX = clampedX / maxRadius;
      const normY = -clampedY / maxRadius; // Đảo dấu Y vì trục màn hình hướng xuống
      const normDist = Math.min(1.0, dist / maxRadius);

      this.callbacks.onJoystickMove?.({ x: normX, y: normY }, normDist);
    };

    const handlePointerEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      activeTouchId = null;
      base.classList.remove("joystick-active");
      thumb.style.transition = "transform 0.15s cubic-bezier(0.18, 0.89, 0.32, 1.28)";
      thumb.style.transform = "translate3d(0px, 0px, 0)";
      this.callbacks.onJoystickMove?.({ x: 0, y: 0 }, 0);
    };

    zone.addEventListener(
      "touchstart",
      (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          activeTouchId = touch.identifier;
          isDragging = true;
          updateBaseCenter();
          thumb.style.transition = "none";
          handlePointerMoveCoord(touch.clientX, touch.clientY);
        }
      },
      { passive: false }
    );

    window.addEventListener(
      "touchmove",
      (e: TouchEvent) => {
        if (!isDragging || activeTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === activeTouchId) {
            e.preventDefault();
            handlePointerMoveCoord(touch.clientX, touch.clientY);
            break;
          }
        }
      },
      { passive: false }
    );

    const onTouchEndHandler = (e: TouchEvent) => {
      if (!isDragging || activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          handlePointerEnd();
          break;
        }
      }
    };

    window.addEventListener("touchend", onTouchEndHandler);
    window.addEventListener("touchcancel", onTouchEndHandler);

    // Mouse fallback để test trên máy tính & DevTools Device Toolbar
    zone.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      activeTouchId = null;
      updateBaseCenter();
      thumb.style.transition = "none";
      handlePointerMoveCoord(e.clientX, e.clientY);
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (isDragging && activeTouchId === null) {
        handlePointerMoveCoord(e.clientX, e.clientY);
      }
    });

    window.addEventListener("mouseup", () => {
      if (isDragging && activeTouchId === null) {
        handlePointerEnd();
      }
    });
  }

  // ==========================================
  // HỆ THỐNG HÒM CÔNG ĐỨC & VIETQR TỰ ĐỘNG
  // ==========================================
  public copyToClipboard(text: string, successMsg?: string) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.appendChatMessage("Hệ Thống", successMsg || `📋 Đã sao chép: ${text}`);
      }).catch(() => {
        this.fallbackCopyText(text, successMsg);
      });
    } else {
      this.fallbackCopyText(text, successMsg);
    }
  }

  private fallbackCopyText(text: string, successMsg?: string) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      this.appendChatMessage("Hệ Thống", successMsg || `📋 Đã sao chép: ${text}`);
    } catch {
      this.appendChatMessage("Hệ Thống", `📋 Vui lòng sao chép thủ công: ${text}`);
    }
  }

  public openDonationModal() {
    const modal = document.getElementById("modal-donation");
    if (!modal) return;
    this.closeTeleportMenu();
    modal.classList.remove("hidden");
    zenAudio.playLotusSound();
    this.switchDonationView("select");
    this.renderDonationPackages();
  }

  public closeDonationModal() {
    const modal = document.getElementById("modal-donation");
    if (modal) modal.classList.add("hidden");
    this.stopDonationPolling();
  }

  public switchDonationView(view: "select" | "qr" | "success") {
    const viewSelect = document.getElementById("donation-view-select");
    const viewQr = document.getElementById("donation-view-qr");
    const viewSuccess = document.getElementById("donation-view-success");
    if (!viewSelect || !viewQr || !viewSuccess) return;

    viewSelect.classList.toggle("hidden", view !== "select");
    viewQr.classList.toggle("hidden", view !== "qr");
    viewSuccess.classList.toggle("hidden", view !== "success");

    if (view !== "qr") {
      this.stopDonationPolling();
    }
  }

  public renderDonationPackages() {
    const grid = document.getElementById("donation-packages-grid");
    if (!grid) return;

    grid.innerHTML = DONATION_PACKAGES_CLIENT.map((pkg) => {
      const isSelected = pkg.id === this.selectedDonationPackageId;
      const formattedAmount = pkg.amount.toLocaleString("vi-VN");
      const highlightClass = pkg.highlight ? "popular-package" : "";
      return `
        <div class="donation-pkg-card ${isSelected ? "selected" : ""} ${highlightClass}" data-pkg-id="${pkg.id}">
          <div class="dpk-top-row">
            <span class="dpk-badge">${pkg.badge}</span>
            <span class="dpk-amount">${formattedAmount} <small>VNĐ</small></span>
          </div>
          <h4 class="dpk-title">${pkg.title}</h4>
          <div class="dpk-points-row">
            <span class="dpk-lotus">🪷</span>
            <b class="dpk-points-val">${pkg.pointsTag}</b>
          </div>
          <p class="dpk-desc">${pkg.desc}</p>
          <button type="button" class="btn-select-pkg ${isSelected ? "active" : ""}">
            ${isSelected ? "✓ Đã Chọn" : "Phát Tâm Cúng Dường ➜"}
          </button>
        </div>
      `;
    }).join("");

    grid.querySelectorAll(".donation-pkg-card").forEach((card) => {
      card.addEventListener("click", () => {
        const pkgId = card.getAttribute("data-pkg-id");
        if (pkgId) {
          this.selectedDonationPackageId = pkgId;
          this.startDonationProcess(pkgId);
        }
      });
    });
  }

  public async startDonationProcess(packageId: string) {
    this.selectedDonationPackageId = packageId;
    const pkg = DONATION_PACKAGES_CLIENT.find((p) => p.id === packageId) || DONATION_PACKAGES_CLIENT[0];

    this.switchDonationView("qr");

    const qrImg = document.getElementById("donation-qr-img") as HTMLImageElement;
    const qrLoading = document.getElementById("donation-qr-loading");
    const summaryEl = document.getElementById("donation-selected-summary");
    const bdBankName = document.getElementById("bd-bank-name");
    const bdAccNum = document.getElementById("bd-acc-num");
    const bdAccName = document.getElementById("bd-acc-name");
    const bdAmount = document.getElementById("bd-amount");
    const bdOrderCode = document.getElementById("bd-order-code");
    const bdAlertCode = document.getElementById("bd-alert-code");

    if (qrLoading) qrLoading.classList.remove("hidden");
    if (qrImg) qrImg.style.opacity = "0.3";

    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="dps-badge">${pkg.badge}</div>
        <div class="dps-title">Gói: <b>${pkg.title}</b></div>
        <div class="dps-points">Tích lũy: <b class="gold-text">${pkg.pointsTag}</b></div>
      `;
    }

    if (bdAmount) bdAmount.innerText = `${pkg.amount.toLocaleString("vi-VN")} đ`;

    // Gọi API/Socket để tạo đơn cúng dường với mã riêng
    const res = await network.createDonationOrder(packageId, this.playerName);
    if (res && res.success && res.order) {
      this.activeDonationOrder = res.order;
      const order = res.order;

      if (qrImg) {
        qrImg.src = order.qrUrl;
        qrImg.onload = () => {
          if (qrLoading) qrLoading.classList.add("hidden");
          qrImg.style.opacity = "1";
        };
      }
      if (bdBankName) bdBankName.innerText = "MB Bank (Ngân Hàng Quân Đội)";
      if (bdAccNum) bdAccNum.innerText = order.accountNumber || "0969856119";
      if (bdAccName) bdAccName.innerText = order.accountName || "LE THANH TUNG";
      if (bdAmount) bdAmount.innerText = `${Number(order.amount).toLocaleString("vi-VN")} đ`;
      if (bdOrderCode) bdOrderCode.innerText = order.orderCode;
      if (bdAlertCode) bdAlertCode.innerText = order.orderCode;

      // Bắt đầu thăm dò trạng thái đơn mỗi 3 giây
      this.startDonationPolling(order.orderCode);
    } else {
      if (qrLoading) qrLoading.innerText = "Chưa kết nối máy chủ. Quét mã cúng dường:";
      const fallbackCode = `CD${Math.floor(100000 + Math.random() * 900000)}`;
      this.activeDonationOrder = {
        orderCode: fallbackCode,
        amount: pkg.amount,
        meritPoints: pkg.meritPoints,
        packageName: pkg.title,
      };
      if (bdOrderCode) bdOrderCode.innerText = fallbackCode;
      if (bdAlertCode) bdAlertCode.innerText = fallbackCode;
      if (qrImg) {
        qrImg.src = `https://img.vietqr.io/image/MB-0969856119-compact2.png?amount=${pkg.amount}&addInfo=${fallbackCode}&accountName=LE%20THANH%20TUNG`;
        qrImg.onload = () => {
          if (qrLoading) qrLoading.classList.add("hidden");
          qrImg.style.opacity = "1";
        };
      }
    }
  }

  private startDonationPolling(orderCode: string) {
    this.stopDonationPolling();

    this.donationPollTimer = setInterval(async () => {
      try {
        const res = await network.checkDonationOrder(orderCode);
        if (res && res.success && res.status === "completed") {
          this.stopDonationPolling();
          this.showDonationSuccess(res.order || this.activeDonationOrder);
        }
      } catch (e) {
        console.warn("Poll donation error:", e);
      }
    }, 3200);
  }

  private stopDonationPolling() {
    if (this.donationPollTimer) {
      clearInterval(this.donationPollTimer);
      this.donationPollTimer = null;
    }
  }

  public async handleCheckDonation() {
    if (!this.activeDonationOrder) {
      this.appendChatMessage("Hệ Thống", "Chưa có đơn cúng dường nào đang mở.");
      return;
    }

    const checkBtn = document.getElementById("btn-check-donation");
    if (checkBtn) {
      checkBtn.innerHTML = "⏳ Đang kiểm tra giao dịch...";
      (checkBtn as HTMLButtonElement).disabled = true;
    }

    try {
      const res = await network.confirmDonationOrder(this.activeDonationOrder.orderCode);
      if (res && res.success) {
        this.showDonationSuccess(res.order || this.activeDonationOrder);
      } else {
        this.appendChatMessage(
          "Hệ Thống",
          res?.message || "Hệ thống chưa nhận được tín hiệu chuyển khoản. Nếu đạo hữu đã chuyển thành công, hoan hỷ chờ 5 - 10 giây để ngân hàng đồng bộ nhé! 🙏"
        );
      }
    } catch {
      this.appendChatMessage("Hệ Thống", "Không thể kiểm tra giao dịch lúc này. Xin thử lại sau giây lát.");
    } finally {
      if (checkBtn) {
        checkBtn.innerHTML = '<span class="btn-pulse-icon">✅</span> Tôi Đã Chuyển Khoản Xong';
        (checkBtn as HTMLButtonElement).disabled = false;
      }
    }
  }

  public showDonationSuccess(order: any) {
    this.stopDonationPolling();
    this.switchDonationView("success");

    zenAudio.playGrandBell();
    zenAudio.playLotusSound();

    const detailsEl = document.getElementById("donation-success-details");
    const amountStr = Number(order.amount || 10000).toLocaleString("vi-VN");
    const points = Number(order.meritPoints || 100);
    const pointsStr = points.toLocaleString("vi-VN");

    if (detailsEl) {
      detailsEl.innerHTML = `
        <div class="sd-row">
          <span>Người phát tâm:</span>
          <b>${this.playerName}</b>
        </div>
        <div class="sd-row">
          <span>Pháp lễ cúng dường:</span>
          <b class="sd-gold">${order.packageName || "Cúng Dường Tam Bảo"}</b>
        </div>
        <div class="sd-row">
          <span>Tịnh tài cúng dường:</span>
          <b>${amountStr} VNĐ</b>
        </div>
        <div class="sd-row highlight-merit">
          <span>Tích lũy công đức:</span>
          <b class="sd-points">+${pointsStr} Điểm Công Đức 🪷</b>
        </div>
        <div class="sd-row">
          <span>Mã công đức:</span>
          <code>${order.orderCode}</code>
        </div>
      `;
    }

    // Cập nhật điểm công đức hiển thị trên client (Server đã cộng chính xác vào DB & Bảng Xếp Hạng)
    this.setMeritPoints(this.getMeritPoints() + points);
    this.appendChatMessage(
      "Hệ Thống",
      `🪷 Bạn vừa tích lũy +${points.toLocaleString()} Điểm Công Đức (Cúng Dường ${order.packageName || "Tam Bảo"}).`
    );

    // Gửi yêu cầu cập nhật lại Bảng Xếp Hạng mới nhất từ server
    network.requestLeaderboard();
  }

  public handleDonationCompletedRemote(data: any) {
    if (this.activeDonationOrder && data.orderCode === this.activeDonationOrder.orderCode) {
      this.showDonationSuccess(data);
    } else {
      if (data.playerName === this.playerName) {
        zenAudio.playGrandBell();
        zenAudio.playLotusSound();
        const pts = Number(data.meritPoints) || 0;
        this.setMeritPoints(this.getMeritPoints() + pts);
        this.appendChatMessage(
          "Chùa",
          `🌸 Quý đạo hữu đã cúng dường thành công ${Number(data.amount).toLocaleString("vi-VN")}đ, nhận được +${pts.toLocaleString("vi-VN")} Điểm Công Đức! A Di Đà Phật 🙏`
        );
      }
    }
  }

  // ─────────────────────────────────────────────
  // HỆ THỐNG TÀNG KINH CÁC & AUDIO ĐỌC KINH
  // ─────────────────────────────────────────────
  private bindTangKinhCacEvents() {
    // Đóng Modal Tàng Kinh Các
    document.getElementById("modal-tang-kinh-cac-close")?.addEventListener("click", () => {
      this.closeTangKinhCacModal();
    });

    const modalTKC = document.getElementById("modal-tang-kinh-cac");
    modalTKC?.addEventListener("click", (e) => {
      if (e.target === modalTKC) {
        this.closeTangKinhCacModal();
      }
    });

    // Nút mở từ prompt hiện trường
    document.getElementById("btn-tkc-prompt-open")?.addEventListener("click", () => {
      this.openTangKinhCacModal();
    });

    // Nút quay lại danh mục từ phòng đọc
    document.getElementById("btn-tkc-back-catalog")?.addEventListener("click", () => {
      this.switchTangKinhCacView("catalog");
    });

    // Nút điều chỉnh cỡ chữ
    document.getElementById("btn-tkc-font-decrease")?.addEventListener("click", () => {
      this.changeSutraFontSize(-2);
    });
    document.getElementById("btn-tkc-font-increase")?.addEventListener("click", () => {
      this.changeSutraFontSize(2);
    });

    // Nút đổi giao diện nền giấy / ban đêm
    document.getElementById("btn-tkc-theme-toggle")?.addEventListener("click", () => {
      this.toggleSutraTheme();
    });

    // Bộ lọc thể loại
    const filterChips = document.querySelectorAll("#tkc-filter-bar .tkc-filter-chip");
    filterChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        filterChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        const cat = chip.getAttribute("data-category") || "all";
        this.currentSutraCategory = cat;
        this.renderSutraCatalog(cat);
      });
    });

    // Audio Controls
    document.getElementById("btn-tkc-audio-play")?.addEventListener("click", () => {
      if (!this.selectedSutra) return;
      if (sutraAudio.getIsPlaying()) {
        if (sutraAudio.getIsPaused()) {
          sutraAudio.resume();
        } else {
          sutraAudio.pause();
        }
      } else {
        sutraAudio.playSutra(this.selectedSutra, this.currentReaderChapterIdx, 0);
      }
    });

    document.getElementById("btn-tkc-audio-prev")?.addEventListener("click", () => {
      sutraAudio.prevVerse();
    });

    document.getElementById("btn-tkc-audio-next")?.addEventListener("click", () => {
      sutraAudio.nextVerse();
    });

    // Tốc độ đọc (0.8x -> 0.95x -> 1.15x)
    const speedBtn = document.getElementById("btn-tkc-audio-speed");
    let speedIdx = 1;
    const speeds = [0.8, 0.95, 1.15];
    speedBtn?.addEventListener("click", () => {
      speedIdx = (speedIdx + 1) % speeds.length;
      const spd = speeds[speedIdx];
      sutraAudio.setPlaybackRate(spd);
      if (speedBtn) speedBtn.innerText = `${spd}x`;
    });

    // Bật/tắt tiếng chuông điểm kệ
    const chimeBtn = document.getElementById("btn-tkc-audio-chime");
    chimeBtn?.addEventListener("click", () => {
      const active = sutraAudio.toggleChime();
      chimeBtn.classList.toggle("active", active);
    });
  }

  private setupSutraAudioSync() {
    sutraAudio.onStateChange = (state) => {
      const playBtn = document.getElementById("btn-tkc-audio-play");
      const pulseIcon = document.getElementById("tkc-audio-pulse");
      const audioName = document.getElementById("tkc-audio-name");
      const audioVerse = document.getElementById("tkc-audio-current-verse");

      if (playBtn) {
        playBtn.innerText = state.isPlaying && !state.isPaused ? "⏸" : "▶";
      }
      if (pulseIcon) {
        pulseIcon.classList.toggle("playing", state.isPlaying && !state.isPaused);
      }
      if (audioName && state.sutra) {
        audioName.innerText = `${state.sutra.title} (${state.sutra.chapters[state.chapterIdx]?.title || ""})`;
      }
      if (audioVerse) {
        audioVerse.innerText = state.currentText || "Nhấn Phát để nghe đọc kinh";
      }

      // Làm nổi bật câu kinh đang đọc trên màn hình
      const allVerses = document.querySelectorAll(".tkc-verse-item");
      allVerses.forEach((el) => el.classList.remove("active-reading"));

      const activeEl = document.querySelector(`.tkc-verse-item[data-verse-idx="${state.verseIdx}"]`);
      if (activeEl) {
        activeEl.classList.add("active-reading");
        if (state.isPlaying && !state.isPaused) {
          activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    };
  }

  public updateTangKinhCacPrompt(isNear: boolean) {
    this.isNearTangKinhCac = isNear;
    const promptEl = document.getElementById("tang-kinh-cac-prompt");
    if (!promptEl) return;
    const modalEl = document.getElementById("modal-tang-kinh-cac");
    const isModalOpen = modalEl && !modalEl.classList.contains("hidden");

    if (isNear && !isModalOpen) {
      promptEl.classList.remove("hidden");
    } else {
      promptEl.classList.add("hidden");
    }
  }

  public openTangKinhCacModal(sutraId?: string) {
    const modal = document.getElementById("modal-tang-kinh-cac");
    if (!modal) return;
    this.closeTeleportMenu();
    modal.classList.remove("hidden");
    zenAudio.playLotusSound();

    const promptEl = document.getElementById("tang-kinh-cac-prompt");
    if (promptEl) promptEl.classList.add("hidden");

    if (sutraId) {
      const s = SUTRA_DATABASE.find((item) => item.id === sutraId);
      if (s) {
        this.openSutraReader(s, 0, false);
        return;
      }
    }

    this.switchTangKinhCacView("catalog");
    this.renderSutraCatalog(this.currentSutraCategory);
  }

  public closeTangKinhCacModal() {
    const modal = document.getElementById("modal-tang-kinh-cac");
    if (modal) modal.classList.add("hidden");
  }

  public switchTangKinhCacView(view: "catalog" | "reader") {
    const catView = document.getElementById("tkc-catalog-view");
    const readerView = document.getElementById("tkc-reader-view");
    if (!catView || !readerView) return;

    if (view === "catalog") {
      catView.classList.remove("hidden");
      readerView.classList.add("hidden");
    } else {
      catView.classList.add("hidden");
      readerView.classList.remove("hidden");
    }
  }

  public renderSutraCatalog(filterCategory = "all") {
    const grid = document.getElementById("tkc-sutra-grid");
    if (!grid) return;

    const filtered = filterCategory === "all"
      ? SUTRA_DATABASE
      : SUTRA_DATABASE.filter((s) => s.category === filterCategory);

    grid.innerHTML = filtered.map((sutra) => `
      <div class="tkc-sutra-card" data-sutra-id="${sutra.id}">
        <div class="tkc-card-cover" style="background: ${sutra.coverColor}">
          <span class="tkc-card-icon">${sutra.icon}</span>
        </div>
        <div class="tkc-card-content">
          <div class="tkc-card-badges">
            <span class="tkc-category-badge">${sutra.categoryLabel}</span>
            <span class="tkc-time-badge">⏱️ ${sutra.readingMinutes} phút</span>
          </div>
          <h4 class="tkc-card-title">${sutra.title}</h4>
          <div class="tkc-card-sanskrit">${sutra.sanskritTitle}</div>
          <p class="tkc-card-desc">${sutra.description}</p>
          <div class="tkc-card-actions">
            <button type="button" class="tkc-action-read" data-action="read" data-sutra-id="${sutra.id}">
              📖 Đọc Kinh
            </button>
            <button type="button" class="tkc-action-listen" data-action="listen" data-sutra-id="${sutra.id}">
              🎧 Nghe Audio
            </button>
          </div>
        </div>
      </div>
    `).join("");

    // Gắn sự kiện click vào các nút trên thẻ kinh
    grid.querySelectorAll(".tkc-action-read").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.sutraId;
        const s = SUTRA_DATABASE.find((item) => item.id === id);
        if (s) this.openSutraReader(s, 0, false);
      });
    });

    grid.querySelectorAll(".tkc-action-listen").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.sutraId;
        const s = SUTRA_DATABASE.find((item) => item.id === id);
        if (s) this.openSutraReader(s, 0, true);
      });
    });

    grid.querySelectorAll(".tkc-sutra-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = (card as HTMLElement).dataset.sutraId;
        const s = SUTRA_DATABASE.find((item) => item.id === id);
        if (s) this.openSutraReader(s, 0, false);
      });
    });
  }

  public openSutraReader(sutra: Sutra, chapterIdx = 0, autoPlay = false) {
    this.selectedSutra = sutra;
    this.currentReaderChapterIdx = Math.max(0, Math.min(sutra.chapters.length - 1, chapterIdx));
    this.switchTangKinhCacView("reader");

    // Đổ dữ liệu tiêu đề và ý nghĩa kinh
    const titleEl = document.getElementById("tkc-reader-title");
    const sanskritEl = document.getElementById("tkc-reader-sanskrit");
    const descEl = document.getElementById("tkc-reader-desc");
    const meritEl = document.getElementById("tkc-merit-text");

    if (titleEl) titleEl.innerText = sutra.title;
    if (sanskritEl) sanskritEl.innerText = sutra.sanskritTitle;
    if (descEl) descEl.innerText = sutra.description;
    if (meritEl) meritEl.innerText = sutra.meritExplanation;

    // Render danh sách chapter tabs
    const tabsContainer = document.getElementById("tkc-chapter-tabs");
    if (tabsContainer) {
      if (sutra.chapters.length > 1) {
        tabsContainer.classList.remove("hidden");
        tabsContainer.innerHTML = sutra.chapters.map((ch, idx) => `
          <button type="button" class="tkc-chapter-tab ${idx === this.currentReaderChapterIdx ? "active" : ""}" data-chapter-idx="${idx}">
            ${ch.title.split(":")[0]}
          </button>
        `).join("");

        tabsContainer.querySelectorAll(".tkc-chapter-tab").forEach((tab) => {
          tab.addEventListener("click", () => {
            const idx = Number((tab as HTMLElement).dataset.chapterIdx);
            this.currentReaderChapterIdx = idx;
            tabsContainer.querySelectorAll(".tkc-chapter-tab").forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            this.renderChapterContent(sutra.chapters[idx], idx);
            if (sutraAudio.getIsPlaying()) {
              sutraAudio.playSutra(sutra, idx, 0);
            }
          });
        });
      } else {
        tabsContainer.classList.add("hidden");
      }
    }

    // Render nội dung chương hiện tại
    this.renderChapterContent(sutra.chapters[this.currentReaderChapterIdx], this.currentReaderChapterIdx);

    // Cập nhật thông tin audio dock
    const audioName = document.getElementById("tkc-audio-name");
    const audioVerse = document.getElementById("tkc-audio-current-verse");
    if (audioName) {
      audioName.innerText = `${sutra.title} (${sutra.chapters[this.currentReaderChapterIdx]?.title || ""})`;
    }
    if (audioVerse) {
      audioVerse.innerText = autoPlay ? "Đang chuẩn bị đọc..." : "Nhấn nút ▶ để nghe đọc kinh thiền vị";
    }

    if (autoPlay) {
      sutraAudio.playSutra(sutra, this.currentReaderChapterIdx, 0);
    }
  }

  private renderChapterContent(chapter: SutraChapter, chapterIdx: number) {
    const curTitleEl = document.getElementById("tkc-current-chapter-title");
    if (curTitleEl) {
      curTitleEl.innerText = chapter.title;
    }

    const flowContainer = document.getElementById("tkc-verses-flow");
    if (!flowContainer) return;

    flowContainer.innerHTML = chapter.verses.map((verse, idx) => `
      <div class="tkc-verse-item" data-verse-idx="${idx}" title="Nhấp vào để nghe đọc câu kinh này">
        <span class="tkc-verse-num">${idx + 1}</span>
        <span class="tkc-verse-text" style="font-size: ${this.sutraFontSize}px;">${verse}</span>
        <button type="button" class="tkc-verse-play-btn" title="Nghe câu này">🔊</button>
      </div>
    `).join("");

    // Click vào câu kinh để nghe phát ngay câu đó
    flowContainer.querySelectorAll(".tkc-verse-item").forEach((item) => {
      item.addEventListener("click", () => {
        const vIdx = Number((item as HTMLElement).dataset.verseIdx);
        if (this.selectedSutra) {
          sutraAudio.playSutra(this.selectedSutra, chapterIdx, vIdx);
        }
      });
    });
  }

  private changeSutraFontSize(delta: number) {
    this.sutraFontSize = Math.max(14, Math.min(26, this.sutraFontSize + delta));
    const verseTexts = document.querySelectorAll<HTMLElement>(".tkc-verse-text");
    verseTexts.forEach((el) => {
      el.style.fontSize = `${this.sutraFontSize}px`;
    });
  }

  private toggleSutraTheme() {
    this.isSutraParchmentTheme = !this.isSutraParchmentTheme;
    const sheet = document.getElementById("tkc-parchment-sheet");
    const themeBtn = document.getElementById("btn-tkc-theme-toggle");
    if (sheet) {
      sheet.classList.toggle("dark-zen-theme", !this.isSutraParchmentTheme);
    }
    if (themeBtn) {
      themeBtn.innerText = this.isSutraParchmentTheme ? "📜 Nền Giấy" : "🌙 Nền Đêm";
    }
  }
}
