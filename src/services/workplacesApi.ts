import { apiFetch, unwrapList } from "./apiHttp";

export type WorkplaceDto = {
  id: number;
  name: string;
  regionId: number;
  districtId: number;
};

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function unwrapCreatedPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  const keys = ["data", "result", "payload", "body", "entity", "content"] as const;
  for (const k of keys) {
    const v = o[k];
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  }
  return raw;
}

function mergeWorkplaceFromBody(raw: unknown, body: WorkplaceBody): WorkplaceDto | null {
  const u = unwrapCreatedPayload(raw);
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const id = toNum(o.id);
  if (id === undefined) return null;
  return {
    id,
    name: String(o.name ?? o.nameUz ?? o.name_uz ?? "").trim() || body.name,
    regionId: toNum(o.regionId ?? o.region_id) ?? body.regionId,
    districtId: toNum(o.districtId ?? o.district_id) ?? body.districtId,
  };
}

export function normalizeWorkplaceDto(raw: unknown): WorkplaceDto | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  const regionId = toNum(o.regionId ?? o.region_id);
  const districtId = toNum(o.districtId ?? o.district_id);
  const name = String(o.name ?? o.nameUz ?? o.name_uz ?? o.title ?? "").trim();
  if (id === undefined || regionId === undefined || districtId === undefined || !name) return null;
  return { id, name, regionId, districtId };
}

export type WorkplaceBody = {
  name: string;
  regionId: number;
  districtId: number;
};

export async function fetchWorkplaces(): Promise<WorkplaceDto[]> {
  const raw = await apiFetch<unknown>("/workplaces", { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeWorkplaceDto).filter((x): x is WorkplaceDto => x !== null);
}

/** Admin panel uchun maxsus ro‘yxat endpointi */
export async function fetchWorkplacesAdmin(): Promise<WorkplaceDto[]> {
  const raw = await apiFetch<unknown>("/workplaces/admin", { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeWorkplaceDto).filter((x): x is WorkplaceDto => x !== null);
}

export async function fetchWorkplace(id: number): Promise<WorkplaceDto> {
  const raw = await apiFetch<unknown>(`/workplaces/${id}`, { method: "GET" });
  const n = normalizeWorkplaceDto(raw);
  if (!n) throw new Error("Ish joyi ma’lumoti noto‘g‘ri");
  return n;
}

export async function createWorkplace(body: WorkplaceBody): Promise<WorkplaceDto> {
  const res = await apiFetch<unknown>("/workplaces", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res === undefined || res === null) {
    return { id: 0, ...body };
  }
  const full = normalizeWorkplaceDto(unwrapCreatedPayload(res));
  if (full) return full;
  const merged = mergeWorkplaceFromBody(res, body);
  if (merged) return merged;
  return { id: 0, ...body };
}

export async function updateWorkplace(id: number, body: WorkplaceBody): Promise<WorkplaceDto> {
  const res = await apiFetch<unknown>(`/workplaces/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (res === undefined || res === null) {
    return { id, ...body };
  }
  const full = normalizeWorkplaceDto(unwrapCreatedPayload(res));
  if (full) return full;
  const merged = mergeWorkplaceFromBody(res, body);
  if (merged) return merged;
  return { id, ...body };
}

export async function deleteWorkplace(id: number): Promise<void> {
  await apiFetch<void>(`/workplaces/${id}`, { method: "DELETE" });
}
