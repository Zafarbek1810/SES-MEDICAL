import { apiFetch } from "./apiHttp";

export type NotificationDto = {
  id: number;
  title: string;
  message: string;
  sanMinimumId?: number | null;
  sanMinimumFirstName?: string | null;
  sanMinimumLastName?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

export type PagedNotifications = {
  items: NotificationDto[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

function unwrapData(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  if ("data" in o && o.data != null && typeof o.data === "object" && !Array.isArray(o.data)) {
    return o.data;
  }
  return raw;
}

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function normalizeNotification(raw: unknown): NotificationDto | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = toNum(o.id);
  if (id === undefined) return null;
  const smRaw = toNum(o.sanMinimumId ?? o.san_minimum_id);
  const sanMinimumId = smRaw !== undefined && smRaw > 0 ? smRaw : null;
  return {
    id,
    title: String(o.title ?? ""),
    message: String(o.message ?? ""),
    sanMinimumId,
    sanMinimumFirstName:
      o.sanMinimumFirstName != null
        ? String(o.sanMinimumFirstName)
        : o.san_minimum_first_name != null
          ? String(o.san_minimum_first_name)
          : undefined,
    sanMinimumLastName:
      o.sanMinimumLastName != null
        ? String(o.sanMinimumLastName)
        : o.san_minimum_last_name != null
          ? String(o.san_minimum_last_name)
          : undefined,
    isRead: Boolean(o.isRead ?? o.is_read),
    createdAt: String(o.createdAt ?? o.created_at ?? ""),
    readAt: o.readAt != null || o.read_at != null ? String(o.readAt ?? o.read_at) : null,
  };
}

function parseSpringPage(raw: unknown): PagedNotifications {
  const u = unwrapData(raw);
  if (!u || typeof u !== "object") {
    return { items: [], totalElements: 0, totalPages: 0, page: 0, size: 0 };
  }
  const o = u as Record<string, unknown>;
  const content = o.content;
  const items = Array.isArray(content)
    ? content.map(normalizeNotification).filter((x): x is NotificationDto => x !== null)
    : [];
  const totalElements = toNum(o.totalElements ?? o.total_elements) ?? items.length;
  const totalPages = toNum(o.totalPages ?? o.total_pages) ?? 1;
  const page = toNum(o.number ?? o.page) ?? 0;
  const size = toNum(o.size ?? o.pageSize ?? o.page_size) ?? items.length;
  return { items, totalElements, totalPages, page, size };
}

/** Sahifalangan barcha bildirishnomalar */
export async function fetchNotifications(page = 0, size = 20): Promise<PagedNotifications> {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  const raw = await apiFetch<unknown>(`/notifications?${q.toString()}`, { method: "GET" });
  return parseSpringPage(raw);
}

/** Faqat o‘qilmaganlar */
export async function fetchUnreadNotifications(page = 0, size = 30): Promise<PagedNotifications> {
  const q = new URLSearchParams({ page: String(page), size: String(size) });
  const raw = await apiFetch<unknown>(`/notifications/unread?${q.toString()}`, { method: "GET" });
  return parseSpringPage(raw);
}

/** O‘qilmaganlar soni (`data` raqam bo‘lishi mumkin) */
export async function fetchUnreadNotificationCount(): Promise<number> {
  const raw = await apiFetch<unknown>("/notifications/unread-count", { method: "GET" });
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const d = (raw as Record<string, unknown>).data;
    if (typeof d === "number" && Number.isFinite(d)) return Math.max(0, Math.floor(d));
    if (typeof d === "string") {
      const n = Number(d);
      if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
    }
  }
  return 0;
}

export async function markNotificationRead(id: number): Promise<void> {
  await apiFetch<unknown>(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<unknown>("/notifications/read-all", { method: "PATCH" });
}
