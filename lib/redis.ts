import Redis from 'ioredis';

// Re-export channels from shared file (safe for client components)
export { CHANNELS, type Channel } from './channels';

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  // Fallback to localhost for development
  return 'redis://localhost:6379';
};

// Create Redis client for publishing events
export const redis = new Redis(getRedisUrl(), {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Create separate Redis client for subscribing to events
export const createSubscriber = () => {
  return new Redis(getRedisUrl(), {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
};

// Helper to publish events
export async function publishEvent(channel: string, data: any) {
  try {
    await redis.publish(channel, JSON.stringify(data));
    console.log(`[Redis] Published to ${channel}:`, data);
  } catch (error) {
    console.error(`[Redis] Failed to publish to ${channel}:`, error);
  }
}

redis.on('error', (error) => {
  console.error('[Redis] Connection error:', error);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});
