import { apiFetch } from "./apiHttp";

export type EnumEntry = {
  name: string;
  value: number;
  labelUz?: string;
};

export type EnumsData = {
  analysisStates: EnumEntry[];
  orderStates: EnumEntry[];
  orderTypes: EnumEntry[];
  paymentStatuses: EnumEntry[];
  paymentTypes: EnumEntry[];
  /** Karta turi: UZCARD, HUMO, VISA — to‘lov CARD bo‘lganda `cardId` */
  cardTypes: EnumEntry[];
  sampleTypes: EnumEntry[];
  /** Namuna obyekti turi: HUMAN / OBJECT va hokazo */
  sampleObjectType: EnumEntry[];
  humanSexes: EnumEntry[];
  /** San minimum kurs holati (GET /san-minimums?courseState=…) */
  courseStates: EnumEntry[];
  /** San minimum to‘lovi: pullik / bepul */
  sanPaymentTypes: EnumEntry[];
};

const emptyEnums = (): EnumsData => ({
  analysisStates: [],
  orderStates: [],
  orderTypes: [],
  paymentStatuses: [],
  paymentTypes: [],
  cardTypes: [],
  sampleTypes: [],
  sampleObjectType: [],
  humanSexes: [],
  courseStates: [],
  sanPaymentTypes: [],
});

function parseEnumArray(raw: unknown, key: string): EnumEntry[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const data = raw as Record<string, unknown>;
  const inner = data.data && typeof data.data === "object" && !Array.isArray(data.data) ? (data.data as Record<string, unknown>) : data;
  const v = inner[key];
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object" && !Array.isArray(x))
    .map((x) => {
      const rawLabel = x.labelUz ?? x.label_uz;
      const labelUz =
        typeof rawLabel === "string"
          ? rawLabel.trim()
          : rawLabel != null && rawLabel !== ""
            ? String(rawLabel).trim()
            : undefined;
      return {
        name: String(x.name ?? "").trim(),
        value: typeof x.value === "number" && Number.isFinite(x.value) ? x.value : Number(x.value),
        ...(labelUz ? { labelUz } : {}),
      };
    })
    .filter((e) => Number.isFinite(e.value) && (e.name || e.labelUz));
}

/** GET /enums — to‘g‘ridan-to‘g‘ri javobni ajratadi */
export async function fetchEnums(): Promise<EnumsData> {
  const raw = await apiFetch<unknown>("/enums", { method: "GET" });
  if (!raw || typeof raw !== "object") return emptyEnums();
  return {
    analysisStates: parseEnumArray(raw, "analysisStates"),
    orderStates: parseEnumArray(raw, "orderStates"),
    orderTypes: parseEnumArray(raw, "orderTypes"),
    paymentStatuses: parseEnumArray(raw, "paymentStatuses"),
    paymentTypes: parseEnumArray(raw, "paymentTypes"),
    cardTypes: parseEnumArray(raw, "cardTypes"),
    sampleTypes: parseEnumArray(raw, "sampleTypes"),
    sampleObjectType: parseEnumArray(raw, "sampleObjectType"),
    humanSexes: parseEnumArray(raw, "humanSexes"),
    courseStates: parseEnumArray(raw, "courseStates"),
    sanPaymentTypes: parseEnumArray(raw, "sanPaymentTypes"),
  };
}

let enumsCache: EnumsData | null = null;
let enumsInflight: Promise<EnumsData> | null = null;

/**
 * Enumlarni bir marta yuklab xotirada saqlaydi; buyurtmalar va boshqa tablar qayta ishlatadi.
 * `force: true` — qayta GET /enums.
 */
export async function getEnums(options?: { force?: boolean }): Promise<EnumsData> {
  if (!options?.force && enumsCache) return enumsCache;
  if (!options?.force && enumsInflight) return enumsInflight;

  enumsInflight = fetchEnums()
    .then((data) => {
      enumsCache = data;
      enumsInflight = null;
      return data;
    })
    .catch((e) => {
      enumsInflight = null;
      throw e;
    });

  return enumsInflight;
}

export function clearEnumsCache(): void {
  enumsCache = null;
}

/** API dagi `name` (masalan CASH, HUMAN) — rang / holat mantiqida ishlatiladi */
export function enumName(entries: EnumEntry[], value: number | undefined): string {
  if (value === undefined) return "";
  const hit = entries.find((e) => e.value === value);
  return hit?.name ?? String(value);
}

/** Foydalanuvchiga ko‘rinadigan matn: `labelUz`, bo‘lmasa `name` */
export function enumLabel(entries: EnumEntry[], value: number | undefined): string {
  if (value === undefined) return "—";
  const hit = entries.find((e) => e.value === value);
  const uz = hit?.labelUz?.trim();
  return uz || hit?.name || String(value);
}

export function enumEntryDisplayLabel(e: EnumEntry): string {
  const uz = e.labelUz?.trim();
  return uz || e.name || String(e.value);
}
