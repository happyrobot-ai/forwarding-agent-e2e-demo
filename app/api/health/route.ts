import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check database connection
    const dbStatus = process.env.DATABASE_URL ? 'connected' : 'missing';
    
    // Check Redis connection
    const redisStatus = process.env.REDIS_URL ? 'configured' : 'missing';
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      redis: redisStatus,
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
