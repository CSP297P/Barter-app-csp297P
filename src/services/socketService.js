import { io } from 'socket.io-client';
import config from '../config';

class SocketService {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Set();
    this.errorHandlers = new Set();
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

  sendMessage(sessionId, content, senderId) {
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
        senderId: senderId.toString()
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
}

// Create a singleton instance
const socketService = new SocketService();
export default socketService; 