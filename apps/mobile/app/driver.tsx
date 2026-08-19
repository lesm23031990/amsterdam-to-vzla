import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { apiClient } from '@/api/client';
import { Ionicons } from '@expo/vector-icons';

interface Delivery {
  id: string;
  orderId: string;
  address: string;
  status: string;
  customerName: string;
  total: number;
}

export default function DriverScreen() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingLocation, setSharingLocation] = useState(false);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const response = await apiClient.get('/api/v1/driver/deliveries');
      setDeliveries(response.data.data || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (deliveryId: string, newStatus: string) => {
    try {
      await apiClient.patch(`/api/v1/driver/deliveries/${deliveryId}/status`, {
        status: newStatus,
      });
      Alert.alert('Éxito', `Estado actualizado a: ${newStatus}`);
      fetchDeliveries();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const startSharingLocation = () => {
    setSharingLocation(true);
    Alert.alert(
      'Ubicación',
      'Compartiendo ubicación en tiempo real con el cliente'
    );
  };

  const stopSharingLocation = () => {
    setSharingLocation(false);
    Alert.alert('Ubicación', 'Dejaste de compartir tu ubicación');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  if (deliveries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bicycle-outline" size={64} color="#9CA3AF" />
        <Text style={styles.emptyText}>No hay entregas asignadas</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.locationBar}>
        <TouchableOpacity
          style={[
            styles.locationButton,
            sharingLocation && styles.locationButtonActive,
          ]}
          onPress={sharingLocation ? stopSharingLocation : startSharingLocation}
        >
          <Ionicons
            name={sharingLocation ? 'location' : 'location-outline'}
            size={20}
            color={sharingLocation ? '#FFFFFF' : '#1E40AF'}
          />
          <Text
            style={[
              styles.locationButtonText,
              sharingLocation && styles.locationButtonTextActive,
            ]}
          >
            {sharingLocation ? 'Compartiendo ubicación' : 'Compartir ubicación'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>Pedido #{item.orderId.slice(-6)}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.address}>{item.address}</Text>
            <Text style={styles.total}>Bs {item.total.toFixed(2)}</Text>

            <View style={styles.actions}>
              {item.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => updateStatus(item.id, 'confirmed')}
                >
                  <Text style={styles.actionButtonText}>Aceptar</Text>
                </TouchableOpacity>
              )}
              {item.status === 'confirmed' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.pickupButton]}
                  onPress={() => updateStatus(item.id, 'shipping')}
                >
                  <Text style={styles.actionButtonText}>En Camino</Text>
                </TouchableOpacity>
              )}
              {item.status === 'shipping' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deliverButton]}
                  onPress={() => updateStatus(item.id, 'delivered')}
                >
                  <Text style={styles.actionButtonText}>Entregado</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
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
    marginTop: 16,
  },
  locationBar: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1E40AF',
  },
  locationButtonActive: {
    backgroundColor: '#1E40AF',
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  locationButtonTextActive: {
    color: '#FFFFFF',
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
  cardHeader: {
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
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  customerName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  total: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#3B82F6',
  },
  pickupButton: {
    backgroundColor: '#10B981',
  },
  deliverButton: {
    backgroundColor: '#6B7280',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
