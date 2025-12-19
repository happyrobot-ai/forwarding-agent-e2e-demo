"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { DollarSign, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceRangeSliderProps {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  onChange: (min: number, max: number) => void;
  className?: string;
}

export function PriceRangeSlider({
  min,
  max,
  minValue,
  maxValue,
  onChange,
  className,
}: PriceRangeSliderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localMin, setLocalMin] = useState(minValue);
  const [localMax, setLocalMax] = useState(maxValue);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasFilter = minValue > min || maxValue < max;

  // Sync props to state when popup opens
  useEffect(() => {
    if (isOpen) {
      setLocalMin(minValue);
      setLocalMax(maxValue);
    }
  }, [isOpen, minValue, maxValue]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Commit changes on close
        if (isOpen) {
          onChange(localMin, localMax);
          setIsOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, localMin, localMax, onChange]);

  // Helpers
  const getPercentage = (value: number) => ((value - min) / (max - min)) * 100;
  
  const formatCompact = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: "compact", maximumFractionDigits: 1 }).format(val);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'min' | 'max') => {
    const val = Number(e.target.value);
    if (type === 'min') {
      setLocalMin(Math.min(val, localMax - 1000));
    } else {
      setLocalMax(Math.max(val, localMin + 1000));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'min' | 'max') => {
    // Strip non-numeric
    const val = Number(e.target.value.replace(/[^0-9]/g, ''));
    if (type === 'min') setLocalMin(val);
    else setLocalMax(val);
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* --- Trigger Button --- */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200",
          "bg-zinc-900/50 hover:bg-zinc-800",
          isOpen 
            ? "border-blue-500/50 text-blue-400 ring-1 ring-blue-500/20" 
            : hasFilter 
              ? "border-blue-500/30 text-blue-400" 
              : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
        )}
      >
        <DollarSign className="h-3.5 w-3.5 opacity-70" />
        <span className="font-mono">
          {hasFilter ? `${formatCompact(minValue)} - ${formatCompact(maxValue)}` : "Price"}
        </span>
      </button>

      {/* --- Dropdown Panel --- */}
      {isOpen && (
        <div className={cn(
          "absolute top-full right-0 mt-2 z-50 w-[300px] p-5",
          "bg-[#0c0c0e]/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl shadow-black/50",
          "animate-in fade-in zoom-in-95 duration-100"
        )}>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
              Filter Range
            </span>
            {hasFilter && (
              <button
                onClick={() => {
                  setLocalMin(min);
                  setLocalMax(max);
                  onChange(min, max);
                }}
                className="text-[10px] text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Reset
              </button>
            )}
          </div>

          {/* Visualization / Inputs */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
              <input
                type="text"
                value={localMin}
                onChange={(e) => handleInputChange(e, 'min')}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 pl-5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
            <span className="text-zinc-600 text-xs font-mono">-</span>
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
              <input
                type="text"
                value={localMax}
                onChange={(e) => handleInputChange(e, 'max')}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 pl-5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Slider Graphic */}
          <div className="relative h-6 mb-2 group">
            {/* Track Background */}
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
               {/* Active Range (Blue) */}
               <div
                className="absolute h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                style={{
                  left: `${getPercentage(localMin)}%`,
                  right: `${100 - getPercentage(localMax)}%`,
                }}
              />
            </div>

            {/* Inputs Wrapper (Invisible but clickable) */}
            {/* Min Thumb Input */}
            <input
              type="range"
              min={min}
              max={max}
              step={1000}
              value={localMin}
              onChange={(e) => handleSliderChange(e, 'min')}
              className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none z-20 
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto 
              [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
              [&::-webkit-slider-thumb]:bg-zinc-950 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-500 
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:cursor-grabbing
              [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110"
            />

            {/* Max Thumb Input */}
            <input
              type="range"
              min={min}
              max={max}
              step={1000}
              value={localMax}
              onChange={(e) => handleSliderChange(e, 'max')}
              className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none z-30
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto 
              [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
              [&::-webkit-slider-thumb]:bg-zinc-950 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-500 
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:cursor-grabbing
              [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110"
            />
          </div>

          {/* Quick Helper Text */}
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-2">
            <span>{formatCompact(min)}</span>
            <span>{formatCompact(max)}</span>
          </div>
        </div>
      )}
    </div>
  );
}