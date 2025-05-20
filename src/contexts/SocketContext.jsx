import React, { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../services/socketService';

export const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children, user }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      // Connect to socket server only if user is present
      socketService.connect();

      // Set up error handler
      const errorHandler = (error) => {
        console.error('Socket error:', error);
        setError(error);
      };

      // Set up connection status handler
      const connectHandler = () => {
        setIsConnected(true);
        setError(null);
      };

      const disconnectHandler = () => {
        setIsConnected(false);
      };

      // Add event listeners
      socketService.onError(errorHandler);
      socketService.socket?.on('connect', connectHandler);
      socketService.socket?.on('disconnect', disconnectHandler);

      // Clean up on unmount or when user changes/logs out
      return () => {
        socketService.disconnect();
      };
    } else {
      // If user logs out, disconnect socket
      socketService.disconnect();
    }
  }, [user]);

  const value = {
    isConnected,
    error,
    joinTradeSession: socketService.joinTradeSession.bind(socketService),
    sendMessage: socketService.sendMessage.bind(socketService),
    onMessage: socketService.onMessage.bind(socketService),
    onError: socketService.onError.bind(socketService),
    onTradeApproved: socketService.onTradeApproved.bind(socketService),
    onTradeCompleted: socketService.onTradeCompleted.bind(socketService),
    onNewTradeSession: socketService.onNewTradeSession.bind(socketService),
    onTradeSessionDeleted: socketService.onTradeSessionDeleted.bind(socketService),
    onTradeSessionStatusUpdated: socketService.onTradeSessionStatusUpdated.bind(socketService)
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 