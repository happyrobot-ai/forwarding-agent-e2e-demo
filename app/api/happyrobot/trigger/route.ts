import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { triggerHappyRobotWorkflow, getHappyRobotRunUrl } from '@/lib/happyrobot';

// Trigger a HappyRobot workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contextType, contextId, name, description, ...workflowData } = body;

    if (!contextType || !contextId) {
      return NextResponse.json(
        { error: 'contextType and contextId are required' },
        { status: 400 }
      );
    }

    // Trigger HappyRobot workflow
    const runIds = await triggerHappyRobotWorkflow({
      context_type: contextType,
      context_id: contextId,
      ...workflowData,
    });

    // Save runs to database
    const runs = await Promise.all(
      runIds.map(async (runId: string) => {
        const platformUrl = getHappyRobotRunUrl(runId);

        return prisma.happyRobotRun.create({
          data: {
            runId,
            contextType,
            contextId,
            name: name || 'HappyRobot Run',
            description: description || null,
            status: 'RUNNING',
            platformUrl,
            metadata: {},
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      runs: runs.map(r => ({
        id: r.id,
        runId: r.runId,
        status: r.status,
        platformUrl: r.platformUrl,
      })),
    });
  } catch (error) {
    console.error('[HappyRobot Trigger] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger workflow'
      },
      { status: 500 }
    );
  }
}
