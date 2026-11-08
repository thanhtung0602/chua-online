/**
 * templeQuestSystem.ts - Hệ Thống Nhiệm Vụ Chấp Tác Công Quả Tại Chùa An Lạc
 * 
 * - Quản lý bởi Chú Tiểu Tịnh Tâm tại Vườn An Lạc.
 * - Các nhiệm vụ công quả thiền môn: Quét chùa, Trồng hoa, Tưới cây, Lau dọn bàn thờ, v.v.
 * - Quy định nghiêm ngặt:
 *   1. Mỗi ngày người chơi có thể nhận và hoàn thành tối đa 10 nhiệm vụ.
 *   2. Hoàn thành mỗi nhiệm vụ nhận +10 Điểm Công Đức.
 *   3. Người chơi có thể hủy nhiệm vụ đã nhận nhưng sẽ bị trừ -10 Điểm Công Đức.
 *   4. Tự động RESET TOÀN BỘ số lượt vào lúc 00:00 hằng ngày (theo giờ Việt Nam UTC+7).
 */

import { getVietnamDateString } from "./dailyActivities";

export interface TempleQuest {
  id: string;
  title: string;
  icon: string;
  category: "garden" | "courtyard" | "hall" | "pond" | "bell";
  description: string;
  locationName: string;
  targetCoords: { x: number; z: number };
  targetRadius: number;
  actionLabel: string;
  instruction: string;
  dialogQuote: string;
  meritReward: number; // 10
  cancelPenalty: number; // 10
}

export interface DailyQuestState {
  date: string;
  completedCount: number; // Tối đa 10 nhiệm vụ / ngày
  activeQuestId: string | null;
  activeQuestAcceptedAt: number;
  activeQuestWorkDone: boolean; // Đã thực hiện xong 10s công quả tại vị trí
  completedQuestIds: string[];
}

const STORAGE_KEY = "chua_an_lac_daily_quests_v1";
export const MAX_DAILY_QUESTS = 10;
export const QUEST_REWARD_POINTS = 10;
export const QUEST_CANCEL_PENALTY = 10;
export const QUEST_WORK_DURATION_SECONDS = 10; // Thời gian làm việc 10 giây

export const TEMPLE_QUESTS: TempleQuest[] = [
  {
    id: "sweep_temple",
    title: "Quét Dọn Lá Rụng Sân Chùa",
    icon: "🧹",
    category: "courtyard",
    description: "Cầm chổi tre quét sạch đống lá vàng bồ đề rơi rụng dưới gốc cây sân chùa, giữ cho chốn thiền môn thanh tịnh sạch sẽ.",
    locationName: "Gốc Cây Sân Chùa",
    targetCoords: { x: -8.5, z: 16.5 },
    targetRadius: 4.5,
    actionLabel: "Quét Dọn Lá Rụng",
    instruction: "Hãy đến khu vực đống lá vàng dưới gốc cây sân chùa và bấm 'Thực Hiện' quét sân trong 10 giây.",
    dialogQuote: "Quét sạch bụi trần ngoài sân, cũng là quét sạch phiền não trong tâm. Đạo hữu hoan hỷ nhận công quả quét chùa nhé! 🙏",
    meritReward: QUEST_REWARD_POINTS,
    cancelPenalty: QUEST_CANCEL_PENALTY,
  },
  {
    id: "plant_flower",
    title: "Trồng Hoa Cúng Phật Vườn An Lạc",
    icon: "🌸",
    category: "garden",
    description: "Đến ô đất tơi xốp tại Vườn An Lạc gieo hạt sen và mầm hoa thơm cúng dường Tam Bảo.",
    locationName: "Vườn Sen An Lạc",
    targetCoords: { x: 14.8, z: 19.8 },
    targetRadius: 4.5,
    actionLabel: "Gieo Mầm Hoa",
    instruction: "Hãy đến luống hoa tại Vườn An Lạc (gần Cổng Tam Quan, trước Hồ Sen) và bấm 'Thực Hiện' gieo mầm hoa trong 10 giây.",
    dialogQuote: "Trồng một đóa hoa thơm cúng Phật, đời sau gặt quả tướng mạo đoan nghiêm thanh tú. Chúc đạo hữu tinh tấn! 🌸",
    meritReward: QUEST_REWARD_POINTS,
    cancelPenalty: QUEST_CANCEL_PENALTY,
  },
  {
    id: "water_garden",
    title: "Tưới Nước Vườn Hoa An Lạc",
    icon: "💧",
    category: "garden",
    description: "Dùng gáo nước suối thanh tịnh tưới tắm cho các khóm hoa và luống sen trong vườn đượm màu tươi thắm.",
    locationName: "Bồn Sen Vườn An Lạc",
    targetCoords: { x: 14.8, z: 19.8 },
    targetRadius: 4.5,
    actionLabel: "Tưới Nước Cho Hoa",
    instruction: "Hãy đến luống hoa tại Vườn An Lạc (gần Cổng Tam Quan, trước Hồ Sen) và bấm 'Thực Hiện' tưới nước trong 10 giây.",
    dialogQuote: "Giọt nước thanh lương tưới mát cỏ cây, nuôi dưỡng lòng từ bi vô lượng. Đạo hữu hoan hỷ chấp tác tưới hoa nhé! 🌿",
    meritReward: QUEST_REWARD_POINTS,
    cancelPenalty: QUEST_CANCEL_PENALTY,
  },
  {
    id: "clean_altar",
    title: "Lau Dọn Hương Án Chính Điện",
    icon: "✨",
    category: "hall",
    description: "Vào Đại Hùng Bảo Điện, kính cẩn dùng khăn sạch lau bụi trần trên bàn thờ trước Tam Thế Phật.",
    locationName: "Hương Án Chính Điện",
    targetCoords: { x: 0, z: -36.5 },
    targetRadius: 4.8,
    actionLabel: "Lau Dọn Bàn Thờ",
    instruction: "Hãy vào Chính Điện, đến trước bàn thờ Tam Thế Phật và bấm 'Thực Hiện' lau dọn hương án trong 10 giây.",
    dialogQuote: "Lau bụi hương án trước Phật, lau sạch cấu uế trần gian, mở ra tâm bồ đề sáng suốt vô biên. 🙏",
    meritReward: QUEST_REWARD_POINTS,
    cancelPenalty: QUEST_CANCEL_PENALTY,
  },
  {
    id: "clean_pond",
    title: "Nhặt Lá Khô Ven Cầu Hồ Sen",
    icon: "🪷",
    category: "pond",
    description: "Đến cây cầu gỗ bắc qua hồ sen, thu nhặt lá khô và rác trôi dạt để mặt nước hồ luôn trong vắt.",
    locationName: "Cầu Gỗ Hồ Sen",
    targetCoords: { x: 0, z: 1.0 },
    targetRadius: 4.0,
    actionLabel: "Làm Sạch Mặt Hồ",
    instruction: "Hãy bước ra giữa cầu gỗ hồ sen và bấm 'Thực Hiện' vớt lá khô trong 10 giây.",
    dialogQuote: "Hồ sen trong trẻo phản chiếu trăng rằm, tâm hồn tĩnh lặng phản chiếu chân như. Hoan hỷ làm sạch hồ sen nhé! 🪷",
    meritReward: QUEST_REWARD_POINTS,
    cancelPenalty: QUEST_CANCEL_PENALTY,
  },
  {
    id: "tidy_cushions",
    title: "Chỉnh Trang Bồ Đoàn Thiền Tọa",
    icon: "🧘",
    category: "hall",
    description: "Vào Chính Điện xếp thẳng hàng, ngay ngắn các bồ đoàn thiền tọa cho chư tăng ni và thiện tín.",
    locationName: "Khu Bồ Đoàn Chính Điện",
    targetCoords: { x: 0, z: -25.0 },
    targetRadius: 5.5,
    actionLabel: "Chỉnh Xếp Bồ Đoàn",
    instruction: "Hãy vào khu vực ngồi thiền trong Chính Điện và bấm 'Thực Hiện' xếp bồ đoàn trong 10 giây.",
    dialogQuote: "Bồ đoàn ngay ngắn, thiền tọa trang nghiêm, trợ duyên cho bao người nhập định an lạc. 🙏",
    meritReward: QUEST_REWARD_POINTS,
    cancelPenalty: QUEST_CANCEL_PENALTY,
  },
  {
    id: "polish_bell",
    title: "Lau Sạch Chuông Đại Hồng Chung",
    icon: "🔔",
    category: "bell",
    description: "Đến Lầu Chuông lau sạch bụi trần bám trên Đại Hồng Chung ngàn năm, gìn giữ pháp bảo thiêng liêng.",
    locationName: "Lầu Chuông Đại Hồng",
    targetCoords: { x: -7.5, z: -7.5 },
    targetRadius: 4.2,
    actionLabel: "Lau Chuông Đại Hồng",
    instruction: "Hãy đến trước thềm Lầu Chuông và bấm 'Thực Hiện' lau sạch chuông đồng trong 10 giây.",
    dialogQuote: "Chuông đồng sáng bóng ngân vang thấu suốt ba cõi sáu đường, độ thoát khổ đau của muôn loài. 🔔",
    meritReward: QUEST_REWARD_POINTS,
    cancelPenalty: QUEST_CANCEL_PENALTY,
  },
  {
    id: "light_garden_lantern",
    title: "Thắp Sáng Đèn Đá Vườn Hoa",
    icon: "🪔",
    category: "garden",
    description: "Thắp sáng ngọn đèn đá phong thủy bên lối vào Vườn An Lạc dẫn lối soi đường ban đêm.",
    locationName: "Đèn Đá Vườn An Lạc",
    targetCoords: { x: 3.5, z: 20.5 },
    targetRadius: 4.0,
    actionLabel: "Thắp Đèn Đá",
    instruction: "Hãy đến trước cột đèn đá bên lối vào Vườn An Lạc (gần Cổng Tam Quan) và bấm 'Thực Hiện' thắp đèn trong 10 giây.",
    dialogQuote: "Thắp lên ngọn đèn trí tuệ xua tan bóng tối vô minh. Đạo hữu thắp đèn cúng dường Phật nhé! 🪔",
    meritReward: QUEST_REWARD_POINTS,
    cancelPenalty: QUEST_CANCEL_PENALTY,
  },
];

export class TempleQuestManager {
  private static instance: TempleQuestManager;

  public static getInstance(): TempleQuestManager {
    if (!TempleQuestManager.instance) {
      TempleQuestManager.instance = new TempleQuestManager();
    }
    return TempleQuestManager.instance;
  }

  public getState(): DailyQuestState {
    const today = getVietnamDateString();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: DailyQuestState = JSON.parse(raw);
        if (parsed && parsed.date === today) {
          if (!Array.isArray(parsed.completedQuestIds)) {
            parsed.completedQuestIds = [];
          }
          if (typeof parsed.completedCount !== "number") {
            parsed.completedCount = parsed.completedQuestIds.length;
          }
          if (typeof parsed.activeQuestWorkDone !== "boolean") {
            parsed.activeQuestWorkDone = false;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn("⚠️ Không thể đọc quest state, tạo mới:", e);
    }

    // Ngày mới sau 00:00: Reset toàn bộ lượt hoàn thành về 0
    const freshState: DailyQuestState = {
      date: today,
      completedCount: 0,
      activeQuestId: null,
      activeQuestAcceptedAt: 0,
      activeQuestWorkDone: false,
      completedQuestIds: [],
    };
    this.saveState(freshState);
    return freshState;
  }

  public saveState(state: DailyQuestState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("⚠️ Không thể lưu quest state:", e);
    }
  }

  public getAvailableQuests(): TempleQuest[] {
    const state = this.getState();
    // Trả về danh sách nhiệm vụ chưa hoàn thành hôm nay
    return TEMPLE_QUESTS.filter((q) => !state.completedQuestIds.includes(q.id));
  }

  public getAllQuests(): TempleQuest[] {
    return TEMPLE_QUESTS;
  }

  public getQuestById(id: string): TempleQuest | undefined {
    return TEMPLE_QUESTS.find((q) => q.id === id);
  }

  public getActiveQuest(): TempleQuest | null {
    const state = this.getState();
    if (!state.activeQuestId) return null;
    return this.getQuestById(state.activeQuestId) || null;
  }

  public getCompletedCountToday(): number {
    return this.getState().completedCount;
  }

  public canAcceptQuest(): boolean {
    const state = this.getState();
    return state.completedCount < MAX_DAILY_QUESTS && !state.activeQuestId;
  }

  public isWorkDone(): boolean {
    return !!this.getState().activeQuestWorkDone;
  }

  public setWorkDone(done = true) {
    const state = this.getState();
    state.activeQuestWorkDone = done;
    this.saveState(state);
  }

  /**
   * Nhận một nhiệm vụ công quả mới
   */
  public acceptQuest(questId: string): { success: boolean; message: string; quest?: TempleQuest } {
    const state = this.getState();
    if (state.completedCount >= MAX_DAILY_QUESTS) {
      return {
        success: false,
        message: `Hôm nay đạo hữu đã hoàn thành tối đa ${MAX_DAILY_QUESTS}/${MAX_DAILY_QUESTS} nhiệm vụ công quả! Hãy trở lại sau 00:00 đêm nay nhé. 🙏`,
      };
    }
    if (state.activeQuestId) {
      const cur = this.getQuestById(state.activeQuestId);
      return {
        success: false,
        message: `Đạo hữu đang thực hiện nhiệm vụ "${cur?.title || "Công quả"}". Hãy hoàn thành hoặc hủy trước khi nhận nhiệm vụ mới!`,
      };
    }

    const quest = this.getQuestById(questId);
    if (!quest) {
      return { success: false, message: "Nhiệm vụ không tồn tại!" };
    }

    state.activeQuestId = questId;
    state.activeQuestAcceptedAt = Date.now();
    state.activeQuestWorkDone = false;
    this.saveState(state);

    return {
      success: true,
      message: `Đã nhận nhiệm vụ: "${quest.title}". Hãy đến ${quest.locationName} để chấp tác!`,
      quest,
    };
  }

  /**
   * Hủy nhiệm vụ đã nhận -> Bị trừ 10 Điểm Công Đức
   */
  public cancelQuest(): { success: boolean; message: string; penalty: number; quest?: TempleQuest } {
    const state = this.getState();
    if (!state.activeQuestId) {
      return {
        success: false,
        message: "Đạo hữu hiện không có nhiệm vụ nào để hủy!",
        penalty: 0,
      };
    }

    const quest = this.getQuestById(state.activeQuestId);
    state.activeQuestId = null;
    state.activeQuestAcceptedAt = 0;
    state.activeQuestWorkDone = false;
    this.saveState(state);

    return {
      success: true,
      message: `Đã hủy nhiệm vụ "${quest?.title || "Công quả"}". Bạn bị trừ -${QUEST_CANCEL_PENALTY} Điểm Công Đức.`,
      penalty: QUEST_CANCEL_PENALTY,
      quest,
    };
  }

  /**
   * Hoàn thành nhiệm vụ -> Nhận +10 Điểm Công Đức
   */
  public completeQuest(): { success: boolean; message: string; reward: number; quest?: TempleQuest } {
    const state = this.getState();
    if (!state.activeQuestId) {
      return {
        success: false,
        message: "Đạo hữu hiện không có nhiệm vụ nào cần hoàn thành!",
        reward: 0,
      };
    }

    if (!state.activeQuestWorkDone) {
      return {
        success: false,
        message: "Đạo hữu chưa thực hiện chấp tác 10 giây tại khu vực yêu cầu! Hãy đến đúng vị trí để làm việc trước khi nhận thưởng nhé. 🙏",
        reward: 0,
      };
    }

    const quest = this.getQuestById(state.activeQuestId);
    if (!quest) {
      state.activeQuestId = null;
      state.activeQuestWorkDone = false;
      this.saveState(state);
      return { success: false, message: "Nhiệm vụ không hợp lệ!", reward: 0 };
    }

    state.completedCount = Math.min(MAX_DAILY_QUESTS, state.completedCount + 1);
    if (!state.completedQuestIds.includes(quest.id)) {
      state.completedQuestIds.push(quest.id);
    }
    state.activeQuestId = null;
    state.activeQuestAcceptedAt = 0;
    state.activeQuestWorkDone = false;
    this.saveState(state);

    return {
      success: true,
      message: `🎉 Tán thán công đức! Bạn đã hoàn thành nhiệm vụ "${quest.title}" và nhận +${QUEST_REWARD_POINTS} Điểm Công Đức! (${state.completedCount}/${MAX_DAILY_QUESTS} hôm nay)`,
      reward: QUEST_REWARD_POINTS,
      quest,
    };
  }

  /**
   * Kiểm tra người chơi có đang đứng gần vị trí mục tiêu của nhiệm vụ không
   */
  public isPlayerNearTarget(playerX: number, playerZ: number): boolean {
    const quest = this.getActiveQuest();
    if (!quest) return false;
    const dist = Math.hypot(playerX - quest.targetCoords.x, playerZ - quest.targetCoords.z);
    return dist <= quest.targetRadius;
  }
}

export const templeQuestManager = TempleQuestManager.getInstance();
