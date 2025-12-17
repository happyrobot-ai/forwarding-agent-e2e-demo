"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, Truck, Brain } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  // Sidebar is collapsed by default, expands on hover
  const isCollapsed = !isHovered;

  const navItems = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
      subtitle: "Overview & Alerts",
    },
    {
      href: "/orders",
      icon: Package,
      label: "Orders",
      subtitle: "Order Management",
    },
    {
      href: "/fleet",
      icon: Truck,
      label: "Fleet",
      subtitle: "Vehicle Tracking",
    },
    {
      href: "/agents",
      icon: Brain,
      label: "AI Agents",
      subtitle: "Orchestration",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] flex">
      {/* Sidebar - Hover to expand */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "bg-white dark:bg-[#1A1A1A] border-r border-gray-200 dark:border-white/10 flex flex-col relative transition-all duration-300 ease-in-out h-screen",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo Header */}
        <div
          className={cn(
            "px-6 flex flex-col items-center justify-center border-b border-gray-200 dark:border-white/10 transition-all duration-300",
            isCollapsed ? "px-2 pt-6 pb-6" : "pt-6 pb-6"
          )}
        >
          <div
            className={cn(
              "font-bold text-blue-600 dark:text-blue-400 transition-all duration-300",
              isCollapsed ? "text-2xl" : "text-3xl"
            )}
          >
            {isCollapsed ? "S" : "SYSCO"}
          </div>
          {!isCollapsed && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Supply Chain AI
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            const navLink = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl transition-all duration-200 group relative",
                  isCollapsed ? "px-3 py-3 justify-center" : "px-4 py-3",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive
                      ? "text-white"
                      : "text-gray-500 dark:text-white/50 group-hover:text-gray-900 dark:group-hover:text-white/70"
                  )}
                />
                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "text-sm font-medium",
                          isActive
                            ? "text-white"
                            : "text-gray-900 dark:text-white/90"
                        )}
                      >
                        {item.label}
                      </div>
                      <div
                        className={cn(
                          "text-xs mt-0.5",
                          isActive
                            ? "text-white/80"
                            : "text-gray-500 dark:text-white/40"
                        )}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </>
                )}
              </Link>
            );

            // Wrap with tooltip when collapsed
            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-100"
                  >
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-300 dark:text-gray-400">
                      {item.subtitle}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navLink;
          })}
        </nav>

        {/* Theme Toggle */}
        <div
          className={cn(
            "px-3 py-4 border-t border-gray-200 dark:border-white/10",
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
            "p-4 border-t border-gray-200 dark:border-white/10",
            isCollapsed && "px-2"
          )}
        >
          {isCollapsed ? (
            <div className="flex justify-center">
              <div className="text-xs text-gray-400 dark:text-white/30 font-bold">
                AI
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/30">
                Powered by
              </div>
              <div className="text-sm font-semibold text-gray-700 dark:text-white/70">
                HappyRobot AI
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
