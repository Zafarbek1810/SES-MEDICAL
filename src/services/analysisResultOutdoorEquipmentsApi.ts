import { apiFetch, apiFetchBlob, unwrapList } from "./apiHttp";

export type OutdoorEquipmentResultRow = {
  orderDetailId: number;
  sampleGroupId: number;
  samplePointName: string;
  isDetermined: boolean;
  result: string;
};

export type OutdoorEquipmentSavedItem = OutdoorEquipmentResultRow & {
  id: number;
};

export type OutdoorEquipmentApiResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

export type PagedOutdoorEquipments = {
  items: OutdoorEquipmentSavedItem[];
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

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1) return true;
  if (v === "false" || v === 0) return false;
  return false;
}

function extractSpringPage(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) return inner as Record<string, unknown>;
  return o;
}

function parsePageMeta(raw: unknown, fallbackItemCount: number): Omit<PagedOutdoorEquipments, "items"> {
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

export function normalizeOutdoorEquipmentItem(raw: unknown): OutdoorEquipmentSavedItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  const orderDetailId = toNum(o.orderDetailId ?? o.order_detail_id);
  const sampleGroupId = toNum(o.sampleGroupId ?? o.sample_group_id);
  if (id === undefined || orderDetailId === undefined || sampleGroupId === undefined) return null;
  return {
    id,
    orderDetailId,
    sampleGroupId,
    samplePointName: toStr(o.samplePointName ?? o.sample_point_name),
    isDetermined: toBool(o.isDetermined ?? o.is_determined),
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
 * GET /analysis-result-outdoor-equipments (pagination, ixtiyoriy orderDetailId filter)
 */
export async function fetchOutdoorEquipmentsPage(
  page = 0,
  size = 50,
  orderDetailId?: number
): Promise<PagedOutdoorEquipments> {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  if (orderDetailId != null && Number.isFinite(orderDetailId) && orderDetailId > 0) {
    q.set("orderDetailId", String(orderDetailId));
  }
  const raw = await apiFetch<unknown>(`/analysis-result-outdoor-equipments?${q.toString()}`, {
    method: "GET",
  });
  const pageObj = extractSpringPage(raw);
  const contentRaw = pageObj?.content;
  const rows = Array.isArray(contentRaw) ? contentRaw : unwrapList<unknown>(raw);
  let items = rows.map(normalizeOutdoorEquipmentItem).filter((x): x is OutdoorEquipmentSavedItem => x !== null);
  if (orderDetailId != null && Number.isFinite(orderDetailId) && orderDetailId > 0) {
    items = items.filter((x) => x.orderDetailId === orderDetailId);
  }
  const meta = parsePageMeta(pageObj ?? {}, items.length);
  return { items, ...meta };
}

/** Bir buyurtma qatori uchun saqlangan yozuvlar (bir necha sahifa qidiriladi). */
export async function fetchOutdoorEquipmentsByOrderDetail(orderDetailId: number): Promise<OutdoorEquipmentSavedItem[]> {
  const collected: OutdoorEquipmentSavedItem[] = [];
  let page = 0;
  const size = 100;
  let totalPages = 1;
  while (page < totalPages && page < 50) {
    const res = await fetchOutdoorEquipmentsPage(page, size, orderDetailId);
    collected.push(...res.items.filter((x) => x.orderDetailId === orderDetailId));
    totalPages = res.totalPages;
    page += 1;
    if (res.items.length === 0) break;
  }
  const byId = new Map<number, OutdoorEquipmentSavedItem>();
  for (const x of collected) byId.set(x.id, x);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

/**
 * GET /analysis-result-outdoor-equipments/{id}
 */
export async function fetchOutdoorEquipmentById(id: number): Promise<OutdoorEquipmentSavedItem> {
  const raw = await apiFetch<unknown>(
    `/analysis-result-outdoor-equipments/${encodeURIComponent(String(id))}`,
    { method: "GET" }
  );
  const n = normalizeOutdoorEquipmentItem(unwrapPayload(raw));
  if (!n) throw new Error("Natija yozuvi noto‘g‘ri");
  return n;
}

/**
 * POST /analysis-result-outdoor-equipments
 */
export async function postOutdoorEquipments(
  body: OutdoorEquipmentResultRow[]
): Promise<OutdoorEquipmentApiResponse> {
  const raw = await apiFetch<unknown>("/analysis-result-outdoor-equipments", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as OutdoorEquipmentApiResponse;
  }
  return {};
}

/**
 * PUT /analysis-result-outdoor-equipments/{orderDetailId}
 */
export async function putOutdoorEquipmentsByOrderDetail(
  orderDetailId: number,
  body: OutdoorEquipmentResultRow[]
): Promise<OutdoorEquipmentApiResponse> {
  const raw = await apiFetch<unknown>(
    `/analysis-result-outdoor-equipments/${encodeURIComponent(String(orderDetailId))}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as OutdoorEquipmentApiResponse;
  }
  return {};
}

/**
 * GET /analysis-result-outdoor-equipments/by-order-detail/{orderDetailId}/pdf/download
 */
export async function fetchOutdoorEquipmentsPdfBlobByOrderDetail(orderDetailId: number): Promise<Blob> {
  return apiFetchBlob(
    `/analysis-result-outdoor-equipments/by-order-detail/${encodeURIComponent(String(orderDetailId))}/pdf/download`,
    { method: "GET" }
  );
}
