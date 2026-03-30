import { apiFetch, unwrapList } from "./apiHttp";

export type LaboratoryDto = {
  id: number;
  nameUz: string;
  nameRu: string;
};

export type LaboratoryIncomeStatisticsFilters = {
  date?: string;
  fromDate?: string;
  toDate?: string;
};

export type LaboratoryIncomePoint = {
  id: string;
  name: string;
  value: number;
};

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeLab(raw: unknown): LaboratoryDto | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  const nameUz = String(o.nameUz ?? o.name_uz ?? "").trim();
  const nameRu = String(o.nameRu ?? o.name_ru ?? "").trim();
  if (id === undefined) return null;
  return { id, nameUz: nameUz || "—", nameRu: nameRu || "—" };
}

function normalizeIncomePoint(raw: unknown, index: number): LaboratoryIncomePoint | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const nameRaw =
    o.laboratoryNameUz ??
    o.laboratory_name_uz ??
    o.laboratoryNameRu ??
    o.laboratory_name_ru ??
    o.name ??
    o.laboratoryName ??
    o.laboratory_name ??
    o.label;
  const valueRaw = o.value ?? o.amount ?? o.total ?? o.income;
  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  const value = toNum(valueRaw);
  if (!name || value === undefined) return null;
  return {
    id: String(o.laboratoryId ?? o.laboratory_id ?? o.id ?? index),
    name,
    value,
  };
}

function appendIncomeFilters(q: URLSearchParams, filters: LaboratoryIncomeStatisticsFilters | undefined): void {
  if (!filters) return;
  if (filters.date?.trim()) q.set("date", filters.date.trim());
  if (filters.fromDate?.trim()) q.set("fromDate", filters.fromDate.trim());
  if (filters.toDate?.trim()) q.set("toDate", filters.toDate.trim());
}

export async function fetchLaboratories(): Promise<LaboratoryDto[]> {
  const raw = await apiFetch<unknown>("/laboratories", { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeLab).filter((x): x is LaboratoryDto => x !== null);
}

export async function fetchLaboratory(id: number): Promise<LaboratoryDto> {
  return apiFetch<LaboratoryDto>(`/laboratories/${id}`, { method: "GET" });
}

export async function createLaboratory(body: {
  nameUz: string;
  nameRu: string;
}): Promise<LaboratoryDto> {
  return apiFetch<LaboratoryDto>("/laboratories", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateLaboratory(
  id: number,
  body: { nameUz: string; nameRu: string }
): Promise<LaboratoryDto> {
  return apiFetch<LaboratoryDto>(`/laboratories/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteLaboratory(id: number): Promise<void> {
  await apiFetch<void>(`/laboratories/${id}`, { method: "DELETE" });
}

/** GET /laboratories/income-statistics */
export async function fetchLaboratoriesIncomeStatistics(
  filters?: LaboratoryIncomeStatisticsFilters
): Promise<LaboratoryIncomePoint[]> {
  const q = new URLSearchParams();
  appendIncomeFilters(q, filters);
  const path = q.size > 0 ? `/laboratories/income-statistics?${q.toString()}` : "/laboratories/income-statistics";
  const raw = await apiFetch<unknown>(path, { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeIncomePoint).filter((x): x is LaboratoryIncomePoint => x !== null);
}
