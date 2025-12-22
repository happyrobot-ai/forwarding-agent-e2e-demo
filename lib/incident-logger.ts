import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";

export type LogSource =
  | "SYSTEM"
  | "ORCHESTRATOR"
  | "DISCOVERY"
  | "AGENT:FACILITY"  // For service centers & warehouses
  | "AGENT:DRIVER";   // For available drivers

export type LogStatus = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface IncidentLogEntry {
  id: string;
  timestamp: string;
  message: string;
  source: string;
  status: string;
}

// Optional metadata for resource selection events
export interface SelectionMetadata {
  selected_facility_id?: string;
  selected_driver_id?: string;
}

/**
 * Writes a log entry to the database and broadcasts it via Pusher.
 * This is the single source of truth for all incident logging.
 *
 * @param selection - Optional metadata to indicate a resource was selected
 *                    (triggers UI to filter down to just that resource)
 */
export async function writeIncidentLog(
  incidentId: string,
  message: string,
  source: LogSource,
  status: LogStatus = "INFO",
  selection?: SelectionMetadata
): Promise<IncidentLogEntry> {
  // 1. Persist to database
  const log = await prisma.incidentLog.create({
    data: {
      incidentId,
      message,
      source,
      status,
    },
  });

  const logEntry: IncidentLogEntry = {
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    message: log.message,
    source: log.source,
    status: log.status,
  };

  // 2. Broadcast to all connected clients (include selection metadata if present)
  await pusherServer.trigger("sysco-demo", "incident-log", {
    incidentId,
    log: logEntry,
    ...(selection?.selected_facility_id && { selected_facility_id: selection.selected_facility_id }),
    ...(selection?.selected_driver_id && { selected_driver_id: selection.selected_driver_id }),
  });

  return logEntry;
}

/**
 * Batch write multiple log entries (useful for seeding/initialization)
 */
export async function writeIncidentLogs(
  incidentId: string,
  entries: Array<{ message: string; source: LogSource; status?: LogStatus }>
): Promise<IncidentLogEntry[]> {
  const results: IncidentLogEntry[] = [];

  for (const entry of entries) {
    const log = await writeIncidentLog(
      incidentId,
      entry.message,
      entry.source,
      entry.status || "INFO"
    );
    results.push(log);
  }

  return results;
}
