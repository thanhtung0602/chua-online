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
          authResponse?: {
            accessToken: string;
            userID: string;
            expiresIn?: number | string;
            signedRequest?: string;
          };
          status: string;
        }) => void,
        options?: { scope: string },
      ) => void;
      getLoginStatus: (
        callback: (response: {
          authResponse?: {
            accessToken: string;
            userID: string;
            expiresIn?: number | string;
            signedRequest?: string;
          };
          status: string;
        }) => void,
        roundtrip?: boolean,
      ) => void;
      api: (
        path: string,
        params: any,
        callback: (response: any) => void,
      ) => void;
      AppEvents?: {
        logPageView: () => void;
      };
    };
    fbAsyncInit?: () => void;
    onFbAsyncInitDone?: () => void;
    checkLoginState?: () => void;
    statusChangeCallback?: (response: any) => void;
    statusChangeCallbackHandler?: (response: any) => void;
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
    if (typeof window !== "undefined") {
      // Đăng ký các hàm toàn cục chuẩn của Facebook SDK
      window.statusChangeCallbackHandler = (res: any) => {
        this.statusChangeCallback(res).catch((err) =>
          console.warn("Lỗi statusChangeCallbackHandler:", err),
        );
      };
      window.checkLoginState = () => {
        this.checkLoginState().catch((err) =>
          console.warn("Lỗi checkLoginState:", err),
        );
      };

      this.checkUrlForOAuthToken();
      setTimeout(() => {
        this.loadGoogleSDK().catch((e) =>
          console.warn("Lỗi tải trước Google SDK:", e),
        );
        const fbAppId = this.getFacebookAppId();
        if (fbAppId) {
          this.loadFacebookSDK(fbAppId)
            .then(() => {
              // Tự động kiểm tra trạng thái Facebook nếu chưa có tài khoản đang đăng nhập
              if (!this.isLoggedIn()) {
                this.checkLoginState().catch((e) =>
                  console.warn("Lỗi tự động kiểm tra Facebook login status:", e),
                );
              }
            })
            .catch((e) => console.warn("Lỗi tải trước Facebook SDK:", e));
        }
      }, 300);
    }
  }

  private checkUrlForOAuthToken() {
    try {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token=")) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get("access_token");
        if (token) {
          fetch(`https://graph.facebook.com/me?fields=id,name,picture.width(200).height(200)&access_token=${token}`)
            .then((res) => res.json())
            .then((userData) => {
              if (userData && userData.id) {
                const savedMonk = localStorage.getItem("chua_an_lac_is_monk") === "true";
                const savedDharmaName = localStorage.getItem("chua_an_lac_dharma_name") || "";
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
                window.history.replaceState(null, "", window.location.pathname);
              }
            })
            .catch((e) => console.warn("Lỗi đọc thông tin Facebook từ token:", e));
        }
      }
    } catch (e) {
      console.warn("Lỗi checkUrlForOAuthToken:", e);
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

  public loadFacebookSDK(appId?: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.isFacebookSdkLoaded && window.FB) {
        return resolve();
      }
      if (window.FB) {
        this.isFacebookSdkLoaded = true;
        return resolve();
      }
      const prevInit = window.fbAsyncInit;
      window.fbAsyncInit = () => {
        if (typeof prevInit === "function") prevInit();
        if (appId && window.FB) {
          window.FB.init({
            appId: appId.trim(),
            cookie: true,
            xfbml: true,
            version: "v21.0",
          });
        }
        this.isFacebookSdkLoaded = true;
        resolve();
      };

      const existing = document.getElementById("facebook-jssdk");
      if (existing) {
        const checkInterval = setInterval(() => {
          if (window.FB) {
            clearInterval(checkInterval);
            this.isFacebookSdkLoaded = true;
            resolve();
          }
        }, 100);
        setTimeout(() => clearInterval(checkInterval), 4000);
        return;
      }

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

  /**
   * statusChangeCallback - Xử lý phản hồi từ FB.getLoginStatus() hoặc FB.login()
   * Phản hồi có cấu trúc chuẩn Facebook:
   * {
   *   status: 'connected', // hoặc 'not_authorized', 'unknown'
   *   authResponse: {
   *     accessToken: '...',
   *     expiresIn: '...',
   *     signedRequest: '...',
   *     userID: '...'
   *   }
   * }
   */
  public async statusChangeCallback(response: {
    status: string;
    authResponse?: {
      accessToken: string;
      userID: string;
      expiresIn?: number | string;
      signedRequest?: string;
    };
  }): Promise<UserAccount | null> {
    console.log("FB statusChangeCallback received:", response);

    if (response.status === "connected" && response.authResponse) {
      return new Promise<UserAccount>((resolve, reject) => {
        if (!window.FB) {
          return reject(new Error("Facebook SDK chưa sẵn sàng"));
        }

        window.FB.api(
          "/me",
          { fields: "id,name,picture.width(200).height(200)" },
          (userData: any) => {
            if (!userData || userData.error) {
              return reject(
                new Error(userData?.error?.message || "Lỗi đọc dữ liệu Facebook"),
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
      });
    } else {
      console.log(
        response.status === "not_authorized"
          ? "Người dùng đã đăng nhập Facebook nhưng chưa cấp quyền cho ứng dụng."
          : "Người dùng chưa đăng nhập Facebook.",
      );
      return null;
    }
  }

  /**
   * checkLoginState - Kiểm tra trạng thái đăng nhập qua FB.getLoginStatus()
   */
  public async checkLoginState(): Promise<UserAccount | null> {
    const appId = this.getFacebookAppId();
    if (!appId) return null;
    await this.loadFacebookSDK(appId);

    if (!window.FB) return null;

    return new Promise((resolve) => {
      window.FB!.getLoginStatus(async (response) => {
        try {
          const user = await this.statusChangeCallback(response);
          resolve(user);
        } catch (e) {
          console.warn("Lỗi trong statusChangeCallback:", e);
          resolve(null);
        }
      });
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
      // 1. Kiểm tra trạng thái đăng nhập hiện tại bằng FB.getLoginStatus
      window.FB!.getLoginStatus((response) => {
        if (response.status === "connected" && response.authResponse) {
          // Đã đăng nhập và cấp quyền sẵn, lấy thông tin ngay không cần popup
          this.statusChangeCallback(response)
            .then((u) => {
              if (u) resolve(u);
              else reject(new Error("Không thể đọc thông tin tài khoản Facebook"));
            })
            .catch(reject);
          return;
        }

        // 2. Nếu chưa kết nối, mở cửa sổ đăng nhập FB.login()
        window.FB!.login(
          (loginRes) => {
            if (loginRes.status === "connected" && loginRes.authResponse) {
              this.statusChangeCallback(loginRes)
                .then((u) => {
                  if (u) resolve(u);
                  else reject(new Error("Không thể đọc thông tin người dùng Facebook"));
                })
                .catch(reject);
            } else {
              reject(
                new Error(
                  "Đạo hữu đã hủy hoặc chưa hoàn tất cấp quyền trên Facebook.",
                ),
              );
            }
          },
          // Quyền mặc định: public_profile
        );
      });
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
