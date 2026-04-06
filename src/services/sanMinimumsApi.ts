import { apiFetch, apiFetchBlob, unwrapList } from "./apiHttp";

/** POST/PUT /san-minimums */
export type SaveSanMinimumBody = {
  firstName: string;
  lastName: string;
  surname: string;
  phoneNumber: string;
  regionId: number;
  districtId: number;
  workplaceId: number;
  positionId: number;
  employeeId: number;
  firstDate: string;
  secondDate: string;
  thirdDate: string;
  paymentType: number;
};

export type SanMinimumDto = SaveSanMinimumBody & {
  id: number;
  /** Kursni tugatganlik holati (GET javobida bo‘lishi mumkin) */
  courseState?: number;
  /** GET /san-minimums javobidagi qo‘shimcha maydonlar */
  referenceNumber?: number;
  regionNameUz?: string;
  regionNameLat?: string;
  districtNameUz?: string;
  districtNameLat?: string;
  workplaceName?: string;
  positionName?: string;
  positionIndustryId?: number;
  positionIndustryName?: string;
  employeeFirstName?: string;
  employeeLastName?: string;
  courseStateName?: string;
  paymentTypeName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PagedSanMinimums = {
  items: SanMinimumDto[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
};

export type SanMinimumListFilters = {
  courseState?: number;
  paymentType?: number;
  workplaceId?: number;
  /** YYYY-MM-DD */
  date?: string;
  /** 1–12 */
  month?: number;
  /** Masalan 2026 */
  year?: number;
};

/** GET /san-minimums/registration-statistics — `data` ichidagi maydonlar */
export type SanMinimumRegistrationStatistics = {
  weeklyCount: number;
  monthlyCount: number;
  yearlyCount: number;
  totalCount: number;
};

/** GET /san-minimums/statistics — `data` ichidagi maydonlar (ixtiyoriy `year`, `month` query) */
export type SanMinimumPeriodStatistics = {
  oneDayCount: number;
  twoDayCount: number;
  threeDayCount: number;
  completedCount: number;
};

export type SanMinimumStatisticsParams = {
  year?: number;
  month?: number;
};

export type SanMinimumMonthlyRegistrationPoint = {
  month: number;
  count: number;
};

/** GET /san-minimums/monthly-registrations?year= */
export type SanMinimumMonthlyRegistrations = {
  year: number;
  totalCount: number;
  monthlyRegistrations: SanMinimumMonthlyRegistrationPoint[];
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

function dateStr(v: unknown): string {
  if (v == null) return "";
  const s = toStr(v);
  if (!s) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : s.slice(0, 10);
}

function optStr(o: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s !== "") return s;
  }
  return undefined;
}

export function normalizeSanMinimum(raw: unknown): SanMinimumDto | null {
  const u = unwrapPayload(raw);
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const id = toNum(o.id);
  if (id === undefined) return null;
  const courseState = toNum(o.courseState ?? o.course_state);
  const regionId = toNum(o.regionId ?? o.region_id) ?? 0;
  const districtId = toNum(o.districtId ?? o.district_id) ?? 0;
  const positionId =
    toNum(o.positionId ?? o.position_id ?? o.spPositionId ?? o.sp_position_id) ?? 0;
  const employeeId = toNum(o.employeeId ?? o.employee_id ?? o.spEmployeeId) ?? 0;
  const refNum = toNum(o.referenceNumber ?? o.reference_number);
  const posIndId = toNum(o.positionIndustryId ?? o.position_industry_id);
  const base: SanMinimumDto = {
    id,
    firstName: toStr(o.firstName ?? o.first_name),
    lastName: toStr(o.lastName ?? o.last_name),
    surname: toStr(o.surname ?? o.middle_name),
    phoneNumber: toStr(o.phoneNumber ?? o.phone_number ?? o.phone),
    regionId,
    districtId,
    workplaceId: toNum(o.workplaceId ?? o.workplace_id) ?? 0,
    positionId,
    employeeId,
    firstDate: dateStr(o.firstDate ?? o.first_date),
    secondDate: dateStr(o.secondDate ?? o.second_date),
    thirdDate: dateStr(o.thirdDate ?? o.third_date),
    paymentType: toNum(o.paymentType ?? o.payment_type) ?? 0,
    ...(courseState !== undefined ? { courseState } : {}),
    ...(refNum !== undefined ? { referenceNumber: refNum } : {}),
    ...(posIndId !== undefined ? { positionIndustryId: posIndId } : {}),
  };
  const wn = optStr(o, "workplaceName", "workplace_name");
  const pn = optStr(o, "positionName", "position_name");
  const pin = optStr(o, "positionIndustryName", "position_industry_name");
  const ru = optStr(o, "regionNameUz", "region_name_uz");
  const rl = optStr(o, "regionNameLat", "region_name_lat");
  const du = optStr(o, "districtNameUz", "district_name_uz");
  const dl = optStr(o, "districtNameLat", "district_name_lat");
  const efn = optStr(o, "employeeFirstName", "employee_first_name");
  const eln = optStr(o, "employeeLastName", "employee_last_name");
  const csn = optStr(o, "courseStateName", "course_state_name");
  const ptn = optStr(o, "paymentTypeName", "payment_type_name");
  const ca = optStr(o, "createdAt", "created_at");
  const ua = optStr(o, "updatedAt", "updated_at");
  return {
    ...base,
    ...(wn ? { workplaceName: wn } : {}),
    ...(pn ? { positionName: pn } : {}),
    ...(pin ? { positionIndustryName: pin } : {}),
    ...(ru ? { regionNameUz: ru } : {}),
    ...(rl ? { regionNameLat: rl } : {}),
    ...(du ? { districtNameUz: du } : {}),
    ...(dl ? { districtNameLat: dl } : {}),
    ...(efn ? { employeeFirstName: efn } : {}),
    ...(eln ? { employeeLastName: eln } : {}),
    ...(csn ? { courseStateName: csn } : {}),
    ...(ptn ? { paymentTypeName: ptn } : {}),
    ...(ca ? { createdAt: ca } : {}),
    ...(ua ? { updatedAt: ua } : {}),
  };
}

function parsePageMeta(raw: unknown, fallbackItemCount: number): Omit<PagedSanMinimums, "items"> {
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
  const size = toNum(o.size ?? o.pageSize ?? o.page_size) ?? 10;
  const totalPages =
    toNum(o.totalPages ?? o.total_pages) ?? Math.max(1, Math.ceil(totalElements / Math.max(size, 1)));
  const page = toNum(o.number ?? o.page ?? o.pageNumber ?? o.page_number) ?? 0;
  return { page, size, totalPages, totalElements };
}

/**
 * Spring Data Page: `{ success, recordsTotal, data: { content, totalElements, totalPages, number, size, pageable } }`
 * yoki to‘g‘ridan-to‘g‘ri `content` bilan page obyekti.
 */
function extractSpringPageRowsAndMeta(raw: unknown): {
  rows: unknown[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
} | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const root = raw as Record<string, unknown>;
  let block: Record<string, unknown> = root;
  if (root.data != null && typeof root.data === "object" && !Array.isArray(root.data)) {
    block = root.data as Record<string, unknown>;
  }
  const content = block.content;
  if (!Array.isArray(content)) return null;
  const pageable =
    block.pageable != null && typeof block.pageable === "object" && !Array.isArray(block.pageable)
      ? (block.pageable as Record<string, unknown>)
      : undefined;
  const totalElements =
    toNum(block.totalElements ?? block.total_elements ?? root.recordsTotal) ?? content.length;
  const size =
    toNum(block.size ?? pageable?.pageSize ?? pageable?.page_size ?? root.size) ?? 10;
  const totalPages =
    toNum(block.totalPages ?? block.total_pages) ??
    Math.max(1, Math.ceil(totalElements / Math.max(size, 1)));
  const page =
    toNum(block.number ?? pageable?.pageNumber ?? pageable?.page_number ?? root.page) ?? 0;
  return { rows: content, page, size, totalPages, totalElements };
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

function appendListFilters(q: URLSearchParams, filters: SanMinimumListFilters | undefined): void {
  if (!filters) return;
  if (filters.courseState !== undefined && Number.isFinite(filters.courseState)) {
    q.set("courseState", String(filters.courseState));
  }
  if (filters.paymentType !== undefined && Number.isFinite(filters.paymentType)) {
    q.set("paymentType", String(filters.paymentType));
  }
  if (filters.workplaceId !== undefined && Number.isFinite(filters.workplaceId) && filters.workplaceId > 0) {
    q.set("workplaceId", String(filters.workplaceId));
  }
  if (filters.date?.trim()) q.set("date", filters.date.trim());
  if (filters.month !== undefined && Number.isFinite(filters.month)) {
    const m = Math.trunc(filters.month);
    if (m >= 1 && m <= 12) q.set("month", String(m));
  }
  if (filters.year !== undefined && Number.isFinite(filters.year)) {
    const y = Math.trunc(filters.year);
    if (y >= 1900 && y <= 2100) q.set("year", String(y));
  }
}

export async function fetchSanMinimums(
  page = 0,
  size = 10,
  filters?: SanMinimumListFilters
): Promise<PagedSanMinimums> {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  appendListFilters(q, filters);
  const raw = await apiFetch<unknown>(`/san-minimums?${q.toString()}`, { method: "GET" });
  const extracted = extractSpringPageRowsAndMeta(raw);
  const rows = extracted ? extracted.rows : unwrapList<unknown>(raw);
  const items = rows.map(normalizeSanMinimum).filter((x): x is SanMinimumDto => x !== null);
  const meta = extracted
    ? {
        page: extracted.page,
        size: extracted.size,
        totalPages: extracted.totalPages,
        totalElements: extracted.totalElements,
      }
    : parsePageMeta(raw, items.length);
  return { items, ...meta };
}

export async function fetchSanMinimum(id: number): Promise<SanMinimumDto> {
  const raw = await apiFetch<unknown>(`/san-minimums/${id}`, { method: "GET" });
  const n = normalizeSanMinimum(unwrapPayload(raw));
  if (n) return n;
  throw new Error("San minimum ma’lumoti noto‘g‘ri");
}

export async function createSanMinimum(body: SaveSanMinimumBody): Promise<SanMinimumDto> {
  const res = await apiFetch<unknown>("/san-minimums", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res === undefined || res === null) {
    throw new Error("Yaratildi, lekin javob bo‘sh");
  }
  const createdId = extractCreatedId(res);
  if (createdId !== undefined) {
    try {
      return await fetchSanMinimum(createdId);
    } catch {
      return normalizeSanMinimum(res) ?? { id: createdId, ...body };
    }
  }
  const direct = normalizeSanMinimum(res);
  if (direct) return direct;
  throw new Error("Javobda id topilmadi");
}

export async function updateSanMinimum(id: number, body: SaveSanMinimumBody): Promise<SanMinimumDto> {
  const res = await apiFetch<unknown>(`/san-minimums/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const direct = normalizeSanMinimum(unwrapPayload(res));
  if (direct) return direct;
  try {
    return await fetchSanMinimum(id);
  } catch {
    return { id, ...body };
  }
}

export async function deleteSanMinimum(id: number): Promise<void> {
  await apiFetch<void>(`/san-minimums/${id}`, { method: "DELETE" });
}

/** GET /san-minimums/registration-statistics */
export async function fetchSanMinimumRegistrationStatistics(): Promise<SanMinimumRegistrationStatistics> {
  const raw = await apiFetch<unknown>("/san-minimums/registration-statistics", { method: "GET" });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { weeklyCount: 0, monthlyCount: 0, yearlyCount: 0, totalCount: 0 };
  }
  const root = raw as Record<string, unknown>;
  const inner = root.data;
  const block =
    inner != null && typeof inner === "object" && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : root;
  return {
    weeklyCount: toNum(block.weeklyCount ?? block.weekly_count) ?? 0,
    monthlyCount: toNum(block.monthlyCount ?? block.monthly_count) ?? 0,
    yearlyCount: toNum(block.yearlyCount ?? block.yearly_count) ?? 0,
    totalCount: toNum(block.totalCount ?? block.total_count) ?? 0,
  };
}

/** GET /san-minimums/monthly-registrations?year= */
export async function fetchSanMinimumMonthlyRegistrations(year: number): Promise<SanMinimumMonthlyRegistrations> {
  const y = Math.trunc(year);
  if (!Number.isFinite(y) || y < 1900 || y > 2100) {
    const cy = new Date().getFullYear();
    return { year: cy, totalCount: 0, monthlyRegistrations: [] };
  }
  const raw = await apiFetch<unknown>(`/san-minimums/monthly-registrations?year=${y}`, {
    method: "GET",
  });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { year: y, totalCount: 0, monthlyRegistrations: [] };
  }
  const root = raw as Record<string, unknown>;
  const inner = root.data;
  const block =
    inner != null && typeof inner === "object" && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : root;
  const rawList = block.monthlyRegistrations ?? block.monthly_registrations;
  const byMonth = new Map<number, number>();
  if (Array.isArray(rawList)) {
    for (const row of rawList) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const o = row as Record<string, unknown>;
      const m = toNum(o.month);
      const c = toNum(o.count) ?? 0;
      if (m !== undefined && m >= 1 && m <= 12) byMonth.set(m, c);
    }
  }
  const monthlyRegistrations: SanMinimumMonthlyRegistrationPoint[] = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return { month, count: byMonth.get(month) ?? 0 };
  });
  return {
    year: toNum(block.year) ?? y,
    totalCount: toNum(block.totalCount ?? block.total_count) ?? 0,
    monthlyRegistrations,
  };
}

/** GET /san-minimums/statistics?year=&month= */
export async function fetchSanMinimumStatistics(
  params?: SanMinimumStatisticsParams,
): Promise<SanMinimumPeriodStatistics> {
  const q = new URLSearchParams();
  if (params?.year !== undefined && Number.isFinite(params.year)) {
    const y = Math.trunc(params.year);
    if (y >= 1900 && y <= 2100) q.set("year", String(y));
  }
  if (params?.month !== undefined && Number.isFinite(params.month)) {
    const m = Math.trunc(params.month);
    if (m >= 1 && m <= 12) q.set("month", String(m));
  }
  const qs = q.toString();
  const raw = await apiFetch<unknown>(`/san-minimums/statistics${qs ? `?${qs}` : ""}`, {
    method: "GET",
  });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { oneDayCount: 0, twoDayCount: 0, threeDayCount: 0, completedCount: 0 };
  }
  const root = raw as Record<string, unknown>;
  const inner = root.data;
  const block =
    inner != null && typeof inner === "object" && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : root;
  return {
    oneDayCount: toNum(block.oneDayCount ?? block.one_day_count) ?? 0,
    twoDayCount: toNum(block.twoDayCount ?? block.two_day_count) ?? 0,
    threeDayCount: toNum(block.threeDayCount ?? block.three_day_count) ?? 0,
    completedCount: toNum(block.completedCount ?? block.completed_count) ?? 0,
  };
}

/** GET /san-minimums/{id}/certificate/download — hujjat (odatda PDF). */
export async function fetchSanMinimumCertificateBlob(id: number): Promise<Blob> {
  return apiFetchBlob(`/san-minimums/${id}/certificate/pdf/download`, { method: "GET" });
}
