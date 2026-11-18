import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiClient } from '@/api/client';
import { isExpoPushToken, toExpoPlatform } from './pushHelpers';

const PUSH_TOKEN_STORAGE_KEY = 'push_token';
const ANDROID_CHANNEL_ID = 'default';

let registrationInFlight: Promise<string | null> | null = null;

/** Muestra banner y sonido aunque la app esté en primer plano. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * El projectId de EAS es obligatorio para `getExpoPushTokenAsync` en SDK 53+.
 * Se lee de `expo.extra.eas.projectId` (app.json) o del `easConfig` inyectado
 * por EAS al compilar.
 */
function getEasProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: unknown } } | undefined;
  const fromExtra = extra?.eas?.projectId;
  if (typeof fromExtra === 'string' && fromExtra.length > 0) return fromExtra;

  const fromEasConfig = Constants.easConfig?.projectId;
  if (typeof fromEasConfig === 'string' && fromEasConfig.length > 0) return fromEasConfig;

  return null;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Pedidos',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function register(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[push] Las notificaciones push requieren un dispositivo físico');
    return null;
  }

  const platform = toExpoPlatform(Platform.OS);
  if (!platform) return null;

  const projectId = getEasProjectId();
  if (!projectId) {
    console.warn(
      '[push] Falta extra.eas.projectId en app.json (ejecuta `eas init`): no se pueden emitir tokens de Expo Push'
    );
    return null;
  }

  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  const status =
    current.status === 'granted'
      ? current.status
      : (await Notifications.requestPermissionsAsync()).status;

  if (status !== 'granted') {
    console.warn('[push] El usuario no autorizó las notificaciones');
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  if (!isExpoPushToken(data)) {
    console.warn('[push] Expo devolvió un token con formato inesperado');
    return null;
  }

  // Registro idempotente: el backend hace upsert por token.
  await apiClient.post('/api/v1/notifications/push-token', { token: data, platform });
  await SecureStore.setItemAsync(PUSH_TOKEN_STORAGE_KEY, data);

  return data;
}

/**
 * Pide permisos, obtiene el token de Expo y lo registra en el backend.
 * Es seguro llamarla varias veces: se deduplica mientras hay una en curso.
 */
export function registerForPushNotifications(): Promise<string | null> {
  if (!registrationInFlight) {
    registrationInFlight = register().then(
      (token) => token,
      (error: unknown) => {
        console.warn('[push] No se pudo registrar el dispositivo:', error);
        registrationInFlight = null;
        return null;
      }
    );
  }

  return registrationInFlight;
}

/** Elimina el token del backend y del dispositivo (al cerrar sesión). */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_STORAGE_KEY);
    if (!token) return;

    await apiClient.delete('/api/v1/notifications/push-token', { params: { token } });
    await SecureStore.deleteItemAsync(PUSH_TOKEN_STORAGE_KEY);
  } catch (error) {
    console.warn('[push] No se pudo eliminar el token del dispositivo:', error);
  }
}
