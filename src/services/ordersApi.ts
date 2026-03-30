import { apiFetch, unwrapList } from "./apiHttp";

export type OrderDetailBody = {
  analysisId: number;
  /** 0–100, foiz (so‘m emas) */
  discount: number;
  quantity: number;
};

export type SaveOrderBody = {
  orderType: number;
  laboratoryId: number;
  patientId: number | null;
  sampleId: number | null;
  paymentType: number;
  paymentStatus: number;
  details: OrderDetailBody[];
};

export type OrderDetailDto = OrderDetailBody & {
  id?: number;
  orderId?: number;
  orderCreatedAt?: string;
  patientId?: number | null;
  patientFirstName?: string | null;
  patientLastName?: string | null;
  sampleId?: number | null;
  sampleType?: number | null;
  sampleName?: string | null;
  sampleSourceName?: string | null;
  analysisNameUz?: string;
  analysisNameRu?: string;
  analysisPriceId?: number;
  laboratoryId?: number;
  laboratoryNameUz?: string;
  laboratoryNameRu?: string;
  analysisStatus?: number;
  resultTime?: string | null;
  price?: number;
  amount?: number;
};

export type OrderDto = {
  id: number;
  orderType: number;
  /** GET /orders javobida bo‘lishi mumkin */
  orderTypeName?: string;
  laboratoryId: number;
  patientId: number;
  sampleId: number;
  patientFirstName?: string | null;
  patientLastName?: string | null;
  sampleType?: number | null;
  sampleName?: string | null;
  sampleSourceName?: string | null;
  regionId?: number;
  regionNameUz?: string;
  districtId?: number;
  districtNameUz?: string;
  /** Backenddan keladigan umumiy narx */
  amount?: number;
  paymentType: number;
  paymentStatus: number;
  /** Backend qaytarsa */
  orderState?: number;
  /** Yaratilgan vaqt (ISO string yoki `normalizeOrder` tomonidan stringga aylantirilgan) */
  createdDate?: string;
  updatedAt?: string;
  details: OrderDetailDto[];
};

export type PagedOrders = {
  items: OrderDto[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
};

export type OrderIncomeStatistics = {
  dailyAmount: number;
  weeklyAmount: number;
  monthlyAmount: number;
  yearlyAmount: number;
  totalAmount: number;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
};

export type OrderIncomePoint = {
  name: string;
  income: number;
  id: string;
};

export type OrderIncomeStatisticsFilters = {
  /** Aniq sana (YYYY-MM-DD) */
  date?: string;
  /** Oraliq boshlanishi (YYYY-MM-DD) */
  fromDate?: string;
  /** Oraliq tugashi (YYYY-MM-DD) */
  toDate?: string;
};

/** GET /orders — ixtiyoriy filter query parametrlari */
export type OrdersListFilters = {
  orderType?: number;
  humanName?: string;
  objectName?: string;
  /** Aniq sana (masalan YYYY-MM-DD) */
  orderDate?: string;
  /** Oraliq boshlanishi */
  fromDate?: string;
  /** Oraliq tugashi */
  toDate?: string;
};

function appendOrderFilters(q: URLSearchParams, filters: OrdersListFilters | undefined): void {
  if (!filters) return;
  if (filters.orderType !== undefined && Number.isFinite(filters.orderType)) {
    q.set("orderType", String(filters.orderType));
  }
  if (filters.humanName?.trim()) q.set("humanName", filters.humanName.trim());
  if (filters.objectName?.trim()) q.set("objectName", filters.objectName.trim());
  if (filters.orderDate?.trim()) q.set("orderDate", filters.orderDate.trim());
  if (filters.fromDate?.trim()) q.set("fromDate", filters.fromDate.trim());
  if (filters.toDate?.trim()) q.set("toDate", filters.toDate.trim());
}

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeIncomeStatistics(raw: unknown): OrderIncomeStatistics {
  const data =
    raw && typeof raw === "object" && !Array.isArray(raw) && (raw as Record<string, unknown>).data
      ? ((raw as Record<string, unknown>).data as Record<string, unknown>)
      : (raw as Record<string, unknown> | null);
  const d = data ?? {};
  return {
    dailyAmount: toNum(d.dailyAmount ?? d.daily_amount) ?? 0,
    weeklyAmount: toNum(d.weeklyAmount ?? d.weekly_amount) ?? 0,
    monthlyAmount: toNum(d.monthlyAmount ?? d.monthly_amount) ?? 0,
    yearlyAmount: toNum(d.yearlyAmount ?? d.yearly_amount) ?? 0,
    totalAmount: toNum(d.totalAmount ?? d.total_amount) ?? 0,
    cashAmount: toNum(d.cashAmount ?? d.cash_amount) ?? 0,
    cardAmount: toNum(d.cardAmount ?? d.card_amount) ?? 0,
    transferAmount: toNum(d.transferAmount ?? d.transfer_amount) ?? 0,
  };
}

function appendIncomeStatisticsFilters(q: URLSearchParams, filters: OrderIncomeStatisticsFilters | undefined): void {
  if (!filters) return;
  if (filters.date?.trim()) q.set("date", filters.date.trim());
  if (filters.fromDate?.trim()) q.set("fromDate", filters.fromDate.trim());
  if (filters.toDate?.trim()) q.set("toDate", filters.toDate.trim());
}

function normalizeIncomePoint(raw: unknown, index: number): OrderIncomePoint | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const nameRaw =
    o.name ??
    o.label ??
    o.dayName ??
    o.day_name ??
    o.day ??
    o.monthName ??
    o.month_name ??
    o.month;
  const incomeRaw = o.income ?? o.amount ?? o.total ?? o.value;
  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  const income = toNum(incomeRaw);
  if (!name || income === undefined) return null;
  return { name, income, id: String(o.id ?? o.key ?? `${index}`) };
}

function normalizeIncomeSeries(raw: unknown): OrderIncomePoint[] {
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeIncomePoint).filter((x): x is OrderIncomePoint => x !== null);
}

function parseCreatedDate(o: Record<string, unknown>): string | undefined {
  const v = o.createdDate ?? o.created_date ?? o.createdAt ?? o.created_at ?? o.createdTime ?? o.created_time;
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v).toISOString();
  return undefined;
}

function parseUpdatedAt(o: Record<string, unknown>): string | undefined {
  const v = o.updatedAt ?? o.updated_at;
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v).toISOString();
  return undefined;
}

function toStrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
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

function normalizeDetail(raw: unknown): OrderDetailDto | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const analysisId = toNum(o.analysisId ?? o.analysis_id);
  if (analysisId === undefined) return null;
  return {
    analysisId,
    discount: toNum(o.discount) ?? 0,
    quantity: toNum(o.quantity) ?? 0,
    id: toNum(o.id ?? o.detailId ?? o.detail_id),
    orderId: toNum(o.orderId ?? o.order_id),
    orderCreatedAt: toStrNull(o.orderCreatedAt ?? o.order_created_at) ?? undefined,
    patientId: o.patientId === null || o.patient_id === null ? null : toNum(o.patientId ?? o.patient_id) ?? null,
    patientFirstName: toStrNull(o.patientFirstName ?? o.patient_first_name),
    patientLastName: toStrNull(o.patientLastName ?? o.patient_last_name),
    sampleId: o.sampleId === null || o.sample_id === null ? null : toNum(o.sampleId ?? o.sample_id) ?? null,
    sampleType: o.sampleType === null || o.sample_type === null ? null : toNum(o.sampleType ?? o.sample_type) ?? null,
    sampleName: toStrNull(o.sampleName ?? o.sample_name),
    sampleSourceName: toStrNull(o.sampleSourceName ?? o.sample_source_name),
    analysisNameUz: String(o.analysisNameUz ?? o.analysis_name_uz ?? "").trim() || undefined,
    analysisNameRu: String(o.analysisNameRu ?? o.analysis_name_ru ?? "").trim() || undefined,
    analysisPriceId: toNum(o.analysisPriceId ?? o.analysis_price_id),
    laboratoryId: toNum(o.laboratoryId ?? o.laboratory_id),
    laboratoryNameUz: String(o.laboratoryNameUz ?? o.laboratory_name_uz ?? "").trim() || undefined,
    laboratoryNameRu: String(o.laboratoryNameRu ?? o.laboratory_name_ru ?? "").trim() || undefined,
    analysisStatus: toNum(o.analysisStatus ?? o.analysis_status),
    resultTime: toStrNull(o.resultTime ?? o.result_time),
    price: toNum(o.price),
    amount: toNum(o.amount),
  };
}

function laboratoryIdFromOrder(o: Record<string, unknown>): number {
  const labNested =
    o.laboratory && typeof o.laboratory === "object"
      ? (o.laboratory as Record<string, unknown>)
      : undefined;
  return (
    toNum(
      o.laboratoryId ??
        o.laboratory_id ??
        o.labId ??
        o.lab_id ??
        (labNested ? labNested.id ?? labNested.laboratoryId ?? labNested.laboratory_id : undefined)
    ) ?? 0
  );
}

export function normalizeOrder(raw: unknown): OrderDto | null {
  const u = unwrapPayload(raw);
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const id = toNum(o.id);
  if (id === undefined) return null;
  const detailsRaw = o.details;
  const details = Array.isArray(detailsRaw)
    ? detailsRaw.map(normalizeDetail).filter((x): x is OrderDetailDto => x !== null)
    : [];
  const orderTypeName = String(o.orderTypeName ?? o.order_type_name ?? "").trim();
  const patientFirstName = toStrNull(o.patientFirstName ?? o.patient_first_name);
  const patientLastName = toStrNull(o.patientLastName ?? o.patient_last_name);
  const sampleType = o.sampleType === null || o.sample_type === null ? null : toNum(o.sampleType ?? o.sample_type) ?? null;
  const sampleName = toStrNull(o.sampleName ?? o.sample_name);
  const sampleSourceName = toStrNull(o.sampleSourceName ?? o.sample_source_name);
  const regionId = toNum(o.regionId ?? o.region_id);
  const regionNameUz = String(o.regionNameUz ?? o.region_name_uz ?? "").trim() || undefined;
  const districtId = toNum(o.districtId ?? o.district_id);
  const districtNameUz = String(o.districtNameUz ?? o.district_name_uz ?? "").trim() || undefined;

  let laboratoryId = laboratoryIdFromOrder(o);
  if (laboratoryId <= 0 && details.length > 0) {
    const fromDetail = details.find((d) => (d.laboratoryId ?? 0) > 0);
    if (fromDetail != null && fromDetail.laboratoryId != null && fromDetail.laboratoryId > 0) {
      laboratoryId = fromDetail.laboratoryId;
    }
  }

  return {
    id,
    orderType: toNum(o.orderType ?? o.order_type) ?? 0,
    ...(orderTypeName ? { orderTypeName } : {}),
    laboratoryId,
    patientId: toNum(o.patientId ?? o.patient_id) ?? 0,
    sampleId: toNum(o.sampleId ?? o.sample_id) ?? 0,
    patientFirstName,
    patientLastName,
    sampleType,
    sampleName,
    sampleSourceName,
    ...(regionId !== undefined ? { regionId } : {}),
    ...(regionNameUz ? { regionNameUz } : {}),
    ...(districtId !== undefined ? { districtId } : {}),
    ...(districtNameUz ? { districtNameUz } : {}),
    amount: toNum(o.amount ?? o.totalAmount ?? o.total_amount),
    paymentType: toNum(o.paymentType ?? o.payment_type) ?? 0,
    paymentStatus: toNum(o.paymentStatus ?? o.payment_status) ?? 0,
    orderState: toNum(o.orderState ?? o.order_state ?? o.state),
    createdDate: parseCreatedDate(o),
    updatedAt: parseUpdatedAt(o),
    details,
  };
}

function parsePageMeta(raw: unknown, fallbackItemCount: number): Omit<PagedOrders, "items"> {
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

export async function fetchOrders(page = 0, size = 10, filters?: OrdersListFilters): Promise<PagedOrders> {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  appendOrderFilters(q, filters);
  const raw = await apiFetch<unknown>(`/orders?${q.toString()}`, { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  const items = rows.map(normalizeOrder).filter((x): x is OrderDto => x !== null);
  const meta = parsePageMeta(raw, items.length);
  return { items, ...meta };
}

export async function fetchOrder(id: number): Promise<OrderDto> {
  const raw = await apiFetch<unknown>(`/orders/${id}`, { method: "GET" });
  const n = normalizeOrder(unwrapPayload(raw));
  if (n) return n;
  throw new Error("Buyurtma ma’lumoti noto‘g‘ri");
}

export async function createOrder(body: SaveOrderBody): Promise<OrderDto> {
  const res = await apiFetch<unknown>("/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res === undefined || res === null) {
    throw new Error("Buyurtma yaratildi, lekin javob bo‘sh");
  }
  const createdId = extractCreatedId(res);
  if (createdId !== undefined) {
    try {
      return await fetchOrder(createdId);
    } catch {
      return normalizeOrder(res) ?? { id: createdId, ...body, details: body.details.map((d) => ({ ...d })) };
    }
  }
  const direct = normalizeOrder(res);
  if (direct) return direct;
  throw new Error("Buyurtma yaratildi, lekin javobda id topilmadi");
}

export async function updateOrder(id: number, body: SaveOrderBody): Promise<OrderDto> {
  const res = await apiFetch<unknown>(`/orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const direct = normalizeOrder(unwrapPayload(res));
  if (direct) return direct;
  try {
    return await fetchOrder(id);
  } catch {
    return { id, ...body, details: body.details.map((d) => ({ ...d })) };
  }
}

export async function deleteOrder(id: number): Promise<void> {
  await apiFetch<void>(`/orders/${id}`, { method: "DELETE" });
}

/** GET /orders/income-statistics */
export async function fetchOrderIncomeStatistics(filters?: OrderIncomeStatisticsFilters): Promise<OrderIncomeStatistics> {
  const q = new URLSearchParams();
  appendIncomeStatisticsFilters(q, filters);
  const path = q.size > 0 ? `/orders/income-statistics?${q.toString()}` : "/orders/income-statistics";
  const raw = await apiFetch<unknown>(path, { method: "GET" });
  return normalizeIncomeStatistics(raw);
}

/** GET /orders/weekly-income */
export async function fetchOrderWeeklyIncome(filters?: OrderIncomeStatisticsFilters): Promise<OrderIncomePoint[]> {
  const q = new URLSearchParams();
  appendIncomeStatisticsFilters(q, filters);
  const path = q.size > 0 ? `/orders/weekly-income?${q.toString()}` : "/orders/weekly-income";
  const raw = await apiFetch<unknown>(path, { method: "GET" });
  return normalizeIncomeSeries(raw);
}

/** GET /orders/monthly-income */
export async function fetchOrderMonthlyIncome(filters?: OrderIncomeStatisticsFilters): Promise<OrderIncomePoint[]> {
  const q = new URLSearchParams();
  appendIncomeStatisticsFilters(q, filters);
  const path = q.size > 0 ? `/orders/monthly-income?${q.toString()}` : "/orders/monthly-income";
  const raw = await apiFetch<unknown>(path, { method: "GET" });
  return normalizeIncomeSeries(raw);
}
