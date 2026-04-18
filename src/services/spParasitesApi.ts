import { apiFetch, unwrapList } from "./apiHttp";

export type SpParasiteDto = {
  id: number;
  name: string;
};

export async function fetchSpParasites(): Promise<SpParasiteDto[]> {
  const raw = await apiFetch<unknown>("/sp-parasites", { method: "GET" });
  const list = unwrapList<Record<string, unknown>>(raw);
  return list
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      id: typeof x.id === "number" && Number.isFinite(x.id) ? x.id : Number(x.id),
      name: String(x.name ?? "").trim(),
    }))
    .filter((x) => Number.isFinite(x.id) && x.name !== "");
}
