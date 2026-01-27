import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Get all emails
export async function GET() {
  try {
    const emails = await prisma.email.findMany({
      orderBy: { receivedAt: 'desc' },
    });

    // Sort highlighted/urgent emails first
    const sorted = emails.sort((a, b) => {
      // Highlighted emails first
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
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}
