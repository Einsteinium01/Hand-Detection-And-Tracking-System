import { useState, useEffect, useRef, useCallback } from 'react';
import type { WebSocketMessage } from '../types/hand';

const WS_URL = 'ws://localhost:8000/ws/detect';
const MAX_RETRIES = Infinity;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;

interface UseWebSocketReturn {
  sendFrame: (base64: string) => void;
  lastResult: WebSocketMessage | null;
  isConnected: boolean;
  error: string | null;
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastResult, setLastResult] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        setError(null);
        retriesRef.current = 0;
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const message: WebSocketMessage = JSON.parse(event.data as string);
          if (message.type === 'detection') {
            setLastResult(message);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);

        // Attempt reconnection with exponential backoff
        if (retriesRef.current < MAX_RETRIES) {
          const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retriesRef.current), MAX_DELAY_MS);
          retriesRef.current += 1;
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Unable to connect to server. Max retries reached.');
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setError('WebSocket connection error');
      };
    } catch {
      setError('Failed to create WebSocket connection');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendFrame = useCallback((base64: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Strip the data URI prefix if present
      const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
      wsRef.current.send(JSON.stringify({ frame: cleanBase64 }));
    }
  }, []);

  return { sendFrame, lastResult, isConnected, error };
}
