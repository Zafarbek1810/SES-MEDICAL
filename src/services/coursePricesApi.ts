import { apiFetch } from "./apiHttp";

export type SaveCoursePriceBody = {
  courseId: number;
  price: number;
  regionId: number;
  districtId: number;
};

export type CoursePriceDto = SaveCoursePriceBody & {
  id: number;
  courseName?: string | null;
  regionNameUz?: string | null;
  districtNameUz?: string | null;
};

export type CoursePriceListFilters = {
  regionId?: number;
  districtId?: number;
};

export type PagedCoursePrices = {
  items: CoursePriceDto[];
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

function toPrice(v: unknown): number | undefined {
  const n = toNum(v);
  if (n === undefined) return undefined;
  return n;
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

export function normalizeCoursePrice(raw: unknown): CoursePriceDto | null {
  const u = unwrapPayload(raw);
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const id = toNum(o.id);
  const courseId = toNum(o.courseId ?? o.course_id);
  const regionId = toNum(o.regionId ?? o.region_id);
  const districtId = toNum(o.districtId ?? o.district_id);
  const price = toPrice(o.price);
  if (id === undefined || courseId === undefined || regionId === undefined || districtId === undefined || price === undefined) {
    return null;
  }
  const courseName = typeof o.courseName === "string" ? o.courseName.trim() : undefined;
  const regionNameUz = typeof o.regionNameUz === "string" ? o.regionNameUz.trim() : undefined;
  const districtNameUz = typeof o.districtNameUz === "string" ? o.districtNameUz.trim() : undefined;
  return {
    id,
    courseId,
    price,
    regionId,
    districtId,
    ...(courseName ? { courseName } : {}),
    ...(regionNameUz ? { regionNameUz } : {}),
    ...(districtNameUz ? { districtNameUz } : {}),
  };
}

function parsePageMeta(raw: unknown, fallbackItemCount: number): Omit<PagedCoursePrices, "items"> {
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

function appendFilters(q: URLSearchParams, filters: CoursePriceListFilters | undefined): void {
  if (!filters) return;
  if (filters.regionId !== undefined && Number.isFinite(filters.regionId) && filters.regionId > 0) {
    q.set("regionId", String(filters.regionId));
  }
  if (filters.districtId !== undefined && Number.isFinite(filters.districtId) && filters.districtId > 0) {
    q.set("districtId", String(filters.districtId));
  }
}

export async function fetchCoursePrices(
  page = 0,
  size = 10,
  filters?: CoursePriceListFilters
): Promise<PagedCoursePrices> {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  appendFilters(q, filters);
  const raw = await apiFetch<unknown>(`/course-prices?${q.toString()}`, { method: "GET" });
  // Javob ko‘pincha { data: { content: [...] , ...meta }, ... } ko‘rinishida bo‘ladi.
  const unwrapped = unwrapPayload(raw);
  // Bu endpoint Spring `Page` bo‘lishi ham mumkin; shu sababli `content` dan olamiz.
  if (unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped)) {
    const o = unwrapped as Record<string, unknown>;
    const content = o.content;
    const rows = Array.isArray(content) ? content : [];
    const items = rows.map(normalizeCoursePrice).filter((x): x is CoursePriceDto => x !== null);
    const meta = parsePageMeta(unwrapped, items.length);
    return { items, ...meta };
  }
  // Aks holda oddiy massiv bo‘lsa:
  const rows = Array.isArray(unwrapped) ? (unwrapped as unknown[]) : [];
  const items = rows.map(normalizeCoursePrice).filter((x): x is CoursePriceDto => x !== null);
  const meta = parsePageMeta({}, items.length);
  return { items, ...meta };
}

export async function fetchCoursePrice(id: number): Promise<CoursePriceDto> {
  const raw = await apiFetch<unknown>(`/course-prices/${id}`, { method: "GET" });
  const n = normalizeCoursePrice(unwrapPayload(raw));
  if (!n) throw new Error("Kurs narxi noto‘g‘ri formatda");
  return n;
}

export async function createCoursePrice(body: SaveCoursePriceBody): Promise<CoursePriceDto> {
  const res = await apiFetch<unknown>("/course-prices", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res === undefined || res === null) {
    throw new Error("Kurs narxi yaratildi, lekin javob bo‘sh");
  }
  const createdId = extractCreatedId(res);
  if (createdId !== undefined) {
    return fetchCoursePrice(createdId);
  }
  const direct = normalizeCoursePrice(unwrapPayload(res));
  if (direct) return direct;
  throw new Error("Kurs narxi yaratildi, lekin javobda id topilmadi");
}

export async function updateCoursePrice(id: number, body: SaveCoursePriceBody): Promise<CoursePriceDto> {
  const res = await apiFetch<unknown>(`/course-prices/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const direct = normalizeCoursePrice(unwrapPayload(res));
  if (direct) return direct;
  return fetchCoursePrice(id);
}

export async function deleteCoursePrice(id: number): Promise<void> {
  await apiFetch<void>(`/course-prices/${id}`, { method: "DELETE" });
}

