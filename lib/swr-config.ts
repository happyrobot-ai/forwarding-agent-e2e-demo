import type { SWRConfiguration } from "swr";

/**
 * Global fetcher for SWR.
 * Handles JSON responses and throws on error.
 */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    throw error;
  }

  return res.json();
}

/**
 * Global SWR configuration.
 * Applied to all SWR hooks via SWRConfig provider.
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  shouldRetryOnError: true,
};

/**
 * SWR Keys for cache management.
 * Use these constants to ensure consistent cache keys across the app.
 */
export const SWR_KEYS = {
  ORDERS: "/api/orders",
  INCIDENTS: "/api/incidents",
  AGENTS: "/api/agents",
  WAREHOUSES: "/api/warehouses",
  INCIDENT_LOGS: (id: string) => `/api/incidents/${id}/logs`,
} as const;
