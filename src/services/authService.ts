/**
 * authService.ts - Dịch vụ Quản lý Tài khoản & Xác thực Người Dùng Thật
 * Tích hợp Google Identity Services (OAuth 2.0)
 * Mở trực tiếp cửa sổ xác thực chính thức của Google (accounts.google.com)
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: any;
            }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
        id: {
          initialize: (config: any) => void;
          prompt: (notification?: any) => void;
        };
      };
    };
  }
}

export type AuthProvider = "google" | "guest";

export interface UserAccount {
  id: string;
  provider: AuthProvider;
  name: string;
  email: string;
  avatarUrl?: string;
  isMonk: boolean; // Đã xuống tóc xuất gia hay chưa
  dharmaName?: string; // Pháp danh có họ Thích (ví dụ: Thích Tâm An)
  robeColor?: number; // Màu áo cà sa đã chọn
  ordinationDate?: string; // Ngày thụ giới xuất gia
  joinedAt: number;
}

type AuthChangeCallback = (user: UserAccount | null) => void;

class AuthService {
  private static instance: AuthService;
  private currentUser: UserAccount | null = null;
  private listeners: AuthChangeCallback[] = [];
  private readonly STORAGE_KEY = "chua_an_lac_auth_user";
  private isGoogleSdkLoaded: boolean = false;

  private constructor() {
    this.loadFromStorage();
    if (typeof window !== "undefined") {
      setTimeout(() => {
        this.loadGoogleSDK().catch((e) =>
          console.warn("Lỗi tải trước Google SDK:", e),
        );
      }, 300);
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Nếu trước đó từng lưu tài khoản facebook, chuyển về null để đăng nhập lại
        if (parsed && parsed.provider === "facebook") {
          localStorage.removeItem(this.STORAGE_KEY);
          this.currentUser = null;
        } else {
          this.currentUser = parsed;
        }
      }
    } catch (e) {
      console.warn("Lỗi đọc thông tin đăng nhập từ localStorage", e);
      this.currentUser = null;
    }
  }

  private saveToStorage() {
    try {
      if (this.currentUser) {
        localStorage.setItem(
          this.STORAGE_KEY,
          JSON.stringify(this.currentUser),
        );
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Lỗi lưu thông tin đăng nhập vào localStorage", e);
    }
    this.notifyListeners();
  }

  public getCurrentUser(): UserAccount | null {
    return this.currentUser;
  }

  public isLoggedIn(): boolean {
    return this.currentUser !== null && this.currentUser.provider !== "guest";
  }

  public isMonk(): boolean {
    return !!this.currentUser?.isMonk;
  }

  public getDharmaName(): string | undefined {
    return this.currentUser?.dharmaName;
  }

  // ─────────────────────────────────────────────
  // LẤY CẤU HÌNH TỪ FILE .ENV CỦA DỰ ÁN
  // ─────────────────────────────────────────────
  public static readonly DEFAULT_GOOGLE_CLIENT_ID =
    "1008712738794-7tihvlshpghvotfub3t5svenieqdgtit.apps.googleusercontent.com";

  public getGoogleClientId(): string {
    const fromEnv = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";
    const fromStorage =
      localStorage.getItem("chua_an_lac_google_client_id") || "";
    return (
      fromEnv.trim() ||
      fromStorage.trim() ||
      AuthService.DEFAULT_GOOGLE_CLIENT_ID
    );
  }

  public setGoogleClientId(clientId: string) {
    if (clientId.trim())
      localStorage.setItem("chua_an_lac_google_client_id", clientId.trim());
    else localStorage.removeItem("chua_an_lac_google_client_id");
  }

  // ─────────────────────────────────────────────
  // TẢI SDK CHÍNH THỨC CỦA GOOGLE
  // ─────────────────────────────────────────────
  public loadGoogleSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isGoogleSdkLoaded && window.google?.accounts?.oauth2) {
        return resolve();
      }
      const existing = document.getElementById("google-gsi-client");
      if (existing) {
        existing.addEventListener("load", () => {
          this.isGoogleSdkLoaded = true;
          resolve();
        });
        existing.addEventListener("error", () =>
          reject(new Error("Không thể kết nối đến máy chủ Google")),
        );
        return;
      }
      const script = document.createElement("script");
      script.id = "google-gsi-client";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.isGoogleSdkLoaded = true;
        resolve();
      };
      script.onerror = () =>
        reject(new Error("Không thể tải Google Identity Services SDK"));
      document.head.appendChild(script);
    });
  }

  // ─────────────────────────────────────────────
  // ĐĂNG NHẬP GOOGLE
  // ─────────────────────────────────────────────
  public async loginWithRealGoogle(): Promise<UserAccount> {
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      throw new Error("MISSING_GOOGLE_CLIENT_ID");
    }

    await this.loadGoogleSDK();

    if (!window.google?.accounts?.oauth2) {
      throw new Error("Không thể khởi tạo Google OAuth2 Client");
    }

    return new Promise((resolve, reject) => {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid profile email",
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            return reject(
              new Error(`Lỗi Google OAuth: ${tokenResponse.error}`),
            );
          }
          if (!tokenResponse.access_token) {
            return reject(new Error("Google không cấp quyền truy cập"));
          }

          try {
            // Lấy thông tin tài khoản THẬT từ Google UserInfo API
            const res = await fetch(
              "https://www.googleapis.com/oauth2/v3/userinfo",
              {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              },
            );
            if (!res.ok) {
              throw new Error(`Google UserInfo API phản hồi lỗi ${res.status}`);
            }
            const info = await res.json();

            const savedMonk =
              localStorage.getItem("chua_an_lac_is_monk") === "true";
            const savedDharmaName =
              localStorage.getItem("chua_an_lac_dharma_name") || "";

            const realName = info.name || info.email || "Đạo Hữu Google";
            const avatar =
              info.picture ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(realName)}&background=4285f4&color=fff&size=128&bold=true`;

            const user: UserAccount = {
              id: "google_" + (info.sub || Date.now()),
              provider: "google",
              name: savedMonk && savedDharmaName ? savedDharmaName : realName,
              email: info.email || "",
              avatarUrl: avatar,
              isMonk: savedMonk,
              dharmaName: savedDharmaName || undefined,
              joinedAt: Date.now(),
            };

            this.currentUser = user;
            this.saveToStorage();
            resolve(user);
          } catch (err: any) {
            reject(
              new Error(
                `Không thể lấy thông tin tài khoản Google thật: ${err.message}`,
              ),
            );
          }
        },
      });

      // MỞ CỬA SỔ POPUP GOOGLE THẬT ĐỂ NGƯỜI CHƠI CHỌN TÀI KHOẢN GMAIL CỦA MÌNH
      client.requestAccessToken({ prompt: "select_account" });
    });
  }

  // ─────────────────────────────────────────────
  // GHI NHẬN XUẤT GIA THỤ GIỚI (XUỐNG TÓC ĐI TU)
  // ─────────────────────────────────────────────
  public ordain(dharmaName: string, robeColor: number = 0xd97706): UserAccount {
    let cleanName = dharmaName.trim();
    cleanName = cleanName.replace(/^(thích\s*)+/i, "").trim();
    if (!cleanName) cleanName = "Tâm An";
    cleanName = "Thích " + cleanName;

    const todayStr = new Date().toISOString().slice(0, 10);

    if (!this.currentUser) {
      // Hỗ trợ người dùng tại gia/vãng lai xuất gia trực tiếp mà không bị chặn
      this.currentUser = {
        id: "local_" + Math.random().toString(36).substring(2, 9),
        provider: "guest",
        name: cleanName,
        email: "phattu@chuaanlac.online",
        isMonk: true,
        dharmaName: cleanName,
        joinedAt: Date.now(),
      };
    }

    this.currentUser.isMonk = true;
    this.currentUser.dharmaName = cleanName;
    this.currentUser.name = cleanName;
    this.currentUser.robeColor = robeColor;
    this.currentUser.ordinationDate = todayStr;

    localStorage.setItem("chua_an_lac_is_monk", "true");
    localStorage.setItem("chua_an_lac_dharma_name", cleanName);
    localStorage.setItem("chua_an_lac_name", cleanName);
    localStorage.setItem("chua_an_lac_robe_color", robeColor.toString(16));

    this.saveToStorage();
    return this.currentUser;
  }

  /**
   * Đăng xuất
   */
  public logout() {
    this.currentUser = null;
    this.saveToStorage();
  }

  public onAuthChange(listener: AuthChangeCallback) {
    this.listeners.push(listener);
    listener(this.currentUser);
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn(this.currentUser));
  }
}

export const authService = AuthService.getInstance();
