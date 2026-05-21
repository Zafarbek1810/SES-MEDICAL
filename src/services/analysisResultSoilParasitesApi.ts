import { apiFetch, apiFetchBlob, unwrapList } from "./apiHttp";

export type SoilParasiteResultRow = {
  orderDetailId: number;
  samplePointName: string;
  quantity: number;
  depth: string;
  result: string;
};

export type SoilParasiteSavedItem = SoilParasiteResultRow & {
  id: number;
};

export type SoilParasiteApiResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

export type PagedSoilParasites = {
  items: SoilParasiteSavedItem[];
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

function extractSpringPage(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) return inner as Record<string, unknown>;
  return o;
}

function parsePageMeta(raw: unknown, fallbackItemCount: number): Omit<PagedSoilParasites, "items"> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      page: 0,
      size: fallbackItemCount,
      totalPages: 1,
      totalElements: fallbackItemCount,
    };
  }
  const o = raw as Record<string, unknown>;
  const totalElements = toNum(o.totalElements ?? o.total_elements ?? o.recordsTotal) ?? fallbackItemCount;
  const size = toNum(o.size ?? o.pageSize ?? o.page_size) ?? 20;
  const totalPages =
    toNum(o.totalPages ?? o.total_pages) ?? Math.max(1, Math.ceil(totalElements / Math.max(size, 1)));
  const page = toNum(o.number ?? o.page ?? o.pageNumber ?? o.page_number) ?? 0;
  return { page, size, totalPages, totalElements };
}

export function normalizeSoilParasiteItem(raw: unknown): SoilParasiteSavedItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  const orderDetailId = toNum(o.orderDetailId ?? o.order_detail_id);
  if (id === undefined || orderDetailId === undefined) return null;
  return {
    id,
    orderDetailId,
    samplePointName: toStr(o.samplePointName ?? o.sample_point_name),
    quantity: toNum(o.quantity) ?? 0,
    depth: toStr(o.depth),
    result: toStr(o.result),
  };
}

function unwrapPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  for (const k of ["data", "result", "payload", "entity", "body"] as const) {
    const v = o[k];
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  }
  return raw;
}

/**
 * GET /analysis-result-soil-parasites (pagination, ixtiyoriy orderDetailId filter)
 */
export async function fetchSoilParasitesPage(
  page = 0,
  size = 50,
  orderDetailId?: number
): Promise<PagedSoilParasites> {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  if (orderDetailId != null && Number.isFinite(orderDetailId) && orderDetailId > 0) {
    q.set("orderDetailId", String(orderDetailId));
  }
  const raw = await apiFetch<unknown>(`/analysis-result-soil-parasites?${q.toString()}`, {
    method: "GET",
  });
  const pageObj = extractSpringPage(raw);
  const contentRaw = pageObj?.content;
  const rows = Array.isArray(contentRaw) ? contentRaw : unwrapList<unknown>(raw);
  let items = rows.map(normalizeSoilParasiteItem).filter((x): x is SoilParasiteSavedItem => x !== null);
  if (orderDetailId != null && Number.isFinite(orderDetailId) && orderDetailId > 0) {
    items = items.filter((x) => x.orderDetailId === orderDetailId);
  }
  const meta = parsePageMeta(pageObj ?? {}, items.length);
  return { items, ...meta };
}

/** Bir buyurtma qatori uchun saqlangan yozuvlar */
export async function fetchSoilParasitesByOrderDetail(orderDetailId: number): Promise<SoilParasiteSavedItem[]> {
  const collected: SoilParasiteSavedItem[] = [];
  let page = 0;
  const size = 100;
  let totalPages = 1;
  while (page < totalPages && page < 50) {
    const res = await fetchSoilParasitesPage(page, size, orderDetailId);
    collected.push(...res.items.filter((x) => x.orderDetailId === orderDetailId));
    totalPages = res.totalPages;
    page += 1;
    if (res.items.length === 0) break;
  }
  const byId = new Map<number, SoilParasiteSavedItem>();
  for (const x of collected) byId.set(x.id, x);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

/**
 * GET /analysis-result-soil-parasites/{id}
 */
export async function fetchSoilParasiteById(id: number): Promise<SoilParasiteSavedItem> {
  const raw = await apiFetch<unknown>(
    `/analysis-result-soil-parasites/${encodeURIComponent(String(id))}`,
    { method: "GET" }
  );
  const n = normalizeSoilParasiteItem(unwrapPayload(raw));
  if (!n) throw new Error("Tuproq paraziti yozuvi noto‘g‘ri");
  return n;
}

/**
 * DELETE /analysis-result-soil-parasites/{id}
 */
export async function deleteSoilParasite(id: number): Promise<void> {
  await apiFetch<void>(`/analysis-result-soil-parasites/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });
}

/**
 * POST /analysis-result-soil-parasites
 */
export async function postSoilParasites(body: SoilParasiteResultRow[]): Promise<SoilParasiteApiResponse> {
  const raw = await apiFetch<unknown>("/analysis-result-soil-parasites", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as SoilParasiteApiResponse;
  }
  return {};
}

/**
 * PUT /analysis-result-soil-parasites/{orderDetailId}
 */
export async function putSoilParasitesByOrderDetail(
  orderDetailId: number,
  body: SoilParasiteResultRow[]
): Promise<SoilParasiteApiResponse> {
  const raw = await apiFetch<unknown>(
    `/analysis-result-soil-parasites/${encodeURIComponent(String(orderDetailId))}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as SoilParasiteApiResponse;
  }
  return {};
}

/**
 * GET /analysis-result-soil-parasites/by-order-detail/{orderDetailId}/pdf/download
 */
export async function fetchSoilParasitesPdfBlobByOrderDetail(orderDetailId: number): Promise<Blob> {
  return apiFetchBlob(
    `/analysis-result-soil-parasites/by-order-detail/${encodeURIComponent(String(orderDetailId))}/pdf/download`,
    { method: "GET" }
  );
}
