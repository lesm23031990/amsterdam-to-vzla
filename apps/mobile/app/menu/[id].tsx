import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Dimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import MenuItemSheet from '@/components/MenuItemSheet';
import { MenuItemDetailSkeleton } from '@/components/Skeleton';
import {
  buildCustomizations,
  missingRequiredOption,
  toggleSelection,
  unitPrice as computeUnitPrice,
  type PricingOption,
} from '@/lib/menuPricing';
import type { MenuOption } from '../menu';
import { resolveMediaUrl } from '@/lib/media';

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
  const [sheetOpen, setSheetOpen] = useState(false);

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
    return <MenuItemDetailSkeleton />;
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

  const options: PricingOption[] = item.options;
  const unitPrice = computeUnitPrice(item.basePrice, options, selected);
  const totalPrice = unitPrice * quantity;

  const toggleChoice = (option: PricingOption, choiceId: string) => {
    setSelected((prev) => toggleSelection(options, prev, option.id, choiceId));
  };

  const addToCart = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    const missing = missingRequiredOption(options, selected);
    if (missing) {
      Alert.alert('Falta una selección', `Debes elegir una opción para "${missing.name}"`);
      return;
    }
    setAdding(true);
    try {
      await apiClient.post('/api/v1/cart/items', {
        menuItemId: item.id,
        quantity,
        customizations: buildCustomizations(options, selected),
      });
      Alert.alert('Agregado al carrito', `${quantity} x ${item.name}`);
      setSheetOpen(false);
      setQuantity(1);
      setSelected({});
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'No pudimos agregar al carrito. Revisa el login del backend de menú.';
      Alert.alert('Error', message);
    } finally {
      setAdding(false);
    }
  };

  const selectedCount = Object.values(selected).reduce((sum, ids) => sum + ids.length, 0);
  const itemImage = resolveMediaUrl(item.image);


  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {itemImage ? (
          <Image source={{ uri: itemImage }} style={styles.image} />
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

        <View style={styles.summaryCard}>
          <Ionicons name="options-outline" size={22} color="#1E40AF" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>Personaliza tu pedido</Text>
            <Text style={styles.summaryHint}>
              {options.length === 0
                ? 'Sin opciones adicionales'
                : selectedCount > 0
                  ? `${selectedCount} opción(es) seleccionada(s)`
                  : `${options.length} grupo(s) de opciones disponibles`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.summaryButton}
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir personalización"
          >
            <Text style={styles.summaryButtonText}>Abrir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.stickyBar}>
        <View style={styles.stickyPriceBox}>
          <Text style={styles.stickyPriceLabel}>Total</Text>
          <Text style={styles.stickyPrice}>{formatMoney(totalPrice, item.currency)}</Text>
        </View>
        <TouchableOpacity
          style={styles.stickyAddButton}
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Personalizar y agregar al carrito"
        >
          <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
          <Text style={styles.stickyButtonText}>Agregar al carrito</Text>
        </TouchableOpacity>
      </View>

      <MenuItemSheet
        visible={sheetOpen}
        name={item.name}
        currency={item.currency}
        options={options}
        selected={selected}
        quantity={quantity}
        total={totalPrice}
        adding={adding}
        formatMoney={formatMoney}
        onToggleChoice={toggleChoice}
        onQuantityChange={setQuantity}
        onClose={() => setSheetOpen(false)}
        onAdd={addToCart}
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
    fontSize: 48,
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    padding: 16,
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  summaryHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  summaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E40AF',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  summaryButtonText: {
    color: '#1E40AF',
    fontSize: 13,
    fontWeight: '600',
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
  stickyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

