import { apiFetch, unwrapList } from "./apiHttp";

export type SampleGroupDto = {
  id: number;
  name: string;
};

export type SaveSampleGroupBody = {
  name: string;
};

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function unwrapPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  for (const k of ["data", "result", "payload", "entity", "body", "content"] as const) {
    const v = o[k];
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  }
  return raw;
}

export function normalizeSampleGroup(raw: unknown): SampleGroupDto | null {
  const u = unwrapPayload(raw);
  if (!u || typeof u !== "object" || Array.isArray(u)) return null;
  const o = u as Record<string, unknown>;
  const id = toNum(o.id);
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (id === undefined || !name) return null;
  return { id, name };
}

/**
 * GET /sample-groups
 */
export async function fetchSampleGroups(): Promise<SampleGroupDto[]> {
  const raw = await apiFetch<unknown>("/sample-groups", { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeSampleGroup).filter((x): x is SampleGroupDto => x !== null);
}

/**
 * GET /sample-groups/{id}
 */
export async function fetchSampleGroup(id: number): Promise<SampleGroupDto> {
  const raw = await apiFetch<unknown>(`/sample-groups/${encodeURIComponent(String(id))}`, {
    method: "GET",
  });
  const n = normalizeSampleGroup(raw);
  if (!n) throw new Error("Namuna guruhi ma’lumoti noto‘g‘ri");
  return n;
}

/**
 * POST /sample-groups
 */
export async function createSampleGroup(body: SaveSampleGroupBody): Promise<SampleGroupDto> {
  const raw = await apiFetch<unknown>("/sample-groups", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const n = normalizeSampleGroup(raw);
  if (n) return n;
  const merged = normalizeSampleGroup({ data: { id: 0, ...body } });
  if (merged) return merged;
  throw new Error("Namuna guruhi yaratildi, lekin javob noto‘g‘ri");
}

/**
 * PUT /sample-groups/{id}
 */
export async function updateSampleGroup(id: number, body: SaveSampleGroupBody): Promise<SampleGroupDto> {
  const raw = await apiFetch<unknown>(`/sample-groups/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const n = normalizeSampleGroup(raw);
  if (n) return n;
  const merged = normalizeSampleGroup({ data: { id, ...body } });
  if (merged) return merged;
  return fetchSampleGroup(id);
}

/**
 * DELETE /sample-groups/{id}
 */
export async function deleteSampleGroup(id: number): Promise<void> {
  await apiFetch<void>(`/sample-groups/${encodeURIComponent(String(id))}`, { method: "DELETE" });
}
