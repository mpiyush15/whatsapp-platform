import { io, Socket } from 'socket.io-client';
import { authService } from './auth';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

export const initSocket = (): Socket => {
  if (socket?.connected) {
    console.log('📌 Socket already connected, reusing:', socket?.id);
    return socket;
  }

  // Socket.io connects to the ROOT server, not /api endpoint
  const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050').replace('/api', '');
  const token = authService.getToken();

  console.log('🔌 Socket Init Debug:');
  console.log('  Socket URL:', SOCKET_URL);
  console.log('  Token exists:', !!token);
  console.log('  Auth status:', authService.isAuthenticated());

  if (!token) {
    console.warn('⚠️ No authentication token found - socket connection may fail');
  }

  socket = io(SOCKET_URL, {
    auth: {
      token: token ? `Bearer ${token}` : '',
    },
    
    // ✅ CRITICAL FIX: Configure reconnection properly
    reconnection: true,
    reconnectionDelay: 1000,          // Start with 1s delay
    reconnectionDelayMax: 10000,      // Max 10s delay
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    
    // ✅ CRITICAL FIX: Use both transports for fallback
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket?.id);
    console.log('🔗 Connected to:', SOCKET_URL);
    console.log('📡 Transport:', socket?.io?.engine?.transport?.name);
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.warn('⚠️ Socket disconnected. Reason:', reason);
    if (reason === 'io server disconnect') {
      // Server disconnected, try to reconnect
      console.log('🔄 Server disconnected client, attempting reconnect...');
      socket?.connect();
    }
  });

  socket.on('error', (error) => {
    console.error('🔴 Socket error:', error);
  });

  // ✅ CRITICAL FIX: Handle polling errors with exponential backoff
  socket.on('connect_error', (error) => {
    reconnectAttempts++;
    
    const errorMessage = typeof error === 'object' ? error.message : String(error);
    console.error(`🔴 Socket connection error (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}):`, errorMessage);
    
    // Log transport info for debugging
    if (socket?.io?.engine) {
      console.error('  📡 Transport:', socket.io.engine.transport?.name);
      console.error('  Status:', socket.io.engine.readyState);
    }
    
    if (errorMessage.includes('Invalid token')) {
      console.error('  💡 Token is invalid - clearing and requiring login');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
        console.error('  ✅ Cleared localStorage. Please refresh and login again.');
      }
    } else if (errorMessage.includes('xhr poll error') || errorMessage.includes('polling')) {
      console.error('  💡 XHR Polling error - fallback transport issue');
      console.error('  💡 This usually means:');
      console.error('     1. Backend is overloaded or unreachable');
      console.error('     2. Network connection is unstable');
      console.error('     3. CORS is misconfigured on the backend');
      console.error('  Retrying with exponential backoff...');
      
      // Let Socket.io handle automatic reconnection with backoff
    } else {
      console.error('  💡 This could be a network or server connectivity issue');
    }
    
    // Don't manually reconnect, let Socket.io's built-in reconnection handle it
    // with exponential backoff
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Socket event listeners
export const onNewMessage = (callback: (data: any) => void) => {
  const sock = getSocket();
  if (sock) {
    sock.on('new_message', callback);
  }
};

export const onConversationUpdate = (callback: (data: any) => void) => {
  const sock = getSocket();
  if (sock) {
    sock.on('conversation_update', callback);
  }
};

export const onTyping = (callback: (data: any) => void) => {
  const sock = getSocket();
  if (sock) {
    sock.on('typing', callback);
  }
};

export const onMessageStatus = (callback: (data: any) => void) => {
  const sock = getSocket();
  if (sock) {
    sock.on('message_status', callback);
  }
};

/**
 * 🎯 CRITICAL: Listen for phone status changes in real-time
 * When testPhoneNumber succeeds, backend broadcasts status change
 * UI can update chat visibility, connection indicators, etc
 */
export const onPhoneStatusChanged = (callback: (data: any) => void) => {
  const sock = getSocket();
  if (sock) {
    console.log('🎯 Subscribing to phone_status_changed event');
    sock.on('phone_status_changed', (data) => {
      console.log('📡 Phone status changed:', {
        phoneNumberId: data.phoneNumberId,
        isActive: data.isActive,
        qualityRating: data.qualityRating
      });
      callback(data);
    });
  }
};

// Cleanup functions to remove event listeners
export const offNewMessage = (callback?: (data: any) => void) => {
  const sock = getSocket();
  if (sock) {
    if (callback) {
      sock.off('new_message', callback);
    } else {
      sock.off('new_message');
    }
  }
};

export const offConversationUpdate = (callback?: (data: any) => void) => {
  const sock = getSocket();
  if (sock) {
    if (callback) {
      sock.off('conversation_update', callback);
    } else {
      sock.off('conversation_update');
    }
  }
};

export const offMessageStatus = (callback?: (data: any) => void) => {
  const sock = getSocket();
  if (sock) {
    if (callback) {
      sock.off('message_status', callback);
    } else {
      sock.off('message_status');
    }
  }
};

/**
 * 🎯 CRITICAL: Unsubscribe from phone status changes
 */
export const offPhoneStatusChanged = (callback?: (data: any) => void) => {
  const sock = getSocket();
  if (sock) {
    if (callback) {
      sock.off('phone_status_changed', callback);
    } else {
      sock.off('phone_status_changed');
    }
  }
};

// Socket event emitters
export const joinConversation = (conversationId: string) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('join_conversation', { conversationId });
  }
};

export const leaveConversation = (conversationId: string) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('leave_conversation', { conversationId });
  }
};

export const emitTyping = (conversationId: string, isTyping: boolean) => {
  const sock = getSocket();
  if (sock) {
    sock.emit('typing', { conversationId, isTyping });
  }
};

export const subscribeToConversations = () => {
  const sock = getSocket();
  if (sock) {
    sock.emit('subscribe_conversations');
  }
};
