/**
 * API bazaviy manzil.
 * Ishlab chiqarishda VITE_API_BASE_URL orqali qayta belgilash mumkin.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL as string | undefined
)?.replace(/\/$/, "") ?? "http://5.42.122.27:8087/api";
