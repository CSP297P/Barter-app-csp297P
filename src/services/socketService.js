import { io } from 'socket.io-client';
import config from '../config';

class SocketService {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Set();
    this.errorHandlers = new Set();
    this.tradeApprovedHandlers = new Set();
    this.tradeCompletedHandlers = new Set();
    this.newTradeSessionHandlers = new Set();
    this.tradeSessionDeletedHandlers = new Set();
    this.tradeSessionStatusUpdatedHandlers = new Set();
    this.tradeRequestedHandlers = new Set();
    this.tradeRequestAcceptedHandlers = new Set();
    this.tradeSessionItemsUpdatedHandlers = new Set();
  }

  connect() {
    if (this.socket?.connected) return;

    const token = localStorage.getItem('token');
    this.socket = io(config.SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.errorHandlers.forEach(handler => handler(error));
    });

    this.socket.on('message_received', (message) => {
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('trade_approved', (data) => {
      this.tradeApprovedHandlers.forEach(handler => handler(data));
    });

    this.socket.on('trade_completed', (data) => {
      this.tradeCompletedHandlers.forEach(handler => handler(data));
    });

    this.socket.on('new_trade_session', (data) => {
      this.newTradeSessionHandlers.forEach(handler => handler(data));
    });

    this.socket.on('trade_session_deleted', (data) => {
      this.tradeSessionDeletedHandlers.forEach(handler => handler(data));
    });

    this.socket.on('trade_session_status_updated', (data) => {
      this.tradeSessionStatusUpdatedHandlers.forEach(handler => handler(data));
    });

    this.socket.on('trade_requested', (data) => {
      this.tradeRequestedHandlers.forEach(handler => handler(data));
    });

    this.socket.on('trade_request_accepted', (data) => {
      this.tradeRequestAcceptedHandlers.forEach(handler => handler(data));
    });

    this.socket.on('trade_session_items_updated', (data) => {
      this.tradeSessionItemsUpdatedHandlers.forEach(handler => handler(data));
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.errorHandlers.forEach(handler => handler(error));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinTradeSession(sessionId) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Join session timeout'));
      }, 5000);

      this.socket.emit('join_trade_session', { sessionId: sessionId.toString() });

      this.socket.once('joined_session', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });

      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  sendMessage(sessionId, content, senderId, isSystemMessage = false) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Send message timeout'));
      }, 5000);

      this.socket.emit('new_message', {
        sessionId: sessionId.toString(),
        content,
        senderId: senderId.toString(),
        isSystemMessage
      });

      this.socket.once('message_received', (message) => {
        clearTimeout(timeout);
        resolve(message);
      });

      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onError(handler) {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  onTradeApproved(handler) {
    this.tradeApprovedHandlers.add(handler);
    return () => this.tradeApprovedHandlers.delete(handler);
  }

  onTradeCompleted(handler) {
    this.tradeCompletedHandlers.add(handler);
    return () => this.tradeCompletedHandlers.delete(handler);
  }

  onNewTradeSession(handler) {
    this.newTradeSessionHandlers.add(handler);
    return () => this.newTradeSessionHandlers.delete(handler);
  }

  onTradeSessionDeleted(handler) {
    this.tradeSessionDeletedHandlers.add(handler);
    return () => this.tradeSessionDeletedHandlers.delete(handler);
  }

  onTradeSessionStatusUpdated(handler) {
    this.tradeSessionStatusUpdatedHandlers.add(handler);
    return () => this.tradeSessionStatusUpdatedHandlers.delete(handler);
  }

  onTradeRequested(handler) {
    this.tradeRequestedHandlers.add(handler);
    return () => this.tradeRequestedHandlers.delete(handler);
  }

  onTradeRequestAccepted(handler) {
    this.tradeRequestAcceptedHandlers.add(handler);
    return () => this.tradeRequestAcceptedHandlers.delete(handler);
  }

  onTradeSessionItemsUpdated(handler) {
    this.tradeSessionItemsUpdatedHandlers.add(handler);
    return () => this.tradeSessionItemsUpdatedHandlers.delete(handler);
  }
}

// Create a singleton instance
const socketService = new SocketService();
export default socketService; 