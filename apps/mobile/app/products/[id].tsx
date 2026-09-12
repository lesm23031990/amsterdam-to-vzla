import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions, TextInput, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiClient } from '@/api/client';
import { useCurrencyStore } from '@/store/currencyStore';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ProductBrand {
  id: string;
  name: string;
  slug: string;
  logoImage: string | null;
}

interface Specification {
  label?: string;
  name?: string;
  value?: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceCop: number;
  currency: string;
  displayPrice: string;
  images: string[];
  stock: number;
  category: string | null;
  isFeatured: boolean;
  hasDiscount: boolean;
  discountPercent: number;
  soldCount: number;
  commentsCount: number;
  averageRating: number;
  reviewsCount: number;
  brand: ProductBrand | string | null;
  specifications: Specification[] | Record<string, string> | null;
  badges: string[] | null;
}

interface CommentUser {
  name: string;
  initials: string;
}

interface CommentReply {
  id: string;
  user: CommentUser;
  content: string;
  createdAt: string;
}

interface Comment {
  id: string;
  type: string;
  user: CommentUser;
  content: string;
  images: string[];
  rating: number | null;
  createdAt: string;
  resolved: boolean | null;
  reactions: Record<string, number>;
  replies: CommentReply[];
}

interface CommentsData {
  averageRating: number;
  totalComments: number;
  totalQuestions: number;
  distribution: Record<string, number>;
  comments: Comment[];
  pagination: { page: number; perPage: number; total: number };
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  priceCop: number;
  currency: string;
  displayPrice: string;
  images: string[];
  category: string | null;
  soldCount: number;
}

const BADGE_LABELS: Record<string, { label: string; color: string }> = {
  'trending': { label: '🔥 Tendencia', color: '#EF4444' },
  'best-seller': { label: '⭐ Más vendido', color: '#F59E0B' },
  'new': { label: '🆕 Nuevo', color: '#10B981' },
  'low-stock': { label: '⚠️ Últimas unidades', color: '#8B5CF6' },
};

const detailTabs = [
  { key: 'description', label: 'Descripción' },
  { key: 'comments', label: 'Comentarios' },
  { key: 'related', label: 'Relacionados' },
];

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currency, formatPrice, loadCurrency } = useCurrencyStore();
  const { isAuthenticated } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [adding, setAdding] = useState(false);

  const [comments, setComments] = useState<CommentsData | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const [related, setRelated] = useState<{ sameCategory: RelatedProduct[]; boughtTogether: RelatedProduct[] } | null>(null);
  const [relatedLoading, setRelatedLoading] = useState(false);

  useEffect(() => {
    loadCurrency();
  }, []);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await apiClient.get(`/api/v1/products/${id}?currency=${currency}`);
      setProduct(response.data.data);
    } catch (err) {
      console.error('Error fetching product:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id, currency]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (activeTab === 'comments' && !comments) {
      fetchComments();
    }
    if (activeTab === 'related' && !related) {
      fetchRelated();
    }
  }, [activeTab]);

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const response = await apiClient.get(`/api/v1/products/${id}/comments`);
      setComments(response.data.data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchRelated = async () => {
    setRelatedLoading(true);
    try {
      const response = await apiClient.get(`/api/v1/products/${id}/related?currency=${currency}`);
      setRelated(response.data.data);
    } catch (err) {
      console.error('Error fetching related products:', err);
    } finally {
      setRelatedLoading(false);
    }
  };

  const requireAuth = (): boolean => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return false;
    }
    return true;
  };

  const submitComment = async () => {
    if (!newComment.trim() || !requireAuth()) return;
    setPostingComment(true);
    try {
      await apiClient.post(`/api/v1/products/${id}/comments`, { content: newComment.trim() });
      setNewComment('');
      await fetchComments();
    } catch (err) {
      Alert.alert('Error', 'No pudimos publicar tu comentario. Intenta de nuevo.');
    } finally {
      setPostingComment(false);
    }
  };

  const submitReply = async (commentId: string) => {
    if (!replyText.trim() || !requireAuth()) return;
    setPostingComment(true);
    try {
      await apiClient.post(`/api/v1/products/${id}/comments/${commentId}/reply`, { content: replyText.trim() });
      setReplyText('');
      setReplyTo(null);
      await fetchComments();
    } catch (err) {
      Alert.alert('Error', 'No pudimos enviar tu respuesta. Intenta de nuevo.');
    } finally {
      setPostingComment(false);
    }
  };

  const addToCart = async (goToCheckout: boolean) => {
    if (!product || !requireAuth()) return;
    setAdding(true);
    try {
      await apiClient.post('/api/v1/cart/items', { productId: product.id, quantity });
      if (goToCheckout) {
        router.push('/checkout');
      } else {
        Alert.alert('Agregado al carrito', `${quantity} x ${product.name}`);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'No pudimos agregar el producto al carrito';
      Alert.alert('Error', message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E40AF" />
      </View>
    );
  }

  if (!product || error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>Producto no disponible</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProduct}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const badges = Array.isArray(product.badges) ? product.badges.filter((b): b is string => typeof b === 'string') : [];
  const brandName = typeof product.brand === 'string' ? product.brand : product.brand?.name ?? null;

  const specs: Specification[] = (() => {
    const raw = product.specifications;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      return Object.entries(raw).map(([label, value]) => ({ label, value: String(value) }));
    }
    return [];
  })();

  const discountPriceCop =
    product.hasDiscount && product.discountPercent > 0
      ? product.priceCop * (1 - product.discountPercent / 100)
      : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Gallery */}
        <View style={styles.gallery}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setImageIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
              }
            >
              {images.map((uri, i) => (
                <Image key={`${uri}-${i}`} source={{ uri }} style={styles.galleryImage} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.galleryImage, styles.galleryPlaceholder]}>
              <Text style={styles.galleryPlaceholderText}>{product.name.charAt(0)}</Text>
            </View>
          )}
          {images.length > 1 && (
            <View style={styles.pageIndicator}>
              {images.map((_, i) => (
                <View key={i} style={[styles.pageDot, i === imageIndex && styles.pageDotActive]} />
              ))}
            </View>
          )}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <View style={styles.badgesRow}>
            {badges.map((b) => {
              const conf = BADGE_LABELS[b];
              return conf ? (
                <View key={b} style={[styles.badge, { backgroundColor: conf.color }]}>
                  <Text style={styles.badgeText}>{conf.label}</Text>
                </View>
              ) : null;
            })}
            {product.isFeatured && (
              <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.badgeText}>⭐ Destacado</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{product.name}</Text>
          {brandName && <Text style={styles.brand}>{brandName}</Text>}

          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= Math.round(product.averageRating) ? 'star' : 'star-outline'}
                  size={16}
                  color="#F59E0B"
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {product.averageRating ? product.averageRating.toFixed(1) : '—'}
            </Text>
            <Text style={styles.ratingMuted}>({product.reviewsCount} reseñas · {product.commentsCount} comentarios)</Text>
          </View>

          <View style={styles.priceRow}>
            {discountPriceCop !== null ? (
              <>
                <Text style={styles.price}>{formatPrice(discountPriceCop)}</Text>
                <Text style={styles.oldPrice}>{product.displayPrice || formatPrice(product.priceCop)}</Text>
                <View style={styles.discountTag}>
                  <Text style={styles.discountTagText}>-{Math.round(product.discountPercent)}%</Text>
                </View>
              </>
            ) : (
              <Text style={styles.price}>{product.displayPrice || formatPrice(product.priceCop)}</Text>
            )}
          </View>

          <View style={styles.stockRow}>
            <Ionicons
              name={product.stock > 0 ? 'cube-outline' : 'close-circle-outline'}
              size={16}
              color={product.stock > 0 ? '#10B981' : '#EF4444'}
            />
            <Text style={[styles.stockText, { color: product.stock > 0 ? '#10B981' : '#EF4444' }]}>
              {product.stock > 0 ? `${product.stock} en stock` : 'Sin stock'}
            </Text>
            {product.soldCount > 0 && (
              <Text style={styles.soldText}>· {product.soldCount} vendidos</Text>
            )}
          </View>

          {product.stock > 0 && (
            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>Cantidad:</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Ionicons name="remove" size={18} color="#1E40AF" />
              </TouchableOpacity>
              <Text style={styles.quantity}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity((q) => Math.min(product.stock, q + 1))}
              >
                <Ionicons name="add" size={18} color="#1E40AF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsBar}>
          {detailTabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'description' && (
          <View style={styles.section}>
            <Text style={styles.description}>
              {product.description || 'Este producto aún no tiene descripción.'}
            </Text>
            {specs.length > 0 && (
              <View style={styles.specsTable}>
                <Text style={styles.specsTitle}>Especificaciones</Text>
                {specs.map((s, i) => (
                  <View key={i} style={styles.specRow}>
                    <Text style={styles.specLabel}>{s.label ?? s.name ?? '—'}</Text>
                    <Text style={styles.specValue}>{s.value ?? '—'}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'comments' && (
          <View style={styles.section}>
            <View style={styles.commentForm}>
              <TextInput
                style={styles.commentInput}
                placeholder="Escribe un comentario o pregunta..."
                placeholderTextColor="#9CA3AF"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.commentSubmit, (postingComment || !newComment.trim()) && styles.commentSubmitDisabled]}
                onPress={submitComment}
                disabled={postingComment || !newComment.trim()}
              >
                <Text style={styles.commentSubmitText}>
                  {postingComment ? 'Enviando...' : 'Comentar'}
                </Text>
              </TouchableOpacity>
            </View>

            {commentsLoading ? (
              <ActivityIndicator size="large" color="#1E40AF" style={styles.tabLoader} />
            ) : (
              comments?.comments.map((c) => (
                <View key={c.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>{c.user.initials}</Text>
                    </View>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>{c.user.name}</Text>
                      <Text style={styles.commentDate}>
                        {new Date(c.createdAt).toLocaleDateString('es-VE')}
                      </Text>
                    </View>
                    {c.type === 'question' && (
                      <View style={[styles.questionTag, c.resolved && styles.questionTagResolved]}>
                        <Text style={styles.questionTagText}>{c.resolved ? 'Resuelta' : 'Pregunta'}</Text>
                      </View>
                    )}
                    {c.rating ? (
                      <View style={styles.commentRating}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.commentRatingText}>{c.rating}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.commentContent}>{c.content}</Text>
                  {c.reactions?.helpful ? (
                    <Text style={styles.helpfulText}>👍 {c.reactions.helpful} persona(s) les resultó útil</Text>
                  ) : null}

                  {c.replies.map((r) => (
                    <View key={r.id} style={styles.replyCard}>
                      <View style={[styles.commentAvatar, styles.replyAvatar]}>
                        <Text style={styles.commentAvatarText}>{r.user.initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.commentAuthor}>{r.user.name}</Text>
                        <Text style={styles.commentContent}>{r.content}</Text>
                      </View>
                    </View>
                  ))}

                  {replyTo === c.id ? (
                    <View style={styles.replyForm}>
                      <TextInput
                        style={styles.commentInput}
                        placeholder="Escribe tu respuesta..."
                        placeholderTextColor="#9CA3AF"
                        value={replyText}
                        onChangeText={setReplyText}
                        multiline
                        maxLength={500}
                      />
                      <View style={styles.replyActions}>
                        <TouchableOpacity
                          style={styles.commentCancel}
                          onPress={() => { setReplyTo(null); setReplyText(''); }}
                        >
                          <Text style={styles.commentCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.commentSubmit, (postingComment || !replyText.trim()) && styles.commentSubmitDisabled]}
                          onPress={() => submitReply(c.id)}
                          disabled={postingComment || !replyText.trim()}
                        >
                          <Text style={styles.commentSubmitText}>Responder</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.replyTrigger}
                      onPress={() => { setReplyTo(c.id); setReplyText(''); }}
                    >
                      <Ionicons name="return-up-forward-outline" size={14} color="#1E40AF" />
                      <Text style={styles.replyTriggerText}>Responder</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
            {!commentsLoading && (comments?.comments.length ?? 0) === 0 && (
              <Text style={styles.emptyText}>Aún no hay comentarios. ¡Sé el primero!</Text>
            )}
          </View>
        )}

        {activeTab === 'related' && (
          <View style={styles.section}>
            {relatedLoading ? (
              <ActivityIndicator size="large" color="#1E40AF" style={styles.tabLoader} />
            ) : (
              <>
                {(related?.sameCategory.length ?? 0) > 0 && (
                  <>
                    <Text style={styles.carouselTitle}>Productos similares</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
                      {related?.sameCategory.map((p) => (
                        <RelatedCard key={p.id} product={p} onPress={() => router.push(`/products/${p.id}`)} />
                      ))}
                    </ScrollView>
                  </>
                )}
                {(related?.boughtTogether.length ?? 0) > 0 && (
                  <>
                    <Text style={styles.carouselTitle}>Comprados juntos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
                      {related?.boughtTogether.map((p) => (
                        <RelatedCard key={p.id} product={p} onPress={() => router.push(`/products/${p.id}`)} />
                      ))}
                    </ScrollView>
                  </>
                )}
                {(related?.sameCategory.length ?? 0) === 0 && (related?.boughtTogether.length ?? 0) === 0 && (
                  <Text style={styles.emptyText}>No encontramos productos relacionados todavía.</Text>
                )}
              </>
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={styles.stickyBar}>
        <View style={styles.stickyPriceBox}>
          <Text style={styles.stickyPriceLabel}>Total</Text>
          <Text style={styles.stickyPrice}>
            {formatPrice((discountPriceCop ?? product.priceCop) * quantity)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.stickyAddButton, (adding || product.stock === 0) && styles.stickyButtonDisabled]}
          onPress={() => addToCart(false)}
          disabled={adding || product.stock === 0}
        >
          <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
          <Text style={styles.stickyButtonText}>
            {product.stock === 0 ? 'Sin stock' : adding ? 'Agregando...' : 'Agregar al carrito'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.stickyBuyButton, (adding || product.stock === 0) && styles.stickyButtonDisabled]}
          onPress={() => addToCart(true)}
          disabled={adding || product.stock === 0}
        >
          <Text style={styles.stickyButtonText}>Comprar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RelatedCard({ product, onPress }: { product: RelatedProduct; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.relatedCard} onPress={onPress}>
      {product.images?.[0] ? (
        <Image source={{ uri: product.images[0] }} style={styles.relatedImage} />
      ) : (
        <View style={[styles.relatedImage, styles.relatedPlaceholder]}>
          <Text style={styles.relatedPlaceholderText}>{product.name.charAt(0)}</Text>
        </View>
      )}
      <Text style={styles.relatedName} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.relatedPrice}>{product.displayPrice}</Text>
    </TouchableOpacity>
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
    fontSize: 18,
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
  gallery: {
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.85,
  },
  galleryPlaceholder: {
    width: SCREEN_WIDTH,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryPlaceholderText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  pageDotActive: {
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  brand: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  ratingMuted: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  oldPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  discountTag: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountTagText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '600',
  },
  soldText: {
    fontSize: 13,
    color: '#6B7280',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 15,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
    color: '#111827',
  },
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1E40AF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  section: {
    padding: 16,
  },
  tabLoader: {
    marginTop: 24,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  specsTable: {
    marginTop: 16,
  },
  specsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  specLabel: {
    width: 130,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  specValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  commentForm: {
    marginBottom: 16,
  },
  commentInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  commentSubmit: {
    alignSelf: 'flex-end',
    backgroundColor: '#1E40AF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  commentSubmitDisabled: {
    backgroundColor: '#9CA3AF',
  },
  commentSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  commentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  commentMeta: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  commentDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  questionTag: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  questionTagResolved: {
    backgroundColor: '#D1FAE5',
  },
  questionTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  commentRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  commentRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  commentContent: {
    fontSize: 14,
    color: '#374151',
    marginTop: 8,
    lineHeight: 20,
  },
  helpfulText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  replyCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6B7280',
  },
  replyForm: {
    marginTop: 8,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    alignItems: 'center',
  },
  commentCancel: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  commentCancelText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  replyTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  replyTriggerText: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 24,
  },
  carouselTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  carousel: {
    paddingBottom: 8,
    marginBottom: 12,
  },
  relatedCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  relatedImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  relatedPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedPlaceholderText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  relatedName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    marginTop: 6,
  },
  relatedPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginTop: 2,
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
    paddingHorizontal: 12,
  },
  stickyBuyButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
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
