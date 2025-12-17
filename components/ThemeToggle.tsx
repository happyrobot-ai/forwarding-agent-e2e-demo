"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant: "switch" | "button";
}

export function ThemeToggle({ variant }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  if (variant === "button") {
    return (
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-yellow-500" />
        ) : (
          <Moon className="h-5 w-5 text-gray-600" />
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-xl">
      <div className="flex items-center gap-3">
        {theme === "dark" ? (
          <Moon className="h-4 w-4 text-white/70" />
        ) : (
          <Sun className="h-4 w-4 text-gray-600" />
        )}
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {theme === "dark" ? "Dark" : "Light"} Mode
        </span>
      </div>
      <button
        onClick={toggleTheme}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          theme === "dark" ? "bg-blue-600" : "bg-gray-300"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            theme === "dark" ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}
