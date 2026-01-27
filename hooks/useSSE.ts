import { useEffect, useRef, useState } from 'react';

interface SSEEvent {
  type: string;
  channel?: string;
  channels?: string[];
  data?: any;
  timestamp?: string;
}

interface UseSSEOptions {
  channels?: string[];
  onEvent?: (event: SSEEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  enabled?: boolean;
}

export function useSSE(options: UseSSEOptions = {}) {
  const { channels, onEvent, onConnect, onDisconnect, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const connect = () => {
      try {
        // Build SSE URL with channels
        const url = new URL('/api/events', window.location.origin);
        if (channels && channels.length > 0) {
          url.searchParams.set('channels', channels.join(','));
        }

        const eventSource = new EventSource(url.toString());
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('[SSE] Connection established');
          setIsConnected(true);
          onConnect?.();
        };

        eventSource.onmessage = (event) => {
          try {
            const parsed: SSEEvent = JSON.parse(event.data);

            // Skip heartbeats
            if (parsed.type === 'connected') {
              console.log('[SSE] Connected to channels:', parsed.channels);
              return;
            }

            onEvent?.(parsed);
          } catch (error) {
            console.error('[SSE] Failed to parse message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('[SSE] Connection error:', error);
          setIsConnected(false);
          eventSource.close();

          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[SSE] Attempting to reconnect...');
            connect();
          }, 3000);
        };
      } catch (error) {
        console.error('[SSE] Failed to create EventSource:', error);
      }
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        console.log('[SSE] Closing connection');
        eventSourceRef.current.close();
        setIsConnected(false);
        onDisconnect?.();
      }
    };
  }, [enabled, channels?.join(',')]); // Re-connect if channels change

  return { isConnected };
}
