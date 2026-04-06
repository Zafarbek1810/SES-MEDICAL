/** Jadval va UI uchun: sana `dd-mm-yyyy`, vaqt `HH:mm` (mahalliy vaqt) */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Sana (va ixtiyoriy vaqt) — `dd-mm-yyyy`.
 * `YYYY-MM-DD` yoki ISO satrlarni timezone siljitishsiz sana qismidan o‘qiydi.
 */
export function formatTableDate(input: string | number | Date | null | undefined): string {
  if (input == null || input === "") return "—";
  if (typeof input === "string") {
    const s = input.trim();
    const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (ymd) {
      return `${ymd[3]}.${ymd[2]}.${ymd[1]}`;
    }
  }
  const d = input instanceof Date ? input : new Date(input as number | string);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** To‘liq sana-vaqt — `dd-mm-yyyy HH:mm` */
export function formatTableDateTime(input: string | number | Date | null | undefined): string {
  if (input == null || input === "") return "—";
  const d = input instanceof Date ? input : new Date(input as number | string);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
