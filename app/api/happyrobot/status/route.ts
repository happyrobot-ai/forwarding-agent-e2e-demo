import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getHappyRobotRunStatus, mapHappyRobotStatus } from '@/lib/happyrobot';

// Get status of a HappyRobot run
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('run_id');

    if (!runId) {
      return NextResponse.json(
        { error: 'run_id query parameter is required' },
        { status: 400 }
      );
    }

    // Get from database
    const run = await prisma.happyRobotRun.findUnique({
      where: { runId },
    });

    if (!run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    // Try to get latest status from HappyRobot API
    let happyRobotStatus = null;
    const platformData = await getHappyRobotRunStatus(runId);

    if (platformData) {
      happyRobotStatus = platformData.status;
      const mappedStatus = mapHappyRobotStatus(happyRobotStatus);

      // Update database if status changed
      if (mappedStatus !== run.status) {
        await prisma.happyRobotRun.update({
          where: { runId },
          data: {
            status: mappedStatus as any,
            metadata: {
              ...run.metadata as any,
              lastPlatformSync: new Date().toISOString()
            },
          },
        });
      }
    }

    return NextResponse.json({
      runId,
      status: happyRobotStatus || run.status.toLowerCase(),
      name: run.name,
      description: run.description,
      contextType: run.contextType,
      contextId: run.contextId,
      platformUrl: run.platformUrl,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    });
  } catch (error) {
    console.error('[HappyRobot Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get run status' },
      { status: 500 }
    );
  }
}
