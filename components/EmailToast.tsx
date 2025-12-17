"use client";

import { Mail, X } from "lucide-react";
import { useEffect, useState } from "react";

interface EmailToastProps {
  onClose: () => void;
}

export function EmailToast({ onClose }: EmailToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  return (
    <div
      className={`fixed top-4 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden transform transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      {/* Header */}
      <div className="bg-green-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-white" />
          <span className="font-semibold text-white">Email Sent</span>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-green-700 rounded p-1 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">To:</div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            texas.quality.meats@example.com
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Subject:
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            Pickup Confirmation - Load #9901
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Message:
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-white/10">
            Driver Marcus (Fleet #882) is en route to your facility for pickup
            of 5 pallets Prime Rib.
            <br />
            <br />
            <strong>ETA:</strong> 15 minutes
            <br />
            <br />
            Please have loading dock ready.
            <br />
            <br />
            Contact: dispatch@sysco.com
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-white/10">
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <span>Automated by AI Agent</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
