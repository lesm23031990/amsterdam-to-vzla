export type PushPlatform = 'android' | 'ios';

const EXPO_PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

/** El backend solo acepta tokens con el formato de Expo Push. */
export function isExpoPushToken(value: unknown): value is string {
  return typeof value === 'string' && EXPO_PUSH_TOKEN_PATTERN.test(value.trim());
}

/** Traduce `Platform.OS` al enum `platform` del backend. */
export function toExpoPlatform(platformOS: string): PushPlatform | null {
  if (platformOS === 'android') return 'android';
  if (platformOS === 'ios') return 'ios';
  return null;
}

/** Extrae el `orderId` del payload de una notificación push. */
export function getOrderIdFromNotificationData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;

  const orderId = (data as { orderId?: unknown }).orderId;
  if (typeof orderId !== 'string' || orderId.length === 0) return null;
  return orderId;
}
