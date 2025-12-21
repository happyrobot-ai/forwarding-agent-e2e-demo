// SWR Data Hooks
export { useOrders, revalidateOrders, mutateOrder } from "./useOrders";
export type { Order, Truck, Buyer } from "./useOrders";

export { useIncidents, revalidateIncidents, mutateIncident } from "./useIncidents";
export type { Incident } from "./useIncidents";

export { useWarehouses } from "./useWarehouses";
export type { Warehouse } from "./useWarehouses";

export { useAgents, revalidateAgents, mutateAgentStatus } from "./useAgents";
export type { Agent } from "./useAgents";

export { useIncidentLogs, addIncidentLog, revalidateIncidentLogs } from "./useIncidentLogs";
export type { IncidentLog } from "./useIncidentLogs";

// Legacy hooks
export { useAgentPolling } from "./useAgentPolling";
