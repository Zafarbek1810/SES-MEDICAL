import { apiFetch, unwrapList } from "./apiHttp";

export type AnalysisPriceDto = {
  id: number;
  analysisId: number;
  price: number;
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

function toPrice(v: unknown): number | undefined {
  const n = toNum(v);
  if (n === undefined) return undefined;
  return n;
}

/** POST/PUT javobida tez-tez keladigan yagona obyekt o‘ramlari */
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

function extractCreatedId(raw: unknown): number | undefined {
  const u = unwrapCreatedPayload(raw);
  if (!u || typeof u !== "object") return undefined;
  const o = u as Record<string, unknown>;
  return toNum(o.id ?? o.priceId ?? o.analysisPriceId ?? o.analysis_price_id);
}

/** Server faqat `{ id }` yoki qisman maydon qaytarsa, qolganini so‘rov tanasi bilan to‘ldiramiz */
function mergePriceDtoFromResponse(raw: unknown, body: AnalysisPriceBody): AnalysisPriceDto | null {
  const u = unwrapCreatedPayload(raw);
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const id = toNum(o.id);
  if (id === undefined) return null;
  const analysisId = toNum(o.analysisId ?? o.analysis_id) ?? body.analysisId;
  const regionId = toNum(o.regionId ?? o.region_id) ?? body.regionId;
  const districtId = toNum(o.districtId ?? o.district_id) ?? body.districtId;
  const price = toPrice(o.price) ?? body.price;
  return { id, analysisId, price, regionId, districtId };
}

export function normalizeAnalysisPriceDto(raw: unknown): AnalysisPriceDto | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  const analysisId = toNum(o.analysisId ?? o.analysis_id);
  const regionId = toNum(o.regionId ?? o.region_id);
  const districtId = toNum(o.districtId ?? o.district_id);
  const price = toPrice(o.price);
  if (id === undefined || analysisId === undefined || regionId === undefined || districtId === undefined || price === undefined) {
    return null;
  }
  return { id, analysisId, price, regionId, districtId };
}

export async function fetchAnalysisPrices(): Promise<AnalysisPriceDto[]> {
  const raw = await apiFetch<unknown>("/analysis-prices", { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeAnalysisPriceDto).filter((x): x is AnalysisPriceDto => x !== null);
}

export async function fetchAnalysisPrice(id: number): Promise<AnalysisPriceDto> {
  const raw = await apiFetch<unknown>(`/analysis-prices/${id}`, { method: "GET" });
  const n = normalizeAnalysisPriceDto(raw);
  if (!n) throw new Error("Narx yozuvi noto‘g‘ri formatda");
  return n;
}

export type AnalysisPriceBody = {
  analysisId: number;
  price: number;
  regionId: number;
  districtId: number;
};

export async function createAnalysisPrice(body: AnalysisPriceBody): Promise<AnalysisPriceDto> {
  const res = await apiFetch<unknown>("/analysis-prices", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = unwrapCreatedPayload(res);
  const full = normalizeAnalysisPriceDto(payload);
  if (full) return full;
  const merged = mergePriceDtoFromResponse(res, body);
  if (merged) return merged;
  const createdId = extractCreatedId(res);
  if (createdId !== undefined) return fetchAnalysisPrice(createdId);
  throw new Error("Server javobi noto‘g‘ri");
}

export async function updateAnalysisPrice(id: number, body: AnalysisPriceBody): Promise<AnalysisPriceDto> {
  const res = await apiFetch<unknown>(`/analysis-prices/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const payload = unwrapCreatedPayload(res);
  const full = normalizeAnalysisPriceDto(payload);
  if (full) return full;
  const merged = mergePriceDtoFromResponse(res, body);
  if (merged) return merged;
  return fetchAnalysisPrice(id);
}

export async function deleteAnalysisPrice(id: number): Promise<void> {
  await apiFetch<void>(`/analysis-prices/${id}`, { method: "DELETE" });
}
