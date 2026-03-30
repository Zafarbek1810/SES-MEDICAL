import { apiFetch } from "./apiHttp";

export type OrderDetailListItem = {
  id: number;
  orderId: number;
  orderCreatedAt: string;
  patientId: number | null;
  patientFirstName: string | null;
  patientLastName: string | null;
  sampleId: number | null;
  sampleType: number | null;
  sampleName: string | null;
  sampleSourceName: string | null;
  analysisId: number;
  analysisNameUz: string;
  analysisNameRu: string;
  analysisPriceId: number;
  laboratoryId: number;
  laboratoryNameUz: string;
  laboratoryNameRu: string;
  analysisStatus: number;
  resultTime: string | null;
  price: number;
  discount: number;
  quantity: number;
  amount: number;
};

export type OrderDetailListFilters = {
  laboratoryId?: number;
  analysisStatus?: number;
  analysisId?: number;
  patientName?: string;
  sampleName?: string;
};

export type PagedOrderDetails = {
  items: OrderDetailListItem[];
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

function toStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function normalizeOrderDetailListItem(raw: unknown): OrderDetailListItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  if (id === undefined) return null;
  return {
    id,
    orderId: toNum(o.orderId ?? o.order_id) ?? 0,
    orderCreatedAt: String(o.orderCreatedAt ?? o.order_created_at ?? ""),
    patientId: o.patientId === null || o.patient_id === null ? null : toNum(o.patientId ?? o.patient_id) ?? null,
    patientFirstName: toStr(o.patientFirstName ?? o.patient_first_name),
    patientLastName: toStr(o.patientLastName ?? o.patient_last_name),
    sampleId: o.sampleId === null || o.sample_id === null ? null : toNum(o.sampleId ?? o.sample_id) ?? null,
    sampleType: o.sampleType === null || o.sample_type === null ? null : toNum(o.sampleType ?? o.sample_type) ?? null,
    sampleName: toStr(o.sampleName ?? o.sample_name),
    sampleSourceName: toStr(o.sampleSourceName ?? o.sample_source_name),
    analysisId: toNum(o.analysisId ?? o.analysis_id) ?? 0,
    analysisNameUz: String(o.analysisNameUz ?? o.analysis_name_uz ?? "—").trim() || "—",
    analysisNameRu: String(o.analysisNameRu ?? o.analysis_name_ru ?? "").trim() || "—",
    analysisPriceId: toNum(o.analysisPriceId ?? o.analysis_price_id) ?? 0,
    laboratoryId: toNum(o.laboratoryId ?? o.laboratory_id) ?? 0,
    laboratoryNameUz: String(o.laboratoryNameUz ?? o.laboratory_name_uz ?? "—").trim() || "—",
    laboratoryNameRu: String(o.laboratoryNameRu ?? o.laboratory_name_ru ?? "").trim() || "—",
    analysisStatus: toNum(o.analysisStatus ?? o.analysis_status) ?? 0,
    resultTime: toStr(o.resultTime ?? o.result_time),
    price: toNum(o.price) ?? 0,
    discount: toNum(o.discount) ?? 0,
    quantity: toNum(o.quantity) ?? 0,
    amount: toNum(o.amount) ?? 0,
  };
}

function extractSpringPage(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) return inner as Record<string, unknown>;
  return o;
}

function appendFilters(q: URLSearchParams, filters: OrderDetailListFilters | undefined): void {
  if (!filters) return;
  if (filters.laboratoryId != null && Number.isFinite(filters.laboratoryId)) {
    q.set("laboratoryId", String(filters.laboratoryId));
  }
  if (filters.analysisStatus != null && Number.isFinite(filters.analysisStatus)) {
    q.set("analysisStatus", String(filters.analysisStatus));
  }
  if (filters.analysisId != null && Number.isFinite(filters.analysisId)) {
    q.set("analysisId", String(filters.analysisId));
  }
  if (filters.patientName?.trim()) q.set("patientName", filters.patientName.trim());
  if (filters.sampleName?.trim()) q.set("sampleName", filters.sampleName.trim());
}

export async function fetchOrderDetailsList(
  page = 0,
  size = 20,
  filters?: OrderDetailListFilters
): Promise<PagedOrderDetails> {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  appendFilters(q, filters);
  const raw = await apiFetch<unknown>(`/order-details/list?${q.toString()}`, { method: "GET" });
  const pageObj = extractSpringPage(raw);
  const contentRaw = pageObj?.content;
  const rows = Array.isArray(contentRaw) ? contentRaw : [];
  const items = rows.map(normalizeOrderDetailListItem).filter((x): x is OrderDetailListItem => x !== null);
  const totalElements = toNum(pageObj?.totalElements ?? pageObj?.total_elements) ?? items.length;
  const sizeVal = toNum(pageObj?.size) ?? size;
  const totalPages = toNum(pageObj?.totalPages ?? pageObj?.total_pages) ?? Math.max(1, Math.ceil(totalElements / Math.max(sizeVal, 1)));
  const number = toNum(pageObj?.number ?? pageObj?.page) ?? page;
  return {
    items,
    page: number,
    size: sizeVal,
    totalPages: Math.max(1, totalPages),
    totalElements,
  };
}
