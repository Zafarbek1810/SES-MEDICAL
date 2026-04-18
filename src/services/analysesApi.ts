import { apiFetch, unwrapList } from "./apiHttp";

export type AnalysisDto = {
  id: number;
  nameUz: string;
  nameRu: string;
  laboratoryId: number;
};

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Backend camelCase / snake_case; `laboratory` obyekti ichida id bo‘lishi mumkin */
export function normalizeAnalysisDto(raw: unknown): AnalysisDto | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id ?? o.analysisId ?? o.analysis_id);
  const labRaw = o.laboratory;
  const labNestedId =
    labRaw && typeof labRaw === "object"
      ? toNum((labRaw as Record<string, unknown>).id ?? (labRaw as Record<string, unknown>).laboratoryId)
      : undefined;
  const laboratoryId = toNum(o.laboratoryId ?? o.laboratory_id) ?? labNestedId;
  const nameUz = String(o.nameUz ?? o.name_uz ?? "").trim();
  const nameRu = String(o.nameRu ?? o.name_ru ?? "").trim();
  if (id === undefined) return null;
  return {
    id,
    nameUz: nameUz || "—",
    nameRu: nameRu || "—",
    laboratoryId: laboratoryId ?? 0,
  };
}

/**
 * Har doim admin ro‘yxat endpointi ishlatiladi: GET `/analyses/admin`.
 * `laboratoryId` berilsa, query sifatida qo‘shiladi: `/analyses/admin?laboratoryId=...`.
 */
export async function fetchAnalyses(options?: { laboratoryId?: number }): Promise<AnalysisDto[]> {
  const labId = options?.laboratoryId;
  const query =
    labId != null && Number.isFinite(labId) && labId > 0
      ? `?laboratoryId=${encodeURIComponent(String(labId))}`
      : "";
  const raw = await apiFetch<unknown>(`/analyses/admin${query}`, { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeAnalysisDto).filter((x): x is AnalysisDto => x !== null);
}

export async function fetchAnalysis(id: number): Promise<AnalysisDto> {
  return apiFetch<AnalysisDto>(`/analyses/${id}`, { method: "GET" });
}

export async function createAnalysis(body: {
  nameUz: string;
  nameRu: string;
  laboratoryId: number;
}): Promise<AnalysisDto> {
  return apiFetch<AnalysisDto>("/analyses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateAnalysis(
  id: number,
  body: { nameUz: string; nameRu: string; laboratoryId: number }
): Promise<AnalysisDto> {
  return apiFetch<AnalysisDto>(`/analyses/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteAnalysis(id: number): Promise<void> {
  await apiFetch<void>(`/analyses/${id}`, { method: "DELETE" });
}
