import useSWR, { mutate } from "swr";
import { fetcher, SWR_KEYS } from "@/lib/swr-config";

export interface Incident {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  orderId?: string | null;
  discoveryStatus?: string;
  createdAt: string;
}

interface UseIncidentsReturn {
  incidents: Incident[];
  activeIncident: Incident | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<Incident[] | undefined>;
  setIncident: (incident: Incident) => void;
  clearActiveIncident: () => void;
}

/**
 * SWR hook for fetching and managing incidents.
 * Automatically extracts the active incident for convenience.
 */
export function useIncidents(): UseIncidentsReturn {
  const { data, error, isLoading, mutate: boundMutate } = useSWR<Incident[]>(
    SWR_KEYS.INCIDENTS,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  const incidents = data ?? [];
  const activeIncident = incidents.find((inc) => inc.status === "ACTIVE") ?? null;

  /**
   * Optimistically add or update an incident in the cache.
   */
  const setIncident = (incident: Incident) => {
    boundMutate(
      (currentIncidents) => {
        if (!currentIncidents) return [incident];
        const exists = currentIncidents.find((i) => i.id === incident.id);
        if (exists) {
          return currentIncidents.map((i) =>
            i.id === incident.id ? { ...i, ...incident } : i
          );
        }
        return [...currentIncidents, incident];
      },
      { revalidate: false }
    );
  };

  /**
   * Clear active incident by setting all to RESOLVED.
   * Used for demo reset.
   */
  const clearActiveIncident = () => {
    boundMutate(
      (currentIncidents) => {
        if (!currentIncidents) return [];
        return currentIncidents.map((inc) => ({
          ...inc,
          status: inc.status === "ACTIVE" ? "RESOLVED" : inc.status,
        }));
      },
      { revalidate: false }
    );
  };

  return {
    incidents,
    activeIncident,
    isLoading,
    isError: !!error,
    error,
    mutate: boundMutate,
    setIncident,
    clearActiveIncident,
  };
}

/**
 * Utility to revalidate incidents from anywhere.
 */
export function revalidateIncidents() {
  return mutate(SWR_KEYS.INCIDENTS);
}

/**
 * Utility to add/update an incident from anywhere.
 */
export function mutateIncident(incident: Incident) {
  return mutate<Incident[]>(
    SWR_KEYS.INCIDENTS,
    (currentIncidents) => {
      if (!currentIncidents) return [incident];
      const exists = currentIncidents.find((i) => i.id === incident.id);
      if (exists) {
        return currentIncidents.map((i) =>
          i.id === incident.id ? { ...i, ...incident } : i
        );
      }
      return [...currentIncidents, incident];
    },
    { revalidate: false }
  );
}
