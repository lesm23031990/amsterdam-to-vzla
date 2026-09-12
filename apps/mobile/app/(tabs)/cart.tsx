import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiClient } from '@/api/client';
import { useCurrencyStore } from '@/store/currencyStore';
import { Ionicons } from '@expo/vector-icons';

interface CartChoice {
  id: string;
  name: string;
  priceModifier?: number;
}

interface CartMenuOption {
  id: string;
  name: string;
  choices?: CartChoice[];
}

interface CartProduct {
  id: string;
  name: string;
  priceCop?: number;
}

interface CartMenuItem {
  id: string;
  name: string;
  currency?: string;
  options?: CartMenuOption[];
}

interface CartItem {
  id: string;
  productId: string | null;
  menuItemId: string | null;
  quantity: number;
  price: number;
  type?: 'product' | 'menu';
  customizations: unknown;
  product?: CartProduct | null;
  menuItem?: CartMenuItem | null;
}

interface CartData {
  id: string | null;
  items: CartItem[];
  total: number;
  totalItems: number;
}

const itemKind = (item: CartItem): 'product' | 'menu' => {
  if (item.type === 'product' || item.type === 'menu') return item.type;
  return item.menuItemId ? 'menu' : 'product';
};

const itemDisplayName = (item: CartItem): string =>
  item.menuItem?.name || item.product?.name || 'Producto';

const resolveCustomizations = (item: CartItem): string[] => {
  const raw = item.customizations;
  if (!Array.isArray(raw)) return [];
  const options = item.menuItem?.options || [];
  return raw.map((entry: unknown) => {
    if (typeof entry === 'string') return entry;
    if (!entry || typeof entry !== 'object') return '';
    const c = entry as Record<string, unknown>;
    if (typeof c.label === 'string') return c.label;
    if (typeof c.optionName === 'string' && typeof c.choiceName === 'string') {
      return `${c.optionName}: ${c.choiceName}`;
    }
    const option = options.find((o) => o.id === c.optionId);
    const choice = option?.choices?.find((ch) => ch.id === c.choiceId);
    if (option && choice) return `${option.name}: ${choice.name}`;
    if (typeof c.name === 'string') return c.name;
    return '';
  }).filter(Boolean);
};

export default function CartScreen() {
  const router = useRouter();
  const { formatPrice } = useCurrencyStore();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      setError(false);
      const response = await apiClient.get('/api/v1/cart');
      setCart(response.data.data);
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [])
  );

  const updateQuantity = async (item: CartItem, quantity: number) => {
    if (quantity < 1) {
      handleRemove(item);
      return;
    }
    setCart((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => (i.id === item.id ? { ...i, quantity } : i)) }
        : prev
    );
    try {
      await apiClient.patch(`/api/v1/cart/items/${item.id}`, { quantity });
      fetchCart();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'No pudimos actualizar la cantidad';
      Alert.alert('Error', message);
      fetchCart();
    }
  };

  const handleRemove = async (item: CartItem) => {
    setCart((prev) =>
      prev ? { ...prev, items: prev.items.filter((i) => i.id !== item.id) } : prev
    );
    try {
      await apiClient.delete(`/api/v1/cart/items/${item.id}`);
      fetchCart();
    } catch (err) {
      Alert.alert('Error', 'No pudimos eliminar el item');
      fetchCart();
    }
  };

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos antes de continuar');
      return;
    }
    router.push('/checkout');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>No pudimos cargar tu carrito</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchCart}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const items = cart?.items || [];

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={64} color="#9CA3AF" />
        <Text style={styles.emptyText}>Tu carrito está vacío</Text>
        <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.browseText}>Explorar productos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCart(); }} />
        }
        renderItem={({ item }) => {
          const kind = itemKind(item);
          const customizations = resolveCustomizations(item);
          const linePrice =
            kind === 'menu'
              ? `${item.menuItem?.currency || 'USD'} $${(item.price * item.quantity).toFixed(2)}`
              : formatPrice(item.price * item.quantity);
          return (
            <View style={styles.itemCard}>
              <View style={styles.itemInfo}>
                <View style={styles.itemTypeRow}>
                  <Ionicons
                    name={kind === 'menu' ? 'restaurant-outline' : 'cube-outline'}
                    size={14}
                    color="#6B7280"
                  />
                  <Text style={styles.itemName} numberOfLines={2}>{itemDisplayName(item)}</Text>
                </View>
                {customizations.length > 0 && (
                  <View style={styles.customizations}>
                    {customizations.map((label, i) => (
                      <Text key={i} style={styles.customizationText}>• {label}</Text>
                    ))}
                  </View>
                )}
                <Text style={styles.itemPrice}>{linePrice}</Text>
              </View>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item, item.quantity - 1)}
                >
                  <Ionicons name="remove" size={20} color="#1E40AF" />
                </TouchableOpacity>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => updateQuantity(item, item.quantity + 1)}
                >
                  <Ionicons name="add" size={20} color="#1E40AF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemove(item)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>{formatPrice(cart?.total || 0)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
          <Text style={styles.checkoutText}>Ir a Pagar</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  retryButton: {
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  emptyText: {
    fontSize: 18,
    color: '#9CA3AF',
    marginTop: 16,
  },
  browseButton: {
    marginTop: 16,
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    paddingBottom: 180,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  customizations: {
    marginTop: 4,
  },
  customizationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemPrice: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  checkoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
