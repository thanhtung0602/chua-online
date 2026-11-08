/**
 * NetworkService - Quản lý kết nối Socket.IO thời gian thực
 * Hỗ trợ tự động kết nối và chế độ ngoại tuyến (Offline/Solo fallback) nếu backend chưa khởi động.
 */

import { io, Socket } from "socket.io-client";

export interface RemotePlayer {
  id: string;
  name: string;
  avatar: string;
  gx: number;
  gy: number;
  action: string;
  direction: "left" | "right" | "down" | "up";
}

export interface LanternData {
  id: string;
  author: string;
  wishText: string;
  type: string;
  gx: number;
  gy: number;
  rejoices: number;
}

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
  appointedDate: string;
}

export interface SeniorMonkInfo {
  rank: number; // 2 -> 13
  name: string;
  avatar: string;
  camLoYesterday: number;
}

export interface LeaderboardPayload {
  currentDate: string;
  currentAbbot: AbbotInfo | null;
  seniorMonks: SeniorMonkInfo[];
  monasticLeaderboard: LeaderboardEntry[]; // Bảng 1: Tăng Ni Xuất Gia
  layLeaderboard: LeaderboardEntry[];      // Bảng 2: Cư Sĩ Tại Gia
  leaderboard: LeaderboardEntry[];         // Tổng hợp
  resetCountdownSec: number;
}

export interface OccupiedSeatEntry {
  seatId: string;
  playerName: string;
  socketId: string;
}

export class NetworkService {
  private static instance: NetworkService;
  public socket: Socket | null = null;
  public isConnected: boolean = false;
  public playerId: string = "";
  public currentAbbot: AbbotInfo | null = null;
  public latestLeaderboard: LeaderboardPayload;
  public roomCount: { current: number; max?: number } = { current: 1 };
  public occupiedSeats: Map<string, { playerName: string; socketId: string }> = new Map();
  private pendingJoin?: { name: string; avatar: string; gx: number; gy: number; isMonk?: boolean; isLoggedIn?: boolean; camLoToday?: number };

  private onPlayerJoinedCb?: (player: RemotePlayer) => void;
  private onPlayerMovedCb?: (data: { id: string; gx: number; gy: number; action: string; dir: "left" | "right" }) => void;
  private onPlayerActionCb?: (data: { id: string; action: string }) => void;
  private onPlayerLeftCb?: (id: string) => void;
  private onChatBubbleCb?: (data: { id: string; text: string }) => void;
  private onLanternSpawnedCb?: (lantern: LanternData) => void;
  private onLanternRejoicedCb?: (data: { id: string; count: number }) => void;
  private onLeaderboardUpdateCb?: (data: LeaderboardPayload) => void;
  private onPlayerRenamedCb?: (data: { id: string; name: string; oldName?: string }) => void;
  private onPlayerOrdainedCb?: (data: { id: string; name: string; oldName?: string; isMonk: boolean; robeColor?: number }) => void;
  private onPlayerNameAdjustedCb?: (data: { name: string; original: string; reason?: string }) => void;
  private onPlayerRenameFailedCb?: (data: { name: string; reason: string }) => void;
  private onRoomPlayerCountCb?: (data: { current: number; max?: number }) => void;
  private onRoomFullCb?: (data: { current: number; max?: number; message: string }) => void;
  private onSeatOccupiedCb?: (data: OccupiedSeatEntry) => void;
  private onSeatVacatedCb?: (data: { seatId: string }) => void;

  private constructor() {
    this.latestLeaderboard = this.getFallbackLeaderboard();
    this.currentAbbot = this.latestLeaderboard.currentAbbot;
    this.initSocket();
  }

  private getFallbackLeaderboard(): LeaderboardPayload {
    const now = new Date(Date.now() + 7 * 3600000);
    const dateStr = now.toISOString().slice(0, 10);
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const secUntilMidnight = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));

    return {
      currentDate: dateStr,
      currentAbbot: null,
      seniorMonks: [],
      monasticLeaderboard: [],
      layLeaderboard: [],
      leaderboard: [],
      resetCountdownSec: secUntilMidnight,
    };
  }

  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  private onUpdateAvailableCb: ((data: { version: string; message?: string }) => void) | null = null;

  public setOnUpdateAvailable(cb: (data: { version: string; message?: string }) => void) {
    this.onUpdateAvailableCb = cb;
  }

  private initSocket() {
    try {
      // Tự động nhận diện URL: ưu tiên VITE_SERVER_URL, nếu không thì tự động chọn đúng host
      const customUrl = (import.meta as any).env?.VITE_SERVER_URL;
      const isLocalDev = window.location.hostname === "localhost" && window.location.port !== "3001";
      const serverUrl = customUrl || (isLocalDev ? "http://localhost:3001" : window.location.origin);

      this.socket = io(serverUrl, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        autoConnect: true,
      });

      this.socket.on("connect", () => {
        this.isConnected = true;
        this.playerId = this.socket?.id || "player_" + Math.floor(Math.random() * 1000);
        console.log("🌸 Kết nối máy chủ Chùa An Lạc thành công. Socket ID:", this.playerId);
        if (this.pendingJoin && this.socket) {
          this.socket.emit("player:join", this.pendingJoin);
        }
        if (this.socket) {
          this.socket.emit("leaderboard:get");
        }
      });

      this.socket.on("server:update_available", (data: { version: string; message?: string }) => {
        console.log("🔔 Máy chủ vừa phát hành phiên bản mới:", data);
        if (this.onUpdateAvailableCb) {
          this.onUpdateAvailableCb(data);
        }
      });

      this.socket.on("connect_error", () => {
        this.isConnected = false;
      });

      this.socket.on("disconnect", () => {
        this.isConnected = false;
        console.log("🍃 Đã ngắt kết nối với máy chủ.");
      });

      this.socket.on("player:joined", (player: RemotePlayer) => {
        if (this.onPlayerJoinedCb) this.onPlayerJoinedCb(player);
      });

      this.socket.on("player:moved", (data) => {
        if (this.onPlayerMovedCb) this.onPlayerMovedCb(data);
      });

      this.socket.on("player:action", (data) => {
        if (this.onPlayerActionCb) this.onPlayerActionCb(data);
      });

      this.socket.on("player:left", (id: string) => {
        if (this.onPlayerLeftCb) this.onPlayerLeftCb(id);
      });

      this.socket.on("player:renamed", (data) => {
        if (this.onPlayerRenamedCb) this.onPlayerRenamedCb(data);
      });

      this.socket.on("player:ordained", (data) => {
        if (this.onPlayerOrdainedCb) this.onPlayerOrdainedCb(data);
      });

      this.socket.on("chat:bubble", (data) => {
        if (this.onChatBubbleCb) this.onChatBubbleCb(data);
      });

      this.socket.on("lantern:spawned", (lantern: LanternData) => {
        if (this.onLanternSpawnedCb) this.onLanternSpawnedCb(lantern);
      });

      this.socket.on("lantern:rejoiced", (data) => {
        if (this.onLanternRejoicedCb) this.onLanternRejoicedCb(data);
      });

      this.socket.on("leaderboard:data", (data: LeaderboardPayload) => {
        this.latestLeaderboard = data;
        this.currentAbbot = data.currentAbbot;
        if (this.onLeaderboardUpdateCb) this.onLeaderboardUpdateCb(data);
      });

      this.socket.on("leaderboard:update", (data: LeaderboardPayload) => {
        this.latestLeaderboard = data;
        this.currentAbbot = data.currentAbbot;
        if (this.onLeaderboardUpdateCb) this.onLeaderboardUpdateCb(data);
      });

      this.socket.on("player:name_adjusted", (data: { name: string; original: string; reason?: string }) => {
        if (this.onPlayerNameAdjustedCb) this.onPlayerNameAdjustedCb(data);
      });

      this.socket.on("player:rename_failed", (data: { name: string; reason: string }) => {
        if (this.onPlayerRenameFailedCb) this.onPlayerRenameFailedCb(data);
      });

      this.socket.on("room:player_count", (data: { current: number; max?: number }) => {
        this.roomCount = data;
        if (this.onRoomPlayerCountCb) this.onRoomPlayerCountCb(data);
      });

      this.socket.on("room:full", (data: { current: number; max?: number; message: string }) => {
        if (this.onRoomFullCb) this.onRoomFullCb(data);
      });

      // Lắng nghe danh sách toàn bộ chỗ ngồi đã có người trong Chính Điện
      this.socket.on("seats:occupied_list", (list: OccupiedSeatEntry[]) => {
        this.occupiedSeats.clear();
        if (Array.isArray(list)) {
          list.forEach((item) => {
            this.occupiedSeats.set(item.seatId, {
              playerName: item.playerName,
              socketId: item.socketId,
            });
          });
        }
      });

      // Lắng nghe một chỗ ngồi vừa được chiếm giữ
      this.socket.on("seat:occupied", (data: OccupiedSeatEntry) => {
        this.occupiedSeats.set(data.seatId, {
          playerName: data.playerName,
          socketId: data.socketId,
        });
        if (this.onSeatOccupiedCb) this.onSeatOccupiedCb(data);
      });

      // Lắng nghe một chỗ ngồi vừa được giải phóng
      this.socket.on("seat:vacated", (data: { seatId: string }) => {
        this.occupiedSeats.delete(data.seatId);
        if (this.onSeatVacatedCb) this.onSeatVacatedCb(data);
      });
    } catch {
      this.isConnected = false;
    }
  }

  public joinWorld(name: string, avatar: string, gx: number, gy: number, isMonk?: boolean, isLoggedIn?: boolean, camLoToday?: number) {
    this.pendingJoin = { name, avatar, gx, gy, isMonk, isLoggedIn, camLoToday };
    if (this.socket && this.isConnected) {
      this.socket.emit("player:join", this.pendingJoin);
    }
  }

  public sendMove(gx: number, gy: number, action: string, dir: "left" | "right") {
    if (this.socket && this.isConnected) {
      this.socket.emit("player:move", { gx, gy, action, dir });
    }
  }

  public sendAction(action: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit("player:action", { action });
    }
  }

  public sendRename(name: string) {
    const oldName = localStorage.getItem("chua_an_lac_player_name") || "";
    if (this.latestLeaderboard) {
      if (
        this.latestLeaderboard.currentAbbot &&
        (this.latestLeaderboard.currentAbbot.name === oldName ||
          this.latestLeaderboard.currentAbbot.name === this.currentAbbot?.name)
      ) {
        this.latestLeaderboard.currentAbbot.name = name;
        if (this.currentAbbot) this.currentAbbot.name = name;
      }
      if (Array.isArray(this.latestLeaderboard.seniorMonks)) {
        this.latestLeaderboard.seniorMonks.forEach((m) => {
          if (m.name === oldName) m.name = name;
        });
      }
      if (Array.isArray(this.latestLeaderboard.leaderboard)) {
        const entry = this.latestLeaderboard.leaderboard.find((e) => e.name === oldName);
        if (entry) entry.name = name;
      }
    }
    if (this.socket && this.isConnected) {
      this.socket.emit("player:rename", { name });
    }
  }

  public sendOrdain(dharmaName: string, robeColor: number = 0xd97706) {
    if (this.socket && this.isConnected) {
      this.socket.emit("player:ordain", { dharmaName, robeColor, isMonk: true });
    }
  }

  public sendChat(text: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit("chat:send", { text });
    }
  }

  public releaseLantern(wishText: string, type: string, gx: number, gy: number) {
    if (this.socket && this.isConnected) {
      this.socket.emit("lantern:release", { wishText, type, gx, gy });
    }
  }

  public rejoiceLantern(lanternId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit("lantern:rejoice", { lanternId });
    }
  }

  public emitEarnCamLo(name: string, avatar: string, amount: number, reason?: string, isMonk?: boolean) {
    if (this.socket && this.isConnected) {
      this.socket.emit("camlo:earn", { name, avatar, amount, reason, isMonk });
    } else if (this.latestLeaderboard) {
      // Offline fallback: cập nhật danh sách tại chỗ
      let entry = this.latestLeaderboard.leaderboard.find((e) => e.name === name);
      if (entry) {
        entry.camLoToday += amount;
        entry.totalCamLo += amount;
        entry.lastUpdated = Date.now();
        if (isMonk !== undefined) entry.isMonk = isMonk;
      } else {
        entry = {
          name,
          avatar,
          camLoToday: amount,
          totalCamLo: amount,
          lastUpdated: Date.now(),
          isMonk,
        };
        this.latestLeaderboard.leaderboard.push(entry);
      }
      this.latestLeaderboard.leaderboard.sort((a, b) => b.camLoToday - a.camLoToday);
      this.latestLeaderboard.monasticLeaderboard = this.latestLeaderboard.leaderboard.filter(
        (e) => e.isMonk || e.name.startsWith("Thích ")
      );
      this.latestLeaderboard.layLeaderboard = this.latestLeaderboard.leaderboard.filter(
        (e) => !(e.isMonk || e.name.startsWith("Thích "))
      );
      if (this.onLeaderboardUpdateCb) {
        this.onLeaderboardUpdateCb(this.latestLeaderboard);
      }
    }
  }

  public emitDeductCamLo(name: string, amount: number, reason?: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit("camlo:deduct", { name, amount, reason });
    } else if (this.latestLeaderboard) {
      const entry = this.latestLeaderboard.leaderboard.find((e) => e.name === name);
      if (entry) {
        entry.camLoToday = Math.max(0, entry.camLoToday - amount);
        entry.totalCamLo = Math.max(0, entry.totalCamLo - amount);
        entry.lastUpdated = Date.now();
      }
      this.latestLeaderboard.leaderboard.sort((a, b) => b.camLoToday - a.camLoToday);
      this.latestLeaderboard.monasticLeaderboard = this.latestLeaderboard.leaderboard.filter(
        (e) => e.isMonk || e.name.startsWith("Thích ")
      );
      this.latestLeaderboard.layLeaderboard = this.latestLeaderboard.leaderboard.filter(
        (e) => !(e.isMonk || e.name.startsWith("Thích "))
      );
      if (this.onLeaderboardUpdateCb) {
        this.onLeaderboardUpdateCb(this.latestLeaderboard);
      }
    }
  }

  public requestLeaderboard() {
    if (this.socket && this.isConnected) {
      this.socket.emit("leaderboard:get");
    }
  }

  // ─────────────────────────────────────────────
  // QUẢN LÝ CHỖ NGỒI DUY NHẤT TRONG CHÍNH ĐIỆN
  // ─────────────────────────────────────────────
  public getSocketId(): string {
    return this.socket?.id || this.playerId;
  }

  public isSeatOccupied(seatId: string): boolean {
    return this.occupiedSeats.has(seatId);
  }

  public getSeatOccupant(seatId: string): { playerName: string; socketId: string } | undefined {
    return this.occupiedSeats.get(seatId);
  }

  public claimSeat(seatId: string): Promise<{ success: boolean; message?: string; occupiedBy?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected) {
        // Chế độ Offline/Solo: cho phép ngồi
        this.occupiedSeats.set(seatId, {
          playerName: localStorage.getItem("chua_an_lac_player_name") || "Đạo Hữu",
          socketId: "local_self",
        });
        resolve({ success: true });
        return;
      }

      this.socket.emit(
        "seat:claim",
        { seatId },
        (res?: { success: boolean; message?: string; occupiedBy?: string }) => {
          if (res) {
            resolve(res);
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  }

  public leaveSeat(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit("seat:leave");
    }
    // Xóa vị trí chỗ ngồi của chính mình trong local map
    const myId = this.getSocketId();
    for (const [sId, info] of this.occupiedSeats.entries()) {
      if (info.socketId === myId) {
        this.occupiedSeats.delete(sId);
        break;
      }
    }
  }

  // Event Callbacks Register
  public onPlayerJoined(cb: (player: RemotePlayer) => void) { this.onPlayerJoinedCb = cb; }
  public onPlayerMoved(cb: (data: { id: string; gx: number; gy: number; action: string; dir: "left" | "right" }) => void) { this.onPlayerMovedCb = cb; }
  public onPlayerAction(cb: (data: { id: string; action: string }) => void) { this.onPlayerActionCb = cb; }
  public onPlayerLeft(cb: (id: string) => void) { this.onPlayerLeftCb = cb; }
  public onPlayerRenamed(cb: (data: { id: string; name: string; oldName?: string }) => void) { this.onPlayerRenamedCb = cb; }
  public onPlayerOrdained(cb: (data: { id: string; name: string; oldName?: string; isMonk: boolean; robeColor?: number }) => void) { this.onPlayerOrdainedCb = cb; }
  public onPlayerNameAdjusted(cb: (data: { name: string; original: string; reason?: string }) => void) { this.onPlayerNameAdjustedCb = cb; }
  public onPlayerRenameFailed(cb: (data: { name: string; reason: string }) => void) { this.onPlayerRenameFailedCb = cb; }
  public onRoomPlayerCount(cb: (data: { current: number; max?: number }) => void) {
    this.onRoomPlayerCountCb = cb;
    if (this.roomCount) {
      cb(this.roomCount);
    }
  }
  public onRoomFull(cb: (data: { current: number; max?: number; message: string }) => void) { this.onRoomFullCb = cb; }
  public onSeatOccupied(cb: (data: OccupiedSeatEntry) => void) { this.onSeatOccupiedCb = cb; }
  public onSeatVacated(cb: (data: { seatId: string }) => void) { this.onSeatVacatedCb = cb; }
  public onChatBubble(cb: (data: { id: string; text: string }) => void) { this.onChatBubbleCb = cb; }
  public onLanternSpawned(cb: (lantern: LanternData) => void) { this.onLanternSpawnedCb = cb; }
  public onLanternRejoiced(cb: (data: { id: string; count: number }) => void) { this.onLanternRejoicedCb = cb; }
  public onLeaderboardUpdate(cb: (data: LeaderboardPayload) => void) {
    this.onLeaderboardUpdateCb = cb;
    if (this.latestLeaderboard) {
      cb(this.latestLeaderboard);
    }
  }
}

export const network = NetworkService.getInstance();
