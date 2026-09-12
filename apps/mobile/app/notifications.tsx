import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { apiClient } from '@/api/client';
import { Ionicons } from '@expo/vector-icons';

interface NotificationOrder {
  id: string;
  status: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data: Record<string, string> | null;
  orderId: string | null;
  order: NotificationOrder | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  order_status: { icon: 'receipt-outline', color: '#1E40AF' },
  payment_confirmed: { icon: 'checkmark-circle-outline', color: '#10B981' },
  driver_assigned: { icon: 'bicycle-outline', color: '#8B5CF6' },
  delivery_update: { icon: 'location-outline', color: '#F59E0B' },
  promo: { icon: 'pricetags-outline', color: '#EF4444' },
  system: { icon: 'information-circle-outline', color: '#6B7280' },
  comment_reply: { icon: 'chatbubble-ellipses-outline', color: '#1E40AF' },
  question_resolved: { icon: 'help-circle-outline', color: '#10B981' },
  product_report: { icon: 'warning-outline', color: '#EF4444' },
  stock_available: { icon: 'cube-outline', color: '#10B981' },
};

const PER_PAGE = 20;

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async (pageNum: number, replace: boolean) => {
    try {
      setError(false);
      const response = await apiClient.get(
        `/api/v1/notifications?page=${pageNum}&perPage=${PER_PAGE}`
      );
      const data = response.data.data;
      const list: Notification[] = data.notifications || [];
      setNotifications((prev) => (replace ? list : [...prev, ...list]));
      setUnreadCount(data.unreadCount ?? 0);
      setHasMore(pageNum * PER_PAGE < (data.total ?? 0));
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(1, true);
  };

  const onEndReached = () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchNotifications(page + 1, false);
  };

  const navigateByType = (n: Notification) => {
    const targetOrderId = n.order?.id || n.orderId || n.data?.orderId;
    if (targetOrderId) {
      router.push(`/orders/${targetOrderId}`);
      return;
    }
    if (n.data?.productId) {
      router.push(`/products/${n.data.productId}`);
      return;
    }
    if (n.data?.menuItemId) {
      router.push(`/menu/${n.data.menuItemId}`);
      return;
    }
  };

  const handlePress = async (n: Notification) => {
    if (!n.read) {
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await apiClient.patch(`/api/v1/notifications/${n.id}/read`);
      } catch (err) {
        console.error('Error marking notification read:', err);
      }
    }
    navigateByType(n);
  };

  const markAllRead = async () => {
    try {
      await apiClient.patch('/api/v1/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all read:', err);
      Alert.alert('Error', 'No pudimos marcar todas como leídas');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>No pudimos cargar tus notificaciones</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchNotifications(1, true)}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSubtitle}>{unreadCount} sin leer</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllButton} onPress={markAllRead}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#1E40AF" />
              <Text style={styles.markAllText}>Marcar todas leídas</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={26} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No tienes notificaciones</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" color="#1E40AF" style={styles.footerLoader} /> : null
        }
        renderItem={({ item }) => {
          const conf = TYPE_ICONS[item.type] || TYPE_ICONS.system;
          return (
            <TouchableOpacity
              style={[styles.card, !item.read && styles.cardUnread]}
              onPress={() => handlePress(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: `${conf.color}1A` }]}>
                <Ionicons name={conf.icon} size={22} color={conf.color} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
                <Text style={styles.cardDate}>
                  {new Date(item.createdAt).toLocaleString('es-VE')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  footerLoader: {
    marginVertical: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#1E40AF',
    backgroundColor: '#EFF6FF',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  cardTitleUnread: {
    fontWeight: '700',
    color: '#111827',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E40AF',
  },
  cardMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  cardDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
