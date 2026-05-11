import { apiFetch } from "./apiHttp";

export type CompanyBody = {
  name: string;
  address: string;
  mailIndex: string;
  email: string;
  phoneNumber: string;
  telegram: string;
  regionId: number;
  districtId: number;
};

export type CompanyDto = CompanyBody & {
  id: number;
  regionNameUz?: string | null;
  regionNameLat?: string | null;
  districtNameUz?: string | null;
  districtNameLat?: string | null;
};

export type PagedCompanies = {
  items: CompanyDto[];
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

export function normalizeCompany(raw: unknown): CompanyDto | null {
  const u = unwrapPayload(raw);
  if (!u || typeof u !== "object" || Array.isArray(u)) return null;
  const o = u as Record<string, unknown>;
  const id = toNum(o.id);
  const regionId = toNum(o.regionId ?? o.region_id);
  const districtId = toNum(o.districtId ?? o.district_id);
  const name = toStr(o.name);
  if (id === undefined || regionId === undefined || districtId === undefined || !name) return null;
  return {
    id,
    name,
    address: toStr(o.address),
    mailIndex: toStr(o.mailIndex ?? o.mail_index),
    email: toStr(o.email),
    phoneNumber: toStr(o.phoneNumber ?? o.phone_number),
    telegram: toStr(o.telegram),
    regionId,
    districtId,
    regionNameUz: toStr(o.regionNameUz ?? o.region_name_uz) || undefined,
    regionNameLat: toStr(o.regionNameLat ?? o.region_name_lat) || undefined,
    districtNameUz: toStr(o.districtNameUz ?? o.district_name_uz) || undefined,
    districtNameLat: toStr(o.districtNameLat ?? o.district_name_lat) || undefined,
  };
}

function extractSpringPage(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) return inner as Record<string, unknown>;
  return o;
}

function parsePageMeta(raw: unknown, fallbackItemCount: number): Omit<PagedCompanies, "items"> {
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

export async function fetchCompanies(page = 0, size = 20): Promise<PagedCompanies> {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  const raw = await apiFetch<unknown>(`/sp-companies?${q.toString()}`, { method: "GET" });
  const pageObj = extractSpringPage(raw);
  const content = pageObj?.content;
  const rows = Array.isArray(content) ? content : [];
  const items = rows.map(normalizeCompany).filter((x): x is CompanyDto => x !== null);
  const meta = parsePageMeta(pageObj, items.length);
  return { items, ...meta };
}

export async function fetchCompany(id: number): Promise<CompanyDto> {
  const raw = await apiFetch<unknown>(`/sp-companies/${id}`, { method: "GET" });
  const n = normalizeCompany(raw);
  if (!n) throw new Error("Korxona ma’lumoti noto‘g‘ri");
  return n;
}

export async function fetchCompanyByUserLocation(): Promise<CompanyDto | null> {
  const raw = await apiFetch<unknown>("/sp-companies/by-user-location", { method: "GET" });
  return normalizeCompany(raw);
}

export async function createCompany(body: CompanyBody): Promise<CompanyDto> {
  const raw = await apiFetch<unknown>("/sp-companies", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const n = normalizeCompany(raw);
  if (n) return n;
  const created = normalizeCompany({ data: { id: 0, ...body } });
  if (created) return created;
  throw new Error("Korxona yaratildi, lekin javob noto‘g‘ri");
}

export async function updateCompany(id: number, body: CompanyBody): Promise<CompanyDto> {
  const raw = await apiFetch<unknown>(`/sp-companies/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const n = normalizeCompany(raw);
  if (n) return n;
  const fallback = normalizeCompany({ data: { id, ...body } });
  if (fallback) return fallback;
  throw new Error("Korxona yangilandi, lekin javob noto‘g‘ri");
}

export async function deleteCompany(id: number): Promise<void> {
  await apiFetch<void>(`/sp-companies/${id}`, { method: "DELETE" });
}
