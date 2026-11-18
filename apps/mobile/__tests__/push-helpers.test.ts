import { describe, expect, it } from 'vitest';
import {
  getOrderIdFromNotificationData,
  isExpoPushToken,
  toExpoPlatform,
} from '../src/lib/pushHelpers';

describe('push helpers', () => {
  it('acepta tokens de Expo Push en ambos formatos', () => {
    expect(isExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]')).toBe(true);
    expect(isExpoPushToken('ExpoPushToken[abc-123]')).toBe(true);
    expect(isExpoPushToken('  ExpoPushToken[abc-123]  ')).toBe(true);
  });

  it('rechaza cualquier otro valor', () => {
    expect(isExpoPushToken('abc')).toBe(false);
    expect(isExpoPushToken('ExponentPushToken[]')).toBe(false);
    expect(isExpoPushToken(undefined)).toBe(false);
    expect(isExpoPushToken(42)).toBe(false);
  });

  it('traduce Platform.OS al enum del backend', () => {
    expect(toExpoPlatform('android')).toBe('android');
    expect(toExpoPlatform('ios')).toBe('ios');
    expect(toExpoPlatform('web')).toBeNull();
  });

  it('extrae el orderId del payload de la notificación', () => {
    expect(getOrderIdFromNotificationData({ orderId: 'order-1' })).toBe('order-1');
    expect(getOrderIdFromNotificationData({ orderId: '' })).toBeNull();
    expect(getOrderIdFromNotificationData({ status: 'confirmed' })).toBeNull();
    expect(getOrderIdFromNotificationData(null)).toBeNull();
    expect(getOrderIdFromNotificationData('order-1')).toBeNull();
  });
});
