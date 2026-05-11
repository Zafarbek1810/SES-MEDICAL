import { apiFetch, unwrapList } from "./apiHttp";

export type SpWaterCheckItem = {
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

function normalizeSpWaterCheckItem(raw: unknown): SpWaterCheckItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (id === undefined || !name) return null;
  return { id, name };
}

/**
 * GET /sp-water-check — suv tekshiruvi parametrlari ro‘yxati.
 */
export async function fetchSpWaterChecks(): Promise<SpWaterCheckItem[]> {
  const raw = await apiFetch<unknown>("/sp-water-check", { method: "GET" });
  const rows = unwrapList<unknown>(raw);
  return rows.map(normalizeSpWaterCheckItem).filter((x): x is SpWaterCheckItem => x !== null);
}
