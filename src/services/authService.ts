/**
 * authService.ts - Dịch vụ Quản lý Tài khoản & Xác thực Người Dùng Thật
 * Tích hợp Google Identity Services (OAuth 2.0) & Facebook JavaScript SDK (Graph API)
 * Mở trực tiếp cửa sổ xác thực chính thức của Google (accounts.google.com) và Facebook (facebook.com)
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
    FB?: {
      init: (options: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: { accessToken: string; userID: string };
          status: string;
        }) => void,
        options?: { scope: string },
      ) => void;
      api: (
        path: string,
        params: any,
        callback: (response: any) => void,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export type AuthProvider = "google" | "facebook" | "guest";

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
  private isFacebookSdkLoaded: boolean = false;

  private constructor() {
    this.loadFromStorage();
    // Tải trước Google và Facebook SDK ngay khi mở trang để tránh bị trình duyệt chặn popup do độ trễ mạng
    if (typeof window !== "undefined") {
      setTimeout(() => {
        this.loadGoogleSDK().catch((e) =>
          console.warn("Lỗi tải trước Google SDK:", e),
        );
        const fbAppId = this.getFacebookAppId();
        if (fbAppId) {
          this.loadFacebookSDK(fbAppId).catch((e) =>
            console.warn("Lỗi tải trước Facebook SDK:", e),
          );
        }
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
        this.currentUser = JSON.parse(raw);
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
  public static readonly DEFAULT_FACEBOOK_APP_ID = "2537696719976197";

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

  public getFacebookAppId(): string {
    const fromEnv = (import.meta as any).env?.VITE_FACEBOOK_APP_ID || "";
    const fromStorage =
      localStorage.getItem("chua_an_lac_facebook_app_id") || "";
    return (
      fromEnv.trim() ||
      fromStorage.trim() ||
      AuthService.DEFAULT_FACEBOOK_APP_ID
    );
  }

  public setFacebookAppId(appId: string) {
    if (appId.trim())
      localStorage.setItem("chua_an_lac_facebook_app_id", appId.trim());
    else localStorage.removeItem("chua_an_lac_facebook_app_id");
  }

  // ─────────────────────────────────────────────
  // TẢI SDK CHÍNH THỨC CỦA GOOGLE & FACEBOOK
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

  public loadFacebookSDK(appId: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.isFacebookSdkLoaded && window.FB) {
        return resolve();
      }
      window.fbAsyncInit = () => {
        window.FB?.init({
          appId: appId.trim(),
          cookie: true,
          xfbml: true,
          version: "v21.0",
        });
        this.isFacebookSdkLoaded = true;
        resolve();
      };

      const existing = document.getElementById("facebook-jssdk");
      if (existing) return;

      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/vi_VN/sdk.js";
      script.async = true;
      script.defer = true;
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
  // ĐĂNG NHẬP FACEBOOK THẬT 100% (Mở popup facebook.com)
  // ─────────────────────────────────────────────
  public async loginWithRealFacebook(): Promise<UserAccount> {
    const appId = this.getFacebookAppId();
    if (!appId) {
      throw new Error("MISSING_FACEBOOK_APP_ID");
    }

    await this.loadFacebookSDK(appId);

    if (!window.FB) {
      throw new Error("Không thể khởi tạo Facebook SDK");
    }

    return new Promise((resolve, reject) => {
      window.FB!.login(
        (response) => {
          if (!response.authResponse) {
            return reject(
              new Error("Đạo hữu đã hủy hoặc không cấp quyền Facebook"),
            );
          }

          // Lấy thông tin tài khoản THẬT từ Facebook Graph API
          // Sử dụng quyền mặc định public_profile (họ tên, id, avatar thật)
          window.FB!.api(
            "/me",
            { fields: "id,name,picture.width(200).height(200)" },
            (userData: any) => {
              if (!userData || userData.error) {
                return reject(
                  new Error(
                    userData?.error?.message || "Lỗi đọc dữ liệu Facebook",
                  ),
                );
              }

              const savedMonk =
                localStorage.getItem("chua_an_lac_is_monk") === "true";
              const savedDharmaName =
                localStorage.getItem("chua_an_lac_dharma_name") || "";

              const realName = userData.name || "Đạo Hữu Facebook";
              const avatar =
                userData.picture?.data?.url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(realName)}&background=1877f2&color=fff&size=128&bold=true`;

              const user: UserAccount = {
                id: "fb_" + userData.id,
                provider: "facebook",
                name: savedMonk && savedDharmaName ? savedDharmaName : realName,
                email: userData.email || `fb_${userData.id}@chuaanlac.online`,
                avatarUrl: avatar,
                isMonk: savedMonk,
                dharmaName: savedDharmaName || undefined,
                joinedAt: Date.now(),
              };

              this.currentUser = user;
              this.saveToStorage();
              resolve(user);
            },
          );
        },
        // Chỉ dùng quyền cơ bản mặc định (public_profile), tuyệt đối không yêu cầu scope email để tránh lỗi "Invalid Scopes: email" trên Meta
      );
    });
  }

  // ─────────────────────────────────────────────
  // ĐĂNG NHẬP NHANH BẰNG TÊN / PHÁP DANH (100% THÀNH CÔNG, KHÔNG LO LỖI OAUTH)
  // ─────────────────────────────────────────────
  public loginWithQuickName(name: string, email?: string): UserAccount {
    const cleanName = name.trim() || "Đạo Hữu An Nhiên";
    const isMonk = cleanName.startsWith("Thích ") || localStorage.getItem("chua_an_lac_is_monk") === "true";
    const dharmaName = isMonk ? cleanName : (localStorage.getItem("chua_an_lac_dharma_name") || undefined);
    const userEmail = email?.trim() || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "") || "phattu"}@chuaanlac.online`;
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=d97706&color=fff&size=128&bold=true`;

    const user: UserAccount = {
      id: "quick_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      provider: "guest",
      name: cleanName,
      email: userEmail,
      avatarUrl: avatar,
      isMonk,
      dharmaName,
      joinedAt: Date.now(),
    };

    this.currentUser = user;
    if (isMonk && dharmaName) {
      localStorage.setItem("chua_an_lac_is_monk", "true");
      localStorage.setItem("chua_an_lac_dharma_name", dharmaName);
    }
    localStorage.setItem("chua_an_lac_name", cleanName);
    this.saveToStorage();
    return user;
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
