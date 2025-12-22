import useSWR, { mutate } from "swr";
import { fetcher, SWR_KEYS } from "@/lib/swr-config";

export interface IncidentLog {
  id: string;
  timestamp: string;
  message: string;
  source: string; // "SYSTEM" | "ORCHESTRATOR" | "DISCOVERY" | "AGENT:FACILITY" | "AGENT:DRIVER"
  status: string; // "INFO" | "SUCCESS" | "WARNING" | "ERROR"
}

interface UseIncidentLogsOptions {
  enabled?: boolean;
}

interface UseIncidentLogsReturn {
  logs: IncidentLog[];
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<IncidentLog[] | undefined>;
  addLog: (log: IncidentLog) => void;
}

/**
 * SWR hook for fetching incident logs.
 * Designed for real-time updates via Pusher integration.
 */
export function useIncidentLogs(
  incidentId: string | null,
  options: UseIncidentLogsOptions = {}
): UseIncidentLogsReturn {
  const { enabled = true } = options;

  const key = incidentId && enabled ? SWR_KEYS.INCIDENT_LOGS(incidentId) : null;

  const { data, error, isLoading, mutate: boundMutate } = useSWR<IncidentLog[]>(
    key,
    fetcher,
    {
      revalidateOnFocus: false, // Logs are append-only, rely on Pusher
      dedupingInterval: 2000,
    }
  );

  /**
   * Optimistically add a log entry to the cache.
   * Deduplicates by log ID.
   */
  const addLog = (log: IncidentLog) => {
    boundMutate(
      (currentLogs) => {
        if (!currentLogs) return [log];
        // Avoid duplicates
        if (currentLogs.find((l) => l.id === log.id)) return currentLogs;
        return [...currentLogs, log];
      },
      { revalidate: false }
    );
  };

  return {
    logs: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate: boundMutate,
    addLog,
  };
}

/**
 * Utility to add a log to the cache from anywhere (e.g., Pusher handler).
 */
export function addIncidentLog(incidentId: string, log: IncidentLog) {
  const key = SWR_KEYS.INCIDENT_LOGS(incidentId);
  return mutate<IncidentLog[]>(
    key,
    (currentLogs) => {
      if (!currentLogs) return [log];
      if (currentLogs.find((l) => l.id === log.id)) return currentLogs;
      return [...currentLogs, log];
    },
    { revalidate: false }
  );
}

/**
 * Utility to revalidate incident logs.
 */
export function revalidateIncidentLogs(incidentId: string) {
  return mutate(SWR_KEYS.INCIDENT_LOGS(incidentId));
}
