import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { publishEvent, CHANNELS } from '@/lib/redis';

// Receive webhooks from HappyRobot
export async function POST(request: NextRequest) {
  try {
    // Optional: Validate webhook using X-API-KEY
    const apiKey = request.headers.get('X-API-KEY');
    const expectedKey = process.env.HAPPYROBOT_X_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse payload
    const payload = await request.json();
    const { run_id, event_type, data, timestamp } = payload;

    console.log('[HappyRobot Webhook] Received:', { run_id, event_type });

    if (!run_id) {
      return NextResponse.json(
        { error: 'run_id is required' },
        { status: 400 }
      );
    }

    // Find the run
    const run = await prisma.happyRobotRun.findUnique({
      where: { runId: run_id },
    });

    if (!run) {
      console.warn(`[HappyRobot Webhook] Unknown run: ${run_id}`);
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    // Handle different event types
    let updatedRun;
    const currentMetadata = run.metadata as any;

    switch (event_type) {
      case 'log':
        // Append log to metadata
        updatedRun = await prisma.happyRobotRun.update({
          where: { runId: run_id },
          data: {
            metadata: {
              ...currentMetadata,
              logs: [...(currentMetadata.logs || []), { timestamp, ...data }],
            },
          },
        });
        break;

      case 'completed':
        updatedRun = await prisma.happyRobotRun.update({
          where: { runId: run_id },
          data: {
            status: 'COMPLETED',
            metadata: {
              ...currentMetadata,
              result: data,
              completedAt: timestamp,
            },
          },
        });
        break;

      case 'failed':
        updatedRun = await prisma.happyRobotRun.update({
          where: { runId: run_id },
          data: {
            status: 'FAILED',
            metadata: {
              ...currentMetadata,
              error: data,
              failedAt: timestamp,
            },
          },
        });
        break;

      case 'running':
        updatedRun = await prisma.happyRobotRun.update({
          where: { runId: run_id },
          data: { status: 'RUNNING' },
        });
        break;

      default:
        console.log(`[HappyRobot Webhook] Unknown event type: ${event_type}`);
        updatedRun = run;
    }

    // Broadcast update via Redis SSE
    await publishEvent(CHANNELS.SHIPMENT_UPDATED, {
      type: 'happyrobot_update',
      runId: run_id,
      contextType: run.contextType,
      contextId: run.contextId,
      eventType: event_type,
      status: updatedRun.status,
      data,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[HappyRobot Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
