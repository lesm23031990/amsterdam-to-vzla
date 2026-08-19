import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCurrencyStore } from '@/store/currencyStore';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiClient } from '@/api/client';
import { Ionicons } from '@expo/vector-icons';

interface Product {
  id: string;
  name: string;
  price: number;
  priceCop: number;
  displayPrice: string;
  displayDiscountPrice: string | null;
  image: string;
  brand: string;
  isFeatured: boolean;
  hasDiscount: boolean;
  discountPercent: number;
  stock: number;
}

const tabs = [
  { key: 'all', label: 'Todos', icon: 'grid-outline' },
  { key: 'featured', label: 'Destacados', icon: 'star-outline' },
  { key: 'offers', label: 'Ofertas', icon: 'flash-outline' },
];

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { isAuthenticated } = useAuthStore();
  const { currency, formatPrice, loadCurrency, loadRates } = useCurrencyStore();
  const router = useRouter();

  useEffect(() => {
    loadCurrency();
    loadRates();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [activeTab, currency])
  );

  const fetchProducts = async () => {
    try {
      const params: Record<string, string> = { currency };
      if (activeTab === 'featured') params.featured = 'true';
      if (activeTab === 'offers') params.discount = 'true';

      const qs = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
      const response = await apiClient.get(`/api/v1/products?${qs}`);
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsBar}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => { setActiveTab(t.key); setLoading(true); }}
          >
            <Ionicons
              name={t.icon as any}
              size={16}
              color={activeTab === t.key ? '#FFFFFF' : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No hay productos en esta sección</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              item.isFeatured && styles.cardFeatured,
              item.hasDiscount && styles.cardOffer,
            ]}
            onPress={() => router.push(`/products/${item.id}`)}
          >
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imageText}>{item.name.charAt(0)}</Text>
              {item.isFeatured && (
                <View style={styles.badgeFeatured}>
                  <Text style={styles.badgeText}>⭐</Text>
                </View>
              )}
              {item.hasDiscount && item.discountPercent > 0 && (
                <View style={styles.badgeOffer}>
                  <Text style={styles.badgeText}>-{item.discountPercent}%</Text>
                </View>
              )}
            </View>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.priceRow}>
              {item.hasDiscount && item.displayDiscountPrice ? (
                <>
                  <Text style={styles.productPrice}>{item.displayDiscountPrice}</Text>
                  <Text style={styles.oldPrice}>{item.displayPrice}</Text>
                </>
              ) : (
                <Text style={styles.productPrice}>
                  {item.displayPrice || formatPrice(item.priceCop)}
                </Text>
              )}
            </View>
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
  tabsBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#1E40AF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  grid: {
    padding: 8,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  card: {
    flex: 1,
    margin: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardFeatured: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  cardOffer: {
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  imageText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  badgeFeatured: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeOffer: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  oldPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
});
