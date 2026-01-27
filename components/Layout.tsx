"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ChevronRight, LucideIcon, RotateCcw, Settings, X, Phone, Play, Loader2, AlertTriangle } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";


// Demo Config Modal Component
function DemoConfigModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [centerPhone, setCenterPhone] = useState("");
  const [truckerPhone, setTruckerPhone] = useState("");

  // Demo trigger state
  const [orderId, setOrderId] = useState("ORD-8128");
  const [description, setDescription] = useState(
    "Samsara reports truck came to a stop on Highway 287. Driver confirmed engine failure with smoke coming out of the truck"
  );
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [triggerSuccess, setTriggerSuccess] = useState(false);

  // Load saved values from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCenterPhone(localStorage.getItem("demo_center_phone") || "");
      setTruckerPhone(localStorage.getItem("demo_trucker_phone") || "");
    }
  }, [isOpen]);

  // Reset trigger state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTriggerError(null);
      setTriggerSuccess(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem("demo_center_phone", centerPhone);
    localStorage.setItem("demo_trucker_phone", truckerPhone);
  };

  const handleTriggerDemo = async () => {
    // Validate all required fields
    const errors: string[] = [];

    if (!orderId.trim()) {
      errors.push("Order ID");
    }
    if (!description.trim()) {
      errors.push("Incident Description");
    }
    if (!centerPhone.trim()) {
      errors.push("Service Centers Phone");
    }
    if (!truckerPhone.trim()) {
      errors.push("Drivers Phone");
    }

    if (errors.length > 0) {
      setTriggerError(`Required: ${errors.join(", ")}`);
      return;
    }

    setIsTriggering(true);
    setTriggerError(null);
    setTriggerSuccess(false);

    // Save phone config first
    handleSave();

    try {
      const response = await fetch("/api/demo/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: orderId.trim(),
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to trigger demo: ${response.status}`);
      }

      setTriggerSuccess(true);
      // Close modal immediately after success
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("Error triggering demo:", error);
      setTriggerError(error instanceof Error ? error.message : "Failed to trigger demo");
    } finally {
      setIsTriggering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Settings className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Demo Configuration
              </h2>
              <p className="text-sm text-zinc-500">
                Configure and launch the demo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Demo Trigger Section */}
          <div className="space-y-4 pb-5 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Incident Simulation
              </span>
            </div>

            {/* Order ID */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Order ID
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="ORD-XXXX"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Incident Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the incident..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none"
              />
            </div>

            {/* Trigger Button */}
            <button
              onClick={handleTriggerDemo}
              disabled={isTriggering || triggerSuccess}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                triggerSuccess
                  ? "bg-emerald-500 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white",
                (isTriggering || triggerSuccess) && "opacity-80 cursor-not-allowed"
              )}
            >
              {isTriggering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Triggering Incident...
                </>
              ) : triggerSuccess ? (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Incident Triggered!
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Launch Demo
                </>
              )}
            </button>

            {/* Error Message */}
            {triggerError && (
              <p className="text-xs text-red-500 text-center">{triggerError}</p>
            )}
          </div>

          {/* Phone Configuration Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Roleplay Phone Numbers
              </span>
            </div>

            {/* Service Centers Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Service Centers & Warehouses Phone
              </label>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-500">
                Assigned to all 3 discovered facilities
              </p>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="tel"
                  value={centerPhone}
                  onChange={(e) => setCenterPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Truckers Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Available Drivers Phone
              </label>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-500">
                Assigned to all 3 discovered drivers
              </p>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="tel"
                  value={truckerPhone}
                  onChange={(e) => setTruckerPhone(e.target.value)}
                  placeholder="+1 (555) 987-6543"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Save Phone Config
          </button>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const isCollapsed = !isHovered;

  // Manhattan icon for Orders nav item
  const getManhattanIcon = () => {
    return theme === "dark"
      ? "/manhattan/manhattan_tms_white.png"
      : "/manhattan/mahnattan_tms_black.svg";
  };

  // Samsara icon for Fleet nav item
  const getSamsaraIcon = () => {
    return theme === "dark"
      ? "/samsara/Samsara_logo_primary_vertical_wht.png"
      : "/samsara/Samsara_logo_primary_vertical_blk.png";
  };

  // HappyRobot icon for Agents nav item
  const getHappyRobotIcon = () => {
    return theme === "dark"
      ? "/happyrobot/Footer-logo-white.png"
      : "/happyrobot/Footer-logo-black.png";
  };

  const navItems: {
    href: string;
    icon?: LucideIcon;
    customIcon?: string;
    label: string;
    subtitle: string;
  }[] = [
    {
      href: "/inbox",
      icon: LayoutDashboard,
      label: "Email Inbox",
      subtitle: "Customer Requests",
    },
    {
      href: "/shipments",
      icon: LayoutDashboard,
      label: "Shipments",
      subtitle: "Air Freight",
    },
    {
      href: "/map",
      icon: LayoutDashboard,
      label: "Map View",
      subtitle: "Live Tracking",
    },
    {
      href: "/agents",
      customIcon: getHappyRobotIcon(),
      label: "AI Agents",
      subtitle: "Orchestration",
    },
  ];

  // Logo selection based on theme and sidebar state
  const getLogoSrc = () => {
    if (isCollapsed) {
      return theme === "dark"
        ? "/happyrobot/Footer-logo-white.png"
        : "/happyrobot/Footer-logo-black.png";
    }
    return theme === "dark"
      ? "/happyrobot/Footer-expand-happyrobot_white.png"
      : "/happyrobot/Footer-expand-happyrobot-blacl.png";
  };

  // HappyRobot footer logo selection
  const getFooterLogoSrc = () => {
    if (isCollapsed) {
      return theme === "dark"
        ? "/happyrobot/Footer-logo-white.png"
        : "/happyrobot/Footer-logo-black.png";
    }
    return theme === "dark"
      ? "/happyrobot/Footer-expand-happyrobot_white.png"
      : "/happyrobot/Footer-expand-happyrobot-blacl.png";
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1A1D29] flex">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed left-0 top-0 h-screen z-40",
          "bg-[#FAFBFC]/95 dark:bg-[#24273A]/95 backdrop-blur-xl",
          "border-r border-[#E8EAED] dark:border-[#3A3F52]",
          "flex flex-col transition-all duration-300 ease-out",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "h-16 flex items-center border-b border-[#E8EAED] dark:border-[#3A3F52]",
            "transition-all duration-300",
            isCollapsed ? "px-4 justify-center" : "px-5"
          )}
        >
          <div className="relative flex items-center">
            {isCollapsed ? (
              <div className="flex items-center justify-center h-8 w-8 rounded bg-[#003366] dark:bg-[#4D7CA8]">
                <span className="text-white font-bold text-lg">D</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-8 w-8 rounded bg-[#003366] dark:bg-[#4D7CA8]">
                  <span className="text-white font-bold text-lg">D</span>
                </div>
                <span className="text-xl font-semibold text-[#003366] dark:text-[#4D7CA8]">DSV</span>
                <span className="text-sm text-[#8B92A3] ml-1">Air & Sea</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            const navLink = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg transition-all duration-200 group relative",
                  isCollapsed ? "px-3 py-2.5 justify-center" : "px-3 py-2.5",
                  isActive
                    ? "bg-[#003366] dark:bg-[#4D7CA8] text-white shadow-lg shadow-[#003366]/20"
                    : "text-gray-600 dark:text-gray-400 hover:bg-[#F5F6F8] dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white"
                )}
              >
                {item.customIcon ? (
                  <Image
                    src={item.customIcon}
                    alt={item.label}
                    width={20}
                    height={20}
                    className={cn(
                      "shrink-0 transition-all object-contain",
                      isActive
                        ? "brightness-0 invert" // Make white on blue active background
                        : "opacity-60 group-hover:opacity-80" // Soften to grey tones
                    )}
                  />
                ) : Icon ? (
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive
                        ? "text-white"
                        : "text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                    )}
                  />
                ) : null}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "text-sm font-medium transition-colors",
                        isActive ? "text-white" : ""
                      )}
                    >
                      {item.label}
                    </div>
                    <div
                      className={cn(
                        "text-xs mt-0.5 transition-colors",
                        isActive
                          ? "text-blue-100"
                          : "text-gray-400 dark:text-gray-500"
                      )}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                )}
                {!isCollapsed && isActive && (
                  <ChevronRight className="h-4 w-4 text-white/70" />
                )}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                  <TooltipContent
                    side="right"
                    sideOffset={12}
                    className="bg-gray-900 dark:bg-gray-800 text-white border-0 shadow-xl"
                  >
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-400">{item.subtitle}</div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navLink;
          })}
        </nav>

        {/* Config & Reset Buttons - Hidden until hovered */}
        {!isCollapsed && (
          <div className="px-3 py-2 border-t border-transparent hover:border-gray-200/60 dark:hover:border-white/[0.08] transition-all duration-300 group space-y-1">
            {/* Config Button - Above Reset */}
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg",
                "text-sm font-medium transition-all duration-300",
                "opacity-0 group-hover:opacity-100",
                "bg-transparent hover:bg-blue-100 dark:hover:bg-blue-900/30",
                "text-transparent group-hover:text-zinc-600 dark:group-hover:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400",
                "border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
              )}
            >
              <Settings className="h-4 w-4" />
              Configure Demo
            </button>
            {/* Reset Button */}
            <button
              onClick={async () => {
                try {
                  await fetch("/api/demo/reset", { method: "POST" });
                } catch (error) {
                  console.error("Error resetting demo:", error);
                }
              }}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg",
                "text-sm font-medium transition-all duration-300",
                "opacity-0 group-hover:opacity-100",
                "bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700",
                "text-transparent group-hover:text-zinc-600 dark:group-hover:text-zinc-400 hover:text-zinc-900 dark:hover:text-white",
                "border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
              )}
            >
              <RotateCcw className="h-4 w-4" />
              Reset Demo
            </button>
          </div>
        )}

        {/* Theme Toggle */}
        <div
          className={cn(
            "px-3 py-3 border-t border-gray-200/60 dark:border-white/[0.08]",
            isCollapsed && "px-2"
          )}
        >
          {isCollapsed ? (
            <div className="flex justify-center">
              <ThemeToggle variant="button" />
            </div>
          ) : (
            <ThemeToggle variant="switch" />
          )}
        </div>

        {/* Powered by Footer */}
        <div
          className={cn(
            "px-4 py-4 border-t border-gray-200/60 dark:border-white/[0.08]",
            isCollapsed && "px-3"
          )}
        >
          {isCollapsed ? (
            <div className="flex justify-center">
              <Image
                src={getFooterLogoSrc()}
                alt="HappyRobot AI"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Powered by
              </div>
              <Image
                src={getFooterLogoSrc()}
                alt="HappyRobot AI"
                width={140}
                height={28}
                className="object-contain"
              />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 min-h-screen transition-all duration-300",
          isCollapsed ? "ml-[72px]" : "ml-[72px]"
        )}
        style={{ marginLeft: "72px" }}
      >
        {children}
      </main>

      {/* Demo Configuration Modal */}
      <DemoConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
}
