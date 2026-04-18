import { apiFetch, unwrapList } from "./apiHttp";

export type SavePatientBody = {
  firstName: string;
  lastName: string;
  surname: string;
  /** 1 — erkak, 0 — ayol */
  sex: 0 | 1;
  regionId: number;
  districtId: number;
  villageId: number;
  workplaceId: number;
  /** GET /sp-positions — lavozim id */
  positionId: number;
  birthDay: string;
  phoneNumber: string;
  address: string;
  privilege: number;
  comment: string;
  isSendSms: boolean;
};

export type PatientDto = SavePatientBody & {
  id: number;
  /** GET javobida bo‘lsa — forma uchun soha tanlash */
  positionIndustryId?: number;
  positionName?: string;
};

export type PagedPatients = {
  items: PatientDto[];
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
};

/** GET /patients — ixtiyoriy query */
export type FetchPatientsParams = {
  /** Berilganda query stringga qo‘shiladi (masalan buyurtma uchun faqat mos bemorlar) */
  availableForOrder?: boolean;
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
  if (v === 1 || v === "1" || v === "true") return true;
  return false;
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

export function normalizePatient(raw: unknown): PatientDto | null {
  const u = unwrapPayload(raw);
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const id = toNum(o.id);
  if (id === undefined) return null;
  const positionId =
    toNum(o.positionId ?? o.position_id) ?? toNum(o.departmentId ?? o.department_id) ?? 0;
  const positionIndustryId = toNum(
    o.positionIndustryId ?? o.position_industry_id ?? o.industryId ?? o.industry_id,
  );
  const positionNameRaw = toStr(o.positionName ?? o.position_name);
  const sexRaw = toNum(o.sex ?? o.gender);
  const sex: 0 | 1 = sexRaw === 1 ? 1 : 0;

  const base: PatientDto = {
    id,
    firstName: toStr(o.firstName ?? o.first_name),
    lastName: toStr(o.lastName ?? o.last_name),
    surname: toStr(o.surname ?? o.middle_name ?? o.middleName ?? o.patronymic),
    sex,
    regionId: toNum(o.regionId ?? o.region_id) ?? 0,
    districtId: toNum(o.districtId ?? o.district_id) ?? 0,
    villageId: toNum(o.villageId ?? o.village_id) ?? 0,
    workplaceId: toNum(o.workplaceId ?? o.workplace_id) ?? 0,
    positionId,
    birthDay: toStr(o.birthDay ?? o.birth_day ?? o.birthDate ?? o.birth_date).slice(0, 10),
    phoneNumber: toStr(o.phoneNumber ?? o.phone_number ?? o.phone),
    address: toStr(o.address),
    privilege: toNum(o.privilege) ?? 0,
    comment: toStr(o.comment),
    isSendSms: toBool(o.isSendSms ?? o.is_send_sms ?? o.sendSms),
  };
  return {
    ...base,
    ...(positionIndustryId !== undefined ? { positionIndustryId } : {}),
    ...(positionNameRaw ? { positionName: positionNameRaw } : {}),
  };
}

function parsePageMeta(raw: unknown, fallbackItemCount: number): Omit<PagedPatients, "items"> {
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

export async function fetchPatients(
  page = 0,
  size = 10,
  params?: FetchPatientsParams,
): Promise<PagedPatients> {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  if (params?.availableForOrder !== undefined) {
    q.set("availableForOrder", String(params.availableForOrder));
  }
  const raw = await apiFetch<unknown>(`/patients?${q.toString()}`, { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  const items = rows.map(normalizePatient).filter((x): x is PatientDto => x !== null);
  const meta = parsePageMeta(raw, items.length);
  return { items, ...meta };
}

export async function fetchPatient(id: number): Promise<PatientDto> {
  const raw = await apiFetch<unknown>(`/patients/${id}`, { method: "GET" });
  const n = normalizePatient(unwrapPayload(raw));
  if (n) return n;
  throw new Error("Bemor ma’lumoti noto‘g‘ri");
}

export async function createPatient(body: SavePatientBody): Promise<PatientDto> {
  const res = await apiFetch<unknown>("/patients", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res === undefined || res === null) {
    throw new Error("Bemor yaratildi, lekin javob bo‘sh");
  }
  const createdId = extractCreatedId(res);
  if (createdId !== undefined) {
    try {
      return await fetchPatient(createdId);
    } catch {
      return normalizePatient(res) ?? { id: createdId, ...body };
    }
  }
  const direct = normalizePatient(res);
  if (direct) return direct;
  throw new Error("Bemor yaratildi, lekin javobda id topilmadi");
}

export async function updatePatient(id: number, body: SavePatientBody): Promise<PatientDto> {
  const res = await apiFetch<unknown>(`/patients/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const direct = normalizePatient(unwrapPayload(res));
  if (direct) return direct;
  try {
    return await fetchPatient(id);
  } catch {
    return { id, ...body };
  }
}

/** Backend odatda `DELETE /patients/{id}` — id siz variant bo‘lsa, xabar qiling. */
export async function deletePatient(id: number): Promise<void> {
  await apiFetch<void>(`/patients/${id}`, { method: "DELETE" });
}
