"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, LucideIcon, MessageSquare, Users, Map } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";


export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const isCollapsed = !isHovered;

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
      href: "/contacts",
      icon: Users,
      label: "Contact Intelligence",
      subtitle: "Customer Insights",
    },
    {
      href: "/inbox",
      icon: MessageSquare,
      label: "Communications",
      subtitle: "Receptionist",
    },
    {
      href: "/map",
      icon: Map,
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

  return (
    <div className="min-h-screen bg-white dark:bg-[#1A1D29] flex">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "fixed left-0 top-0 h-screen z-40",
          "bg-[#FAFBFC] dark:bg-[#3A4055] backdrop-blur-xl",
          "border-r border-[#E8EAED] dark:border-[#4A5068]",
          "flex flex-col transition-all duration-300 ease-out",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "h-16 flex items-center border-b border-[#E8EAED] dark:border-[#4A5068]",
            "transition-all duration-300",
            isCollapsed ? "px-4 justify-center" : "px-5"
          )}
        >
          <div className="relative flex items-center">
            {isCollapsed ? (
              <Image
                src="/ceva/ceva-logo.png"
                alt="CEVA"
                width={32}
                height={32}
                className="object-contain"
              />
            ) : (
              <Image
                src="/ceva/ceva-logo.png"
                alt="CEVA Logistics"
                width={140}
                height={40}
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

        {/* Theme Toggle */}
        <div
          className={cn(
            "px-3 py-3 border-t border-[#E8EAED] dark:border-[#4A5068]",
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

        {/* Powered by Footer - CEVA + HappyRobot co-branding */}
        <div
          className={cn(
            "px-4 py-4 border-t border-[#E8EAED] dark:border-[#4A5068]",
            isCollapsed && "px-3"
          )}
        >
          {isCollapsed ? (
            <div className="flex justify-center">
              <Image
                src="/happyrobot/hr-icon-black.png"
                alt="HappyRobot"
                width={24}
                height={24}
                className={cn("object-contain", theme === "dark" && "invert")}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Powered by
              </div>
              <div className="flex items-center gap-2">
                <Image
                  src="/ceva/ceva-logo.png"
                  alt="CEVA"
                  width={60}
                  height={20}
                  className="object-contain"
                />
                <span className="text-xs text-zinc-400 dark:text-zinc-500">+</span>
                <Image
                  src="/happyrobot/hr-icon-black.png"
                  alt="HappyRobot"
                  width={18}
                  height={18}
                  className={cn("object-contain", theme === "dark" && "invert")}
                />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">HappyRobot</span>
              </div>
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
