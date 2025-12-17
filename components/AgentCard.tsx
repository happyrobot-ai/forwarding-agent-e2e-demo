"use client";

import { Phone, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
  id: number;
  runId: string;
  agentRole: string;
  agentName: string;
  status: string;
}

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const getStatusIcon = () => {
    switch (agent.status) {
      case "IDLE":
        return <Phone className="h-5 w-5 text-gray-400" />;
      case "RUNNING":
      case "ACTIVE":
        return (
          <div className="relative">
            <Phone className="h-5 w-5 text-green-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
        );
      case "COMPLETED":
      case "FINISHED":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />;
    }
  };

  const getStatusLabel = () => {
    switch (agent.status) {
      case "IDLE":
        return "Ready";
      case "RUNNING":
      case "ACTIVE":
        return "Calling...";
      case "COMPLETED":
      case "FINISHED":
        return "Success";
      case "FAILED":
        return "Failed";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = () => {
    switch (agent.status) {
      case "IDLE":
        return "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700";
      case "RUNNING":
      case "ACTIVE":
        return "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 shadow-lg shadow-green-500/20";
      case "COMPLETED":
      case "FINISHED":
        return "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700";
      case "FAILED":
        return "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700";
      default:
        return "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700";
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl p-4 border-2 transition-all duration-300",
        getStatusColor()
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
              {agent.agentName}
            </h4>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Role: {agent.agentRole.replace("_", " ")}
          </p>
        </div>
        <div
          className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            agent.status === "RUNNING" || agent.status === "ACTIVE"
              ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
              : agent.status === "COMPLETED" || agent.status === "FINISHED"
              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
              : agent.status === "FAILED"
              ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          )}
        >
          {getStatusLabel()}
        </div>
      </div>

      {/* Waveform animation for active calls */}
      {(agent.status === "RUNNING" || agent.status === "ACTIVE") && (
        <div className="mt-3 flex items-center justify-center gap-1 h-8">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-green-500 rounded-full animate-wave"
              style={{
                animationDelay: `${i * 0.1}s`,
                height: "100%",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
