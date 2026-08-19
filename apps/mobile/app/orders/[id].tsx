import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { apiClient } from '@/api/client';
import { Ionicons } from '@expo/vector-icons';

const statusSteps = [
  { key: 'pending', label: 'Pendiente', icon: 'time-outline' },
  { key: 'confirmed', label: 'Confirmado', icon: 'checkmark-circle-outline' },
  { key: 'preparing', label: 'Preparando', icon: 'restaurant-outline' },
  { key: 'shipping', label: 'En camino', icon: 'bicycle-outline' },
  { key: 'delivered', label: 'Entregado', icon: 'checkmark-done-circle-outline' },
];

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  address: string;
  paymentMethod: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await apiClient.get(`/api/v1/orders/${id}`);
      setOrder(response.data.data);
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
              Bs {(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dirección:</Text>
          <Text style={styles.infoValue}>{order.address}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Pago:</Text>
          <Text style={styles.infoValue}>{order.paymentMethod}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>Bs {order.total.toFixed(2)}</Text>
        </View>
      </View>

      {order.status === 'shipping' && (
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={48} color="#9CA3AF" />
          <Text style={styles.mapText}>Mapa de seguimiento en vivo</Text>
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
  mapPlaceholder: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    marginTop: 12,
    alignItems: 'center',
  },
  mapText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
