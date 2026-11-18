import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { configureNotificationHandler, registerForPushNotifications } from '../src/lib/notifications';
import { getOrderIdFromNotificationData } from '../src/lib/pushHelpers';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Debe configurarse a nivel de módulo, antes de recibir notificaciones.
configureNotificationHandler();

export default function RootLayout() {
  const { isAuthenticated, loading, loadStoredAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const coldStartHandledRef = useRef(false);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Registro del token de Expo Push cuando hay sesión activa.
  useEffect(() => {
    if (loading || !isAuthenticated) return;
    void registerForPushNotifications();
  }, [isAuthenticated, loading]);

  // Tocar una notificación abre el pedido correspondiente.
  useEffect(() => {
    const openOrder = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const orderId = getOrderIdFromNotificationData(response.notification.request.content.data);
      if (orderId) router.push(`/orders/${orderId}`);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(openOrder);

    return () => subscription.remove();
  }, [router]);

  // App cerrada: la notificación que la abrió se consulta una sola vez.
  useEffect(() => {
    if (loading || !isAuthenticated || coldStartHandledRef.current) return;
    coldStartHandledRef.current = true;

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const orderId = getOrderIdFromNotificationData(response.notification.request.content.data);
      if (orderId) router.push(`/orders/${orderId}`);
    });
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="orders/[id]" />
        <Stack.Screen name="ai-assistant" />
        <Stack.Screen name="driver" />
        <Stack.Screen name="products/[id]" />
        <Stack.Screen name="menu" />
        <Stack.Screen name="menu/[id]" />
        <Stack.Screen name="notifications" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
