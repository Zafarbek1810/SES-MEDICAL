import { apiFetch, unwrapList } from "./apiHttp";

export type DepartmentDto = {
  id: number;
  name: string;
};

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function normalizeDepartmentDto(raw: unknown): DepartmentDto | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  if (id === undefined) return null;
  const name = String(o.name ?? o.nameUz ?? o.name_uz ?? o.title ?? o.titleUz ?? "").trim();
  return { id, name: name || `ID ${id}` };
}

/** GET /departments — barcha bo‘limlar */
export async function fetchDepartments(): Promise<DepartmentDto[]> {
  const raw = await apiFetch<unknown>("/sp-ses-departments", { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeDepartmentDto).filter((x): x is DepartmentDto => x !== null);
}
