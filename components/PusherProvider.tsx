"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Pusher from "pusher-js";

interface PusherContextType {
  pusher: Pusher | null;
}

const PusherContext = createContext<PusherContextType>({ pusher: null });

export function PusherProvider({ children }: { children: ReactNode }) {
  const [pusher, setPusher] = useState<Pusher | null>(null);

  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!pusherKey || !pusherCluster) {
      console.warn("[PusherProvider] Missing env vars - NEXT_PUBLIC_PUSHER_KEY:", !!pusherKey, "NEXT_PUBLIC_PUSHER_CLUSTER:", !!pusherCluster);
      return;
    }

    console.log("[PusherProvider] Initializing Pusher client with cluster:", pusherCluster);
    const pusherClient = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    // Connection state debugging
    pusherClient.connection.bind("connected", () => {
      console.log("[PusherProvider] Connected to Pusher");
    });
    pusherClient.connection.bind("error", (err: Error) => {
      console.error("[PusherProvider] Connection error:", err);
    });

    setPusher(pusherClient);

    return () => {
      pusherClient.disconnect();
    };
  }, []);

  return (
    <PusherContext.Provider value={{ pusher }}>
      {children}
    </PusherContext.Provider>
  );
}

export function usePusher() {
  const context = useContext(PusherContext);
  if (context === undefined) {
    throw new Error("usePusher must be used within a PusherProvider");
  }
  return context;
}
