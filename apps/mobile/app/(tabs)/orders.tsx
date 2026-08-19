import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { apiClient } from '@/api/client';

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: number;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  shipping: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  preparing: '#8B5CF6',
  shipping: '#10B981',
  delivered: '#6B7280',
  cancelled: '#EF4444',
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await apiClient.get('/api/v1/orders');
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No tienes pedidos aún</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/orders/${item.id}`)}
          >
            <View style={styles.header}>
              <Text style={styles.orderId}>Pedido #{item.id.slice(-6)}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColors[item.status] || '#9CA3AF' },
                ]}
              >
                <Text style={styles.statusText}>
                  {statusLabels[item.status] || item.status}
                </Text>
              </View>
            </View>
            <View style={styles.details}>
              <Text style={styles.detailText}>
                {item.items} producto{item.items !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.detailText}>
                Bs {item.total.toFixed(2)}
              </Text>
            </View>
            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString('es-VE')}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
