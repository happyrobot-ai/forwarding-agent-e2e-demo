import { NextRequest, NextResponse } from 'next/server';
import { publishEvent, CHANNELS } from '@/lib/redis';
import prisma from '@/lib/db';

// HappyRobot webhook for email received
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Save email to database
    const email = await prisma.email.create({
      data: {
        emailId: data.emailId,
        threadId: data.threadId,
        fromName: data.from.name,
        fromEmail: data.from.email,
        fromCompany: data.from.company,
        toEmail: data.to,
        subject: data.subject,
        receivedAt: new Date(data.receivedAt),
        classification: data.classification,
        intent: data.intent,
        priority: data.priority,
        status: data.status,
        assignedRepName: data.assignedRep?.name,
        assignedRepEmail: data.assignedRep?.email,
        linkedShipment: data.linkedShipment,
        summary: data.summary,
        missingInfo: data.missingInfo || [],
        tags: data.tags || [],
        highlight: data.highlight || false,
      },
    });

    // Publish to Redis for real-time updates
    await publishEvent(CHANNELS.EMAIL_RECEIVED, {
      email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error('[Email Webhook] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process email' },
      { status: 500 }
    );
  }
}
