import { io, type Socket } from 'socket.io-client';

/**
 * Socket.io vive en el mismo origen que la API Express (sin el prefijo /api/v1).
 * En la demo de Vercel (NEXT_PUBLIC_API_URL relativo o ausente) no hay servidor
 * de sockets, por eso devolvemos null y el cliente simplemente no se conecta.
 */
export function getSocketUrl(): string | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const url = new URL(apiUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function connectNotificationSocket(token: string): Socket | null {
  const url = getSocketUrl();
  if (!url || !token) return null;

  return io(url, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
  });
}
