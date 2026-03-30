import { REFERENCE_ENDPOINTS } from "../config/reference-endpoints";
import { apiFetch, unwrapList } from "./apiHttp";

/**
 * Spravochnik qatorlari — backend maydonlari farq qilishi mumkin (camelCase/snake_case).
 * Forma/select uchun odatda `id` va nom maydonlari ishlatiladi.
 */
export type ReferenceItem = {
  id: number;
  nameUz?: string;
  nameRu?: string;
  name?: string;
  code?: string;
  regionId?: number;
  districtId?: number;
  [key: string]: unknown;
};

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeItem(raw: unknown): ReferenceItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  if (id === undefined) return null;
  return {
    ...o,
    id,
    nameUz: o.nameUz != null ? String(o.nameUz) : o.name_uz != null ? String(o.name_uz) : undefined,
    nameRu: o.nameRu != null ? String(o.nameRu) : o.name_ru != null ? String(o.name_ru) : undefined,
    name: o.name != null ? String(o.name) : undefined,
    code: o.code != null ? String(o.code) : undefined,
    regionId: toNum(o.regionId ?? o.region_id),
    districtId: toNum(o.districtId ?? o.district_id),
  } as ReferenceItem;
}

async function fetchReferenceList(path: string): Promise<ReferenceItem[]> {
  const raw = await apiFetch<unknown>(path, { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeItem).filter((x): x is ReferenceItem => x !== null);
}

/** Xotira keshi (bir sessiyada takroriy so‘rovlarni kamaytirish) */
const cache = new Map<string, { items: ReferenceItem[]; at: number }>();
const TTL_MS = 5 * 60 * 1000;

function getCached(path: string): ReferenceItem[] | null {
  const e = cache.get(path);
  if (!e || Date.now() - e.at > TTL_MS) return null;
  return e.items;
}

function setCached(path: string, items: ReferenceItem[]) {
  cache.set(path, { items, at: Date.now() });
}

/** Keshni tozalash (masalan, logout yoki majburiy yangilash) */
export function clearReferenceDataCache(): void {
  cache.clear();
}

function districtsPath(regionId: number): string {
  const q = new URLSearchParams({ regionId: String(regionId) });
  return `${REFERENCE_ENDPOINTS.districts}?${q.toString()}`;
}

function villagesPath(districtId: number): string {
  const q = new URLSearchParams({ districtId: String(districtId) });
  return `${REFERENCE_ENDPOINTS.villages}?${q.toString()}`;
}

async function fetchCached(path: string, force = false): Promise<ReferenceItem[]> {
  if (!force) {
    const c = getCached(path);
    if (c) return c;
  }
  const items = await fetchReferenceList(path);
  setCached(path, items);
  return items;
}

/**
 * GET /roles — `name` odatda enum kodi (ADMIN, DIRECTOR, …).
 * UI uchun lotincha/o‘zbekcha qisqa nom.
 */
const ROLE_CODE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  ADMINISTRATOR: "Administrator",
  USER: "Foydalanuvchi",
  CASHIER: "Kassir",
  KASSIR: "Kassir",
  LABORATORY_ASSISTANT: "Laboratoriya assistenti",
  LABORANT: "Laborant",
  LABORATORY_DIRECTOR: "Laboratoriya direktori",
  LAB_DIRECTOR: "Laboratoriya direktori",
  DIRECTOR: "Direktor",
  COMPANY_DIRECTOR: "Kompaniya direktori",
};

/** Faqat kod satrini berilsa (masalan, token ichidagi `role`) */
export function roleCodeToLabel(codeOrName: string | undefined | null): string {
  if (codeOrName == null || String(codeOrName).trim() === "") return "";
  const raw = String(codeOrName).trim();
  const key = raw.replace(/^ROLE_/i, "").toUpperCase();
  return ROLE_CODE_LABELS[key] ?? raw;
}

/** GET /roles qatori — `name` / `code` bo‘yicha jilovlangan nom */
export function roleReferenceLabel(item: ReferenceItem): string {
  const primary = item.name?.trim() || item.code?.trim();
  if (primary) return roleCodeToLabel(primary);
  return item.nameUz?.trim() || item.nameRu?.trim() || `#${item.id}`;
}

export async function fetchRoles(force = false): Promise<ReferenceItem[]> {
  return fetchCached(REFERENCE_ENDPOINTS.roles, force);
}

export async function fetchRegions(force = false): Promise<ReferenceItem[]> {
  return fetchCached(REFERENCE_ENDPOINTS.regions, force);
}

/**
 * Tumanlar ro‘yxati — backend `regionId` query parametri talab qiladi.
 */
export async function fetchDistricts(regionId: number, force = false): Promise<ReferenceItem[]> {
  if (!Number.isFinite(regionId) || regionId <= 0) {
    return [];
  }
  return fetchCached(districtsPath(regionId), force);
}

/**
 * Mahallalar / qishloqlar — backend `districtId` query parametri talab qiladi (GET /villages?districtId=…).
 */
export async function fetchVillages(districtId: number, force = false): Promise<ReferenceItem[]> {
  if (!Number.isFinite(districtId) || districtId <= 0) {
    return [];
  }
  return fetchCached(villagesPath(districtId), force);
}

/**
 * Barcha spravochniklarni yuklash.
 * Tumanlar `regionId`, mahallalar `districtId` talab qilgani uchun bu yerda bo‘sh qaytariladi —
 * kerak bo‘lsa `fetchDistricts` / `fetchVillages` alohida chaqiring.
 */
export async function fetchAllReferenceData(force = false): Promise<{
  roles: ReferenceItem[];
  regions: ReferenceItem[];
  districts: ReferenceItem[];
  villages: ReferenceItem[];
}> {
  const [roles, regions] = await Promise.all([fetchRoles(force), fetchRegions(force)]);
  return { roles, regions, districts: [], villages: [] };
}
