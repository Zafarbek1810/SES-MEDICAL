import { apiFetch, unwrapList } from "./apiHttp";

export type SaveCourseBody = {
  name: string;
  isActive: boolean;
};

export type CourseDto = SaveCourseBody & {
  id: number;
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

export function normalizeCourse(raw: unknown): CourseDto | null {
  const u = unwrapPayload(raw);
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const id = toNum(o.id);
  if (id === undefined) return null;
  return {
    id,
    name: toStr(o.name),
    isActive: toBool(o.isActive ?? o.is_active ?? o.active),
  };
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

export async function fetchCourses(): Promise<CourseDto[]> {
  const raw = await apiFetch<unknown>("/courses", { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeCourse).filter((x): x is CourseDto => x !== null);
}

export async function fetchActiveCourses(): Promise<CourseDto[]> {
  const raw = await apiFetch<unknown>("/courses/active", { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeCourse).filter((x): x is CourseDto => x !== null);
}

export async function fetchCourse(id: number): Promise<CourseDto> {
  const raw = await apiFetch<unknown>(`/courses/${id}`, { method: "GET" });
  const n = normalizeCourse(unwrapPayload(raw));
  if (!n) throw new Error("Kurs ma’lumoti noto‘g‘ri formatda");
  return n;
}

export async function createCourse(body: SaveCourseBody): Promise<CourseDto> {
  const res = await apiFetch<unknown>("/courses", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res === undefined || res === null) {
    throw new Error("Kurs yaratildi, lekin javob bo‘sh");
  }
  const createdId = extractCreatedId(res);
  if (createdId !== undefined) {
    try {
      return await fetchCourse(createdId);
    } catch {
      return normalizeCourse(res) ?? { id: createdId, ...body };
    }
  }
  const direct = normalizeCourse(res);
  if (direct) return direct;
  throw new Error("Kurs yaratildi, lekin javobda id topilmadi");
}

export async function updateCourse(id: number, body: SaveCourseBody): Promise<CourseDto> {
  const res = await apiFetch<unknown>(`/courses/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  const direct = normalizeCourse(unwrapPayload(res));
  if (direct) return direct;
  try {
    return await fetchCourse(id);
  } catch {
    return { id, ...body };
  }
}

export async function deleteCourse(id: number): Promise<void> {
  await apiFetch<void>(`/courses/${id}`, { method: "DELETE" });
}

