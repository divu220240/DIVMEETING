import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';
import { getServerUrl } from '../services/runtimeConfig';

export default function useSocket() {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const client = io(getServerUrl(), {
      auth: { token },
      transports: ['websocket'],
    });

    setSocket(client);

    client.on('connect', () => setConnected(true));
    client.on('disconnect', () => setConnected(false));

    return () => {
      client.disconnect();
    };
  }, [token]);

  return useMemo(() => ({ socket, connected }), [socket, connected]);
}
