import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// List HappyRobot runs, optionally filtered by context
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('context_id');
    const contextType = searchParams.get('context_type');

    const where: any = {};
    if (contextId) where.contextId = contextId;
    if (contextType) where.contextType = contextType;

    const runs = await prisma.happyRobotRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error('[HappyRobot Runs] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list runs' },
      { status: 500 }
    );
  }
}
