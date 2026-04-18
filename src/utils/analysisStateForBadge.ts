import type { EnumsData, EnumEntry } from "../services/enumsApi";

export function getAnalysisStateEntry(enums: EnumsData | null, value: number): EnumEntry | undefined {
  return enums?.analysisStates?.find((e) => e.value === value);
}

/**
 * `StatusBadge` uchun: enum `name` / `labelUz` va `value` (14/24/34/44).
 */
export function analysisStateToBadgeStatus(
  enums: EnumsData | null,
  value: number
): "Pending" | "In Progress" | "Completed" | "Rejected" {
  const entry = getAnalysisStateEntry(enums, value);
  const name = (entry?.name ?? "").trim().toUpperCase();
  const label = (entry?.labelUz ?? "").trim().toLowerCase();

  if (name === "REJECTED" || /rad etilgan/.test(label)) return "Rejected";

  const completedNames = new Set([
    "COMPLETED",
    "APPROVED",
    "DONE",
    "RETURNED",
    "PAID",
    "FINISHED",
    "SUCCESS",
    "CLOSED",
    "READY",
  ]);
  if (completedNames.has(name)) return "Completed";
  if (
    /tasdiqlangan|bajaril|tasdiql|tugall|yakun|tayyor| chiqarildi/.test(label) &&
    name !== "RESULT_READY"
  ) {
    return "Completed";
  }

  const inProgressNames = new Set([
    "PENDING",
    "IN_PROGRESS",
    "PROCESSING",
    "RUNNING",
    "WAITING",
    "ASSIGNED",
    "STARTED",
  ]);
  if (name === "PENDING" || inProgressNames.has(name)) return "In Progress";
  if (/jarayonda/.test(label)) return "In Progress";

  if (name === "RESULT_READY" || /kutilmoqda/.test(label)) return "Pending";

  if (!entry) {
    if (value === 34) return "Completed";
    if (value === 44) return "Rejected";
    if (value === 14) return "In Progress";
    if (value === 24) return "Pending";
  }

  return "Pending";
}
