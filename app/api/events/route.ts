import { createSubscriber, CHANNELS } from '@/lib/redis';

// SSE endpoint for real-time updates
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channels = searchParams.get('channels')?.split(',') || Object.values(CHANNELS);

  const encoder = new TextEncoder();
  const subscriber = createSubscriber();

  // Check if Redis is available
  if (!subscriber || typeof subscriber.subscribe !== 'function') {
    // Return a simple stream that just sends heartbeats
    const stream = new ReadableStream({
      start(controller) {
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch (error) {
            clearInterval(heartbeat);
          }
        }, 30000);

        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch (error) {
            // Ignore
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Subscribe to requested channels
        await subscriber.subscribe(...channels);
        console.log(`[SSE] Client connected, subscribed to: ${channels.join(', ')}`);

        // Send initial connection message
        const connectMessage = `data: ${JSON.stringify({ type: 'connected', channels })}\n\n`;
        controller.enqueue(encoder.encode(connectMessage));

        // Handle incoming messages
        subscriber.on('message', (channel: string, message: string) => {
          try {
            const data = JSON.parse(message);
            const eventData = {
              type: 'event',
              channel,
              data,
              timestamp: new Date().toISOString(),
            };

            const sseMessage = `data: ${JSON.stringify(eventData)}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
          } catch (error) {
            console.error('[SSE] Error processing message:', error);
          }
        });
      } catch (error) {
        console.error('[SSE] Failed to subscribe:', error);
      }

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', async () => {
        console.log('[SSE] Client disconnected');
        clearInterval(heartbeat);
        try {
          await subscriber.unsubscribe(...channels);
          await subscriber.quit();
        } catch (error) {
          // Ignore cleanup errors
        }
        try {
          controller.close();
        } catch (error) {
          // Ignore errors on close
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
