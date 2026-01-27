import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Get all emails
export async function GET() {
  try {
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 10000);
    });

    const emailsPromise = prisma.email.findMany({
      orderBy: { receivedAt: 'desc' },
    });

    const emails = await Promise.race([emailsPromise, timeoutPromise]) as any[];

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
    
    // Return empty array instead of error to prevent page crash
    return NextResponse.json([], { status: 200 });
  }
}
