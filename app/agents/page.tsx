"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePusher } from "@/components/PusherProvider";
import { useTheme } from "@/components/ThemeProvider";
import {
  Clock,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
  id: number;
  agent_id: string;
  agent_name: string;
  summary: string;
  status: string;
  link: string;
  run_id: string;
  created_at: string;
  updated_at: string;
}

export default function AgentsPage() {
  const { pusher } = usePusher();
  const { theme } = useTheme();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const getHappyRobotLogo = () => {
    return theme === "dark"
      ? "/happyrobot/Footer-logo-white.png"
      : "/happyrobot/Footer-logo-black.png";
  };

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        if (Array.isArray(data)) {
          setAgents(data);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching agents:", error);
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, []);

  useEffect(() => {
    if (!pusher) return;

    const channel = pusher.subscribe("sysco-demo");

    channel.bind("agent-update", () => {
      fetch("/api/agents")
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setAgents(data));
    });

    channel.bind("demo-started", () => {
      fetch("/api/agents")
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setAgents(data));
    });

    channel.bind("demo-complete", () => {
      fetch("/api/agents")
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setAgents(data));
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("sysco-demo");
    };
  }, [pusher]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAgents(data);
      }
    } catch (error) {
      console.error("Error refreshing agents:", error);
    }
    setIsLoading(false);
  };

  const statusConfig: Record<
    string,
    { bg: string; text: string; icon: typeof CheckCircle; border: string }
  > = {
    IDLE: {
      bg: "bg-zinc-500/10",
      text: "text-zinc-400",
      icon: Clock,
      border: "border-zinc-500/30",
    },
    RUNNING: {
      bg: "bg-[var(--status-info-bg)]",
      text: "text-[var(--status-info-text)]",
      icon: Loader2,
      border: "border-[var(--status-info-border)]",
    },
    ACTIVE: {
      bg: "bg-violet-500/10",
      text: "text-violet-400",
      icon: Activity,
      border: "border-violet-500/30",
    },
    COMPLETED: {
      bg: "bg-[var(--status-success-bg)]",
      text: "text-[var(--status-success-text)]",
      icon: CheckCircle,
      border: "border-[var(--status-success-border)]",
    },
    FINISHED: {
      bg: "bg-[var(--status-success-bg)]",
      text: "text-[var(--status-success-text)]",
      icon: CheckCircle,
      border: "border-[var(--status-success-border)]",
    },
    FAILED: {
      bg: "bg-[var(--status-error-bg)]",
      text: "text-[var(--status-error-text)]",
      icon: XCircle,
      border: "border-[var(--status-error-border)]",
    },
  };

  const getStatusConfig = (status: string) =>
    statusConfig[status] || statusConfig.IDLE;

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.run_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const uniqueStatuses = Array.from(new Set(agents.map((a) => a.status)));

  const stats = {
    total: agents.length,
    running: agents.filter(
      (a) => a.status === "RUNNING" || a.status === "ACTIVE"
    ).length,
    completed: agents.filter(
      (a) => a.status === "COMPLETED" || a.status === "FINISHED"
    ).length,
    failed: agents.filter((a) => a.status === "FAILED").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--sysco-bg)]">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="font-mono text-sm">LOADING AGENTS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--sysco-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--sysco-bg)]/80 backdrop-blur-xl border-b border-[var(--sysco-border)]">
        <div className="px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
              AI Agents
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Image
                src={getHappyRobotLogo()}
                alt="HappyRobot"
                width={14}
                height={14}
                className="object-contain"
              />
              <span className="text-sm text-zinc-500 font-mono">
                HAPPYROBOT AI ORCHESTRATION
              </span>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200",
              "bg-[var(--sysco-surface)] hover:bg-zinc-200 dark:hover:bg-zinc-800",
              "text-zinc-700 dark:text-zinc-300",
              "border border-[var(--sysco-border)]",
              "flex items-center gap-2"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={cn(
            "relative overflow-hidden rounded-xl p-4",
            "bg-[var(--sysco-card)] border border-[var(--sysco-border)]"
          )}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--sysco-surface)] border border-[var(--sysco-border)] flex items-center justify-center">
                <Image
                  src={getHappyRobotLogo()}
                  alt="HappyRobot"
                  width={20}
                  height={20}
                  className="object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Total Agents
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white font-mono">
                  {stats.total}
                </p>
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-xl" />
          </div>
          <div className={cn(
            "relative overflow-hidden rounded-xl p-4",
            "bg-[var(--sysco-card)] border border-[var(--sysco-border)]"
          )}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              </div>
              <div>
                <p className="text-xs font-medium text-blue-500 uppercase tracking-wider">
                  Running
                </p>
                <p className="text-2xl font-bold text-blue-500 font-mono">
                  {stats.running}
                </p>
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-blue-500/10 blur-xl" />
          </div>
          <div className={cn(
            "relative overflow-hidden rounded-xl p-4",
            "bg-[var(--sysco-card)] border border-[var(--sysco-border)]"
          )}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-500 uppercase tracking-wider">
                  Completed
                </p>
                <p className="text-2xl font-bold text-emerald-500 font-mono">
                  {stats.completed}
                </p>
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-emerald-500/10 blur-xl" />
          </div>
          <div className={cn(
            "relative overflow-hidden rounded-xl p-4",
            "bg-[var(--sysco-card)] border border-[var(--sysco-border)]"
          )}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-red-500 uppercase tracking-wider">
                  Failed
                </p>
                <p className="text-2xl font-bold text-red-500 font-mono">
                  {stats.failed}
                </p>
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-red-500/10 blur-xl" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-2.5 rounded-lg text-sm",
                "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
                "text-zinc-900 dark:text-white placeholder-zinc-500",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              )}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={cn(
                "pl-10 pr-8 py-2.5 rounded-lg text-sm appearance-none",
                "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
                "text-zinc-900 dark:text-white",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              )}
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Agents Table */}
        <div className={cn(
          "rounded-xl overflow-hidden",
          "bg-[var(--sysco-card)] border border-[var(--sysco-border)]",
          "shadow-sm"
        )}>
          <div className="px-6 py-4 border-b border-[var(--sysco-border)] flex items-center justify-between bg-[var(--sysco-surface)]">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                Agent Runs
              </h2>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                {filteredAgents.length} OF {agents.length} AGENTS
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>

          {filteredAgents.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--sysco-surface)] flex items-center justify-center mx-auto mb-3">
                <Image
                  src={getHappyRobotLogo()}
                  alt="HappyRobot"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <p className="text-zinc-400 font-medium">No agents found</p>
              <p className="text-sm text-zinc-600 mt-1">
                {agents.length === 0
                  ? "Trigger a demo incident to see agents in action"
                  : "Try adjusting your search or filters"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--sysco-border)] bg-[var(--sysco-surface)] text-xs font-medium uppercase text-zinc-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Agent</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Summary</th>
                    <th className="px-6 py-3">Run ID</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sysco-border)]">
                  {filteredAgents.map((agent) => {
                    const config = getStatusConfig(agent.status);
                    const StatusIcon = config.icon;
                    return (
                      <tr
                        key={agent.id}
                        className="group hover:bg-[var(--sysco-surface)] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                              <Image
                                src={getHappyRobotLogo()}
                                alt="HappyRobot"
                                width={20}
                                height={20}
                                className="object-contain"
                              />
                            </div>
                            <span className="font-medium text-zinc-200">
                              {agent.agent_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                              config.bg,
                              config.text,
                              config.border
                            )}
                          >
                            <StatusIcon
                              className={cn(
                                "h-3 w-3",
                                agent.status === "RUNNING" && "animate-spin"
                              )}
                            />
                            {agent.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <span className="text-zinc-400 line-clamp-2">
                            {agent.summary}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-zinc-500 font-mono text-xs">
                            {agent.run_id.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                          {new Date(agent.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          {agent.link ? (
                            <a
                              href={agent.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-400 font-medium text-xs"
                            >
                              View
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
