import Redis from 'ioredis';

// Re-export channels from shared file (safe for client components)
export { CHANNELS, type Channel } from './channels';

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  return null; // Don't fallback to localhost in production
};

// Lazy Redis client - only create if REDIS_URL is set
let redisInstance: Redis | null = null;

function getRedis(): Redis | null {
  const url = getRedisUrl();
  if (!url) {
    return null;
  }

  if (!redisInstance) {
    redisInstance = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true, // Don't connect immediately
      enableOfflineQueue: false, // Don't queue commands if disconnected
    });

    redisInstance.on('error', (error) => {
      console.error('[Redis] Connection error:', error);
    });

    redisInstance.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    // Connect asynchronously, don't block startup
    redisInstance.connect().catch((err) => {
      console.error('[Redis] Failed to connect:', err);
    });
  }

  return redisInstance;
}

// Create separate Redis client for subscribing to events
export const createSubscriber = () => {
  const url = getRedisUrl();
  if (!url) {
    // Return a dummy client that does nothing
    return {
      subscribe: async () => {},
      on: () => {},
      unsubscribe: async () => {},
      quit: async () => {},
    } as any;
  }

  const subscriber = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  subscriber.on('error', (error) => {
    console.error('[Redis Subscriber] Connection error:', error);
  });

  // Connect asynchronously
  subscriber.connect().catch((err) => {
    console.error('[Redis Subscriber] Failed to connect:', err);
  });

  return subscriber;
};

// Helper to publish events
export async function publishEvent(channel: string, data: any) {
  const redis = getRedis();
  if (!redis) {
    console.warn('[Redis] Not configured, skipping publish');
    return;
  }

  try {
    await redis.publish(channel, JSON.stringify(data));
    console.log(`[Redis] Published to ${channel}:`, data);
  } catch (error) {
    console.error(`[Redis] Failed to publish to ${channel}:`, error);
  }
}

// Export redis instance getter
export const redis = {
  publish: async (channel: string, message: string) => {
    const instance = getRedis();
    if (!instance) return;
    return instance.publish(channel, message);
  },
};
