import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, ScrollView, Modal, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native';
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

interface CategoryOption {
  name: string;
  count: number;
}

interface BrandOption {
  id: string;
  name: string;
}

interface Filters {
  category: string | null;
  brandIds: string[];
  minPrice: string;
  maxPrice: string;
  orderBy: string;
  inStock: boolean;
}

const PER_PAGE = 20;

const emptyFilters: Filters = {
  category: null,
  brandIds: [],
  minPrice: '',
  maxPrice: '',
  orderBy: 'relevance',
  inStock: false,
};

const tabs = [
  { key: 'all', label: 'Todos', icon: 'grid-outline' },
  { key: 'featured', label: 'Destacados', icon: 'star-outline' },
  { key: 'offers', label: 'Ofertas', icon: 'flash-outline' },
];

const sortOptions = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'name_asc', label: 'Nombre A-Z' },
];

const countActiveFilters = (f: Filters) => {
  let n = 0;
  if (f.category) n++;
  if (f.brandIds.length > 0) n++;
  if (f.minPrice || f.maxPrice) n++;
  if (f.orderBy !== 'relevance') n++;
  if (f.inStock) n++;
  return n;
};

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<Filters>(emptyFilters);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const { isAuthenticated } = useAuthStore();
  const { currency, formatPrice, loadCurrency, loadRates } = useCurrencyStore();
  const router = useRouter();

  const activeFilterCount = countActiveFilters(filters);

  useEffect(() => {
    loadCurrency();
    loadRates();
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        apiClient.get('/api/v1/products/categories'),
        apiClient.get('/api/v1/brands'),
      ]);
      setCategories(catRes.data.data?.categories || []);
      setBrands(brandRes.data.data || []);
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const buildQuery = (pageNum: number) => {
    const params: Record<string, string> = {
      currency,
      page: String(pageNum),
      perPage: String(PER_PAGE),
    };
    if (activeTab === 'featured') params.featured = 'true';
    if (activeTab === 'offers') params.discount = 'true';
    if (filters.category) params.category = filters.category;
    if (filters.brandIds.length > 0) params.brandIds = filters.brandIds.join(',');
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.orderBy !== 'relevance') params.orderBy = filters.orderBy;
    if (filters.inStock) params.inStock = 'true';
    return Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  };

  const fetchProducts = useCallback(async (pageNum: number, replace: boolean) => {
    try {
      setError(false);
      const response = await apiClient.get(`/api/v1/products?${buildQuery(pageNum)}`);
      const list: Product[] = response.data.data || [];
      setProducts((prev) => (replace ? list : [...prev, ...list]));
      const totalPages = response.data.pagination?.totalPages ?? 1;
      setHasMore(pageNum < totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activeTab, filters, currency]);

  useFocusEffect(
    useCallback(() => {
      fetchProducts(1, true);
    }, [fetchProducts])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(1, true);
  };

  const onEndReached = () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchProducts(page + 1, false);
  };

  const openFilters = () => {
    setDraftFilters(filters);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setFiltersOpen(false);
    setLoading(true);
  };

  const clearFilters = () => {
    setDraftFilters(emptyFilters);
  };

  const toggleBrand = (id: string) => {
    setDraftFilters((prev) => ({
      ...prev,
      brandIds: prev.brandIds.includes(id)
        ? prev.brandIds.filter((b) => b !== id)
        : [...prev.brandIds, id],
    }));
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
      <View style={styles.tabsRow}>
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
          <TouchableOpacity
            style={styles.tab}
            onPress={() => router.push('/menu')}
          >
            <Ionicons name="restaurant-outline" size={16} color="#6B7280" />
            <Text style={styles.tabText}>Menú</Text>
          </TouchableOpacity>
        </ScrollView>
        <TouchableOpacity style={styles.filterButton} onPress={openFilters}>
          <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? '#1E40AF' : '#6B7280'} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {error && products.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
          <Text style={styles.errorText}>No pudimos cargar los productos</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchProducts(1, true)}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No hay productos que coincidan con los filtros</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#1E40AF" style={styles.footerLoader} />
            ) : null
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
                <View style={styles.badgesContainer}>
                  {item.isFeatured && (
                    <View style={styles.badgeFeatured}>
                      <Text style={styles.badgeText}>⭐ Destacado</Text>
                    </View>
                  )}
                  {item.hasDiscount && item.discountPercent > 0 && (
                    <View style={styles.badgeOffer}>
                      <Text style={styles.badgeText}>🔥 -{item.discountPercent}%</Text>
                    </View>
                  )}
                </View>
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
      )}

      {/* Filters modal */}
      <Modal visible={filtersOpen} animationType="slide" transparent onRequestClose={() => setFiltersOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.modalClear}>Limpiar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSection}>Ordenar por</Text>
              <View style={styles.chipsRow}>
                {sortOptions.map((o) => (
                  <TouchableOpacity
                    key={o.value}
                    style={[styles.chip, draftFilters.orderBy === o.value && styles.chipActive]}
                    onPress={() => setDraftFilters((prev) => ({ ...prev, orderBy: o.value }))}
                  >
                    <Text style={[styles.chipText, draftFilters.orderBy === o.value && styles.chipTextActive]}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {categories.length > 0 && (
                <>
                  <Text style={styles.modalSection}>Categoría</Text>
                  <View style={styles.chipsRow}>
                    <TouchableOpacity
                      style={[styles.chip, !draftFilters.category && styles.chipActive]}
                      onPress={() => setDraftFilters((prev) => ({ ...prev, category: null }))}
                    >
                      <Text style={[styles.chipText, !draftFilters.category && styles.chipTextActive]}>Todas</Text>
                    </TouchableOpacity>
                    {categories.map((c) => (
                      <TouchableOpacity
                        key={c.name}
                        style={[styles.chip, draftFilters.category === c.name && styles.chipActive]}
                        onPress={() => setDraftFilters((prev) => ({ ...prev, category: c.name }))}
                      >
                        <Text style={[styles.chipText, draftFilters.category === c.name && styles.chipTextActive]}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {brands.length > 0 && (
                <>
                  <Text style={styles.modalSection}>Marcas</Text>
                  <View style={styles.chipsRow}>
                    {brands.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.chip, draftFilters.brandIds.includes(b.id) && styles.chipActive]}
                        onPress={() => toggleBrand(b.id)}
                      >
                        <Text style={[styles.chipText, draftFilters.brandIds.includes(b.id) && styles.chipTextActive]}>
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.modalSection}>Precio (COP)</Text>
              <View style={styles.priceInputs}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Mínimo"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={draftFilters.minPrice}
                  onChangeText={(v) => setDraftFilters((prev) => ({ ...prev, minPrice: v.replace(/[^0-9.]/g, '') }))}
                />
                <TextInput
                  style={styles.priceInput}
                  placeholder="Máximo"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={draftFilters.maxPrice}
                  onChangeText={(v) => setDraftFilters((prev) => ({ ...prev, maxPrice: v.replace(/[^0-9.]/g, '') }))}
                />
              </View>

              <View style={styles.stockRow}>
                <Text style={styles.stockLabel}>Solo con stock disponible</Text>
                <Switch
                  value={draftFilters.inStock}
                  onValueChange={(v) => setDraftFilters((prev) => ({ ...prev, inStock: v }))}
                  trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                  thumbColor={draftFilters.inStock ? '#1E40AF' : '#FFFFFF'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setFiltersOpen(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApply} onPress={applyFilters}>
                <Text style={styles.modalApplyText}>Aplicar filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsBar: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
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
  footerLoader: {
    marginVertical: 12,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
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
  badgesContainer: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'column',
    gap: 4,
  },
  imageText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  badgeFeatured: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeOffer: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalClear: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  modalSection: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: '#1E40AF',
  },
  chipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  priceInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  stockLabel: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
  modalApply: {
    flex: 1.5,
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalApplyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
