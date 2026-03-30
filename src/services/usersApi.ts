import { apiFetch, unwrapList } from "./apiHttp";

export type UserDto = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  surname: string;
  phoneNumber: string;
  roleId: number;
  regionId?: number;
  districtId?: number;
  /** Backend qaytarsa (masalan `enabled`, `active`) */
  active?: boolean;
};

export type PagedUsers = {
  items: UserDto[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
};

export type CreateUserBody = {
  username: string;
  firstName: string;
  lastName: string;
  surname: string;
  password: string;
  phoneNumber: string;
  roleId: number;
  regionId: number;
  districtId: number;
};

export type UpdateUserBody = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  surname: string;
  phoneNumber: string;
  roleId: number;
  /** Bo‘sh bo‘lsa yuborilmaydi (parolni o‘zgartirmaslik) */
  password?: string;
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

function toActive(o: Record<string, unknown>): boolean | undefined {
  if (typeof o.isActive === "boolean") return o.isActive;
  if (typeof o.is_active === "boolean") return o.is_active;
  if (typeof o.enabled === "boolean") return o.enabled;
  if (typeof o.active === "boolean") return o.active;
  if (typeof o.status === "string") {
    const s = o.status.toLowerCase();
    if (s === "active" || s === "faol") return true;
    if (s === "inactive" || s === "nofaol") return false;
  }
  return undefined;
}

/** POST/PUT javobida keladigan yagona obyekt o‘ramlari */
function unwrapCreatedPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  const keys = ["data", "result", "payload", "body", "entity", "content"] as const;
  for (const k of keys) {
    const v = o[k];
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  }
  return raw;
}

function roleIdFromObject(o: Record<string, unknown>): number | undefined {
  const roleNested =
    o.role && typeof o.role === "object" ? (o.role as Record<string, unknown>) : undefined;
  const fromNested = roleNested ? toNum(roleNested.id) : undefined;
  return toNum(o.roleId ?? o.role_id) ?? fromNested;
}

/**
 * POST javobidan `id` ni qidiradi (ichki obyektlar, turli kalit nomlari).
 * UUID string bo‘lsa raqamga aylantira olmasak — undefined.
 */
function extractCreatedIdDeep(raw: unknown): number | undefined {
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth: number): number | undefined => {
    if (node == null || depth > 5) return undefined;
    if (typeof node === "number" && Number.isFinite(node) && node >= 0) return node;
    if (typeof node === "string" && node.trim() !== "") {
      const n = Number(node);
      if (Number.isFinite(n)) return n;
      return undefined;
    }
    if (typeof node !== "object" || Array.isArray(node)) return undefined;
    if (seen.has(node)) return undefined;
    seen.add(node);
    const o = node as Record<string, unknown>;
    const direct = toNum(
      o.id ?? o.Id ?? o.ID ?? o.userId ?? o.user_id ?? o.userID
    );
    if (direct !== undefined) return direct;
    for (const k of ["data", "result", "payload", "content", "user", "entity", "body", "value"]) {
      const v = o[k];
      const found = walk(v, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  };
  return walk(raw, 0);
}

function syntheticDtoFromCreateBody(body: CreateUserBody): UserDto {
  return {
    id: 0,
    username: body.username,
    firstName: body.firstName,
    lastName: body.lastName,
    surname: body.surname,
    phoneNumber: body.phoneNumber,
    roleId: body.roleId,
    regionId: body.regionId,
    districtId: body.districtId,
  };
}

/** Server faqat qisman maydon qaytarsa — qolganini yuborilgan body bilan to‘ldiramiz */
function mergeUserDtoFromCreate(raw: unknown, body: CreateUserBody): UserDto | null {
  if (raw == null) return null;
  const u = unwrapCreatedPayload(raw);
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const id = toNum(o.id ?? o.Id ?? o.ID) ?? extractCreatedIdDeep(raw);
  if (id === undefined) return null;
  const roleId = roleIdFromObject(o) ?? body.roleId;
  return {
    id,
    username: toStr(o.username ?? o.user_name) || body.username,
    firstName: toStr(o.firstName ?? o.first_name) || body.firstName,
    lastName: toStr(o.lastName ?? o.last_name) || body.lastName,
    surname: toStr(o.surname ?? o.middle_name) || body.surname,
    phoneNumber: toStr(o.phoneNumber ?? o.phone_number ?? o.phone) || body.phoneNumber,
    roleId,
    regionId: toNum(o.regionId ?? o.region_id) ?? body.regionId,
    districtId: toNum(o.districtId ?? o.district_id) ?? body.districtId,
    active: toActive(o),
  };
}

/** GET /users/{id} javobi to‘liq bo‘lmasa — kamida `id` va mavjud maydonlar */
function mergeUserDtoPartial(raw: unknown, fallbackId: number): UserDto | null {
  const u = unwrapCreatedPayload(raw);
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const id = toNum(o.id) ?? fallbackId;
  const roleId = roleIdFromObject(o) ?? 0;
  return {
    id,
    username: toStr(o.username ?? o.user_name) || "—",
    firstName: toStr(o.firstName ?? o.first_name),
    lastName: toStr(o.lastName ?? o.last_name),
    surname: toStr(o.surname ?? o.middle_name),
    phoneNumber: toStr(o.phoneNumber ?? o.phone_number ?? o.phone),
    roleId,
    regionId: toNum(o.regionId ?? o.region_id),
    districtId: toNum(o.districtId ?? o.district_id),
    active: toActive(o),
  };
}

function mergeUserDtoFromUpdate(raw: unknown, body: UpdateUserBody): UserDto | null {
  const u = unwrapCreatedPayload(raw);
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const id = toNum(o.id) ?? body.id;
  if (id === undefined) return null;
  const roleId = roleIdFromObject(o) ?? body.roleId;
  return {
    id,
    username: toStr(o.username ?? o.user_name) || body.username,
    firstName: toStr(o.firstName ?? o.first_name) || body.firstName,
    lastName: toStr(o.lastName ?? o.last_name) || body.lastName,
    surname: toStr(o.surname ?? o.middle_name) || body.surname,
    phoneNumber: toStr(o.phoneNumber ?? o.phone_number ?? o.phone) || body.phoneNumber,
    roleId,
    regionId: toNum(o.regionId ?? o.region_id),
    districtId: toNum(o.districtId ?? o.district_id),
    active: toActive(o),
  };
}

export function normalizeUserDto(raw: unknown): UserDto | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  const roleNested =
    o.role && typeof o.role === "object" ? (o.role as Record<string, unknown>) : undefined;
  const roleIdFromNested = roleNested ? toNum(roleNested.id) : undefined;
  const roleId = toNum(o.roleId ?? o.role_id) ?? roleIdFromNested;
  if (id === undefined || roleId === undefined) return null;
  return {
    id,
    username: toStr(o.username ?? o.user_name) || "—",
    firstName: toStr(o.firstName ?? o.first_name),
    lastName: toStr(o.lastName ?? o.last_name),
    surname: toStr(o.surname ?? o.middle_name),
    phoneNumber: toStr(o.phoneNumber ?? o.phone_number ?? o.phone),
    roleId,
    regionId: toNum(o.regionId ?? o.region_id),
    districtId: toNum(o.districtId ?? o.district_id),
    active: toActive(o),
  };
}

function parsePageMeta(raw: unknown, fallbackItemCount: number): Omit<PagedUsers, "items"> {
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
  const totalPages = toNum(o.totalPages ?? o.total_pages) ?? Math.max(1, Math.ceil(totalElements / Math.max(size, 1)));
  const page = toNum(o.number ?? o.page ?? o.pageNumber ?? o.page_number) ?? 0;
  return { page, size, totalPages, totalElements };
}

/**
 * GET /users — sahifalangan ro‘yxat (Spring `page`, `size` yoki oddiy massiv).
 */
export async function fetchUsers(page = 0, size = 10): Promise<PagedUsers> {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  const raw = await apiFetch<unknown>(`/users?${q.toString()}`, { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  const items = rows.map(normalizeUserDto).filter((x): x is UserDto => x !== null);
  const meta = parsePageMeta(raw, items.length);
  return { items, ...meta };
}

export async function fetchUser(id: number): Promise<UserDto> {
  const raw = await apiFetch<unknown>(`/users/${id}`, { method: "GET" });
  const payload = unwrapCreatedPayload(raw);
  const n = normalizeUserDto(payload);
  if (n) return n;
  const partial = mergeUserDtoPartial(raw, id);
  if (partial) return partial;
  throw new Error("Foydalanuvchi ma’lumoti noto‘g‘ri");
}

export async function createUser(body: CreateUserBody): Promise<UserDto> {
  const res = await apiFetch<unknown>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
  /** 204 yoki bo‘sh javob — apiFetch `undefined` qaytaradi */
  if (res === undefined || res === null) {
    return syntheticDtoFromCreateBody(body);
  }
  const payload = unwrapCreatedPayload(res);
  const full = normalizeUserDto(payload);
  if (full) return full;
  const merged = mergeUserDtoFromCreate(res, body);
  if (merged) return merged;
  const createdId = extractCreatedIdDeep(res);
  if (createdId !== undefined) {
    try {
      return await fetchUser(createdId);
    } catch {
      return { ...syntheticDtoFromCreateBody(body), id: createdId };
    }
  }
  /** 200/201 muvaffaqiyatli, lekin JSONda id yo‘q (masalan `{ "success": true }`) — xato chiqarmaymiz */
  return syntheticDtoFromCreateBody(body);
}

export async function updateUser(body: UpdateUserBody): Promise<UserDto> {
  const { password, ...rest } = body;
  const payload: Record<string, unknown> = { ...rest };
  if (password != null && password.trim() !== "") payload.password = password;
  const res = await apiFetch<unknown>("/users", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const unwrapped = unwrapCreatedPayload(res);
  const full = normalizeUserDto(unwrapped);
  if (full) return full;
  const merged = mergeUserDtoFromUpdate(res, body);
  if (merged) return merged;
  return fetchUser(body.id);
}

export async function deleteUser(id: number): Promise<void> {
  await apiFetch<void>(`/users/${id}`, { method: "DELETE" });
}

export async function activateUser(id: number): Promise<void> {
  await apiFetch<void>(`/users/${id}/activate`, { method: "PATCH" });
}

export async function deactivateUser(id: number): Promise<void> {
  await apiFetch<void>(`/users/${id}/deactivate`, { method: "PATCH" });
}

export function formatUserFullName(u: Pick<UserDto, "firstName" | "lastName" | "surname">): string {
  return [u.firstName, u.lastName, u.surname].filter(Boolean).join(" ").trim() || "—";
}
