import { createSubscriber, CHANNELS } from '@/lib/redis';

// SSE endpoint for real-time updates
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channels = searchParams.get('channels')?.split(',') || Object.values(CHANNELS);

  const encoder = new TextEncoder();
  const subscriber = createSubscriber();

  const stream = new ReadableStream({
    async start(controller) {
      // Subscribe to requested channels
      await subscriber.subscribe(...channels);

      console.log(`[SSE] Client connected, subscribed to: ${channels.join(', ')}`);

      // Send initial connection message
      const connectMessage = `data: ${JSON.stringify({ type: 'connected', channels })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));

      // Handle incoming messages
      subscriber.on('message', (channel, message) => {
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

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000); // Every 30 seconds

      // Cleanup on disconnect
      request.signal.addEventListener('abort', async () => {
        console.log('[SSE] Client disconnected');
        clearInterval(heartbeat);
        await subscriber.unsubscribe(...channels);
        await subscriber.quit();
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
