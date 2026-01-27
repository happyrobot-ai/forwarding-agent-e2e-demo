import { PrismaClient } from "@prisma/client";
import PusherServer from "pusher";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pusher: PusherServer | undefined;
};

// Lazy Pusher server instance (avoids issues during build)
function getPusherServer(): PusherServer | null {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY) {
    return null; // Skip during build or if not configured
  }

  if (!globalForPrisma.pusher) {
    globalForPrisma.pusher = new PusherServer({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return globalForPrisma.pusher;
}

// Broadcast helper - fire and forget
async function broadcast(event: string, data: unknown) {
  const pusher = getPusherServer();
  if (!pusher) return;

  try {
    await pusher.trigger("sysco-demo", event, data);
  } catch (error) {
    console.error(`[Prisma Middleware] Failed to broadcast ${event}:`, error);
  }
}

// Generic types for Prisma extension query functions
interface ExtensionArgs {
  args: Record<string, unknown>;
  query: (args: Record<string, unknown>) => Promise<unknown>;
}

// Create Prisma client (standard connection, no driver adapter)
function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  console.log("Database url", process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@'));

  // Create base client with standard Prisma connection
  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Extend with auto-broadcast middleware
  const extendedClient = baseClient.$extends({
    query: {
      order: {
        async create({ args, query }: ExtensionArgs) {
          const result = await query(args);
          await broadcast("order:created", { order: result });
          return result;
        },
        async update({ args, query }: ExtensionArgs) {
          const result = await query(args);
          await broadcast("order:updated", { order: result });
          return result;
        },
        async delete({ args, query }: ExtensionArgs) {
          const result = await query(args) as { id: string };
          await broadcast("order:deleted", { orderId: result.id });
          return result;
        },
        async updateMany({ args, query }: ExtensionArgs) {
          const result = await query(args) as { count: number };
          // For bulk updates, broadcast a general refresh signal
          await broadcast("orders:bulk-updated", {
            count: result.count,
            where: args.where,
          });
          return result;
        },
        async deleteMany({ args, query }: ExtensionArgs) {
          const result = await query(args) as { count: number };
          await broadcast("orders:bulk-deleted", {
            count: result.count,
            where: args.where,
          });
          return result;
        },
      },
      incident: {
        async create({ args, query }: ExtensionArgs) {
          const result = await query(args);
          await broadcast("incident:created", { incident: result });
          return result;
        },
        async update({ args, query }: ExtensionArgs) {
          const result = await query(args);
          await broadcast("incident:updated", { incident: result });
          return result;
        },
        async delete({ args, query }: ExtensionArgs) {
          const result = await query(args) as { id: string };
          await broadcast("incident:deleted", { incidentId: result.id });
          return result;
        },
        async deleteMany({ args, query }: ExtensionArgs) {
          const result = await query(args) as { count: number };
          await broadcast("incidents:bulk-deleted", { count: result.count });
          return result;
        },
      },
      agentRun: {
        async create({ args, query }: ExtensionArgs) {
          const result = await query(args);
          await broadcast("agent:created", { agent: result });
          return result;
        },
        async update({ args, query }: ExtensionArgs) {
          const result = await query(args);
          await broadcast("agent:updated", { agent: result });
          return result;
        },
        async updateMany({ args, query }: ExtensionArgs) {
          const result = await query(args) as { count: number };
          await broadcast("agents:bulk-updated", { count: result.count });
          return result;
        },
        async deleteMany({ args, query }: ExtensionArgs) {
          const result = await query(args) as { count: number };
          await broadcast("agents:bulk-deleted", { count: result.count });
          return result;
        },
      },
      // IncidentLog already broadcasts via writeIncidentLog helper
      // No middleware needed here to avoid double-broadcasting
    },
  });

  // Return the extended client cast back to PrismaClient type
  // The extension adds behavior but maintains the same interface
  return extendedClient as unknown as PrismaClient;
}

// Lazy getter - only initializes when accessed at runtime
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Use a Proxy to forward all property accesses to the real PrismaClient
// This ensures proper lazy initialization while maintaining type compatibility
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrisma();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    // If it's a function, bind it to the client
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
