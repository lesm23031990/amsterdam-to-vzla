import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiClient } from '@/api/client';
import { Ionicons } from '@expo/vector-icons';

export interface MenuChoice {
  id: string;
  name: string;
  priceModifier: number;
}

export interface MenuOption {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  choices: MenuChoice[];
}

interface MenuItem {
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

export default function MenuScreen() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  const fetchMenu = useCallback(async () => {
    try {
      setError(false);
      const response = await apiClient.get('/api/v1/fastfood/menu');
      setItems(response.data.data || []);
    } catch (err) {
      console.error('Error fetching menu:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMenu();
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
        <Text style={styles.errorText}>No pudimos cargar el menú</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMenu}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={<Text style={styles.headerTitle}>Menú de comida rápida</Text>}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No hay productos en el menú</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => router.push(`/menu/${item.id}`)}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderText}>{item.name.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.prepBadge}>
                <Text style={styles.prepBadgeText}>⏱ {item.preparationTime} min</Text>
              </View>
            </View>
            {item.category && <Text style={styles.cardCategory}>{item.category}</Text>}
            {item.description && (
              <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
            )}
            <View style={styles.cardFooter}>
              <Text style={styles.cardPrice}>
                {item.currency === 'Bs' ? 'Bs.' : item.currency === 'USD' ? 'USD $' : 'COP $'}
                {item.basePrice.toFixed(2)}
              </Text>
              {item.options?.length > 0 && (
                <Text style={styles.customizable}>Personalizable</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
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
  list: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
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
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: {
    width: 100,
    height: 100,
    backgroundColor: '#E5E7EB',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  cardBody: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  prepBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  prepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  cardCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  customizable: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
});
