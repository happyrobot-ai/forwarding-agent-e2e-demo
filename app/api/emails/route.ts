import { NextResponse } from 'next/server';
import emailSeedData from '@/lib/seed-data/email-inbox.json';

// Define the email type for better type safety
interface SeedEmail {
  emailId: string;
  threadId: string;
  from: { name: string; email: string; company: string };
  subject: string;
  receivedAt: string;
  classification: string;
  intent: string;
  priority: string;
  status: string;
  assignedRep: string | null;
  linkedShipment: string | null;
  missingInfo?: string[];
  tags: string[];
  read?: boolean;
  highlight?: boolean;
  isKeyDemo?: boolean;
  attachments?: string[];
  bodyHtml?: string;
}

// Transform seed data email to API format
function transformSeedEmail(email: SeedEmail, index: number) {
  return {
    id: email.emailId,
    emailId: email.emailId,
    fromName: email.from.name,
    fromEmail: email.from.email,
    fromCompany: email.from.company,
    subject: email.subject,
    receivedAt: email.receivedAt,
    classification: email.classification,
    intent: email.intent,
    priority: email.priority,
    status: email.status,
    assignedRepName: email.assignedRep || null,
    linkedShipment: email.linkedShipment || null,
    summary: email.subject, // Use subject as summary for demo
    missingInfo: email.missingInfo || [],
    tags: email.tags,
    highlight: email.highlight || false,
    isKeyDemo: email.isKeyDemo || false,
    originalIndex: index, // Preserve original order for demo items
    bodyHtml: email.bodyHtml || null, // HTML email body for display
  };
}

// Get all emails - uses seed data for demo (no database required)
export async function GET() {
  try {
    // Use seed data directly for demo purposes
    const emails = (emailSeedData.emails as SeedEmail[]).map(transformSeedEmail);

    // Sort with key demo items first (preserving their original order),
    // then highlighted/urgent emails
    const sorted = emails.sort((a, b) => {
      // Key demo items first, preserving their original order (first 2 items)
      if (a.isKeyDemo && a.originalIndex < 2 && (!b.isKeyDemo || b.originalIndex >= 2)) return -1;
      if (b.isKeyDemo && b.originalIndex < 2 && (!a.isKeyDemo || a.originalIndex >= 2)) return 1;
      if (a.isKeyDemo && b.isKeyDemo && a.originalIndex < 2 && b.originalIndex < 2) {
        return a.originalIndex - b.originalIndex;
      }

      // Highlighted emails next
      if (a.highlight && !b.highlight) return -1;
      if (!a.highlight && b.highlight) return 1;

      // Then by priority (URGENT > HIGH > MEDIUM > LOW)
      const priorityOrder: Record<string, number> = {
        URGENT: 0,
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3
      };
      const aPriority = priorityOrder[a.priority] ?? 4;
      const bPriority = priorityOrder[b.priority] ?? 4;
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Finally by received date (newest first)
      return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error('[Emails API] Error:', error);
    
    // Return empty array instead of error to prevent page crash
    return NextResponse.json([], { status: 200 });
  }
}
