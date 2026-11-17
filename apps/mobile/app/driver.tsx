import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/api/client';
import { Ionicons } from '@expo/vector-icons';

interface Delivery {
  id: string;
  orderId: string;
  deliveryAddress?: string | null;
  status: string;
  customerName: string;
  contactPhone?: string | null;
  total: number;
  currency?: string;
  items?: { name: string; quantity: number }[];
}

const statusLabels: Record<string, string> = {
  assigned: 'Asignado',
  pending: 'Pendiente',
  accepted: 'Aceptado',
  picked_up: 'Recogido',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export default function DriverScreen() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingLocation, setSharingLocation] = useState(false);
  const watchRef = useRef<any>(null);

  useEffect(() => {
    fetchDeliveries();

    return () => {
      const geolocation = (globalThis as any).navigator?.geolocation;
      if (watchRef.current !== null && geolocation?.clearWatch) {
        geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  const fetchDeliveries = async () => {
    try {
      const response = await apiClient.get('/api/v1/delivery/my-deliveries');
      setDeliveries(response.data.data?.deliveries || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (deliveryId: string, newStatus: string) => {
    try {
      await apiClient.patch(`/api/v1/delivery/${deliveryId}/status`, {
        status: newStatus,
      });
      Alert.alert('Éxito', `Estado actualizado: ${statusLabels[newStatus] || newStatus}`);
      if (newStatus === 'delivered') stopSharingLocation(false);
      fetchDeliveries();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const startSharingLocation = () => {
    const inTransit = deliveries.find((delivery) => delivery.status === 'in_transit');

    if (!inTransit) {
      Alert.alert('Ubicación', 'Solo puedes compartir ubicación cuando una entrega está en camino.');
      return;
    }

    const geolocation = (globalThis as any).navigator?.geolocation;
    if (!geolocation?.watchPosition) {
      Alert.alert('Ubicación', 'La geolocalización no está disponible en este dispositivo. Usa la versión web del panel de repartidor.');
      return;
    }

    watchRef.current = geolocation.watchPosition(
      (position: any) => {
        apiClient
          .patch(`/api/v1/delivery/${inTransit.id}/location`, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          .catch(() => undefined);
      },
      () => {
        Alert.alert('Ubicación', 'No pudimos obtener tu ubicación. Revisa los permisos del dispositivo.');
        stopSharingLocation(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    setSharingLocation(true);
    Alert.alert('Ubicación', 'Compartiendo ubicación en tiempo real con el cliente');
  };

  const stopSharingLocation = (notify = true) => {
    const geolocation = (globalThis as any).navigator?.geolocation;
    if (watchRef.current !== null && geolocation?.clearWatch) {
      geolocation.clearWatch(watchRef.current);
    }
    watchRef.current = null;
    setSharingLocation(false);
    if (notify) Alert.alert('Ubicación', 'Dejaste de compartir tu ubicación');
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
          onPress={sharingLocation ? () => stopSharingLocation() : startSharingLocation}
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
                <Text style={styles.statusText}>{statusLabels[item.status] || item.status}</Text>
              </View>
            </View>

            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.address}>{item.deliveryAddress || 'Dirección no registrada'}</Text>
            {item.contactPhone ? <Text style={styles.address}>📞 {item.contactPhone}</Text> : null}
            <Text style={styles.total}>{item.currency || 'USD'} {item.total.toFixed(2)}</Text>

            <View style={styles.actions}>
              {(item.status === 'assigned' || item.status === 'pending') && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => updateStatus(item.id, 'accepted')}
                >
                  <Text style={styles.actionButtonText}>Aceptar</Text>
                </TouchableOpacity>
              )}
              {item.status === 'accepted' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.pickupButton]}
                  onPress={() => updateStatus(item.id, 'picked_up')}
                >
                  <Text style={styles.actionButtonText}>Recogido</Text>
                </TouchableOpacity>
              )}
              {item.status === 'picked_up' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.pickupButton]}
                  onPress={() => updateStatus(item.id, 'in_transit')}
                >
                  <Text style={styles.actionButtonText}>En Camino</Text>
                </TouchableOpacity>
              )}
              {item.status === 'in_transit' && (
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
