import { apiFetch, unwrapList } from "./apiHttp";

export type FecesParasiteResultRow = {
  orderDetailId: number;
  spParasitesId: number;
};

export type AnalysisResultFecesParasitesResponse = {
  success?: boolean;
  message?: string;
  recordsTotal?: number;
  data?: unknown;
};

export type FecesParasiteResultByOrderDetailItem = {
  id: number;
  orderDetailId: number;
  spParasitesId: number;
  spParasitesName?: string;
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

function normalizeFecesResultByOrderDetailItem(raw: unknown): FecesParasiteResultByOrderDetailItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  const orderDetailId = toNum(o.orderDetailId ?? o.order_detail_id);
  const spParasitesId = toNum(o.spParasitesId ?? o.sp_parasites_id);
  if (id === undefined || orderDetailId === undefined || spParasitesId === undefined) return null;
  return {
    id,
    orderDetailId,
    spParasitesId,
    spParasitesName:
      typeof o.spParasitesName === "string"
        ? o.spParasitesName
        : typeof o.sp_parasites_name === "string"
          ? o.sp_parasites_name
          : undefined,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : typeof o.created_at === "string" ? o.created_at : undefined,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : typeof o.updated_at === "string" ? o.updated_at : undefined,
  };
}

/**
 * GET /analysis-result-feces-parasites/by-order-detail/{orderDetailId}
 */
export async function fetchAnalysisResultFecesParasitesByOrderDetail(
  orderDetailId: number
): Promise<FecesParasiteResultByOrderDetailItem[]> {
  const raw = await apiFetch<unknown>(
    `/analysis-result-feces-parasites/by-order-detail/${encodeURIComponent(String(orderDetailId))}`,
    { method: "GET" }
  );
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeFecesResultByOrderDetailItem).filter((x): x is FecesParasiteResultByOrderDetailItem => x !== null);
}

/**
 * POST /analysis-result-feces-parasites — tanlangan parazitlar ro‘yxati.
 */
export async function postAnalysisResultFecesParasites(
  body: FecesParasiteResultRow[]
): Promise<AnalysisResultFecesParasitesResponse> {
  const raw = await apiFetch<unknown>("/analysis-result-feces-parasites", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as AnalysisResultFecesParasitesResponse;
  }
  return {};
}

/**
 * PUT /analysis-result-feces-parasites/{orderDetailId}
 * Body: `[{ orderDetailId, spParasitesId }, ...]`
 */
export async function putAnalysisResultFecesParasites(
  orderDetailId: number,
  body: FecesParasiteResultRow[]
): Promise<AnalysisResultFecesParasitesResponse> {
  const raw = await apiFetch<unknown>(
    `/analysis-result-feces-parasites/${encodeURIComponent(String(orderDetailId))}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as AnalysisResultFecesParasitesResponse;
  }
  return {};
}
