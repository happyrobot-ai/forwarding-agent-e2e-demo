import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";

export type LogSource =
  | "SYSTEM"
  | "ORCHESTRATOR"
  | "DISCOVERY"
  | "AGENT:SUPPLIER"
  | "AGENT:DRIVER"
  | "AGENT:CUSTOMER";

export type LogStatus = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface IncidentLogEntry {
  id: string;
  timestamp: string;
  message: string;
  source: string;
  status: string;
}

/**
 * Writes a log entry to the database and broadcasts it via Pusher.
 * This is the single source of truth for all incident logging.
 */
export async function writeIncidentLog(
  incidentId: string,
  message: string,
  source: LogSource,
  status: LogStatus = "INFO"
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

  // 2. Broadcast to all connected clients
  await pusherServer.trigger("sysco-demo", "incident-log", {
    incidentId,
    log: logEntry,
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
