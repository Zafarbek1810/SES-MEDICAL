import { API_BASE_URL } from "../config/api";
import { getStoredAccessToken, getStoredRefreshToken, refreshApi } from "./auth";

function getErrorMessage(data: unknown, status: number, raw: string): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const msg = o.message ?? o.error ?? o.detail;
    if (typeof msg === "string") return msg;
  }
  return raw || `So‘rov xatosi (${status})`;
}

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function shouldTryRefresh(status: number, data: unknown): boolean {
  if (status !== 401) return false;
  if (!data || typeof data !== "object") return true;
  const o = data as Record<string, unknown>;
  const msg = String(o.error ?? o.message ?? o.detail ?? "").toLowerCase();
  return msg.includes("token") || msg.includes("muddati tugagan") || msg.includes("yaroqsiz");
}

let refreshInFlight: Promise<void> | null = null;

async function ensureFreshAccessToken(): Promise<boolean> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    refreshInFlight = refreshApi(refreshToken)
      .then(() => undefined)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  try {
    await refreshInFlight;
    return true;
  } catch {
    return false;
  }
}

async function rawFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getStoredAccessToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const hasBody = init?.body != null && init.body !== "";
  if (hasBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

/** Obekt ichidagi birinchi massivni (ichki obektlar bo‘yicha DFS) qidiradi */
function firstArrayInTree(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) return v;
    }
    for (const v of Object.values(o)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const inner = firstArrayInTree(v);
        if (inner !== null) return inner;
      }
    }
  }
  return null;
}

/** GET javobidan ro‘yxatni ajratib oladi (massiv yoki keng tarqalgan o‘ramlar) */
export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const keys = [
      "content",
      "data",
      "items",
      "results",
      "result",
      "payload",
      "analyses",
      "analysisPrices",
      "workplaces",
      "records",
      "users",
      "list",
      "rows",
      "body",
      "values",
      "orders",
      "patients",
      "departments",
    ] as const;
    for (const k of keys) {
      const v = o[k];
      if (Array.isArray(v)) return v as T[];
    }
    if (o._embedded && typeof o._embedded === "object") {
      const emb = o._embedded as Record<string, unknown>;
      for (const v of Object.values(emb)) {
        if (Array.isArray(v)) return v as T[];
      }
    }
    const deep = firstArrayInTree(data);
    if (deep) return deep as T[];
  }
  return [];
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await rawFetch(path, init);
  let text = await res.text();

  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  let data = text ? parseJsonSafe(text) : null;

  if (!res.ok && shouldTryRefresh(res.status, data)) {
    const refreshed = await ensureFreshAccessToken();
    if (refreshed) {
      res = await rawFetch(path, init);
      text = await res.text();
      if (res.status === 204 || res.status === 205) {
        return undefined as T;
      }
      data = text ? parseJsonSafe(text) : null;
    }
  }

  if (!res.ok) {
    throw new Error(getErrorMessage(data, res.status, text));
  }

  if (data === null || data === undefined) {
    return undefined as T;
  }

  return data as T;
}
