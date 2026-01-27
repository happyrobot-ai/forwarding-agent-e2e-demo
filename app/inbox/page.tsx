"use client";

import { useEffect, useState } from "react";
import { useSSE } from "@/hooks/useSSE";
import { CHANNELS } from "@/lib/channels";
import { cn } from "@/lib/utils";
import { Mail, User, Clock, Tag, AlertCircle, CheckCircle2, Circle } from "lucide-react";

interface Email {
  id: string;
  emailId: string;
  fromName: string;
  fromEmail: string;
  fromCompany: string;
  subject: string;
  receivedAt: string;
  classification: string;
  intent: string;
  priority: string;
  status: string;
  assignedRepName?: string;
  linkedShipment?: string;
  summary: string;
  missingInfo: string[];
  tags: string[];
  highlight: boolean;
}

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [filterNeedsAttention, setFilterNeedsAttention] = useState(false);

  // Fetch emails
  const fetchEmails = async () => {
    try {
      const response = await fetch('/api/emails');
      const data = await response.json();
      setEmails(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  // Real-time updates via SSE
  useSSE({
    channels: [CHANNELS.EMAIL_RECEIVED],
    onEvent: (event) => {
      if (event.channel === CHANNELS.EMAIL_RECEIVED) {
        fetchEmails(); // Refresh emails
      }
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/20 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      case 'NEW':
        return <Circle className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getClassificationLabel = (classification: string) => {
    const labels: Record<string, string> = {
      'QUOTE_REQUEST': 'Quote Request',
      'BOOKING_CONFIRMATION': 'Booking Confirmation',
      'STATUS_INQUIRY': 'Status Inquiry',
      'DOCUMENTATION': 'Documentation',
      'ALERT_RESPONSE': 'Alert Response',
      'GENERAL': 'General',
    };
    return labels[classification] || classification;
  };

  // Filter emails that need attention
  const needsAttention = (email: Email) => {
    return (
      email.status === 'NEW' ||
      email.status === 'PENDING' ||
      email.highlight ||
      email.priority === 'URGENT' ||
      email.priority === 'HIGH'
    );
  };

  // Apply filter
  const filteredEmails = filterNeedsAttention
    ? emails.filter(needsAttention)
    : emails;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#1A1D29]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] dark:border-[#4D7CA8] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#1A1D29]">
      {/* Header */}
      <div className="border-b border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A]">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#003366] dark:text-white">
                Communication Analyzer
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                AI-classified customer requests
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Needs Attention:</span>
                <span className="ml-2 font-semibold text-orange-600 dark:text-orange-400">
                  {emails.filter(needsAttention).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="p-8">
        <div className="space-y-3">
          {emails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No emails yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Emails will appear here when received
              </p>
            </div>
          ) : (
            emails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(selectedEmail?.id === email.id ? null : email)}
                className={cn(
                  "border rounded-lg transition-all duration-200 cursor-pointer",
                  email.highlight
                    ? "border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10"
                    : "border-[#E8EAED] dark:border-[#3A3F52] bg-white dark:bg-[#24273A] hover:bg-[#F5F6F8] dark:hover:bg-[#2A2E42]",
                  selectedEmail?.id === email.id && "ring-2 ring-[#003366] dark:ring-[#4D7CA8]"
                )}
              >
                <div className="p-5">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getStatusIcon(email.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {email.fromName}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {email.fromCompany}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {email.subject}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Open email in new window or modal
                          window.open(`mailto:${email.fromEmail}?subject=Re: ${email.subject}`, '_blank');
                        }}
                      >
                        <Mail className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <span className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-md border",
                        getPriorityColor(email.priority)
                      )}>
                        {email.priority === 'URGENT' ? 'NEEDS ATTENTION' : email.priority}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(email.receivedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    {email.summary}
                  </p>

                  {/* Tags and Classification */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-[#003366] dark:bg-[#4D7CA8] text-white">
                      {getClassificationLabel(email.classification)}
                    </span>
                    {email.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Missing Info Alert */}
                  {email.missingInfo.length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-orange-900 dark:text-orange-200 mb-1">
                          Missing Information
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {email.missingInfo.map((info) => (
                            <span
                              key={info}
                              className="px-2 py-1 text-xs font-medium rounded bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                            >
                              {info}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assigned Rep & Linked Shipment */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {email.assignedRepName && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Assigned to:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {email.assignedRepName}
                        </span>
                      </div>
                    )}
                    {email.linkedShipment && (
                      <div className="flex items-center gap-2 text-sm">
                        <Tag className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Shipment:</span>
                        <span className="font-mono text-xs font-medium text-[#003366] dark:text-[#4D7CA8]">
                          {email.linkedShipment}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
