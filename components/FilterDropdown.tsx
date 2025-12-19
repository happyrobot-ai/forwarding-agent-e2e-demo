"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  className?: string;
  label?: string; // Optional: To show "Status: Active" instead of just "Active"
}

export function FilterDropdown({
  value,
  onChange,
  options,
  placeholder,
  className,
  label
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const isActive = !!value;

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* --- Trigger Button --- */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 w-full justify-between min-w-[140px]",
          "bg-zinc-900/50 hover:bg-zinc-800",
          isOpen 
            ? "border-blue-500/50 text-blue-400 ring-1 ring-blue-500/20" 
            : isActive
              ? "border-blue-500/30 text-blue-400 bg-blue-500/5"
              : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <Filter className={cn("h-3.5 w-3.5", isActive ? "opacity-100" : "opacity-50")} />
          <span className="truncate">
            {isActive 
              ? (label ? `${label}: ${value}` : value) 
              : placeholder}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-zinc-500 transition-transform duration-200",
            isOpen && "rotate-180 text-blue-400"
          )}
        />
      </button>

      {/* --- Dropdown Panel --- */}
      {isOpen && (
        <div className={cn(
          "absolute top-full left-0 mt-2 z-50 min-w-[180px] w-full max-h-[300px] flex flex-col",
          "bg-[#0c0c0e]/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl shadow-black/50",
          "animate-in fade-in zoom-in-95 duration-100 origin-top-left"
        )}>
          
          {/* Header (Only if active, allows quick clear) */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
              Select {label || "Option"}
            </span>
            {isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-[10px] text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {/* "All" Option */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors font-mono",
                !value 
                  ? "bg-blue-500/10 text-blue-400" 
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
            >
              <span>All {placeholder}s</span>
              {!value && <Check className="h-3 w-3" />}
            </button>

            {/* Dynamic Options */}
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors font-mono",
                  value === option
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
              >
                <span className="truncate">{option}</span>
                {value === option && <Check className="h-3 w-3" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}