import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, Dimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import type { MenuOption } from '../menu';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface MenuItemDetail {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  currency: string;
  category: string | null;
  image: string | null;
  preparationTime: number;
  options: MenuOption[];
}

interface Customization {
  optionId: string;
  choiceId: string;
}

const formatMoney = (amount: number, currency: string) => {
  if (currency === 'Bs') return `Bs. ${amount.toFixed(2)}`;
  if (currency === 'USD') return `USD $${amount.toFixed(2)}`;
  return `COP $${Math.round(amount).toLocaleString('es-CO')}`;
};

export default function MenuDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [item, setItem] = useState<MenuItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const fetchItem = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await apiClient.get('/api/v1/fastfood/menu');
      const found = (response.data.data || []).find((m: MenuItemDetail) => m.id === id);
      if (!found) {
        setError(true);
      } else {
        setItem(found);
      }
    } catch (err) {
      console.error('Error fetching menu item:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  if (!item || error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>Producto no disponible</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchItem}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleChoice = (option: MenuOption, choiceId: string) => {
    setSelected((prev) => {
      const current = prev[option.id] || [];
      if (option.type === 'single') {
        return { ...prev, [option.id]: current.includes(choiceId) ? [] : [choiceId] };
      }
      const next = current.includes(choiceId)
        ? current.filter((c) => c !== choiceId)
        : [...current, choiceId];
      return { ...prev, [option.id]: next };
    });
  };

  const modifierTotal = item.options.reduce((sum, option) => {
    const chosen = selected[option.id] || [];
    return (
      sum +
      option.choices
        .filter((c) => chosen.includes(c.id))
        .reduce((s, c) => s + (c.priceModifier || 0), 0)
    );
  }, 0);

  const unitPrice = item.basePrice + modifierTotal;
  const totalPrice = unitPrice * quantity;

  const customizations: Customization[] = item.options.flatMap((option) =>
    (selected[option.id] || []).map((choiceId) => ({
      optionId: option.id,
      choiceId,
    }))
  );

  const addToCart = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    const missing = item.options.find(
      (o) => o.required && (selected[o.id] || []).length === 0
    );
    if (missing) {
      Alert.alert('Falta una selección', `Debes elegir una opción para "${missing.name}"`);
      return;
    }
    setAdding(true);
    try {
      await apiClient.post('/api/v1/cart/items', {
        menuItemId: item.id,
        quantity,
        customizations,
      });
      Alert.alert('Agregado al carrito', `${quantity} x ${item.name}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'No pudimos agregar al carrito. Revisa el login del backend de menú.';
      Alert.alert('Error', message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>{item.name.charAt(0)}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.name}</Text>
            <View style={styles.prepBadge}>
              <Text style={styles.prepBadgeText}>⏱ {item.preparationTime} min</Text>
            </View>
          </View>
          {item.category && <Text style={styles.category}>{item.category}</Text>}
          {item.description && <Text style={styles.description}>{item.description}</Text>}
          <Text style={styles.basePrice}>
            Base: {formatMoney(item.basePrice, item.currency)}
          </Text>
        </View>

        {item.options.map((option) => (
          <View key={option.id} style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <Text style={styles.optionName}>{option.name}</Text>
              <Text style={styles.optionType}>
                {option.required ? 'Obligatorio' : option.type === 'single' ? 'Elige 1' : 'Elige varios'}
              </Text>
            </View>
            {option.choices.map((choice) => {
              const isChecked = (selected[option.id] || []).includes(choice.id);
              return (
                <TouchableOpacity
                  key={choice.id}
                  style={styles.choiceRow}
                  onPress={() => toggleChoice(option, choice.id)}
                >
                  <Ionicons
                    name={
                      option.type === 'single'
                        ? isChecked
                          ? 'radio-button-on'
                          : 'radio-button-off'
                        : isChecked
                          ? 'checkbox'
                          : 'square-outline'
                    }
                    size={20}
                    color={isChecked ? '#1E40AF' : '#9CA3AF'}
                  />
                  <Text style={[styles.choiceName, isChecked && styles.choiceNameSelected]}>
                    {choice.name}
                  </Text>
                  {choice.priceModifier > 0 && (
                    <Text style={styles.choicePrice}>
                      +{formatMoney(choice.priceModifier, item.currency)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={styles.quantityCard}>
          <Text style={styles.quantityLabel}>Cantidad</Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Ionicons name="remove" size={20} color="#1E40AF" />
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity((q) => q + 1)}
            >
              <Ionicons name="add" size={20} color="#1E40AF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.stickyBar}>
        <View style={styles.stickyPriceBox}>
          <Text style={styles.stickyPriceLabel}>Total</Text>
          <Text style={styles.stickyPrice}>{formatMoney(totalPrice, item.currency)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.stickyAddButton, adding && styles.stickyButtonDisabled]}
          onPress={addToCart}
          disabled={adding}
        >
          <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
          <Text style={styles.stickyButtonText}>
            {adding ? 'Agregando...' : 'Agregar al carrito'}
          </Text>
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
  scrollContent: {
    paddingBottom: 8,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.6,
    backgroundColor: '#E5E7EB',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  prepBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  prepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  category: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginTop: 8,
  },
  basePrice: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    padding: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  optionType: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  choiceName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  choiceNameSelected: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  choicePrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  quantityCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  quantityRow: {
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
    color: '#111827',
  },
  bottomSpacer: {
    height: 16,
  },
  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  stickyPriceBox: {
    marginRight: 'auto',
  },
  stickyPriceLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  stickyPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  stickyAddButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    paddingVertical: 14,
  },
  stickyButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  stickyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
