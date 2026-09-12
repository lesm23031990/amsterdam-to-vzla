import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useCurrencyStore } from '@/store/currencyStore';
import { apiClient } from '@/api/client';

interface CheckoutItem {
  id: string;
  quantity: number;
  price: number;
  product?: { id: string; name: string } | null;
  menuItem?: { id: string; name: string } | null;
}

interface CheckoutCart {
  items: CheckoutItem[];
  total: number;
}

export default function CheckoutScreen() {
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'binance_pay' | 'cash' | 'transfer'>('cash');
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CheckoutCart | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuthStore();
  const { currency, formatPrice, loadCurrency } = useCurrencyStore();

  useEffect(() => {
    loadCurrency();
  }, []);

  const fetchCart = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/v1/cart');
      setCart(response.data.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
      Alert.alert('Error', 'No pudimos cargar tu carrito');
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleCheckout = async () => {
    if (!address) {
      Alert.alert('Error', 'Por favor ingresa tu dirección');
      return;
    }
    if (!cart || cart.items.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos antes de continuar');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/api/v1/checkout', {
        paymentMethod,
        deliveryAddress: address,
        contactPhone: (user as { phone?: string } | null)?.phone,
        currency,
      });

      if (response.data.ok) {
        Alert.alert(
          'Pedido Confirmado',
          'Tu pedido ha sido procesado exitosamente',
          [
            {
              text: 'Ver Pedido',
              onPress: () => router.replace(`/orders/${response.data.data.id}`),
            },
          ]
        );
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'No se pudo procesar el pedido';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dirección de Entrega</Text>
        <TextInput
          style={styles.input}
          placeholder="Ingresa tu dirección completa"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Método de Pago</Text>
        <View style={styles.paymentOptions}>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'cash' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Text style={styles.paymentText}>Efectivo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'transfer' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('transfer')}
          >
            <Text style={styles.paymentText}>Transferencia</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'binance_pay' && styles.paymentOptionSelected,
            ]}
            onPress={() => setPaymentMethod('binance_pay')}
          >
            <Text style={styles.paymentText}>Binance Pay</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Resumen del Pedido</Text>
        {cartLoading ? (
          <ActivityIndicator color="#1E40AF" />
        ) : (
          (cart?.items || []).map((item) => (
            <View key={item.id} style={styles.summaryItem}>
              <Text style={styles.summaryItemName}>
                {(item.product?.name || item.menuItem?.name || 'Producto')} x{item.quantity}
              </Text>
              <Text style={styles.summaryItemPrice}>
                {formatPrice(item.price * item.quantity)}
              </Text>
            </View>
          ))
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>{formatPrice(cart?.total || 0)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]}
        onPress={handleCheckout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.checkoutText}>Confirmar Pedido</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  paymentOptionSelected: {
    borderColor: '#1E40AF',
    backgroundColor: '#EFF6FF',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  summary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryItemName: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: '600',
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
  checkoutButton: {
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
