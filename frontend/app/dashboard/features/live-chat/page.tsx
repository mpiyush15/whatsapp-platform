'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { io, Socket } from 'socket.io-client';
import LiveChatContainer from '@/components/LiveChat/LiveChatContainer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050';

export default function LiveChatPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Check auth
    const token = authService.getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    // Initialize Socket.io connection
    console.log('🔌 Connecting to Socket.io server...');
    
    socketRef.current = io(SOCKET_URL, {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Socket events
    socketRef.current.on('connect', () => {
      console.log('✅ Connected to real-time server');
    });

    socketRef.current.on('disconnect', () => {
      console.log('⚠️ Disconnected from real-time server');
    });

    socketRef.current.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [router]);

  return (
    <div className="h-[calc(100vh-80px)] bg-gray-50 overflow-hidden">
      <LiveChatContainer />
    </div>
  );
}
