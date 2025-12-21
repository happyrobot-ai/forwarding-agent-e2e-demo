"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ChevronRight, LucideIcon, RotateCcw } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

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
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
      subtitle: "Overview & Alerts",
    },
    {
      href: "/orders",
      customIcon: getManhattanIcon(),
      label: "Orders",
      subtitle: "Order Management",
    },
    {
      href: "/fleet",
      customIcon: getSamsaraIcon(),
      label: "Fleet",
      subtitle: "Vehicle Tracking",
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
        ? "/sysco/sysco-logo-small-blue.png"
        : "/sysco/Sysco-logo-small.png";
    }
    return theme === "dark"
      ? "/sysco/Sysco-Logo-White1.png"
      : "/sysco/Sysco-Logo-Color1.png";
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] flex">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed left-0 top-0 h-screen z-40",
          "bg-white/80 dark:bg-[#18181B]/90 backdrop-blur-xl",
          "border-r border-gray-200/60 dark:border-white/[0.08]",
          "flex flex-col transition-all duration-300 ease-out",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "h-16 flex items-center border-b border-gray-200/60 dark:border-white/[0.08]",
            "transition-all duration-300",
            isCollapsed ? "px-4 justify-center" : "px-5"
          )}
        >
          <div className="relative flex items-center">
            {isCollapsed ? (
              <Image
                src={getLogoSrc()}
                alt="Sysco"
                width={40}
                height={40}
                className="object-contain"
              />
            ) : (
              <Image
                src={getLogoSrc()}
                alt="Sysco"
                width={120}
                height={36}
                className="object-contain"
              />
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
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white"
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

        {/* Reset Button - Only visible when expanded */}
        {!isCollapsed && (
          <div className="px-3 py-2 border-t border-gray-200/60 dark:border-white/[0.08]">
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
                "text-sm font-medium transition-all duration-200",
                "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700",
                "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white",
                "border border-zinc-200 dark:border-zinc-700"
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
    </div>
  );
}
