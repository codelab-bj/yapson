// src/contexts/WebSocketContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';

interface WebSocketContextType {
  addMessageHandler: (handler: (data: any) => void) => () => void;
  sendMessage: (message: any) => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const ws = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<((data: any) => void)[]>([]);
  const reconnectAttempts = useRef(0);
  const isConnected = useRef(false);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const connect = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('No access token found, skipping WebSocket connection');
      return;
    }

    if (ws.current) {
      ws.current.close();
    }

    try {
      const wsUrl = `wss://api.yapson.net/ws/socket?token=${encodeURIComponent(token)}`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        isConnected.current = true;
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          console.log('WebSocket message received:', data);
          const normalizedData = {
            ...data,
            // If data has a data property, use that as the URL
            ...(data.data && { url: data.data })
          };

          messageHandlers.current.forEach(handler => handler(data));
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        isConnected.current = false;
        console.log('WebSocket disconnected, attempting to reconnect...');
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        reconnectTimeout.current = setTimeout(connect, delay);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, []);

  const addMessageHandler = (handler: (data: any) => void) => {
    messageHandlers.current.push(handler);
    return () => {
      messageHandlers.current = messageHandlers.current.filter(h => h !== handler);
    };
  };

  const sendMessage = (message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  };

  return (
    <WebSocketContext.Provider 
      value={{ 
        addMessageHandler, 
        sendMessage, 
        isConnected: isConnected.current 
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};