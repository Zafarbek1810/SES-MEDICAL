import { apiFetch, apiFetchBlob, unwrapList } from "./apiHttp";

export type ParasiteWaterCheckResultRow = {
  orderDetailId: number;
  waterCheckId: number;
  result: string;
};

export type AnalysisResultParasiteWaterChecksResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

export type ParasiteWaterCheckSavedItem = {
  id: number;
  orderDetailId: number;
  waterCheckId: number;
  waterCheckName?: string;
  result: string;
  createdAt?: string;
  updatedAt?: string;
};

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function toStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function normalizeParasiteWaterCheckSavedItem(raw: unknown): ParasiteWaterCheckSavedItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  const orderDetailId = toNum(o.orderDetailId ?? o.order_detail_id);
  const waterCheckId = toNum(o.waterCheckId ?? o.water_check_id);
  const result = toStr(o.result) ?? "";
  if (id === undefined || orderDetailId === undefined || waterCheckId === undefined) return null;
  return {
    id,
    orderDetailId,
    waterCheckId,
    waterCheckName: toStr(o.waterCheckName ?? o.water_check_name),
    result,
    createdAt: toStr(o.createdAt ?? o.created_at),
    updatedAt: toStr(o.updatedAt ?? o.updated_at),
  };
}

/**
 * GET /analysis-result-parasite-water-checks/by-order-detail/{orderDetailId}
 */
export async function fetchAnalysisResultParasiteWaterChecksByOrderDetail(
  orderDetailId: number
): Promise<ParasiteWaterCheckSavedItem[]> {
  const raw = await apiFetch<unknown>(
    `/analysis-result-parasite-water-checks/by-order-detail/${encodeURIComponent(String(orderDetailId))}`,
    { method: "GET" }
  );
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeParasiteWaterCheckSavedItem).filter((x): x is ParasiteWaterCheckSavedItem => x !== null);
}

/**
 * GET /analysis-result-parasite-water-checks/by-order-detail/{orderDetailId}/pdf/download
 */
export async function fetchParasiteWaterChecksPdfBlobByOrderDetail(orderDetailId: number): Promise<Blob> {
  return apiFetchBlob(
    `/analysis-result-parasite-water-checks/by-order-detail/${encodeURIComponent(String(orderDetailId))}/pdf/download`,
    { method: "GET" }
  );
}

/**
 * POST /analysis-result-parasite-water-checks
 * Body: faqat qiymati kiritilgan qatorlar (bo‘sh inputlar yuborilmaydi).
 */
export async function postAnalysisResultParasiteWaterChecks(
  body: ParasiteWaterCheckResultRow[]
): Promise<AnalysisResultParasiteWaterChecksResponse> {
  const raw = await apiFetch<unknown>("/analysis-result-parasite-water-checks", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as AnalysisResultParasiteWaterChecksResponse;
  }
  return {};
}

/**
 * PUT /analysis-result-parasite-water-checks/{orderDetailId}
 */
export async function putAnalysisResultParasiteWaterChecks(
  orderDetailId: number,
  body: ParasiteWaterCheckResultRow[]
): Promise<AnalysisResultParasiteWaterChecksResponse> {
  const raw = await apiFetch<unknown>(
    `/analysis-result-parasite-water-checks/${encodeURIComponent(String(orderDetailId))}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as AnalysisResultParasiteWaterChecksResponse;
  }
  return {};
}
