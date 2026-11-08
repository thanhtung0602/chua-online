/**
 * dailyActivities.ts - Quản Lý Giới Hạn Hoạt Động & Nhận Điểm Công Đức Mỗi Ngày
 * 
 * - Quy định nghiêm ngặt:
 *   1. Dâng nén tâm hương: Chỉ nhận Điểm Công Đức (+10) 1 lần/ngày.
 *   2. Thỉnh Đại Hồng Chung: Chỉ nhận Điểm Công Đức (+10) 1 lần/ngày.
 *   3. Dâng hoa cúng Phật: Chỉ nhận Điểm Công Đức (+15) 1 lần/ngày.
 *   4. Chú Tiểu đón cổng chúc phúc: Chỉ nhận Điểm Công Đức (+5) 1 lần/ngày.
 *   5. Xin quẻ nguyện ước: Mỗi ngày chỉ thỉnh được tối đa 5 quẻ thuộc 5 chủ đề khác nhau
 *      (Nhân Duyên, Học Hành, Sự Nghiệp, Bình An, Pháp Cú). Sau khi thỉnh đủ 5 quẻ khác nhau
 *      thì không được thỉnh thêm quẻ nào trong ngày. Có thể xem lại chi tiết từng quẻ đã xin bất kỳ lúc nào!
 * - Tự động RESET TOÀN BỘ vào lúc 00:00 mỗi đêm (theo giờ Việt Nam UTC+7).
 */

export interface DailyActivitiesState {
  date: string;
  hasOfferedIncense: boolean;
  hasRungGrandBell: boolean;
  hasOfferedFlowers: boolean;
  hasReceivedGateBlessing: boolean;
  drawnOracleCategories: string[]; // Danh sách category đã thỉnh (e.g. ['love', 'study', ...])
  drawnOracleSticks?: Record<string, any>; // Lưu nội dung chi tiết quẻ đã xin để xem lại trong ngày
  hasRenamedToday: boolean; // Mỗi ngày chỉ được đổi tên 1 lần
}

const STORAGE_KEY = "chua_an_lac_daily_activities_v2";

export function getVietnamDateString(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const vnNow = new Date(utc + 3600000 * 7);
  const y = vnNow.getFullYear();
  const m = String(vnNow.getMonth() + 1).padStart(2, "0");
  const d = String(vnNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getSavedMeritPoints(playerName: string): number {
  const today = getVietnamDateString();
  const clean = (playerName || "").trim();
  if (!clean) return 0;
  const key = `chua_an_lac_merit_${today}_${clean}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const val = parseInt(raw, 10);
      if (!isNaN(val)) return val;
    }
  } catch {}
  return 0;
}

export function saveMeritPoints(playerName: string, points: number) {
  const today = getVietnamDateString();
  const clean = (playerName || "").trim();
  if (!clean) return;
  const key = `chua_an_lac_merit_${today}_${clean}`;
  try {
    localStorage.setItem(key, points.toString());
  } catch (e) {
    console.warn("Không thể lưu điểm công đức vào localStorage:", e);
  }
}

export class DailyActivityManager {
  public getState(): DailyActivitiesState {
    const today = getVietnamDateString();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: DailyActivitiesState = JSON.parse(raw);
        if (parsed && parsed.date === today) {
          if (!Array.isArray(parsed.drawnOracleCategories)) {
            parsed.drawnOracleCategories = [];
          }
          if (!parsed.drawnOracleSticks || typeof parsed.drawnOracleSticks !== "object") {
            parsed.drawnOracleSticks = {};
          }
          parsed.hasRenamedToday = !!parsed.hasRenamedToday;
          return parsed;
        }
      }
    } catch (e) {
      console.warn("⚠️ Không thể đọc daily activities state, tạo mới:", e);
    }

    // Ngày mới (sau 00h) hoặc lần đầu chơi: Khởi tạo mới sạch sẽ
    const freshState: DailyActivitiesState = {
      date: today,
      hasOfferedIncense: false,
      hasRungGrandBell: false,
      hasOfferedFlowers: false,
      hasReceivedGateBlessing: false,
      drawnOracleCategories: [],
      drawnOracleSticks: {},
      hasRenamedToday: false,
    };
    this.saveState(freshState);
    return freshState;
  }

  public saveState(state: DailyActivitiesState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("⚠️ Không thể lưu daily activities state:", e);
    }
  }

  public resetForNewCharacter() {
    const today = getVietnamDateString();
    const freshState: DailyActivitiesState = {
      date: today,
      hasOfferedIncense: false,
      hasRungGrandBell: false,
      hasOfferedFlowers: false,
      hasReceivedGateBlessing: false,
      drawnOracleCategories: [],
      drawnOracleSticks: {},
      hasRenamedToday: false,
    };
    this.saveState(freshState);
  }

  // ─────────────────────────────────────────────
  // 1. DÂNG NÉN TÂM HƯƠNG (1 LẦN/NGÀY)
  // ─────────────────────────────────────────────
  public canOfferIncense(): boolean {
    return !this.getState().hasOfferedIncense;
  }

  public recordOfferIncense(): boolean {
    const s = this.getState();
    if (s.hasOfferedIncense) return false;
    s.hasOfferedIncense = true;
    this.saveState(s);
    return true;
  }

  // ─────────────────────────────────────────────
  // 2. THỈNH ĐẠI HỒNG CHUNG (1 LẦN/NGÀY)
  // ─────────────────────────────────────────────
  public canRingGrandBell(): boolean {
    return !this.getState().hasRungGrandBell;
  }

  public recordRingGrandBell(): boolean {
    const s = this.getState();
    if (s.hasRungGrandBell) return false;
    s.hasRungGrandBell = true;
    this.saveState(s);
    return true;
  }

  // ─────────────────────────────────────────────
  // 3. DÂNG HOA CÚNG PHẬT (1 LẦN/NGÀY)
  // ─────────────────────────────────────────────
  public canOfferFlowers(): boolean {
    return !this.getState().hasOfferedFlowers;
  }

  public recordOfferFlowers(): boolean {
    const s = this.getState();
    if (s.hasOfferedFlowers) return false;
    s.hasOfferedFlowers = true;
    this.saveState(s);
    return true;
  }

  // ─────────────────────────────────────────────
  // 4. CHÚ TIỂU ĐÓN CỔNG CHÚC PHÚC (1 LẦN/NGÀY)
  // ─────────────────────────────────────────────
  public canReceiveGateBlessing(): boolean {
    return !this.getState().hasReceivedGateBlessing;
  }

  public recordGateBlessing(): boolean {
    const s = this.getState();
    if (s.hasReceivedGateBlessing) return false;
    s.hasReceivedGateBlessing = true;
    this.saveState(s);
    return true;
  }

  // ─────────────────────────────────────────────
  // 5. XIN QUẺ NGUYỆN ƯỚC (TỐI ĐA 5 QUẺ CỦA 5 CHỦ ĐỀ KHÁC NHAU)
  // ─────────────────────────────────────────────
  /**
   * Kiểm tra xem danh mục này đã thỉnh trong ngày chưa
   */
  public hasDrawnOracleCategory(category: string): boolean {
    return this.getState().drawnOracleCategories.includes(category);
  }

  /**
   * Đã thỉnh đủ cả 5 quẻ của 5 danh mục chưa?
   */
  public hasDrawnAllOracleCategories(): boolean {
    return this.getState().drawnOracleCategories.length >= 5;
  }

  /**
   * Số lượng quẻ đã thỉnh trong ngày (0..5)
   */
  public getDrawnOracleCount(): number {
    return this.getState().drawnOracleCategories.length;
  }

  /**
   * Danh sách các danh mục đã thỉnh hôm nay
   */
  public getDrawnOracleCategories(): string[] {
    return this.getState().drawnOracleCategories;
  }

  /**
   * Kiểm tra xem có thể thỉnh quẻ thuộc category này không
   */
  public canDrawOracleCategory(category: string): boolean {
    const s = this.getState();
    // Đã thỉnh quẻ chủ đề này rồi thì không được thỉnh lại
    if (s.drawnOracleCategories.includes(category)) return false;
    // Đã thỉnh đủ 5 quẻ rồi thì dừng
    if (s.drawnOracleCategories.length >= 5) return false;
    return true;
  }

  /**
   * Ghi nhận đã thỉnh thành công 1 quẻ của category này
   */
  public recordDrawOracleCategory(category: string): boolean {
    const s = this.getState();
    if (s.drawnOracleCategories.includes(category)) return false;
    if (s.drawnOracleCategories.length >= 5) return false;
    s.drawnOracleCategories.push(category);
    this.saveState(s);
    return true;
  }

  /**
   * Lấy chi tiết quẻ đã xin của category này để người dùng xem lại bất kỳ lúc nào trong ngày
   */
  public getDrawnOracleStick(category: string): any | null {
    const s = this.getState();
    return s.drawnOracleSticks ? s.drawnOracleSticks[category] || null : null;
  }

  /**
   * Lưu trọn vẹn nội dung thẻ quẻ đã xin (tiêu đề, thơ, ý nghĩa, lời khuyên)
   */
  public recordDrawOracleStick(stick: any): boolean {
    if (!stick || !stick.category) return false;
    const s = this.getState();
    const cat = stick.category;
    if (!s.drawnOracleCategories.includes(cat)) {
      if (s.drawnOracleCategories.length >= 5) return false;
      s.drawnOracleCategories.push(cat);
    }
    if (!s.drawnOracleSticks) {
      s.drawnOracleSticks = {};
    }
    s.drawnOracleSticks[cat] = stick;
    this.saveState(s);
    return true;
  }

  // ─────────────────────────────────────────────
  // 6. ĐỔI PHÁP DANH / TÊN NHÂN VẬT (1 LẦN/NGÀY)
  // ─────────────────────────────────────────────
  public canRenameToday(): boolean {
    return !this.getState().hasRenamedToday;
  }

  public recordRename(): boolean {
    const s = this.getState();
    if (s.hasRenamedToday) return false;
    s.hasRenamedToday = true;
    this.saveState(s);
    return true;
  }

  /**
   * Đặt lại trạng thái hôm nay để kiểm thử (hoặc khi cần test lại từ đầu)
   */
  public resetToday(): DailyActivitiesState {
    const today = getVietnamDateString();
    const freshState: DailyActivitiesState = {
      date: today,
      hasOfferedIncense: false,
      hasRungGrandBell: false,
      hasOfferedFlowers: false,
      hasReceivedGateBlessing: false,
      drawnOracleCategories: [],
      drawnOracleSticks: {},
      hasRenamedToday: false,
    };
    this.saveState(freshState);
    console.log("🌸 [CHÙA AN LẠC] Đã reset toàn bộ hoạt động nhận Điểm Công Đức & đổi tên hôm nay để kiểm thử!");
    return freshState;
  }
}

export const dailyActivities = new DailyActivityManager();

// Gắn vào window để có thể gọi nhanh resetDailyActivities() trong Console trình duyệt khi cần test
if (typeof window !== "undefined") {
  (window as any).resetDailyActivities = () => dailyActivities.resetToday();
}
