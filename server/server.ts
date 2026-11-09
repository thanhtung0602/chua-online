import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import dns from "dns";
import dotenv from "dotenv";

dotenv.config();

// Đảm bảo DNS SRV phân giải chính xác tới cụm MongoDB Atlas trên mọi mạng / môi trường
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  console.warn("DNS setServers:", e);
}

import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://lethanhtungdb05_db_user:Letung123.@annhien.rbaml2a.mongodb.net/chua_an_lac?retryWrites=true&w=majority";

// Mongoose Models cho Bảng Xếp Hạng & Hồ Sơ Đạo Hữu
const LeaderboardDocSchema = new mongoose.Schema(
  {
    docId: { type: String, default: "active_leaderboard", unique: true },
    currentDate: String,
    currentAbbot: Object,
    seniorMonks: Array,
    entries: Object,
    history: Array,
  },
  { timestamps: true }
);
const LeaderboardModel = mongoose.model("LeaderboardDoc", LeaderboardDocSchema);

const PlayerProfileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    avatar: String,
    isMonk: Boolean,
    dharmaName: String,
    robeColor: { type: Number, default: 0xd97706 },
    clientToken: { type: String, index: true },
    camLoToday: { type: Number, default: 0 },
    totalCamLo: { type: Number, default: 0 },
    totalDonated: { type: Number, default: 0 },
    donationCount: { type: Number, default: 0 },
    lastDate: String,
    // Tiến trình nhiệm vụ công quả hàng ngày
    questsCompletedToday: { type: Number, default: 0 },
    completedQuestIds: { type: [String], default: [] },
    activeQuestId: { type: String, default: null },
    activeQuestWorkDone: { type: Boolean, default: false },
    questDate: String,
  },
  { timestamps: true }
);
const PlayerProfileModel = mongoose.model("PlayerProfile", PlayerProfileSchema);

// Schema Đơn Cúng Dường Hòm Công Đức (VietQR)
const DonationOrderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, required: true, unique: true, index: true },
    playerName: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    meritPoints: { type: Number, required: true },
    packageId: { type: String, required: true },
    packageName: { type: String, required: true },
    bankCode: { type: String, default: "MB" },
    accountNumber: { type: String, default: "0969856119" },
    accountName: { type: String, default: "LE THANH TUNG" },
    qrUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    paidAt: { type: Date },
  },
  { timestamps: true }
);
const DonationOrderModel = mongoose.model("DonationOrder", DonationOrderSchema);

// Cấu hình Ngân hàng thụ hưởng & Gói Cúng Dường Tam Bảo
export const BANK_CONFIG = {
  bankCode: "MB",
  bankName: "Ngân Hàng TMCP Quân Đội (MB Bank)",
  accountNumber: "0969856119",
  accountName: "LE THANH TUNG",
};

export interface DonationPackage {
  id: string;
  amount: number;
  meritPoints: number;
  title: string;
  badge: string;
  desc: string;
}

export const DONATION_PACKAGES: DonationPackage[] = [
  {
    id: "pkg_10k",
    amount: 10000,
    meritPoints: 100,
    title: "Gói Tâm Hương",
    badge: "🌸 Khởi Tâm Lành",
    desc: "Thành tâm gieo hạt giống lành nơi Tam Bảo (+100 Điểm Công Đức)",
  },
  {
    id: "pkg_20k",
    amount: 20000,
    meritPoints: 250,
    title: "Gói Thanh Tịnh",
    badge: "🪷 Hương Sen",
    desc: "Tâm sen thanh tịnh không vướng trần ai (+250 Điểm Công Đức)",
  },
  {
    id: "pkg_50k",
    amount: 50000,
    meritPoints: 700,
    title: "Gói Bồ Đề",
    badge: "🌿 Bồ Đề Tâm",
    desc: "Trí tuệ quang minh, dũng mãnh tinh tấn (+700 Điểm Công Đức)",
  },
  {
    id: "pkg_100k",
    amount: 100000,
    meritPoints: 1600,
    title: "Gói Tịnh Tâm",
    badge: "🕯️ Đăng Hoa Chiếu",
    desc: "Ngọn đèn chánh niệm xua tan vô minh (+1.600 Điểm Công Đức)",
  },
  {
    id: "pkg_200k",
    amount: 200000,
    meritPoints: 3600,
    title: "Gói Đại Từ Bi",
    badge: "✨ Từ Bi Hỷ Xả",
    desc: "Rộng mở lòng từ bi hỷ xả chở che (+3.600 Điểm Công Đức)",
  },
  {
    id: "pkg_500k",
    amount: 500000,
    meritPoints: 10000,
    title: "Gói Vạn Duyên Tịnh Lạc",
    badge: "👑 Phúc Báo Vô Biên",
    desc: "Đại thí chủ hộ trì Tam Bảo thường trụ (+10.000 Điểm Công Đức)",
  },
];

const donationOrders: Map<string, any> = new Map();

function generateOrderCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `CD${digits}`;
}

function buildVietQrUrl(amount: number, orderCode: string): string {
  const encAccountName = encodeURIComponent(BANK_CONFIG.accountName);
  const encAddInfo = encodeURIComponent(orderCode);
  return `https://img.vietqr.io/image/${BANK_CONFIG.bankCode}-${BANK_CONFIG.accountNumber}-compact2.png?amount=${amount}&addInfo=${encAddInfo}&accountName=${encAccountName}`;
}

async function completeDonationOrder(orderCode: string, source: string = "manual"): Promise<{ success: boolean; message: string; order?: any }> {
  let order = donationOrders.get(orderCode);
  if (!order && isMongoConnected) {
    try {
      order = await DonationOrderModel.findOne({ orderCode }).lean();
    } catch (e) {
      console.warn("Lỗi tìm đơn cúng dường:", e);
    }
  }

  if (!order) {
    return { success: false, message: `Không tìm thấy đơn cúng dường với mã ${orderCode}.` };
  }

  if (order.status === "completed") {
    return { success: true, message: "Đơn cúng dường này đã được cộng công đức trước đó.", order };
  }

  order.status = "completed";
  order.paidAt = new Date();
  donationOrders.set(orderCode, order);

  if (isMongoConnected) {
    try {
      await DonationOrderModel.updateOne(
        { orderCode },
        { $set: { status: "completed", paidAt: order.paidAt } }
      );
    } catch (e) {
      console.warn("Lỗi cập nhật MongoDB đơn cúng dường:", e);
    }
  }

  const playerName = order.playerName;
  const points = Number(order.meritPoints) || 100;
  const donationAmount = Number(order.amount) || 0;
  const todayStr = getVietnamDateString();

  // 1. Cập nhật hồ sơ trên MongoDB Atlas
  if (isMongoConnected) {
    try {
      await PlayerProfileModel.findOneAndUpdate(
        { name: playerName },
        {
          $inc: {
            camLoToday: points,
            totalCamLo: points,
            totalDonated: donationAmount,
            donationCount: 1,
          },
          $set: { lastDate: todayStr },
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn("Lỗi lưu điểm công đức vào MongoDB PlayerProfile:", e);
    }
  }

  // 2. Cập nhật Bảng Xếp Hạng realtime
  if (!leaderboardState.entries[playerName]) {
    leaderboardState.entries[playerName] = {
      name: playerName,
      avatar: "female",
      camLoToday: points,
      totalCamLo: points,
      totalDonated: donationAmount,
      donationCount: 1,
      lastUpdated: Date.now(),
      isMonk: playerName.startsWith("Thích "),
    };
  } else {
    leaderboardState.entries[playerName].camLoToday = (leaderboardState.entries[playerName].camLoToday || 0) + points;
    leaderboardState.entries[playerName].totalCamLo = (leaderboardState.entries[playerName].totalCamLo || 0) + points;
    leaderboardState.entries[playerName].totalDonated = (leaderboardState.entries[playerName].totalDonated || 0) + donationAmount;
    leaderboardState.entries[playerName].donationCount = (leaderboardState.entries[playerName].donationCount || 0) + 1;
    leaderboardState.entries[playerName].lastUpdated = Date.now();
  }

  saveLeaderboardData();
  broadcastLeaderboard();

  // 3. Gửi thông báo hoàn tất giao dịch cho client
  const updatedPoints = leaderboardState.entries[playerName].camLoToday;
  io.emit("donation:completed", {
    orderCode,
    playerName,
    amount: order.amount,
    meritPoints: points,
    packageName: order.packageName,
    totalCamLo: updatedPoints,
  });

  // 4. Phát loa chúc phúc toàn thể đạo hữu trong chùa
  const amountFormatted = Number(order.amount).toLocaleString("vi-VN");
  const pointsFormatted = points.toLocaleString("vi-VN");
  const blessMsg = `🌸 [CÚNG DƯỜNG TAM BẢO] Đạo hữu [${playerName}] vừa phát tâm cúng dường ${amountFormatted}đ (${order.packageName}), tích lũy +${pointsFormatted} Điểm Công Đức! Công đức vô lượng, thân tâm an lạc! A Di Đà Phật 🙏✨`;

  io.emit("chat:bubble", {
    id: "system",
    text: blessMsg,
  });

  console.log(`🎉 [Cúng Dường Thành Công - ${source}] Đạo hữu ${playerName} cúng dường ${amountFormatted}đ -> +${points} công đức!`);
  return { success: true, message: "Công đức đã được ghi nhận thành công!", order };
}

let isMongoConnected = false;

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const APP_VERSION = process.env.APP_VERSION || "1.2.0";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "dist")));

// In-Memory Realtime Game State
interface PlayerState {
  id: string;
  name: string;
  avatar: string;
  gx: number;
  gy: number;
  action: string;
  dir: "left" | "right";
  isLoggedIn?: boolean;
  isMonk?: boolean;
  robeColor?: number;
  clientToken?: string;
}

interface ServerLantern {
  id: string;
  author: string;
  wishText: string;
  type: string;
  gx: number;
  gy: number;
  rejoices: number;
  createdAt: number;
}

// Bảng Xếp Hạng & Quyền Hòa Thượng Trụ Trì
export interface LeaderboardEntry {
  name: string;
  avatar: string;
  camLoToday: number;
  totalCamLo: number;
  totalDonated?: number;
  donationCount?: number;
  lastUpdated: number;
  isMonk?: boolean;
}

export interface AbbotInfo {
  name: string;
  avatar: string;
  camLoYesterday: number;
  appointedDate: string; // YYYY-MM-DD
}

// 12 Vị Cao Tăng (Xếp hạng từ 2 đến 13)
export interface SeniorMonkInfo {
  rank: number; // 2 -> 13
  name: string;
  avatar: string;
  camLoYesterday: number;
}

export interface LeaderboardState {
  currentDate: string;
  currentAbbot: AbbotInfo | null;
  seniorMonks: SeniorMonkInfo[];
  entries: Record<string, LeaderboardEntry>;
  history: Array<{ date: string; winner: string; score: number }>;
}

const players: Map<string, PlayerState> = new Map();
const activeLanterns: Map<string, ServerLantern> = new Map();

// Quản lý chỗ ngồi duy nhất trong Chính Điện (Chỉ 1 người / 1 chỗ, ai ngồi rồi người khác không được ngồi đè)
interface OccupiedSeatInfo {
  socketId: string;
  playerName: string;
  seatedAt: number;
}
const occupiedSeats: Map<string, OccupiedSeatInfo> = new Map();

function broadcastRoomCount() {
  io.emit("room:player_count", {
    current: players.size,
  });
}

function broadcastOccupiedSeats() {
  const seatList = Array.from(occupiedSeats.entries()).map(([seatId, info]) => ({
    seatId,
    playerName: info.playerName,
    socketId: info.socketId,
  }));
  io.emit("seats:occupied_list", seatList);
}

// Helper tính thời gian chuẩn Việt Nam (GMT+7)
function getVietnamNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 7);
}

function getVietnamDateString(): string {
  const vnNow = getVietnamNow();
  const y = vnNow.getFullYear();
  const m = String(vnNow.getMonth() + 1).padStart(2, "0");
  const d = String(vnNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getSecondsUntilMidnight(): number {
  const vnNow = getVietnamNow();
  const midnight = new Date(vnNow);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - vnNow.getTime()) / 1000));
}

// Đường dẫn lưu trữ dữ liệu Bảng Xếp Hạng thật
const LEADERBOARD_FILE = path.resolve(process.cwd(), "server", "leaderboard_data.json");

// Danh sách các tên mock cũ cần loại bỏ hoàn toàn khỏi hệ thống
const LEGACY_MOCK_NAMES = new Set([
  "Đạo Hữu An Nhiên", "Diệu Tâm", "Minh Trí", "Quang Hải", "Diệu Âm",
  "Tuệ Minh", "Thanh Nhã", "Chân Định", "Ngọc Liên", "Phúc Tâm",
  "An Bình", "Tâm Từ", "Trí Dũng", "Pháp Đăng", "Tịnh Vân",
  "Thích Trí Quảng", "Thích Thanh Từ", "Thích Nhất Hạnh", "Thích Huyền Diệu",
  "Thích Tuệ Sỹ", "Thích Viên Minh", "Thích Minh Châu", "Thích Thiện Nhơn",
  "Thích Bảo Nghiêm", "Thích Lệ Trang", "Thích Giác Toàn", "Thích Thông Phương"
]);

function loadLeaderboardData(): LeaderboardState {
  const todayStr = getVietnamDateString();
  const defaultState: LeaderboardState = {
    currentDate: todayStr,
    currentAbbot: null,
    seniorMonks: [],
    entries: {},
    history: [],
  };

  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const raw = fs.readFileSync(LEADERBOARD_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const cleanEntries: Record<string, LeaderboardEntry> = {};
        if (parsed.entries && typeof parsed.entries === "object") {
          for (const [k, v] of Object.entries(parsed.entries as Record<string, any>)) {
            if (!LEGACY_MOCK_NAMES.has(k) && !LEGACY_MOCK_NAMES.has(v?.name)) {
              cleanEntries[k] = {
                name: v.name || k,
                avatar: v.avatar || "female",
                camLoToday: typeof v.camLoToday === "number" ? v.camLoToday : 0,
                totalCamLo: typeof v.totalCamLo === "number" ? v.totalCamLo : 0,
                totalDonated: typeof v.totalDonated === "number" ? v.totalDonated : 0,
                donationCount: typeof v.donationCount === "number" ? v.donationCount : 0,
                lastUpdated: typeof v.lastUpdated === "number" ? v.lastUpdated : Date.now(),
                isMonk: Boolean(v.isMonk || (v.name && v.name.startsWith("Thích "))),
              };
            }
          }
        }

        const cleanSeniorMonks: SeniorMonkInfo[] = [];
        if (Array.isArray(parsed.seniorMonks)) {
          for (const m of parsed.seniorMonks) {
            if (m && m.name && !LEGACY_MOCK_NAMES.has(m.name)) {
              cleanSeniorMonks.push(m);
            }
          }
        }

        let cleanAbbot: AbbotInfo | null = parsed.currentAbbot || null;
        if (cleanAbbot && (LEGACY_MOCK_NAMES.has(cleanAbbot.name) || cleanAbbot.name === "Thích Tâm An")) {
          if (!cleanEntries["Thích Tâm An"]) {
            cleanAbbot = null;
          }
        }

        return {
          currentDate: parsed.currentDate || todayStr,
          currentAbbot: cleanAbbot,
          seniorMonks: cleanSeniorMonks,
          entries: cleanEntries,
          history: Array.isArray(parsed.history)
            ? parsed.history.filter((h: any) => h && !LEGACY_MOCK_NAMES.has(h.winner))
            : [],
        };
      }
    }
  } catch (e) {
    console.warn("⚠️ Không thể đọc file leaderboard_data.json, khởi tạo mặc định:", e);
  }

  return defaultState;
}

let leaderboardState: LeaderboardState = loadLeaderboardData();

function saveLeaderboardData() {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboardState, null, 2), "utf-8");
  } catch (e) {
    console.error("❌ Không thể ghi file leaderboard_data.json:", e);
  }

  // Đồng bộ đám mây MongoDB Atlas
  if (isMongoConnected) {
    LeaderboardModel.findOne({ docId: "active_leaderboard" }).then(async (doc) => {
      if (doc) {
        doc.currentDate = leaderboardState.currentDate;
        doc.currentAbbot = leaderboardState.currentAbbot;
        doc.seniorMonks = leaderboardState.seniorMonks;
        doc.entries = leaderboardState.entries;
        doc.history = leaderboardState.history;
        doc.markModified("entries");
        doc.markModified("currentAbbot");
        doc.markModified("seniorMonks");
        doc.markModified("history");
        await doc.save();
      } else {
        await LeaderboardModel.create({
          docId: "active_leaderboard",
          currentDate: leaderboardState.currentDate,
          currentAbbot: leaderboardState.currentAbbot,
          seniorMonks: leaderboardState.seniorMonks,
          entries: leaderboardState.entries,
          history: leaderboardState.history,
        });
      }
    }).catch((e) => console.warn("⚠️ [MongoDB] Lỗi lưu Leaderboard:", e.message));
  }
}

function cleanupDuplicateSuffixEntries(): boolean {
  let changed = false;
  const entries = leaderboardState.entries;
  if (entries) {
    for (const key of Object.keys(entries)) {
      const match = key.match(/^(.*?)\s*#\d+$/);
      if (match) {
        const baseName = match[1].trim();
        const dup = entries[key];
        if (baseName) {
          if (!entries[baseName]) {
            entries[baseName] = {
              ...dup,
              name: baseName,
              isMonk: baseName.startsWith("Thích ") || Boolean(dup.isMonk),
            };
          } else {
            entries[baseName].camLoToday = Math.max(entries[baseName].camLoToday || 0, dup.camLoToday || 0);
            entries[baseName].totalCamLo = Math.max(entries[baseName].totalCamLo || 0, dup.totalCamLo || 0);
            entries[baseName].totalDonated = Math.max(entries[baseName].totalDonated || 0, dup.totalDonated || 0);
            entries[baseName].donationCount = Math.max(entries[baseName].donationCount || 0, dup.donationCount || 0);
          }
        }
        delete entries[key];
        changed = true;
      }
    }
  }

  if (Array.isArray(leaderboardState.seniorMonks)) {
    const cleaned: SeniorMonkInfo[] = [];
    const seen = new Set<string>();
    for (const monk of leaderboardState.seniorMonks) {
      const cleanName = monk.name.replace(/\s*#\d+$/, "").trim();
      if (!seen.has(cleanName)) {
        seen.add(cleanName);
        cleaned.push({ ...monk, name: cleanName });
        if (monk.name !== cleanName) changed = true;
      } else {
        changed = true;
      }
    }
    leaderboardState.seniorMonks = cleaned;
  }

  if (leaderboardState.currentAbbot?.name) {
    const cleanAbbot = leaderboardState.currentAbbot.name.replace(/\s*#\d+$/, "").trim();
    if (cleanAbbot !== leaderboardState.currentAbbot.name) {
      leaderboardState.currentAbbot.name = cleanAbbot;
      changed = true;
    }
  }

  if (changed) {
    saveLeaderboardData();
    console.log("🧹 Đã tự động dọn dẹp và gộp các hồ sơ bị trùng lặp hậu tố (#2, #3,...) về tên gốc.");
  }
  return changed;
}

// Khởi chạy dọn dẹp cục bộ ngay khi khởi động
cleanupDuplicateSuffixEntries();

async function cleanupMongoDuplicateSuffixEntries() {
  if (!isMongoConnected) return;
  try {
    const dupProfiles = await PlayerProfileModel.find({ name: { $regex: /#\d+$/ } }).lean();
    if (dupProfiles && dupProfiles.length > 0) {
      console.log(`🧹 [MongoDB Atlas] Tìm thấy ${dupProfiles.length} bản ghi trùng lặp có hậu tố #... Đang gộp dữ liệu...`);
      for (const dup of dupProfiles) {
        const baseName = dup.name.replace(/\s*#\d+$/, "").trim();
        if (baseName) {
          await PlayerProfileModel.findOneAndUpdate(
            { name: baseName },
            {
              $max: {
                camLoToday: dup.camLoToday || 0,
                totalCamLo: dup.totalCamLo || 0,
                totalDonated: dup.totalDonated || 0,
                donationCount: dup.donationCount || 0,
                questsCompletedToday: (dup as any).questsCompletedToday || 0,
              },
            },
            { upsert: true }
          );
        }
        await PlayerProfileModel.deleteOne({ _id: dup._id });
      }
    }

    const dupOrders = await DonationOrderModel.find({ playerName: { $regex: /#\d+$/ } });
    if (dupOrders && dupOrders.length > 0) {
      for (const ord of dupOrders) {
        ord.playerName = ord.playerName.replace(/\s*#\d+$/, "").trim();
        await ord.save();
      }
    }

    // Làm sạch và gộp triệt để tài liệu active_leaderboard trên Cloud
    const activeDoc = await LeaderboardModel.findOne({ docId: "active_leaderboard" });
    if (activeDoc && activeDoc.entries && typeof activeDoc.entries === "object") {
      let docChanged = false;
      const docEntries = activeDoc.entries as any;
      for (const k of Object.keys(docEntries)) {
        if (/#\d+$/.test(k)) {
          const base = k.replace(/\s*#\d+$/, "").trim();
          if (base) {
            if (!docEntries[base]) {
              docEntries[base] = { ...docEntries[k], name: base };
            } else {
              docEntries[base].camLoToday = Math.max(docEntries[base].camLoToday || 0, docEntries[k].camLoToday || 0);
              docEntries[base].totalCamLo = Math.max(docEntries[base].totalCamLo || 0, docEntries[k].totalCamLo || 0);
              docEntries[base].totalDonated = Math.max(docEntries[base].totalDonated || 0, docEntries[k].totalDonated || 0);
              docEntries[base].donationCount = Math.max(docEntries[base].donationCount || 0, docEntries[k].donationCount || 0);
            }
          }
          delete docEntries[k];
          docChanged = true;
        }
      }
      if (docChanged) {
        activeDoc.markModified("entries");
        await activeDoc.save();
        console.log("🧹 [MongoDB Atlas] Đã dọn dẹp và chuẩn hóa active_leaderboard trên Cloud!");
      }
    }
  } catch (err) {
    console.warn("⚠️ [MongoDB Atlas] Lỗi khi dọn dẹp bản ghi có hậu tố #...:", err);
  }
}

function syncPlayerToMongo(name: string, entry?: LeaderboardEntry, clientToken?: string) {
  if (!isMongoConnected || !name) return;
  const target = entry || leaderboardState.entries[name];
  if (!target) return;
  const todayStr = getVietnamDateString();
  const updateData: any = {
    avatar: target.avatar,
    isMonk: target.isMonk,
    camLoToday: target.camLoToday,
    totalCamLo: target.totalCamLo,
    lastDate: todayStr,
  };
  if (clientToken) updateData.clientToken = clientToken;
  if (target.totalDonated !== undefined) updateData.totalDonated = target.totalDonated;
  if (target.donationCount !== undefined) updateData.donationCount = target.donationCount;

  PlayerProfileModel.updateOne(
    { name },
    { $set: updateData },
    { upsert: true }
  ).catch((e) => console.warn("⚠️ [MongoDB] Lỗi lưu PlayerProfile:", e.message));
}

async function initMongoConnection() {
  try {
    await mongoose.connect(MONGODB_URI);
    isMongoConnected = true;
    console.log("🌸 [MongoDB Atlas] Kết nối thành công! Đã kết nối cơ sở dữ liệu Cloud: annhien (chua_an_lac).");

    const cloudDoc = await LeaderboardModel.findOne({ docId: "active_leaderboard" });
    if (cloudDoc) {
      const todayStr = getVietnamDateString();
      if (cloudDoc.currentDate === todayStr) {
        if (cloudDoc.entries && typeof cloudDoc.entries === "object") {
          leaderboardState.entries = { ...(cloudDoc.entries as any), ...leaderboardState.entries };
        }
        if (cloudDoc.currentAbbot) leaderboardState.currentAbbot = cloudDoc.currentAbbot as any;
        if (Array.isArray(cloudDoc.seniorMonks)) leaderboardState.seniorMonks = cloudDoc.seniorMonks as any;
        if (Array.isArray(cloudDoc.history)) leaderboardState.history = cloudDoc.history as any;
      } else {
        if (cloudDoc.entries && typeof cloudDoc.entries === "object") {
          leaderboardState.entries = { ...(cloudDoc.entries as any), ...leaderboardState.entries };
        }
        leaderboardState.currentDate = cloudDoc.currentDate || todayStr;
        checkDailyReset();
      }
      cleanupDuplicateSuffixEntries();
      await cleanupMongoDuplicateSuffixEntries();
      saveLeaderboardData();
      broadcastLeaderboard();
      console.log(`✨ [MongoDB Atlas] Đã nạp và chuẩn hóa thành công Bảng Xếp Hạng & Công Đức của ${Object.keys(leaderboardState.entries).length} người chơi từ Cloud.`);
    } else {
      await LeaderboardModel.create({
        docId: "active_leaderboard",
        currentDate: leaderboardState.currentDate,
        currentAbbot: leaderboardState.currentAbbot,
        seniorMonks: leaderboardState.seniorMonks,
        entries: leaderboardState.entries,
        history: leaderboardState.history,
      });
      console.log("✨ [MongoDB Atlas] Đã khởi tạo bản ghi Bảng Xếp Hạng đầu tiên trên Cloud MongoDB.");
    }

    // Tự động tổng hợp và đồng bộ danh sách cúng dường từ các đơn đã hoàn tất trên Cloud
    try {
      const donationAgg = await DonationOrderModel.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: "$playerName", totalAmount: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]);
      for (const d of donationAgg) {
        if (leaderboardState.entries[d._id]) {
          leaderboardState.entries[d._id].totalDonated = d.totalAmount;
          leaderboardState.entries[d._id].donationCount = d.count;
        } else {
          leaderboardState.entries[d._id] = {
            name: d._id,
            avatar: "female",
            camLoToday: 0,
            totalCamLo: 0,
            totalDonated: d.totalAmount,
            donationCount: d.count,
            lastUpdated: Date.now(),
            isMonk: d._id.startsWith("Thích "),
          };
        }
      }
      saveLeaderboardData();
      broadcastLeaderboard();
    } catch (aggErr) {
      console.warn("Lỗi tổng hợp dữ liệu cúng dường:", aggErr);
    }
  } catch (err: any) {
    console.warn("⚠️ [MongoDB Atlas] Chưa thể kết nối Cloud MongoDB, hệ thống dùng Local Fallback:", err.message);
  }
}

// Kiểm tra và thực hiện RESET VÀO 00H MỖI NGÀY
function checkDailyReset(): boolean {
  const todayStr = getVietnamDateString();
  if (leaderboardState.currentDate !== todayStr) {
    console.log(`🌙 [RESET 00H00] Chuyển giao ngày mới: ${todayStr} (Ngày cũ: ${leaderboardState.currentDate})`);

    // Lấy danh sách tu sĩ đã xuất gia (bắt đầu bằng "Thích " hoặc isMonk === true)
    const monkCandidates = Object.values(leaderboardState.entries)
      .filter((p) => p.name.startsWith("Thích ") || p.isMonk === true)
      .sort((a, b) => b.camLoToday - a.camLoToday || b.totalCamLo - a.totalCamLo);

    const winner = monkCandidates.length > 0 && monkCandidates[0].camLoToday > 0 ? monkCandidates[0] : null;

    if (winner) {
      leaderboardState.currentAbbot = {
        name: winner.name,
        avatar: winner.avatar,
        camLoYesterday: winner.camLoToday,
        appointedDate: todayStr,
      };
      leaderboardState.history.push({
        date: leaderboardState.currentDate,
        winner: winner.name,
        score: winner.camLoToday,
      });
      if (leaderboardState.history.length > 30) leaderboardState.history.shift();
      console.log(`👑 TÂN HÒA THƯỢNG TRỤ TRÌ HÔM NAY: ${winner.name} (${winner.camLoToday} Điểm Công Đức hôm qua)`);
    } else {
      leaderboardState.currentAbbot = null;
    }

    // Tấn phong 12 Vị Cao Tăng (Hạng 2 đến 13) - CHỈ LẤY NGƯỜI CHƠI THẬT ĐÃ XUẤT GIA
    const seniorMonks: SeniorMonkInfo[] = [];
    for (let i = 1; i <= 12; i++) {
      const p = monkCandidates[i];
      if (p && p.camLoToday > 0) {
        seniorMonks.push({
          rank: i + 1,
          name: p.name,
          avatar: p.avatar,
          camLoYesterday: p.camLoToday,
        });
      }
    }
    leaderboardState.seniorMonks = seniorMonks;

    // Reset Điểm Công Đức trong ngày hôm nay về 0 cho tất cả đạo hữu
    for (const key of Object.keys(leaderboardState.entries)) {
      leaderboardState.entries[key].camLoToday = 0;
      leaderboardState.entries[key].lastUpdated = Date.now();
    }

    leaderboardState.currentDate = todayStr;
    saveLeaderboardData();

    // Thông báo đến toàn bộ đạo hữu trong chùa
    if (winner) {
      io.emit("chat:bubble", {
        id: "system",
        text: `👑 [SẮC PHONG TRỤ TRÌ] Chúc mừng Hòa Thượng ${winner.name} đã tích lũy nhiều Điểm Công Đức nhất hôm qua (${winner.camLoToday} điểm) và được tấn phong làm Hòa Thượng Trụ Trì hôm nay!`,
      });
    }

    broadcastLeaderboard();
    return true;
  }
  return false;
}

// Lấy danh sách Top Bảng Xếp Hạng phân chia 2 bảng Xuất Gia & Cư Sĩ
function getLeaderboardPayload() {
  checkDailyReset();
  cleanupDuplicateSuffixEntries();

  // Gộp tất cả các bản ghi có cùng tên gốc (loại bỏ và hợp nhất mọi hậu tố #2, #3,...)
  const mergedMap = new Map<string, LeaderboardEntry>();
  for (const entry of Object.values(leaderboardState.entries)) {
    const cleanName = (entry.name || "").replace(/\s*#\d+$/, "").trim();
    if (!cleanName) continue;
    const key = cleanName.toLowerCase();
    const existing = mergedMap.get(key);
    if (!existing) {
      mergedMap.set(key, {
        ...entry,
        name: cleanName,
        isMonk: cleanName.startsWith("Thích ") || Boolean(entry.isMonk),
      });
    } else {
      existing.camLoToday = Math.max(existing.camLoToday || 0, entry.camLoToday || 0);
      existing.totalCamLo = Math.max(existing.totalCamLo || 0, entry.totalCamLo || 0);
      existing.totalDonated = Math.max(existing.totalDonated || 0, entry.totalDonated || 0);
      existing.donationCount = Math.max(existing.donationCount || 0, entry.donationCount || 0);
      if (entry.isMonk || cleanName.startsWith("Thích ")) existing.isMonk = true;
      if (entry.avatar && (!existing.avatar || existing.avatar === "chibi_gray")) {
        existing.avatar = entry.avatar;
      }
    }
  }

  const allEntries = Array.from(mergedMap.values());
  allEntries.sort((a, b) => (b.camLoToday || 0) - (a.camLoToday || 0) || (b.totalCamLo || 0) - (a.totalCamLo || 0) || (a.lastUpdated || 0) - (b.lastUpdated || 0));

  // 1. BẢNG XUẤT GIA (Tu sĩ đã xuống tóc - Họ Thích hoặc isMonk)
  const monasticLeaderboard = allEntries.filter(
    (e) => e.isMonk === true || (e.name && e.name.startsWith("Thích "))
  );

  // 2. BẢNG CƯ SĨ TẠI GIA (Người chưa xuất gia)
  const layLeaderboard = allEntries.filter(
    (e) => !(e.isMonk === true || (e.name && e.name.startsWith("Thích ")))
  );

  // Trụ Trì: Nếu đã có Trụ Trì chính thức từ ngày hôm trước
  let abbot = leaderboardState.currentAbbot;
  // Nếu chưa có Trụ Trì hôm qua nhưng trong bảng xuất gia có vị sư dẫn đầu hôm nay với điểm > 0
  if (!abbot && monasticLeaderboard.length > 0 && (monasticLeaderboard[0].camLoToday || 0) > 0) {
    abbot = {
      name: monasticLeaderboard[0].name,
      avatar: monasticLeaderboard[0].avatar,
      camLoYesterday: monasticLeaderboard[0].camLoToday,
      appointedDate: leaderboardState.currentDate,
    };
  }

  // 12 Vị Cao Tăng (Hạng 2 đến 13 trong bảng xuất gia) - BẢO LƯU TỪ MIDNIGHT HOẶC TỰ ĐỘNG CẬP NHẬT
  let seniorMonks: SeniorMonkInfo[] = [];
  if (Array.isArray(leaderboardState.seniorMonks) && leaderboardState.seniorMonks.length > 0) {
    seniorMonks = leaderboardState.seniorMonks;
  } else {
    for (let i = 1; i < Math.min(13, monasticLeaderboard.length); i++) {
      const monk = monasticLeaderboard[i];
      if ((monk.camLoToday || 0) > 0 || (monk.totalCamLo || 0) > 0) {
        seniorMonks.push({
          rank: i + 1,
          name: monk.name,
          avatar: monk.avatar,
          camLoYesterday: monk.camLoToday || 0,
        });
      }
    }
  }

  // 3. BẢNG ĐẠI THÍ CHỦ CÚNG DƯỜNG TAM BẢO (Nạp / Cúng Dường Nhiều Nhất)
  const donationLeaderboard = allEntries
    .filter((e) => (e.totalDonated && e.totalDonated > 0) || (e.donationCount && e.donationCount > 0))
    .sort((a, b) => (b.totalDonated || 0) - (a.totalDonated || 0) || (b.totalCamLo || 0) - (a.totalCamLo || 0));

  return {
    currentDate: leaderboardState.currentDate,
    currentAbbot: abbot,
    seniorMonks,
    monasticLeaderboard: monasticLeaderboard.slice(0, 50),
    layLeaderboard: layLeaderboard.slice(0, 50),
    donationLeaderboard: donationLeaderboard.slice(0, 50),
    leaderboard: allEntries.slice(0, 50),
    resetCountdownSec: getSecondsUntilMidnight(),
  };
}

function broadcastLeaderboard() {
  io.emit("leaderboard:update", getLeaderboardPayload());
}

// Chạy kiểm tra reset 00h mỗi 30 giây
setInterval(checkDailyReset, 30000);

// Thả sẵn một vài hoa đăng mặc định trên hồ
activeLanterns.set("lan_init_1", {
  id: "lan_init_1",
  author: "Diệu Tâm",
  wishText: "Cầu chúc cha mẹ sống lâu trăm tuổi, thân tâm an lạc.",
  type: "lotus_pink",
  gx: 7.5,
  gy: 15.2,
  rejoices: 8,
  createdAt: Date.now(),
});

activeLanterns.set("lan_init_2", {
  id: "lan_init_2",
  author: "Minh Trí",
  wishText: "Nguyện cho thế giới hòa bình, vạn sự hanh thông.",
  type: "lotus_white",
  gx: 14.2,
  gy: 16.1,
  rejoices: 15,
  createdAt: Date.now(),
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ─────────────────────────────────────────────
// QUẢN LÝ TÍNH DUY NHẤT CỦA TÊN NGƯỜI CHƠI (KHÔNG ĐƯỢC TRÙNG NHAU)
// ─────────────────────────────────────────────
function isNameAlreadyTaken(name: string, excludeSocketId?: string, clientToken?: string): boolean {
  const clean = name.trim().toLowerCase().replace(/\s*#\d+$/, "");
  if (!clean) return true;

  // Kiểm tra với tất cả người chơi đang kết nối online trong chùa
  for (const [sId, p] of players.entries()) {
    if (sId !== excludeSocketId) {
      // Nếu là cùng 1 phiên làm việc (cùng clientToken), không tính là bị trùng do đây là reload/reconnect
      if (clientToken && p.clientToken && p.clientToken === clientToken) {
        continue;
      }
      const pClean = (p.name || "").trim().toLowerCase().replace(/\s*#\d+$/, "");
      if (pClean === clean) {
        return true;
      }
    }
  }

  return false;
}

function getGuaranteedUniqueName(baseName: string, _excludeSocketId?: string, _clientToken?: string): string {
  let candidate = (baseName || "Đạo Hữu").trim().slice(0, 30);
  // Luôn loại bỏ hậu tố #... để không bao giờ làm biến dạng tên nhân vật thành #2, #3
  candidate = candidate.replace(/\s*#\d+$/, "").trim();
  if (!candidate) candidate = "Đạo Hữu";
  return candidate;
}

// REST API Endpoints
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    temple: "Chùa An Lạc Online",
    activePlayers: players.size,
    activeLanterns: activeLanterns.size,
    occupiedSeatsCount: occupiedSeats.size,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/quotes/daily", (_req, res) => {
  const quotes = [
    { text: "Tâm an vạn sự an. Bình yên đến từ bên trong, đừng tìm kiếm ở bên ngoài.", author: "Lời Phật Dạy" },
    { text: "Hãy dịu dàng với chính mình và từ bi với vạn vật xung quanh.", author: "Kinh Pháp Cú" },
    { text: "Hạnh phúc không phải là không có đau khổ, mà là biết an trú giữa những thăng trầm.", author: "Thiền Sư Nhất Hạnh" },
    { text: "Hận thù diệt hận thù, đời này không thể có. Từ bi diệt hận thù, là định luật ngàn thu.", author: "Kinh Pháp Cú" },
  ];
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  res.json(q);
});

app.get("/api/lanterns", (_req, res) => {
  res.json(Array.from(activeLanterns.values()));
});

app.get("/api/leaderboard", (_req, res) => {
  res.json(getLeaderboardPayload());
});

app.get("/api/version", (_req, res) => {
  res.json({
    version: APP_VERSION,
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

// ==========================================
// REST API CHO HÒM CÔNG ĐỨC & VIETQR
// ==========================================
app.get("/api/donation/packages", (_req, res) => {
  res.json({
    success: true,
    packages: DONATION_PACKAGES,
    bankConfig: BANK_CONFIG,
  });
});

app.post("/api/donation/create", async (req, res) => {
  try {
    const { playerName, packageId } = req.body || {};
    const pkg = DONATION_PACKAGES.find((p) => p.id === packageId) || DONATION_PACKAGES[0];
    const name = (playerName || "Đạo Hữu Vô Danh").trim().slice(0, 30);
    const orderCode = generateOrderCode();
    const qrUrl = buildVietQrUrl(pkg.amount, orderCode);

    const orderData = {
      orderCode,
      playerName: name,
      amount: pkg.amount,
      meritPoints: pkg.meritPoints,
      packageId: pkg.id,
      packageName: pkg.title,
      bankCode: BANK_CONFIG.bankCode,
      accountNumber: BANK_CONFIG.accountNumber,
      accountName: BANK_CONFIG.accountName,
      qrUrl,
      status: "pending",
      createdAt: new Date(),
    };

    donationOrders.set(orderCode, orderData);

    if (isMongoConnected) {
      try {
        await DonationOrderModel.create(orderData);
      } catch (err) {
        console.warn("MongoDB create donation order error:", err);
      }
    }

    res.json({
      success: true,
      order: orderData,
      bankConfig: BANK_CONFIG,
    });
  } catch (error) {
    console.error("Lỗi tạo đơn cúng dường:", error);
    res.status(500).json({ success: false, message: "Không thể tạo đơn cúng dường" });
  }
});

app.post("/api/donation/check", async (req, res) => {
  try {
    const { orderCode } = req.body || {};
    if (!orderCode) {
      return res.status(400).json({ success: false, message: "Thiếu mã đơn cúng dường" });
    }

    let order = donationOrders.get(orderCode);
    if (!order && isMongoConnected) {
      order = await DonationOrderModel.findOne({ orderCode }).lean();
    }

    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn cúng dường" });
    }

    res.json({
      success: true,
      status: order.status,
      order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi kiểm tra đơn cúng dường" });
  }
});

app.post("/api/donation/confirm", async (req, res) => {
  try {
    const { orderCode } = req.body || {};
    if (!orderCode) {
      return res.status(400).json({ success: false, message: "Thiếu mã đơn cúng dường" });
    }

    const result = await completeDonationOrder(orderCode, "api_confirm");
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi xác nhận cúng dường" });
  }
});

// Webhook tự động nhận thông báo từ ngân hàng (SePAY, Casso, MB Bank webhook, v.v.)
app.post("/api/donation/webhook", async (req, res) => {
  try {
    console.log("📥 [Donation Webhook Nhận Được]:", JSON.stringify(req.body));
    const body = req.body || {};
    const content = String(
      body.content ||
      body.description ||
      body.memo ||
      body.transferContent ||
      body.message ||
      ""
    );

    const match = content.match(/CD\d{6}/i);
    if (match) {
      const orderCode = match[0].toUpperCase();
      console.log(`🔍 Webhook tìm thấy mã đơn cúng dường: ${orderCode}`);
      const result = await completeDonationOrder(orderCode, "bank_webhook");
      return res.json({ success: true, processed: true, result });
    }

    res.json({ success: true, processed: false, message: "Không tìm thấy mã đơn cúng dường hợp lệ" });
  } catch (error) {
    console.error("Lỗi xử lý webhook cúng dường:", error);
    res.status(500).json({ success: false, message: "Lỗi xử lý webhook" });
  }
});

// SPA Fallback cho các route khác (đảm bảo reload trang không bị 404, tương thích Express 5)
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
    return next();
  }
  const indexPath = path.join(process.cwd(), "dist", "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send("Game static build not found. Please run 'npm run build' first.");
});

// Realtime Socket.IO Logic
io.on("connection", (socket: Socket) => {
  console.log(`🌸 Đạo hữu kết nối: ${socket.id}`);

  // Gửi ngay phiên bản máy chủ hiện tại
  socket.emit("server:version", { version: APP_VERSION });
  socket.emit("server:update_available", {
    version: APP_VERSION,
    message: "🌸 Đã mở rộng Đại Tạng Kinh Điện đồ sộ (24 bồ đoàn, hành lang nối Chính Điện & tối ưu di động)! Nhấn để làm mới trang.",
  });

  // Gửi ngay số người đang cùng chiêm bái
  socket.emit("room:player_count", {
    current: players.size,
  });

  // Gửi danh sách toàn bộ chỗ ngồi đã có người trong Chính Điện
  const seatList = Array.from(occupiedSeats.entries()).map(([seatId, info]) => ({
    seatId,
    playerName: info.playerName,
    socketId: info.socketId,
  }));
  socket.emit("seats:occupied_list", seatList);

  // Gửi ngay thông tin Bảng Xếp Hạng & Đương Kim Trụ Trì cho người mới kết nối
  socket.emit("leaderboard:data", getLeaderboardPayload());

  // Lắng nghe yêu cầu lấy bảng xếp hạng
  socket.on("leaderboard:get", () => {
    socket.emit("leaderboard:data", getLeaderboardPayload());
  });

  // Lắng nghe tích lũy Điểm Công Đức
  socket.on("camlo:earn", (data: { name: string; avatar: string; amount: number; reason?: string; isMonk?: boolean }) => {
    const amount = Math.min(50, Math.max(1, Math.floor(data.amount || 1)));
    let name = (data.name || "Đạo Hữu").trim().slice(0, 30).replace(/\s*#\d+$/, "").trim();
    if (!name) name = "Đạo Hữu";
    const avatar = data.avatar || "female";

    checkDailyReset();

    const isMonk = name.startsWith("Thích ") || Boolean(data.isMonk) || Boolean(leaderboardState.entries[name]?.isMonk);

    if (!leaderboardState.entries[name]) {
      leaderboardState.entries[name] = {
        name,
        avatar,
        camLoToday: 0,
        totalCamLo: 0,
        lastUpdated: Date.now(),
        isMonk,
      };
    }

    leaderboardState.entries[name].camLoToday += amount;
    leaderboardState.entries[name].totalCamLo += amount;
    leaderboardState.entries[name].avatar = avatar;
    leaderboardState.entries[name].lastUpdated = Date.now();
    if (isMonk) {
      leaderboardState.entries[name].isMonk = true;
    }

    saveLeaderboardData();
    syncPlayerToMongo(name, leaderboardState.entries[name]);
    broadcastLeaderboard();

    // Thông báo tán thán công đức nếu lượng cam lộ lớn
    if (amount >= 20 && data.reason) {
      io.emit("chat:bubble", {
        id: "system",
        text: `🌸 Đạo hữu ${name} vừa tích lũy +${amount} Điểm Công Đức (${data.reason})!`,
      });
    }
  });

  // Lắng nghe khấu trừ Điểm Công Đức (Hủy nhiệm vụ, etc.)
  socket.on("camlo:deduct", (data: { name: string; amount: number; reason?: string }) => {
    const amount = Math.max(1, Math.floor(data.amount || 10));
    let name = (data.name || "Đạo Hữu").trim().slice(0, 30).replace(/\s*#\d+$/, "").trim();
    if (!name) name = "Đạo Hữu";
    checkDailyReset();

    if (leaderboardState.entries[name]) {
      leaderboardState.entries[name].camLoToday = Math.max(0, leaderboardState.entries[name].camLoToday - amount);
      leaderboardState.entries[name].totalCamLo = Math.max(0, leaderboardState.entries[name].totalCamLo - amount);
      leaderboardState.entries[name].lastUpdated = Date.now();
      saveLeaderboardData();
      syncPlayerToMongo(name, leaderboardState.entries[name]);
      broadcastLeaderboard();
      console.log(`⚠️ Khấu trừ -${amount} Điểm Công Đức của [${name}] (${data.reason || "Hủy nhiệm vụ"})`);
    }
  });

  // Kiểm tra tính khả dụng của tên (không được trùng lặp)
  socket.on("check:name_available", (data: { name: string }, callback: (res: { available: boolean; reason?: string }) => void) => {
    const raw = (data.name || "").trim().slice(0, 30);
    if (!raw || raw.length < 2) {
      if (typeof callback === "function") callback({ available: false, reason: "Tên phải có ít nhất 2 ký tự" });
      return;
    }
    const player = players.get(socket.id);
    const taken = isNameAlreadyTaken(raw, socket.id, player?.clientToken);
    if (typeof callback === "function") {
      callback({
        available: !taken,
        reason: taken ? `Tên "${raw}" đã có người sử dụng trong chùa! Đạo hữu vui lòng chọn tên khác.` : undefined,
      });
    }
  });

  // 1. Gia nhập thế giới chùa (Không giới hạn người chơi, mỗi người tên duy nhất)
  socket.on("player:join", (data: { name: string; avatar: string; gx: number; gy: number; isLoggedIn?: boolean; isMonk?: boolean; clientToken?: string }) => {
    let rawName = (data.name || "Đạo Hữu").trim().slice(0, 30);
    const originalInputName = rawName;
    // Tự động gỡ bỏ hậu tố #2, #3 nếu trước đó bị lỗi gán nhầm
    rawName = rawName.replace(/\s*#\d+$/, "").trim();
    if (!rawName) rawName = "Đạo Hữu";

    const clientToken = (data.clientToken || (data as any).token || "").trim();
    const clean = rawName.toLowerCase();

    // DỌN DẸP TRIỆT ĐỂ TẤT CẢ PHIÊN CŨ KHI F5 / RELOAD TRANG:
    const staleSocketIds: string[] = [];
    for (const [sId, p] of players.entries()) {
      if (sId !== socket.id) {
        const basePName = (p.name || "").replace(/\s*#\d+$/, "").trim().toLowerCase();
        const sameToken = Boolean(clientToken && p.clientToken && p.clientToken === clientToken);
        const sameName = basePName === clean;
        if (sameToken || sameName) {
          staleSocketIds.push(sId);
        }
      }
    }

    for (const sId of staleSocketIds) {
      console.log(`🔄 [F5/Reload] Đạo hữu [${rawName}] nạp lại trang / phiên cũ. Chuyển giao phiên từ socket ${sId} sang ${socket.id}`);
      players.delete(sId);
      for (const [seatId, info] of occupiedSeats.entries()) {
        if (info.socketId === sId) occupiedSeats.delete(seatId);
      }
      const oldSock = io.sockets.sockets.get(sId);
      if (oldSock) {
        try {
          oldSock.disconnect(true);
        } catch {}
      }
      socket.broadcast.emit("player:left", sId);
    }

    // Luôn đảm bảo dữ liệu Bảng Xếp Hạng không còn sót hậu tố #... do lỗi reload cũ
    cleanupDuplicateSuffixEntries();

    // Tên người chơi là tên gốc nguyên bản (không thêm hậu tố #2, #3)
    const uniqueName = rawName;
    const isPlayerMonk = uniqueName.startsWith("Thích ") || Boolean((data as any).isMonk);
    const isLoggedIn = Boolean((data as any).isLoggedIn);

    const player: PlayerState = {
      id: socket.id,
      name: uniqueName,
      avatar: data.avatar || "chibi_gray",
      gx: data.gx || 12,
      gy: data.gy || 21,
      action: "idle",
      dir: "right",
      isLoggedIn,
      isMonk: isPlayerMonk,
      clientToken,
    };

    players.set(socket.id, player);

    // Xử lý điểm công đức & bảng xếp hạng khi gia nhập:
    const clientPoints = Math.max(0, Number((data as any).camLoToday) || 0);
    const isDefaultGuest = !isLoggedIn && !isPlayerMonk && (uniqueName === "Đạo Hữu An Nhiên" || uniqueName.startsWith("Khách "));

    if (isDefaultGuest) {
      // Khách vãng lai mặc định chưa đăng nhập: khởi tạo tạm thời
      if (!leaderboardState.entries[uniqueName]) {
        leaderboardState.entries[uniqueName] = {
          name: uniqueName,
          avatar: data.avatar || "female",
          camLoToday: 0,
          totalCamLo: 0,
          lastUpdated: Date.now(),
          isMonk: false,
        };
      }
    } else {
      // Người dùng đã có tên / đã xuất gia / đã đăng nhập: Bảo lưu và đồng bộ điểm công đức thật
      if (!leaderboardState.entries[uniqueName]) {
        leaderboardState.entries[uniqueName] = {
          name: uniqueName,
          avatar: data.avatar || "female",
          camLoToday: clientPoints,
          totalCamLo: clientPoints,
          lastUpdated: Date.now(),
          isMonk: isPlayerMonk,
        };
      } else {
        const entry = leaderboardState.entries[uniqueName];
        if (clientPoints > (entry.camLoToday || 0)) {
          entry.camLoToday = clientPoints;
        }
        if (clientPoints > (entry.totalCamLo || 0)) {
          entry.totalCamLo = clientPoints;
        }
        if (isPlayerMonk) entry.isMonk = true;
      }
      saveLeaderboardData();
      syncPlayerToMongo(uniqueName, leaderboardState.entries[uniqueName], clientToken);
      broadcastLeaderboard();

      if (isMongoConnected) {
        PlayerProfileModel.findOne({ name: uniqueName }).then((profile) => {
          if (profile) {
            const todayStr = getVietnamDateString();
            const cloudToday = profile.lastDate === todayStr ? (profile.camLoToday || 0) : 0;
            const bestToday = Math.max(cloudToday, clientPoints, leaderboardState.entries[uniqueName]?.camLoToday || 0);
            const bestTotal = Math.max(profile.totalCamLo || 0, leaderboardState.entries[uniqueName]?.totalCamLo || 0, bestToday);
            if (leaderboardState.entries[uniqueName]) {
              leaderboardState.entries[uniqueName].camLoToday = bestToday;
              leaderboardState.entries[uniqueName].totalCamLo = bestTotal;
              if (profile.isMonk) leaderboardState.entries[uniqueName].isMonk = true;
              saveLeaderboardData();
              broadcastLeaderboard();
            }

            // Gửi điểm công đức thật từ Cloud về client để hiển thị trên thanh trạng thái
            socket.emit("player:merit_sync", { camLoToday: bestToday, totalCamLo: bestTotal });

            // Đồng bộ dữ liệu công quả đã lưu từ MongoDB Atlas về máy người chơi
            const isSameQuestDay = profile.questDate === todayStr;
            const questData = {
              date: todayStr,
              completedCount: isSameQuestDay ? Math.min(10, Math.max(0, profile.questsCompletedToday || 0)) : 0,
              completedQuestIds: isSameQuestDay && Array.isArray(profile.completedQuestIds) ? profile.completedQuestIds : [],
              activeQuestId: isSameQuestDay ? (profile.activeQuestId || null) : null,
              activeQuestWorkDone: isSameQuestDay ? Boolean(profile.activeQuestWorkDone) : false,
            };
            socket.emit("quest:sync_from_server", questData);

            // Đồng bộ màu áo cà sa từ DB
            if (profile.robeColor) {
              player.robeColor = profile.robeColor;
              socket.emit("player:robe_sync", { robeColor: profile.robeColor });
            }
          }
        }).catch(() => {});
      }
    }

    // Cập nhật số người trong phòng cho tất cả đạo hữu
    broadcastRoomCount();

    // Nếu tên ban đầu bị trùng hoặc bị dính hậu tố #2 cũ và được tự động điều chỉnh, gửi thông báo cho client
    if (uniqueName !== originalInputName) {
      socket.emit("player:name_adjusted", {
        name: uniqueName,
        original: originalInputName,
        reason: uniqueName === rawName
          ? "Đã chuẩn hóa và khôi phục tên gốc của đạo hữu"
          : "Tên ban đầu đã có đạo hữu khác đang online trong chùa",
      });
    }

    // Gửi danh sách người chơi hiện có cho người mới vào
    players.forEach((p) => {
      if (p.id !== socket.id) {
        socket.emit("player:joined", p);
      }
    });

    // Gửi danh sách hoa đăng đang trôi trên hồ
    activeLanterns.forEach((l) => {
      socket.emit("lantern:spawned", l);
    });

    // Gửi danh sách các bồ đoàn / chỗ ngồi trong Chính Điện đã có người ngồi
    const seatList = Array.from(occupiedSeats.entries()).map(([seatId, info]) => ({
      seatId,
      playerName: info.playerName,
      socketId: info.socketId,
    }));
    socket.emit("seats:occupied_list", seatList);

    // Thông báo cho mọi người biết có người mới vào
    socket.broadcast.emit("player:joined", player);
  });

  // 1.1. Người chơi đăng nhập tài khoản thật (Google OAuth) - cập nhật phiên và đồng bộ DB tức thời
  socket.on("player:auth_login", async (data: { name: string; isMonk?: boolean; email?: string; clientToken?: string; camLoToday?: number }) => {
    let cleanName = (data.name || "").replace(/\s*#\d+$/, "").trim();
    if (!cleanName) cleanName = "Đạo Hữu";
    const clientToken = (data.clientToken || "").trim();
    const isPlayerMonk = Boolean(data.isMonk) || cleanName.startsWith("Thích ");

    const player = players.get(socket.id);
    if (player) {
      player.name = cleanName;
      player.isLoggedIn = true;
      player.isMonk = isPlayerMonk;
      if (clientToken) player.clientToken = clientToken;
    }

    if (!leaderboardState.entries[cleanName]) {
      leaderboardState.entries[cleanName] = {
        name: cleanName,
        avatar: player?.avatar || "female",
        camLoToday: Math.max(0, Number(data.camLoToday) || 0),
        totalCamLo: Math.max(0, Number(data.camLoToday) || 0),
        lastUpdated: Date.now(),
        isMonk: isPlayerMonk,
      };
    } else {
      if (data.camLoToday && data.camLoToday > (leaderboardState.entries[cleanName].camLoToday || 0)) {
        leaderboardState.entries[cleanName].camLoToday = data.camLoToday;
      }
      if (isPlayerMonk) leaderboardState.entries[cleanName].isMonk = true;
    }

    saveLeaderboardData();
    syncPlayerToMongo(cleanName, leaderboardState.entries[cleanName], clientToken);
    broadcastLeaderboard();

    if (isMongoConnected) {
      try {
        const profile = await PlayerProfileModel.findOne({ name: cleanName });
        if (profile) {
          const todayStr = getVietnamDateString();
          const cloudToday = profile.lastDate === todayStr ? (profile.camLoToday || 0) : 0;
          const bestToday = Math.max(cloudToday, Number(data.camLoToday) || 0, leaderboardState.entries[cleanName]?.camLoToday || 0);
          const bestTotal = Math.max(profile.totalCamLo || 0, leaderboardState.entries[cleanName]?.totalCamLo || 0, bestToday);

          leaderboardState.entries[cleanName].camLoToday = bestToday;
          leaderboardState.entries[cleanName].totalCamLo = bestTotal;
          saveLeaderboardData();
          broadcastLeaderboard();

          socket.emit("player:merit_sync", { camLoToday: bestToday, totalCamLo: bestTotal });

          const isSameQuestDay = profile.questDate === todayStr;
          const questData = {
            date: todayStr,
            completedCount: isSameQuestDay ? Math.min(10, Math.max(0, profile.questsCompletedToday || 0)) : 0,
            completedQuestIds: isSameQuestDay && Array.isArray(profile.completedQuestIds) ? profile.completedQuestIds : [],
            activeQuestId: isSameQuestDay ? (profile.activeQuestId || null) : null,
            activeQuestWorkDone: isSameQuestDay ? Boolean(profile.activeQuestWorkDone) : false,
          };
          socket.emit("quest:sync_from_server", questData);

          if (profile.robeColor) {
            if (player) player.robeColor = profile.robeColor;
            socket.emit("player:robe_sync", { robeColor: profile.robeColor });
          }
        }
      } catch (err) {
        console.warn("Lỗi sync DB khi player:auth_login:", err);
      }
    }
  });

  // 1.5. Quản lý chỗ ngồi duy nhất trong Chính Điện (Chỉ 1 người / 1 chỗ, ai ngồi rồi người khác không được ngồi)
  socket.on(
    "seat:claim",
    (
      data: { seatId: string },
      callback?: (res: { success: boolean; message?: string; occupiedBy?: string }) => void
    ) => {
      const seatId = (data.seatId || "").trim();
      if (!seatId) {
        if (typeof callback === "function") callback({ success: false, message: "Mã chỗ ngồi không hợp lệ." });
        return;
      }
      const player = players.get(socket.id);
      const playerName = player ? player.name : "Đạo Hữu";

      // Kiểm tra xem chỗ này đã có người khác ngồi chưa
      const existing = occupiedSeats.get(seatId);
      if (existing && existing.socketId !== socket.id) {
        const msg = `Chỗ ngồi này đã có đạo hữu [${existing.playerName}] đang tĩnh tọa!`;
        socket.emit("seat:rejected", { seatId, message: msg, occupiedBy: existing.playerName });
        if (typeof callback === "function") callback({ success: false, message: msg, occupiedBy: existing.playerName });
        return;
      }

      // Giải phóng chỗ ngồi cũ của socket này nếu trước đó đang ngồi chỗ khác
      let oldSeatId: string | null = null;
      for (const [sId, info] of occupiedSeats.entries()) {
        if (info.socketId === socket.id && sId !== seatId) {
          oldSeatId = sId;
          occupiedSeats.delete(sId);
          break;
        }
      }
      if (oldSeatId) {
        io.emit("seat:vacated", { seatId: oldSeatId });
      }

      // Chiếm chỗ mới
      occupiedSeats.set(seatId, {
        socketId: socket.id,
        playerName,
        seatedAt: Date.now(),
      });

      // Thông báo cho tất cả người chơi trong chùa biết chỗ này đã có người ngồi
      io.emit("seat:occupied", {
        seatId,
        playerName,
        socketId: socket.id,
      });

      console.log(`🧘 Đạo hữu [${playerName}] (${socket.id}) đã ngự tọa tại chỗ ngồi [${seatId}]`);
      if (typeof callback === "function") callback({ success: true });
    }
  );

  // Người chơi rời khỏi chỗ ngồi
  socket.on("seat:leave", () => {
    let releasedSeatId: string | null = null;
    for (const [sId, info] of occupiedSeats.entries()) {
      if (info.socketId === socket.id) {
        releasedSeatId = sId;
        occupiedSeats.delete(sId);
        break;
      }
    }
    if (releasedSeatId) {
      io.emit("seat:vacated", { seatId: releasedSeatId });
      console.log(`🍃 Đạo hữu (${socket.id}) đã rời khỏi chỗ ngồi [${releasedSeatId}]`);
    }
  });

  // 2. Di chuyển
  socket.on("player:move", (data: { gx: number; gy: number; action: string; dir: "left" | "right" }) => {
    const player = players.get(socket.id);
    if (player) {
      player.gx = data.gx;
      player.gy = data.gy;
      player.action = data.action;
      player.dir = data.dir;

      // Nếu hành động không phải ngồi thiền (ví dụ đi bộ, đứng dậy): tự động giải phóng chỗ ngồi
      if (data.action !== "meditate") {
        let releasedSeatId: string | null = null;
        for (const [sId, info] of occupiedSeats.entries()) {
          if (info.socketId === socket.id) {
            releasedSeatId = sId;
            occupiedSeats.delete(sId);
            break;
          }
        }
        if (releasedSeatId) {
          io.emit("seat:vacated", { seatId: releasedSeatId });
        }
      }

      socket.broadcast.emit("player:moved", {
        id: socket.id,
        gx: data.gx,
        gy: data.gy,
        action: data.action,
        dir: data.dir,
      });
    }
  });

  // 3. Hành động (Thiền, bái lễ, chuông, mõ, vẫy tay)
  socket.on("player:action", (data: { action: string }) => {
    const player = players.get(socket.id);
    if (player) {
      player.action = data.action;
      socket.broadcast.emit("player:action", {
        id: socket.id,
        action: data.action,
      });
    }
  });

  // 3.1. Đổi tên / Pháp danh nhân vật (Bảo lưu trọn vẹn danh hiệu Trụ Trì, Cao Tăng & Điểm Công Đức)
  socket.on("player:rename", async (data: { name: string }) => {
    const player = players.get(socket.id);
    if (!player) return;

    const newName = (data.name || "").trim().slice(0, 30).replace(/\s*#\d+$/, "").trim();
    if (!newName) return;

    const oldName = player.name;
    if (oldName === newName) return;

    // KIỂM TRA TRÙNG TÊN: Tuyệt đối không cho phép trùng tên với người khác!
    if (isNameAlreadyTaken(newName, socket.id, player.clientToken)) {
      socket.emit("player:rename_failed", {
        name: newName,
        reason: `Tên "${newName}" đã có đạo hữu khác sử dụng trong chùa! Vui lòng chọn một tên khác.`,
      });
      return;
    }

    player.name = newName;
    socket.emit("player:rename_success", { name: newName });

    // BẢO LƯU TRỌN VẸN ĐIỂM CÔNG ĐỨC, HẠNG & DANH HIỆU
    const oldEntry = leaderboardState.entries[oldName];
    const isMonk = newName.startsWith("Thích ") || Boolean(oldEntry?.isMonk) || Boolean(player.isMonk);

    if (oldEntry) {
      delete leaderboardState.entries[oldName];
      leaderboardState.entries[newName] = {
        ...oldEntry,
        name: newName,
        isMonk,
        lastUpdated: Date.now(),
      };
    } else {
      leaderboardState.entries[newName] = {
        name: newName,
        avatar: player.avatar || "male",
        camLoToday: 0,
        totalCamLo: 0,
        totalDonated: 0,
        donationCount: 0,
        lastUpdated: Date.now(),
        isMonk,
      };
    }

    // Bảo lưu danh hiệu Trụ Trì nếu là đương kim Trụ Trì
    if (leaderboardState.currentAbbot && leaderboardState.currentAbbot.name === oldName) {
      leaderboardState.currentAbbot.name = newName;
    }

    // Bảo lưu danh hiệu Cao Tăng nếu nằm trong 12 Vị Cao Tăng
    if (Array.isArray(leaderboardState.seniorMonks)) {
      leaderboardState.seniorMonks.forEach((m) => {
        if (m.name === oldName) {
          m.name = newName;
        }
      });
    }

    // Bảo lưu lịch sử sắc phong
    if (Array.isArray(leaderboardState.history)) {
      leaderboardState.history.forEach((h) => {
        if (h.winner === oldName) {
          h.winner = newName;
        }
      });
    }

    // Cập nhật tên trên chỗ ngồi trong Chính Điện nếu socket đang ngồi
    for (const [seatId, info] of occupiedSeats.entries()) {
      if (info.socketId === socket.id) {
        info.playerName = newName;
        break;
      }
    }
    broadcastOccupiedSeats();

    // Đồng bộ sang MongoDB Atlas: cập nhật PlayerProfile và các đơn cúng dường
    if (isMongoConnected) {
      try {
        await PlayerProfileModel.updateOne(
          { name: oldName },
          { $set: { name: newName, isMonk } }
        );
        await DonationOrderModel.updateMany(
          { playerName: oldName },
          { $set: { playerName: newName } }
        );
      } catch (err) {
        console.warn("MongoDB update rename error:", err);
      }
    }

    saveLeaderboardData();
    broadcastLeaderboard();

    socket.broadcast.emit("player:renamed", {
      id: socket.id,
      name: newName,
      oldName,
    });
  });

  // 3.2. Xuất gia thụ giới (Xuống tóc đi tu & nhận pháp danh họ Thích)
  socket.on("player:ordain", async (data: { dharmaName: string; robeColor?: number; isMonk: boolean }) => {
    let cleanName = (data.dharmaName || "").trim().slice(0, 30);
    if (!cleanName.startsWith("Thích ") && !cleanName.startsWith("Thích")) {
      cleanName = "Thích " + cleanName;
    } else if (cleanName.startsWith("Thích") && !cleanName.startsWith("Thích ")) {
      cleanName = "Thích " + cleanName.substring(5).trim();
    }

    const player = players.get(socket.id);
    const oldName = player?.name || "Đạo hữu";

    // Đảm bảo pháp danh xuất gia nguyên bản, không bao giờ gán hậu tố #2, #3
    cleanName = cleanName.replace(/\s*#\d+$/, "").trim();

    if (player) {
      player.name = cleanName;
      player.avatar = "chibi_monk";
      (player as any).isMonk = true;
      (player as any).dharmaName = cleanName;
    }

    let needLeaderboardUpdate = false;

    // Di chuyển hoặc cập nhật mục trong bảng xếp hạng
    if (leaderboardState.entries[oldName]) {
      const oldEntry = leaderboardState.entries[oldName];
      delete leaderboardState.entries[oldName];
      leaderboardState.entries[cleanName] = {
        ...oldEntry,
        name: cleanName,
        avatar: "chibi_monk",
        lastUpdated: Date.now(),
      };
      (leaderboardState.entries[cleanName] as any).isMonk = true;
      needLeaderboardUpdate = true;
    } else if (!leaderboardState.entries[cleanName]) {
      leaderboardState.entries[cleanName] = {
        name: cleanName,
        avatar: "chibi_monk",
        camLoToday: 0,
        totalCamLo: 0,
        lastUpdated: Date.now(),
      };
      (leaderboardState.entries[cleanName] as any).isMonk = true;
      needLeaderboardUpdate = true;
    }

    // Bảo lưu danh hiệu Trụ Trì & Cao Tăng khi xuất gia
    if (leaderboardState.currentAbbot && leaderboardState.currentAbbot.name === oldName) {
      leaderboardState.currentAbbot.name = cleanName;
      needLeaderboardUpdate = true;
    }
    if (Array.isArray(leaderboardState.seniorMonks)) {
      leaderboardState.seniorMonks.forEach((m) => {
        if (m.name === oldName) {
          m.name = cleanName;
          needLeaderboardUpdate = true;
        }
      });
    }

    for (const [seatId, info] of occupiedSeats.entries()) {
      if (info.socketId === socket.id) {
        info.playerName = cleanName;
        break;
      }
    }
    broadcastOccupiedSeats();

    if (isMongoConnected) {
      try {
        await PlayerProfileModel.updateOne(
          { name: oldName },
          { $set: { name: cleanName, isMonk: true, dharmaName: cleanName } }
        );
        await DonationOrderModel.updateMany(
          { playerName: oldName },
          { $set: { playerName: cleanName } }
        );
      } catch (err) {
        console.warn("MongoDB update ordain error:", err);
      }
    }

    if (needLeaderboardUpdate) {
      saveLeaderboardData();
      broadcastLeaderboard();
    }

    // Thông báo toàn bộ người chơi
    io.emit("player:ordained", {
      id: socket.id,
      name: cleanName,
      oldName,
      isMonk: true,
      robeColor: data.robeColor || 0xd97706,
    });

    io.emit("chat:bubble", {
      id: "system",
      text: `🔔 [XUẤT GIA THỤ GIỚI] Đạo hữu ${oldName} đã chính thức xả bỏ thế tục, xuống tóc quy y và mang pháp danh [${cleanName}]. Kính chúc tân tăng thân tâm an lạc, sớm đắc quả vị! 🙏`,
    });
  });

  // 3.3. Thay đổi sắc y phục Cà Sa (Dành cho Tăng Ni đã xuất gia theo đúng phẩm vị)
  socket.on("player:robe_change", async (data: { robeColor: number }) => {
    const player = players.get(socket.id);
    if (!player) return;
    const robeColor = Number(data.robeColor) || 0xd97706;
    player.robeColor = robeColor;

    if (isMongoConnected) {
      try {
        await PlayerProfileModel.updateOne(
          { name: player.name },
          { $set: { robeColor } }
        );
      } catch (e) {
        console.warn("⚠️ Lỗi lưu robeColor vào MongoDB:", e);
      }
    }

    io.emit("player:robe_changed", {
      id: socket.id,
      name: player.name,
      robeColor,
    });
  });

  // 3.4. Lưu và đồng bộ tiến trình công quả thiền môn lên MongoDB Atlas
  socket.on("quest:update", async (data: any) => {
    const player = players.get(socket.id);
    if (!player) return;
    const name = (player.name || "").replace(/\s*#\d+$/, "").trim();
    if (!name || name === "Đạo Hữu An Nhiên") return;
    const todayStr = getVietnamDateString();
    const completedCount = Math.min(10, Math.max(0, Number(data.completedCount) || 0));
    const completedQuestIds = Array.isArray(data.completedQuestIds) ? data.completedQuestIds : [];
    const activeQuestId = data.activeQuestId || null;
    const activeQuestWorkDone = Boolean(data.activeQuestWorkDone);

    if (isMongoConnected) {
      try {
        await PlayerProfileModel.updateOne(
          { name },
          {
            $set: {
              questDate: todayStr,
              questsCompletedToday: completedCount,
              completedQuestIds,
              activeQuestId,
              activeQuestWorkDone,
            },
          },
          { upsert: true }
        );
      } catch (err) {
        console.warn("⚠️ Lỗi lưu tiến trình công quả vào MongoDB:", err);
      }
    }
  });

  // 4. Chat & Bong bóng thoại
  socket.on("chat:send", (data: { text: string }) => {
    const text = (data.text || "").slice(0, 120).trim();
    if (text) {
      // Broadcast bong bóng thoại cho tất cả mọi người
      io.emit("chat:bubble", {
        id: socket.id,
        text,
      });
    }
  });

  // 5. Thả hoa đăng
  socket.on("lantern:release", (data: { wishText: string; type: string; gx: number; gy: number }) => {
    const player = players.get(socket.id);
    const authorName = player ? player.name : "Đồng tu";
    const newLantern: ServerLantern = {
      id: "lan_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      author: authorName,
      wishText: data.wishText || "Cầu chúc bình an.",
      type: data.type || "lotus_pink",
      gx: data.gx,
      gy: data.gy,
      rejoices: 1,
      createdAt: Date.now(),
    };

    activeLanterns.set(newLantern.id, newLantern);
    // Broadcast hoa đăng mới cho mọi người thấy trên hồ
    socket.broadcast.emit("lantern:spawned", newLantern);
  });

  // 6. Tùy hỷ công đức hoa đăng
  socket.on("lantern:rejoice", (data: { lanternId: string }) => {
    const l = activeLanterns.get(data.lanternId);
    if (l) {
      l.rejoices += 1;
      io.emit("lantern:rejoiced", {
        id: l.id,
        count: l.rejoices,
      });
    }
  });

  // 6.5. Hòm Công Đức & VietQR Cúng Dường Tam Bảo
  socket.on(
    "donation:create",
    async (
      data: { playerName?: string; packageId: string },
      callback?: (res: any) => void
    ) => {
      try {
        const player = players.get(socket.id);
        const name = (data.playerName || player?.name || "Đạo Hữu Vô Danh").trim().slice(0, 30);
        const pkg = DONATION_PACKAGES.find((p) => p.id === data.packageId) || DONATION_PACKAGES[0];
        const orderCode = generateOrderCode();
        const qrUrl = buildVietQrUrl(pkg.amount, orderCode);

        const orderData = {
          orderCode,
          playerName: name,
          amount: pkg.amount,
          meritPoints: pkg.meritPoints,
          packageId: pkg.id,
          packageName: pkg.title,
          bankCode: BANK_CONFIG.bankCode,
          accountNumber: BANK_CONFIG.accountNumber,
          accountName: BANK_CONFIG.accountName,
          qrUrl,
          status: "pending",
          createdAt: new Date(),
        };

        donationOrders.set(orderCode, orderData);

        if (isMongoConnected) {
          try {
            await DonationOrderModel.create(orderData);
          } catch (err) {
            console.warn("MongoDB create donation order error:", err);
          }
        }

        const response = {
          success: true,
          order: orderData,
          bankConfig: BANK_CONFIG,
        };

        if (typeof callback === "function") {
          callback(response);
        } else {
          socket.emit("donation:created", response);
        }
      } catch (err) {
        console.error("Socket donation:create error:", err);
        if (typeof callback === "function") {
          callback({ success: false, message: "Lỗi tạo đơn cúng dường" });
        }
      }
    }
  );

  socket.on(
    "donation:check",
    async (
      data: { orderCode: string },
      callback?: (res: any) => void
    ) => {
      const orderCode = (data.orderCode || "").trim().toUpperCase();
      let order = donationOrders.get(orderCode);
      if (!order && isMongoConnected) {
        order = await DonationOrderModel.findOne({ orderCode }).lean();
      }

      const res = order
        ? { success: true, status: order.status, order }
        : { success: false, message: "Không tìm thấy đơn cúng dường" };

      if (typeof callback === "function") callback(res);
      else socket.emit("donation:status", res);
    }
  );

  socket.on(
    "donation:confirm",
    async (
      data: { orderCode: string },
      callback?: (res: any) => void
    ) => {
      const orderCode = (data.orderCode || "").trim().toUpperCase();
      const res = await completeDonationOrder(orderCode, "player_socket_confirm");
      if (typeof callback === "function") callback(res);
      else socket.emit("donation:confirmed", res);
    }
  );

  // 7. Rời mạng
  socket.on("disconnect", () => {
    console.log(`🍃 Đạo hữu rời bước: ${socket.id}`);
    const player = players.get(socket.id);
    if (player) {
      const isMonk = player.isMonk || player.name.startsWith("Thích ");
      const isDefaultGuest = !player.isLoggedIn && !isMonk && (player.name === "Đạo Hữu An Nhiên" || player.name.startsWith("Khách "));
      const points = (leaderboardState.entries[player.name]?.camLoToday || 0) + (leaderboardState.entries[player.name]?.totalCamLo || 0);
      if (isDefaultGuest && points === 0) {
        // Khách mặc định chưa đăng nhập và chưa có điểm: Dọn dẹp khỏi bảng xếp hạng khi rời mạng
        delete leaderboardState.entries[player.name];
        saveLeaderboardData();
        broadcastLeaderboard();
      }
    }
    players.delete(socket.id);

    // Giải phóng chỗ ngồi trong Chính Điện nếu socket này đang ngồi
    let releasedSeatId: string | null = null;
    for (const [sId, info] of occupiedSeats.entries()) {
      if (info.socketId === socket.id) {
        releasedSeatId = sId;
        occupiedSeats.delete(sId);
        break;
      }
    }
    if (releasedSeatId) {
      io.emit("seat:vacated", { seatId: releasedSeatId });
    }

    socket.broadcast.emit("player:left", socket.id);
    // Cập nhật số người trong phòng cho tất cả đạo hữu còn lại
    broadcastRoomCount();
  });
});

server.listen(PORT, () => {
  console.log(`🛕 Máy chủ Chùa An Lạc Online v${APP_VERSION} đang lắng nghe tại cổng http://localhost:${PORT}`);
  initMongoConnection();
});

// Xử lý Graceful Shutdown khi reload/redeploy trên Cloud (Render, Railway, Docker, PM2)
function handleGracefulShutdown(signal: string) {
  console.log(`🌸 [${signal}] Đang tiến hành lưu trạng thái chùa và ngắt kết nối an toàn...`);
  try {
    saveLeaderboardData();
    console.log("💾 Đã lưu dữ liệu bảng xếp hạng và công đức thành công.");
  } catch (err) {
    console.error("❌ Lỗi khi lưu dữ liệu trước khi tắt:", err);
  }

  if (isMongoConnected) {
    try {
      mongoose.disconnect();
    } catch {}
  }

  // Báo trước cho client tự động chuẩn bị reconnect
  io.emit("server:maintenance", {
    message: "Hệ thống đang cập nhật phiên bản mới. Quý đạo hữu hoan hỷ chờ trong giây lát...",
  });

  server.close(() => {
    console.log("🙏 Máy chủ Chùa An Lạc đã hoàn tất đóng cổng lắng nghe.");
    process.exit(0);
  });

  setTimeout(() => {
    console.warn("⚠️ Quá 8 giây chưa đóng hết kết nối, ép buộc dừng tiến trình.");
    process.exit(0);
  }, 8000);
}

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
