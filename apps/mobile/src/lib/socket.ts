import { io } from 'socket.io-client';

export type OrderSocket = ReturnType<typeof io>;

export interface JoinAck {
  ok?: boolean;
  error?: string;
}

/**
 * Deriva el origen del socket a partir de la URL de la API
 * (`http://192.168.1.10:3001` -> `http://192.168.1.10:3001`).
 * Devuelve `null` si no hay URL configurada o no es http/https.
 */
export function getSocketUrl(apiUrl?: string): string | null {
  const value = (apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? '').trim();
  if (value.length === 0) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Conexión autenticada al servidor de sockets. El JWT viaja en el handshake
 * (`auth.token`), igual que en la web, porque el servidor rechaza conexiones
 * sin token y valida `join:order` contra la base de datos.
 */
export function connectOrderSocket(token: string, orderId: string): OrderSocket | null {
  const url = getSocketUrl();
  if (!url) {
    console.warn('[socket] EXPO_PUBLIC_API_URL no configurada: el tracking en vivo está deshabilitado');
    return null;
  }

  const socket = io(url, { auth: { token }, reconnection: true });

  socket.on('connect', () => {
    socket.emit('join:order', orderId, (ack?: JoinAck) => {
      if (ack && ack.ok === false) {
        console.warn('[socket] join:order rechazado:', ack.error);
      }
    });
  });

  socket.on('connect_error', (error: Error) => {
    console.warn('[socket] error de conexión:', error.message);
  });

  return socket;
}
