import { API_BASE_URL } from "../config/api";

export const AUTH_KEYS = {
  ACCESS: "auth_access_token",
  REFRESH: "auth_refresh_token",
  USER: "auth_user",
} as const;

export type AuthUser = {
  username?: string;
  firstName?: string;
  lastName?: string;
  surname?: string;
  role?: string;
};

export type LoginResponse = AuthUser & {
  accessToken?: string;
  refreshToken?: string;
};

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const msg = o.message ?? o.error ?? o.detail;
    if (typeof msg === "string") return msg;
  }
  return `So‘rov xatosi (${status})`;
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(AUTH_KEYS.ACCESS);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(AUTH_KEYS.REFRESH);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuthStorage(): void {
  localStorage.removeItem(AUTH_KEYS.ACCESS);
  localStorage.removeItem(AUTH_KEYS.REFRESH);
  localStorage.removeItem(AUTH_KEYS.USER);
}

export function isAuthenticated(): boolean {
  return Boolean(getStoredAccessToken());
}

/**
 * Backend `role` satrini taqqoslash uchun: ROLE_ olib tashlash, bo‘shliq/defis → `_`, katta harf.
 * Masalan: "Laboratory Director", "LABORATORY-DIRECTOR" → "LABORATORY_DIRECTOR"
 */
export function normalizeRoleKey(role: string | undefined): string {
  if (!role || !String(role).trim()) return "";
  return String(role)
    .replace(/^ROLE_/i, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .toUpperCase();
}

/** Login javobidan keyin bosh sahifa yo‘li — `/roles` dagi `name` (ADMIN, LABORATORY_DIRECTOR, …) bilan mos */
export function getPathForRole(role: string | undefined): string {
  if (!role) return "/cashier";
  const key = normalizeRoleKey(role);
  const map: Record<string, string> = {
    ADMIN: "/admin",
    ADMINISTRATOR: "/admin",
    CASHIER: "/cashier",
    KASSIR: "/cashier",
    USER: "/cashier",
    LABORANT: "/laborant",
    LABORATORY_ASSISTANT: "/laborant",
    LAB_DIRECTOR: "/lab-director",
    LABORATORY_DIRECTOR: "/lab-director",
    COMPANY_DIRECTOR: "/company-director",
    DIRECTOR: "/company-director",
  };
  return map[key] ?? "/cashier";
}

export async function loginApi(body: {
  username: string;
  password: string;
}): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = (text ? parseJsonSafe(text) : null) as LoginResponse | null;

  if (!res.ok) {
    throw new Error(getErrorMessage(data ?? { message: text }, res.status));
  }
  if (!data) {
    throw new Error("Server javobini o‘qib bo‘lmadi");
  }

  const access = data.accessToken;
  const refresh = data.refreshToken;
  if (access) localStorage.setItem(AUTH_KEYS.ACCESS, access);
  if (refresh) localStorage.setItem(AUTH_KEYS.REFRESH, refresh);

  const user: AuthUser = {
    username: body.username,
    firstName: data.firstName,
    lastName: data.lastName,
    surname: data.surname,
    role: data.role,
  };
  localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(user));

  return data;
}

export async function logoutApi(): Promise<void> {
  const token = getStoredAccessToken();
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } finally {
    clearAuthStorage();
  }
}

export async function refreshApi(refreshToken: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const text = await res.text();
  const data = (text ? parseJsonSafe(text) : null) as LoginResponse | null;

  if (!res.ok) {
    clearAuthStorage();
    throw new Error(getErrorMessage(data ?? { message: text }, res.status));
  }
  if (!data) {
    clearAuthStorage();
    throw new Error("Refresh javobini o‘qib bo‘lmadi");
  }

  if (data.accessToken) localStorage.setItem(AUTH_KEYS.ACCESS, data.accessToken);
  if (data.refreshToken) localStorage.setItem(AUTH_KEYS.REFRESH, data.refreshToken);

  const prev = getStoredUser();
  if (prev) {
    const nextUser: AuthUser = {
      ...prev,
      firstName: data.firstName ?? prev.firstName,
      lastName: data.lastName ?? prev.lastName,
      surname: data.surname ?? prev.surname,
      role: data.role ?? prev.role,
    };
    localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(nextUser));
  }

  return data;
}
