import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { apiClient } from '@/api/client';
import { Ionicons } from '@expo/vector-icons';

const statusSteps = [
  { key: 'pending_payment', label: 'Pago', icon: 'card-outline' },
  { key: 'confirmed', label: 'Confirmado', icon: 'checkmark-circle-outline' },
  { key: 'preparing', label: 'Preparando', icon: 'restaurant-outline' },
  { key: 'in_transit', label: 'En camino', icon: 'bicycle-outline' },
  { key: 'delivered', label: 'Entregado', icon: 'checkmark-done-circle-outline' },
];

const paymentLabels: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  binance_pay: 'Binance Pay',
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  pending_review: 'En revisión',
  paid: 'Pagado',
  failed: 'Vencido / rechazado',
};

interface Order {
  id: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  deliveryAddress: string | null;
  paymentMethod: string;
  paymentStatus: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface PaymentStatus {
  orderId: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentUrl: string | null;
  expiresAt: string;
  expired: boolean;
}

interface TrackingInfo {
  deliveryId: string;
  status: string;
  driver: { id: string; name: string; phone: string } | null;
  latestLocation: { lat: number; lng: number; createdAt: string } | null;
  orderStatus: string;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // Polling de respaldo mientras el pedido va en camino (el mapa nativo es backlog).
  useEffect(() => {
    if (order?.status !== 'in_transit') return;
    const orderId = order.id;
    const interval = setInterval(() => { void fetchTracking(orderId); }, 15000);
    return () => clearInterval(interval);
  }, [order?.id, order?.status]);

  const fetchTracking = async (orderId: string) => {
    try {
      const res = await apiClient.get(`/api/v1/delivery/orders/${orderId}/tracking`);
      setTracking(res.data.data ?? null);
    } catch (error) {
      console.error('Error fetching tracking:', error);
    }
  };

  const fetchOrder = async () => {
    try {
      const [orderRes, paymentRes, trackingRes] = await Promise.all([
        apiClient.get(`/api/v1/checkout/orders/${id}`),
        apiClient.get(`/api/v1/checkout/orders/${id}/payment-status`),
        apiClient.get(`/api/v1/delivery/orders/${id}/tracking`),
      ]);
      setOrder(orderRes.data.data);
      setPayment(paymentRes.data.data);
      setTracking(trackingRes.data.data ?? null);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Pedido no encontrado</Text>
      </View>
    );
  }

  const currentStatusIndex = statusSteps.findIndex((s) => s.key === order.status);
  const trackingDriver = tracking?.driver ?? null;
  const latestLocation = tracking?.latestLocation ?? null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pedido #{order.id.slice(-6)}</Text>
        <Text style={styles.date}>
          {new Date(order.createdAt).toLocaleString('es-VE')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado del Pedido</Text>
        <View style={styles.tracker}>
          {statusSteps.map((step, index) => {
            const isActive = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            return (
              <View key={step.key} style={styles.step}>
                <View
                  style={[
                    styles.stepIcon,
                    isActive && styles.stepIconActive,
                    isCurrent && styles.stepIconCurrent,
                  ]}
                >
                  <Ionicons
                    name={isActive ? 'checkmark' : (step.icon as any)}
                    size={20}
                    color={isActive ? '#FFFFFF' : '#9CA3AF'}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
                {index < statusSteps.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      index < currentStatusIndex && styles.stepLineActive,
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Productos</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName}>
              {item.name} x{item.quantity}
            </Text>
            <Text style={styles.itemPrice}>
              {order.currency} {(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dirección:</Text>
          <Text style={styles.infoValue}>{order.deliveryAddress || 'No especificada'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Pago:</Text>
          <Text style={styles.infoValue}>{paymentLabels[order.paymentMethod] || order.paymentMethod}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Estado pago:</Text>
          <Text style={styles.infoValue}>{paymentStatusLabels[order.paymentStatus] || order.paymentStatus}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>{order.currency} {Number(order.total).toFixed(2)}</Text>
        </View>
      </View>

      {order.paymentMethod === 'binance_pay' && order.paymentStatus !== 'paid' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pago con Binance Pay</Text>
          {payment?.expired || order.status === 'cancelled' ? (
            <View style={styles.expiredBox}>
              <Text style={styles.expiredText}>
                La ventana de pago de 24 horas venció y el pedido fue cancelado.
              </Text>
              <Text style={styles.expiredText}>
                Vuelve a hacer el pedido para generar un nuevo link.
              </Text>
            </View>
          ) : (
            <>
              {payment?.paymentUrl && (
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={() => Linking.openURL(payment.paymentUrl as string)}
                >
                  <Text style={styles.payButtonText}>Pagar con Binance</Text>
                </TouchableOpacity>
              )}
              {payment && (
                <Text style={styles.payHint}>
                  Tienes hasta el{' '}
                  {new Date(payment.expiresAt).toLocaleString('es-VE', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                  })}{' '}
                  para completar el pago (link de demostración del MVP).
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {order.status === 'in_transit' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguimiento en vivo</Text>
          {trackingDriver ? (
            <View style={styles.trackingCard}>
              <View style={styles.trackingRow}>
                <Ionicons name="bicycle-outline" size={22} color="#1E40AF" />
                <Text style={styles.trackingDriver}>{trackingDriver.name}</Text>
              </View>
              {trackingDriver.phone && (
                <TouchableOpacity
                  style={styles.trackingCall}
                  onPress={() => Linking.openURL(`tel:${trackingDriver.phone}`)}
                >
                  <Ionicons name="call-outline" size={18} color="#1E40AF" />
                  <Text style={styles.trackingCallText}>{trackingDriver.phone}</Text>
                </TouchableOpacity>
              )}
              <Text style={styles.trackingHint}>
                {latestLocation
                  ? `Última ubicación: ${new Date(latestLocation.createdAt).toLocaleTimeString('es-VE')}`
                  : 'Esperando ubicación del repartidor...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.mapText}>Esperando asignación del repartidor...</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  tracker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  step: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIconActive: {
    backgroundColor: '#3B82F6',
  },
  stepIconCurrent: {
    borderWidth: 2,
    borderColor: '#1E40AF',
  },
  stepLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 16,
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: '#E5E7EB',
    zIndex: -1,
  },
  stepLineActive: {
    backgroundColor: '#3B82F6',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemName: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  payButton: {
    backgroundColor: '#F0B90B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  payHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 12,
  },
  expiredBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  expiredText: {
    fontSize: 14,
    color: '#B91C1C',
  },
  mapText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  trackingCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    gap: 8,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingDriver: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  trackingCall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
  },
  trackingCallText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  trackingHint: {
    fontSize: 13,
    color: '#6B7280',
  },
});
