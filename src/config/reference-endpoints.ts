/**
 * Umumiy spravochniklar (GET) — boshqa API va formlarda qayta ishlatiladi.
 * To‘liq URL: API_BASE_URL + yo‘l
 */
export const REFERENCE_ENDPOINTS = {
  roles: "/roles",
  regions: "/regions",
  districts: "/districts",
  villages: "/villages",
} as const;

export type ReferenceEndpointKey = keyof typeof REFERENCE_ENDPOINTS;
