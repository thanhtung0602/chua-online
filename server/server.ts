import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const APP_VERSION = process.env.APP_VERSION || "1.0.0";

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

  const allEntries = Object.values(leaderboardState.entries);
  allEntries.sort((a, b) => b.camLoToday - a.camLoToday || b.totalCamLo - a.totalCamLo || a.lastUpdated - b.lastUpdated);

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
  if (!abbot && monasticLeaderboard.length > 0 && monasticLeaderboard[0].camLoToday > 0) {
    abbot = {
      name: monasticLeaderboard[0].name,
      avatar: monasticLeaderboard[0].avatar,
      camLoYesterday: monasticLeaderboard[0].camLoToday,
      appointedDate: leaderboardState.currentDate,
    };
  }

  // 12 Vị Cao Tăng (Hạng 2 đến 13 trong bảng xuất gia) - CHỈ LẤY NGƯỜI CHƠI THẬT
  const seniorMonks: SeniorMonkInfo[] = [];
  for (let i = 1; i < Math.min(13, monasticLeaderboard.length); i++) {
    const monk = monasticLeaderboard[i];
    seniorMonks.push({
      rank: i + 1,
      name: monk.name,
      avatar: monk.avatar,
      camLoYesterday: monk.camLoToday,
    });
  }

  return {
    currentDate: leaderboardState.currentDate,
    currentAbbot: abbot,
    seniorMonks,
    monasticLeaderboard: monasticLeaderboard.slice(0, 50),
    layLeaderboard: layLeaderboard.slice(0, 50),
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
function isNameAlreadyTaken(name: string, excludeSocketId?: string): boolean {
  const clean = name.trim().toLowerCase();
  if (!clean) return true;

  // 1. Kiểm tra với tất cả người chơi đang kết nối online trong chùa
  for (const [sId, p] of players.entries()) {
    if (sId !== excludeSocketId && p.name.trim().toLowerCase() === clean) {
      return true;
    }
  }

  // 2. Kiểm tra với Đương Kim Trụ Trì & 12 Vị Cao Tăng (trừ khi chính người đó đang sở hữu)
  if (leaderboardState.currentAbbot?.name) {
    if (leaderboardState.currentAbbot.name.trim().toLowerCase() === clean) {
      const isSelf = Array.from(players.entries()).some(
        ([sId, p]) => sId === excludeSocketId && p.name.trim().toLowerCase() === clean
      );
      if (!isSelf) return true;
    }
  }

  if (Array.isArray(leaderboardState.seniorMonks)) {
    for (const monk of leaderboardState.seniorMonks) {
      if (monk.name.trim().toLowerCase() === clean) {
        const isSelf = Array.from(players.entries()).some(
          ([sId, p]) => sId === excludeSocketId && p.name.trim().toLowerCase() === clean
        );
        if (!isSelf) return true;
      }
    }
  }

  return false;
}

function getGuaranteedUniqueName(baseName: string, excludeSocketId?: string): string {
  let candidate = (baseName || "Đạo Hữu").trim().slice(0, 30);
  if (!isNameAlreadyTaken(candidate, excludeSocketId)) {
    return candidate;
  }

  // Thêm hậu tố số tăng dần hoặc mã ngẫu nhiên để luôn đảm bảo không bị trùng
  let count = 2;
  while (count <= 99) {
    const test = `${candidate} #${count}`.slice(0, 30);
    if (!isNameAlreadyTaken(test, excludeSocketId)) {
      return test;
    }
    count++;
  }

  return `${candidate} #${Math.floor(100 + Math.random() * 900)}`.slice(0, 30);
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
    const name = (data.name || "Đạo Hữu").trim().slice(0, 30);
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
    const name = (data.name || "Đạo Hữu").trim().slice(0, 30);
    checkDailyReset();

    if (leaderboardState.entries[name]) {
      leaderboardState.entries[name].camLoToday = Math.max(0, leaderboardState.entries[name].camLoToday - amount);
      leaderboardState.entries[name].totalCamLo = Math.max(0, leaderboardState.entries[name].totalCamLo - amount);
      leaderboardState.entries[name].lastUpdated = Date.now();
      saveLeaderboardData();
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
    const taken = isNameAlreadyTaken(raw, socket.id);
    if (typeof callback === "function") {
      callback({
        available: !taken,
        reason: taken ? `Tên "${raw}" đã có người sử dụng trong chùa! Đạo hữu vui lòng chọn tên khác.` : undefined,
      });
    }
  });

  // 1. Gia nhập thế giới chùa (Không giới hạn người chơi, mỗi người tên duy nhất)
  socket.on("player:join", (data: { name: string; avatar: string; gx: number; gy: number; isLoggedIn?: boolean; isMonk?: boolean }) => {
    const rawName = (data.name || "Đạo Hữu").trim().slice(0, 30);
    // Bắt buộc tên không được trùng với bất kỳ ai
    const uniqueName = getGuaranteedUniqueName(rawName, socket.id);
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
    };

    players.set(socket.id, player);

    // Xử lý điểm công đức & bảng xếp hạng khi gia nhập:
    const clientPoints = Math.max(0, Number((data as any).camLoToday) || 0);
    if (!isLoggedIn) {
      // Khách vãng lai chưa đăng nhập: Luôn reset điểm công đức về 0
      leaderboardState.entries[uniqueName] = {
        name: uniqueName,
        avatar: data.avatar || "female",
        camLoToday: 0,
        totalCamLo: 0,
        lastUpdated: Date.now(),
        isMonk: false,
      };
      saveLeaderboardData();
      broadcastLeaderboard();
    } else {
      // Người dùng đã đăng nhập: Khôi phục và đồng bộ điểm công đức thật
      if (!leaderboardState.entries[uniqueName]) {
        leaderboardState.entries[uniqueName] = {
          name: uniqueName,
          avatar: data.avatar || "female",
          camLoToday: clientPoints,
          totalCamLo: clientPoints,
          lastUpdated: Date.now(),
          isMonk: isPlayerMonk,
        };
        saveLeaderboardData();
        broadcastLeaderboard();
      } else {
        let changed = false;
        const currentServerPoints = leaderboardState.entries[uniqueName].camLoToday || 0;
        if (clientPoints > currentServerPoints) {
          leaderboardState.entries[uniqueName].camLoToday = clientPoints;
          leaderboardState.entries[uniqueName].totalCamLo = Math.max(leaderboardState.entries[uniqueName].totalCamLo || 0, clientPoints);
          changed = true;
        }
        if (isPlayerMonk && !leaderboardState.entries[uniqueName].isMonk) {
          leaderboardState.entries[uniqueName].isMonk = true;
          changed = true;
        }
        if (changed) {
          saveLeaderboardData();
          broadcastLeaderboard();
        }
      }
    }

    // Cập nhật số người trong phòng cho tất cả đạo hữu
    broadcastRoomCount();

    // Nếu tên ban đầu bị trùng và được tự động điều chỉnh, gửi thông báo cho client
    if (uniqueName !== rawName) {
      socket.emit("player:name_adjusted", {
        name: uniqueName,
        original: rawName,
        reason: "Tên ban đầu đã có đạo hữu khác sử dụng trong chùa",
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

  // 3.1. Đổi tên / Pháp danh nhân vật (Bảo lưu trọn vẹn danh hiệu Trụ Trì & Cao Tăng)
  socket.on("player:rename", (data: { name: string }) => {
    const player = players.get(socket.id);
    if (!player) return;

    const newName = (data.name || "").trim().slice(0, 30);
    if (!newName) return;

    // KIỂM TRA TRÙNG TÊN: Tuyệt đối không cho phép trùng tên với người khác!
    if (isNameAlreadyTaken(newName, socket.id)) {
      socket.emit("player:rename_failed", {
        name: newName,
        reason: `Tên "${newName}" đã có đạo hữu khác sử dụng trong chùa! Vui lòng chọn một tên khác.`,
      });
      return;
    }

    const oldName = player.name;
    player.name = newName;
    socket.emit("player:rename_success", { name: newName });

      // Đã tạo mới nhân vật: Xóa nhân vật cũ khỏi bảng xếp hạng & reset điểm công đức về 0
      if (oldName !== newName) {
        delete leaderboardState.entries[oldName];
        if (leaderboardState.currentAbbot && leaderboardState.currentAbbot.name === oldName) {
          leaderboardState.currentAbbot = null;
        }
        if (Array.isArray(leaderboardState.seniorMonks)) {
          leaderboardState.seniorMonks = leaderboardState.seniorMonks.filter((m) => m.name !== oldName);
        }
      }

      // Tạo mới nhân vật với 0 điểm công đức
      const isMonk = newName.startsWith("Thích ");
      leaderboardState.entries[newName] = {
        name: newName,
        avatar: player.avatar || "male",
        camLoToday: 0,
        totalCamLo: 0,
        lastUpdated: Date.now(),
        isMonk,
      };

      saveLeaderboardData();
      broadcastLeaderboard();

      socket.broadcast.emit("player:renamed", {
        id: socket.id,
        name: newName,
        oldName,
      });
  });

  // 3.2. Xuất gia thụ giới (Xuống tóc đi tu & nhận pháp danh họ Thích)
  socket.on("player:ordain", (data: { dharmaName: string; robeColor?: number; isMonk: boolean }) => {
    let cleanName = (data.dharmaName || "").trim().slice(0, 30);
    if (!cleanName.startsWith("Thích ") && !cleanName.startsWith("Thích")) {
      cleanName = "Thích " + cleanName;
    } else if (cleanName.startsWith("Thích") && !cleanName.startsWith("Thích ")) {
      cleanName = "Thích " + cleanName.substring(5).trim();
    }

    // Đảm bảo pháp danh xuất gia không bị trùng lặp
    if (isNameAlreadyTaken(cleanName, socket.id)) {
      cleanName = getGuaranteedUniqueName(cleanName, socket.id);
    }

    const player = players.get(socket.id);
    const oldName = player?.name || "Đạo hữu";

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

  // 7. Rời mạng
  socket.on("disconnect", () => {
    console.log(`🍃 Đạo hữu rời bước: ${socket.id}`);
    const player = players.get(socket.id);
    if (player && !player.isLoggedIn) {
      // Khách chưa đăng nhập: Dọn dẹp khỏi bảng xếp hạng khi rời mạng
      delete leaderboardState.entries[player.name];
      saveLeaderboardData();
      broadcastLeaderboard();
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
