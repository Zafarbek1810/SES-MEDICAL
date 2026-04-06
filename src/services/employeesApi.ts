import { apiFetch, unwrapList } from "./apiHttp";

export type EmployeeDto = {
  id: number;
  firstName: string;
  lastName: string;
  surname: string;
  /** Backend `spSesDepartmentId` / `spSesDepartmentId` */
  spSesDepartmentId: number;
  regionId: number;
  districtId: number;
  spSesDepartmentName?: string;
  regionNameUz?: string;
  districtNameUz?: string;
};

export type CreateOrUpdateEmployeeBody = {
  firstName: string;
  lastName: string;
  surname: string;
  spSesDepartmentId: number;
  regionId: number;
  districtId: number;
};

export type PagedEmployees = {
  items: EmployeeDto[];
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

function normalizeEmployee(raw: unknown): EmployeeDto | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  if (id === undefined) return null;
  const spSesDepartmentId =
    toNum(o.spSesDepartmentId ?? o.spSesDepartmentId ?? o.departmentId ?? o.spDepartmentId) ?? 0;
  const regionId = toNum(o.regionId ?? o.region_id) ?? 0;
  const districtId = toNum(o.districtId ?? o.district_id) ?? 0;
  return {
    id,
    firstName: toStr(o.firstName ?? o.first_name),
    lastName: toStr(o.lastName ?? o.last_name),
    surname: toStr(o.surname ?? o.middle_name),
    spSesDepartmentId,
    regionId,
    districtId,
    spSesDepartmentName: toStr(o.spSesDepartmentName ?? o.sp_ses_department_name) || undefined,
    regionNameUz: toStr(o.regionNameUz ?? o.region_name_uz) || undefined,
    districtNameUz: toStr(o.districtNameUz ?? o.district_name_uz) || undefined,
  };
}

/** Javob: `{ "data": { "content": [...], "totalElements": ... }, "success": true }` */
function unwrapEmployeesPagePayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  const data = o.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data;
  }
  return raw;
}

function parsePageMeta(raw: unknown, fallbackItemCount: number): Omit<PagedEmployees, "items"> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      page: 0,
      size: fallbackItemCount || 10,
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

export type FetchEmployeesFilters = {
  spDepartmentId?: number;
  regionId?: number;
  districtId?: number;
};

export async function fetchEmployees(
  page = 0,
  size = 50,
  filters?: FetchEmployeesFilters,
): Promise<PagedEmployees> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  const dep = filters?.spDepartmentId;
  if (dep != null && Number.isFinite(dep) && dep > 0) {
    params.set("spDepartmentId", String(dep));
  }
  const reg = filters?.regionId;
  if (reg != null && Number.isFinite(reg) && reg > 0) {
    params.set("regionId", String(reg));
  }
  const dist = filters?.districtId;
  if (dist != null && Number.isFinite(dist) && dist > 0) {
    params.set("districtId", String(dist));
  }
  const raw = await apiFetch<unknown>(`/employees/admin?${params.toString()}`, { method: "GET" });
  const pagePayload = unwrapEmployeesPagePayload(raw);
  const rows = unwrapList<unknown>(pagePayload);
  const items = rows.map(normalizeEmployee).filter((x): x is EmployeeDto => x !== null);
  const meta = parsePageMeta(pagePayload, items.length);
  return { items, ...meta };
}

export async function fetchEmployee(id: number): Promise<EmployeeDto> {
  const raw = await apiFetch<unknown>(`/employees/${id}`, { method: "GET" });
  const items = unwrapList<unknown>(raw);
  if (items.length === 1) {
    const n = normalizeEmployee(items[0]);
    if (n) return n;
  }
  const n = normalizeEmployee(raw);
  if (n) return n;
  throw new Error("Xodim ma’lumoti noto‘g‘ri");
}

export async function createEmployee(body: CreateOrUpdateEmployeeBody): Promise<void> {
  await apiFetch<void>("/employees", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createEmployeesBulk(list: CreateOrUpdateEmployeeBody[]): Promise<void> {
  await apiFetch<void>("/employees/bulk", {
    method: "POST",
    body: JSON.stringify(list),
  });
}

export async function updateEmployee(id: number, body: CreateOrUpdateEmployeeBody): Promise<void> {
  await apiFetch<void>(`/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteEmployee(id: number): Promise<void> {
  await apiFetch<void>(`/employees/${id}`, {
    method: "DELETE",
  });
}

