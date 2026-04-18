import { apiFetch, unwrapList } from "./apiHttp";

export type SaveSampleBody = {
  objectName: string;
  /** GET /enums → `sampleObjectType` (masalan 33 — HUMAN, 44 — OBJECT) */
  sampleObjectType: number;
  patientId: number;
  sampleType: number;
  name: string;
  description: string;
  sourceName: string;
  sourceAddress: string;
  regionId: number;
  districtId: number;
  collectedDate: string;
  /** Laboratoriyaga topshirilgan sana-vaqt */
  dateSubmissionLaboratory: string;
};

export type SampleDto = SaveSampleBody & {
  id: number;
};

export type PagedSamples = {
  items: SampleDto[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
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

function unwrapPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  for (const k of ["data", "result", "payload", "content", "entity", "body"] as const) {
    const v = o[k];
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  }
  return raw;
}

export function normalizeSample(raw: unknown): SampleDto | null {
  const u = unwrapPayload(raw);
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const id = toNum(o.id);
  if (id === undefined) return null;
  return {
    id,
    objectName: toStr(o.objectName ?? o.object_name),
    sampleObjectType: toNum(o.sampleObjectType ?? o.sample_object_type) ?? 0,
    patientId: toNum(o.patientId ?? o.patient_id) ?? 0,
    sampleType: toNum(o.sampleType ?? o.sample_type) ?? 0,
    name: toStr(o.name),
    description: toStr(o.description),
    sourceName: toStr(o.sourceName ?? o.source_name),
    sourceAddress: toStr(o.sourceAddress ?? o.source_address),
    regionId: toNum(o.regionId ?? o.region_id) ?? 0,
    districtId: toNum(o.districtId ?? o.district_id) ?? 0,
    collectedDate: toStr(o.collectedDate ?? o.collected_date),
    dateSubmissionLaboratory: toStr(
      o.dateSubmissionLaboratory ??
        o.date_submission_laboratory ??
        o.dateSubmissionToLaboratory ??
        o.date_submission_to_laboratory
    ),
  };
}

function parsePageMeta(raw: unknown, fallbackItemCount: number): Omit<PagedSamples, "items"> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      page: 0,
      size: fallbackItemCount,
      totalPages: 1,
      totalElements: fallbackItemCount,
    };
  }
  const o = raw as Record<string, unknown>;
  const totalElements = toNum(o.totalElements ?? o.total_elements) ?? fallbackItemCount;
  const size = toNum(o.size ?? o.pageSize ?? o.page_size) ?? 10;
  const totalPages =
    toNum(o.totalPages ?? o.total_pages) ?? Math.max(1, Math.ceil(totalElements / Math.max(size, 1)));
  const page = toNum(o.number ?? o.page ?? o.pageNumber ?? o.page_number) ?? 0;
  return { page, size, totalPages, totalElements };
}

function extractCreatedId(raw: unknown): number | undefined {
  const u = unwrapPayload(raw);
  if (u && typeof u === "object" && !Array.isArray(u)) {
    const id = toNum((u as Record<string, unknown>).id);
    if (id !== undefined) return id;
  }
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const id = toNum((raw as Record<string, unknown>).id);
    if (id !== undefined) return id;
  }
  return undefined;
}

export async function fetchSamples(page = 0, size = 10): Promise<PagedSamples> {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  const raw = await apiFetch<unknown>(`/samples?${q.toString()}`, { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  const items = rows.map(normalizeSample).filter((x): x is SampleDto => x !== null);
  const meta = parsePageMeta(raw, items.length);
  return { items, ...meta };
}

export async function fetchSample(id: number): Promise<SampleDto> {
  const raw = await apiFetch<unknown>(`/samples/${id}`, { method: "GET" });
  const n = normalizeSample(unwrapPayload(raw));
  if (n) return n;
  throw new Error("Namuna ma’lumoti noto‘g‘ri");
}

export async function createSample(body: SaveSampleBody): Promise<SampleDto> {
  const res = await apiFetch<unknown>("/samples", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res === undefined || res === null) {
    throw new Error("Namuna yaratildi, lekin javob bo‘sh");
  }
  const createdId = extractCreatedId(res);
  if (createdId !== undefined) {
    try {
      return await fetchSample(createdId);
    } catch {
      return normalizeSample(res) ?? { id: createdId, ...body };
    }
  }
  const direct = normalizeSample(res);
  if (direct) return direct;
  throw new Error("Namuna yaratildi, lekin javobda id topilmadi");
}

export async function updateSample(id: number, body: SaveSampleBody): Promise<SampleDto> {
  const res = await apiFetch<unknown>(`/samples/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const direct = normalizeSample(unwrapPayload(res));
  if (direct) return direct;
  try {
    return await fetchSample(id);
  } catch {
    return { id, ...body };
  }
}

export async function deleteSample(id: number): Promise<void> {
  await apiFetch<void>(`/samples/${id}`, { method: "DELETE" });
}
