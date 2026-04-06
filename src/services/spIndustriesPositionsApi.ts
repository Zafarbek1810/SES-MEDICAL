import { apiFetch, unwrapList } from "./apiHttp";

/** GET /sp-industries — soha / tarmoq */
export type SpIndustryDto = {
  id: number;
  name: string;
};

/** GET /sp-positions?industryId= — lavozim */
export type SpPositionDto = {
  id: number;
  name: string;
  industryId: number;
  industryName: string;
};

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function toStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export function normalizeSpIndustry(raw: unknown): SpIndustryDto | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  if (id === undefined) return null;
  return { id, name: toStr(o.name) || `ID ${id}` };
}

export function normalizeSpPosition(raw: unknown): SpPositionDto | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  const industryId = toNum(o.industryId ?? o.industry_id);
  if (id === undefined || industryId === undefined) return null;
  return {
    id,
    name: toStr(o.name) || `ID ${id}`,
    industryId,
    industryName: toStr(o.industryName ?? o.industry_name),
  };
}

/**
 * GET /sp-industries
 * Javob: `{ "data": [ { "id", "name" }, ... ] }`
 */
export async function fetchSpIndustries(): Promise<SpIndustryDto[]> {
  const raw = await apiFetch<unknown>("/sp-industries", { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeSpIndustry).filter((x): x is SpIndustryDto => x !== null);
}

/**
 * GET /sp-positions?industryId=
 * Javob: `{ "data": [ { "id", "name", "industryId", "industryName" }, ... ] }`
 */
export async function fetchSpPositions(industryId: number): Promise<SpPositionDto[]> {
  if (!Number.isFinite(industryId) || industryId <= 0) return [];
  const q = new URLSearchParams({ industryId: String(industryId) });
  const raw = await apiFetch<unknown>(`/sp-positions?${q.toString()}`, { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeSpPosition).filter((x): x is SpPositionDto => x !== null);
}
