'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { api } from '@/lib/api';
import ShareButton from '@/components/ShareButton';
import CommentImagePicker from '@/components/CommentImagePicker';
import { COMMENT_FILTER_LABELS, CommentFilter, commentsEndpoint } from '@/lib/comments';
import styles from './page.module.css';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  priceCop: number;
  currency: string;
  displayPrice: string;
  discountPrice: number | null;
  displayDiscountPrice: string | null;
  category: string;
  images: string[];
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  hasDiscount: boolean;
  discountPercent: number;
  soldCount: number;
  specifications: { key: string; value: string }[];
  badges: string[];
  commentsCount: number;
  averageRating: number;
  reviewsCount: number;
  brand?: { id: string; name: string; slug: string; logoImage: string | null };
  createdAt: string;
}

interface Comment {
  id: string;
  type: 'question' | 'comment' | 'reply';
  user: { name: string; initials: string };
  content: string;
  images: string[];
  rating: number | null;
  createdAt: string;
  resolved: boolean | null;
  reactions: Record<string, number>;
  replies: {
    id: string;
    user: { name: string; initials: string };
    content: string;
    createdAt: string;
    reactions: Record<string, number>;
  }[];
}

interface CommentsData {
  averageRating: number;
  totalComments: number;
  totalQuestions: number;
  distribution: Record<string, number>;
  comments: Comment[];
  pagination: { page: number; perPage: number; total: number };
}

interface RelatedData {
  sameCategory: { id: string; name: string; price: number; priceCop: number; images: string[]; category: string; displayPrice: string }[];
  boughtTogether: { id: string; name: string; price: number; priceCop: number; images: string[]; category: string; displayPrice: string }[];
}

const NEW_PRODUCT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const COMMENT_FILTERS: CommentFilter[] = ['all', 'question', 'comment', 'withImages', 'withRating'];

const REPORT_REASONS = [
  { value: 'misleading_info', label: 'Informacion enganosa' },
  { value: 'wrong_price', label: 'Precio incorrecto' },
  { value: 'out_of_stock', label: 'Producto agotado hace mucho' },
  { value: 'inappropriate', label: 'Contenido inapropiado' },
  { value: 'other', label: 'Otro' },
];

const SPEC_ICONS: Record<string, string> = {
  congelados: '❄️',
  insumos: '📦',
  salsas: '🫙',
  panaderia: '🍞',
  bebidas: '🥤',
  postres: '🍰',
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currency } = useCurrency();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  // Gallery
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomStyle, setZoomStyle] = useState<Record<string, string>>({});
  const imgRef = useRef<HTMLDivElement>(null);

  // Comments
  const [commentsData, setCommentsData] = useState<CommentsData | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentFilter, setCommentFilter] = useState<CommentFilter>('all');
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [commentType, setCommentType] = useState<'question' | 'comment'>('comment');
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [commentError, setCommentError] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Related
  const [relatedData, setRelatedData] = useState<RelatedData | null>(null);

  // Report
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSent, setReportSent] = useState(false);

  // Stock notification
  const [subscribedStock, setSubscribedStock] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);

  const productId = params.id as string;

  useEffect(() => {
    Promise.all([
      api.get<Product>(`/products/${productId}?currency=${currency}`),
      api.get<RelatedData>(`/products/${productId}/related?currency=${currency}`),
    ]).then(([productRes, relatedRes]) => {
      if (productRes.ok && productRes.data) {
        setProduct(productRes.data);
        setIsNewProduct(Date.now() - new Date(productRes.data.createdAt).getTime() < NEW_PRODUCT_WINDOW_MS);
      }
      if (relatedRes.ok && relatedRes.data) {
        setRelatedData(relatedRes.data);
      }
      setLoading(false);
    });
  }, [productId, currency]);

  // Comentarios: se recargan al cambiar el filtro (todos / preguntas / comentarios / con fotos / con rating)
  const reloadComments = useCallback(async () => {
    const res = await api.get<CommentsData>(commentsEndpoint(productId, commentFilter));
    if (res.ok && res.data) setCommentsData(res.data);
    setCommentsLoading(false);
  }, [productId, commentFilter]);

  useEffect(() => {
    let cancelled = false;
    api.get<CommentsData>(commentsEndpoint(productId, commentFilter)).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) setCommentsData(res.data);
      setCommentsLoading(false);
    });
    return () => { cancelled = true; };
  }, [productId, commentFilter]);

  const changeCommentFilter = (filter: CommentFilter) => {
    setCommentsLoading(true);
    setCommentFilter(filter);
  };

  const handleAddToCart = async () => {
    if (!user) { router.push('/login'); return; }
    if (!product || product.stock === 0) return;
    setAdding(true);
    const res = await api.post('/cart/items', { productId: product.id, quantity });
    if (res.ok) {
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 2000);
    }
    setAdding(false);
  };

  const handleImageHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(1.8)',
      transition: 'transform 0.1s ease',
    });
  };

  const handleImageLeave = () => {
    setZoomStyle({ transform: 'scale(1)', transition: 'transform 0.3s ease' });
  };

  const handleCreateComment = async () => {
    if (!user || !newComment.trim()) return;
    setCommentError('');
    const res = await api.post(`/products/${productId}/comments`, {
      type: commentType,
      content: newComment.trim(),
      rating: commentType === 'comment' && newRating > 0 ? newRating : undefined,
      images: commentImages.length > 0 ? commentImages : undefined,
    });
    if (res.ok) {
      setNewComment('');
      setNewRating(0);
      setCommentImages([]);
      await reloadComments();
    } else {
      setCommentError(res.error || 'No se pudo publicar el comentario');
    }
  };

  const handleReply = async (commentId: string) => {
    if (!user || !replyContent.trim()) return;
    const res = await api.post(`/products/${productId}/comments/${commentId}/reply`, {
      content: replyContent.trim(),
    });
    if (res.ok) {
      setReplyContent('');
      setReplyingTo(null);
      await reloadComments();
    }
  };

  const handleReact = async (commentId: string) => {
    if (!user) return;
    const res = await api.post(`/products/${productId}/comments/${commentId}/react`, {
      reaction: 'helpful',
    });
    if (res.ok) {
      await reloadComments();
    }
  };

  const handleResolve = async (commentId: string) => {
    const res = await api.post(`/products/${productId}/comments/${commentId}/resolve`, {});
    if (res.ok) {
      await reloadComments();
    }
  };

  const handleReport = async () => {
    if (!user || !reportReason) return;
    const res = await api.post(`/products/${productId}/report`, {
      reason: reportReason,
      details: reportDetails || undefined,
    });
    if (res.ok) {
      setReportSent(true);
      setTimeout(() => { setReportOpen(false); setReportSent(false); setReportReason(''); setReportDetails(''); }, 2000);
    }
  };

  const handleStockNotify = async () => {
    if (!user) { router.push('/login'); return; }
    const res = await api.post(`/products/${productId}/notify-stock`, {});
    if (res.ok) setSubscribedStock(true);
  };

  const renderStars = (rating: number, size = 16) => {
    return (
      <span className={styles.stars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} style={{ fontSize: size, color: i <= rating ? '#f59e0b' : '#d1d5db' }}>★</span>
        ))}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={styles.page} aria-busy="true" aria-label="Cargando producto">
        <div className={styles.container}>
          <div className={`${styles.skeleton} ${styles.skeletonBreadcrumb}`} />
          <div className={styles.mainGrid}>
            <div className={styles.gallerySection}>
              <div className={`${styles.skeleton} ${styles.skeletonImage}`} />
              <div className={styles.skeletonThumbs}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`${styles.skeleton} ${styles.skeletonThumb}`} />
                ))}
              </div>
            </div>
            <div className={styles.infoSection}>
              <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
              <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
              <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
              <div className={`${styles.skeleton} ${styles.skeletonPrice}`} />
              <div className={`${styles.skeleton} ${styles.skeletonButton}`} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!product) return <p className={styles.loading}>Producto no encontrado</p>;

  const hasImages = product.images && product.images.length > 0;
  const isAdmin = user?.role === 'admin';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <Link href="/products">Productos</Link>
          <span> / </span>
          {product.brand && <><Link href={`/products?brand=${product.brand.slug}`}>{product.brand.name}</Link><span> / </span></>}
          <span>{product.name}</span>
        </div>

        {/* Main Content */}
        <div className={styles.mainGrid}>
          {/* Gallery */}
          <div className={styles.gallerySection}>
            <div
              ref={imgRef}
              className={styles.mainImage}
              style={{
                backgroundImage: hasImages ? `url(${product.images[activeImage]})` : undefined,
                ...zoomStyle,
              }}
              onClick={() => hasImages && setLightboxOpen(true)}
              onMouseMove={handleImageHover}
              onMouseLeave={handleImageLeave}
            >
              {!hasImages && <span className={styles.placeholder}>❄️</span>}
              {product.hasDiscount && product.discountPercent > 0 && (
                <span className={styles.discountBadge}>-{product.discountPercent}%</span>
              )}
            </div>

            {hasImages && product.images.length > 1 && (
              <div className={styles.thumbnails}>
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    className={`${styles.thumb} ${i === activeImage ? styles.thumbActive : ''}`}
                    onClick={() => setActiveImage(i)}
                    style={{ backgroundImage: `url(${img})` }}
                  />
                ))}
                <span className={styles.imageCounter}>{activeImage + 1}/{product.images.length}</span>
              </div>
            )}

            {/* Share & Report */}
            <div className={styles.metaActions}>
              <ShareButton title={product.name} price={product.displayPrice} />
              <button className={styles.reportLink} onClick={() => setReportOpen(true)}>
                Reportar producto
              </button>
            </div>
          </div>

          {/* Product Info */}
          <div className={styles.infoSection}>
            {/* Badges */}
            <div className={styles.badgesRow}>
              {product.badges?.includes('trending') && <span className={`${styles.badge} ${styles.badgeTrending}`}>🔥 Trending</span>}
              {product.badges?.includes('best-seller') && <span className={`${styles.badge} ${styles.badgeBest}`}>🏆 Mas vendido</span>}
              {product.isFeatured && <span className={`${styles.badge} ${styles.badgeFeatured}`}>⭐ Destacado</span>}
              {isNewProduct && (
                <span className={`${styles.badge} ${styles.badgeNew}`}>🆕 Nuevo</span>
              )}
            </div>

            <h1 className={styles.name}>{product.name}</h1>

            {product.brand && (
              <Link href={`/products?brand=${product.brand.slug}`} className={styles.brandLink}>
                {product.brand.logoImage && <img src={product.brand.logoImage} alt={product.brand.name} className={styles.brandLogo} />}
                {product.brand.name}
              </Link>
            )}

            {/* Rating */}
            {product.reviewsCount > 0 && (
              <div className={styles.ratingRow}>
                {renderStars(Math.round(product.averageRating))}
                <span className={styles.ratingText}>{product.averageRating.toFixed(1)} ({product.reviewsCount} resenas)</span>
              </div>
            )}

            {product.soldCount > 0 && (
              <span className={styles.soldCount}>+{product.soldCount} vendidos</span>
            )}

            {/* Price */}
            <div className={styles.priceBlock}>
              {product.hasDiscount && product.discountPrice ? (
                <>
                  <span className={styles.priceCurrent}>{product.displayDiscountPrice}</span>
                  <span className={styles.priceOld}>{product.displayPrice}</span>
                </>
              ) : (
                <span className={styles.priceCurrent}>{product.displayPrice}</span>
              )}
            </div>

            {/* Stock */}
            <div className={styles.stockBlock}>
              {product.stock > 0 ? (
                <span className={styles.inStock}>
                  Disponible ({product.stock} unidades)
                  {product.stock <= 5 && <span className={styles.lowStockWarn}> ¡Ultimas unidades!</span>}
                </span>
              ) : (
                <span className={styles.outOfStock}>Agotado</span>
              )}
            </div>

            {/* Actions */}
            {product.stock > 0 ? (
              <div className={styles.actions}>
                <div className={styles.quantityControl}>
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className={styles.qtyBtn}>-</button>
                  <span className={styles.qty}>{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className={styles.qtyBtn}>+</button>
                </div>
                <button onClick={handleAddToCart} className={styles.addBtn} disabled={adding || addedFeedback}>
                  {addedFeedback ? '✓ Agregado' : adding ? 'Agregando...' : 'Agregar al carrito'}
                </button>
              </div>
            ) : (
              <button
                className={styles.notifyBtn}
                onClick={handleStockNotify}
                disabled={subscribedStock}
              >
                {subscribedStock ? '✓ Te avisaremos' : '🔔 Avisarme cuando haya stock'}
              </button>
            )}

            {/* Description */}
            {product.description && (
              <div className={styles.descriptionBlock}>
                <h3>Descripcion</h3>
                <p>{product.description}</p>
              </div>
            )}

            {/* Specifications */}
            {product.specifications && product.specifications.length > 0 && (
              <div className={styles.specsBlock}>
                <h3>
                  {SPEC_ICONS[product.category] || '📋'} Caracteristicas
                </h3>
                <table className={styles.specsTable}>
                  <tbody>
                    {product.specifications.map((spec, i) => (
                      <tr key={i}>
                        <td className={styles.specKey}>{spec.key}</td>
                        <td className={styles.specValue}>{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className={styles.commentsSection}>
          <h2 className={styles.sectionTitle}>
            Comentarios y Preguntas ({product.commentsCount})
          </h2>

          {/* Filters */}
          <div className={styles.commentFilters} role="tablist" aria-label="Filtrar comentarios">
            {COMMENT_FILTERS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={commentFilter === f}
                className={`${styles.commentFilter} ${commentFilter === f ? styles.commentFilterActive : ''}`}
                onClick={() => changeCommentFilter(f)}
              >
                {f === 'question'
                  ? `Preguntas (${commentsData?.totalQuestions || 0})`
                  : f === 'comment'
                    ? `Comentarios (${commentsData?.totalComments || 0})`
                    : COMMENT_FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Rating Distribution */}
          {commentsData && commentsData.distribution && commentsData.totalComments > 0 && (
            <div className={styles.ratingDist}>
              <h4>Valoracion promedio: {commentsData.averageRating.toFixed(1)}</h4>
              {renderStars(Math.round(commentsData.averageRating), 20)}
              <div className={styles.distBars}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = commentsData.distribution[String(star)] || 0;
                  const pct = commentsData.totalComments > 0 ? (count / commentsData.totalComments) * 100 : 0;
                  return (
                    <div key={star} className={styles.distRow}>
                      <span className={styles.distStar}>{star} ★</span>
                      <div className={styles.distBar}>
                        <div className={styles.distFill} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.distCount}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New Comment */}
          {user && (
            <div className={styles.newComment}>
              <div className={styles.commentTypeToggle}>
                <button
                  className={`${styles.typeBtn} ${commentType === 'comment' ? styles.typeBtnActive : ''}`}
                  onClick={() => setCommentType('comment')}
                >
                  Comentario
                </button>
                <button
                  className={`${styles.typeBtn} ${commentType === 'question' ? styles.typeBtnActive : ''}`}
                  onClick={() => setCommentType('question')}
                >
                  Pregunta
                </button>
              </div>
              <textarea
                className={styles.commentInput}
                placeholder={commentType === 'question' ? 'Haz una pregunta sobre este producto...' : 'Comparte tu experiencia con este producto...'}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={500}
                rows={3}
              />
              {commentType === 'comment' && (
                <div className={styles.ratingInput}>
                  <span>Tu valoracion: </span>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className={styles.ratingStar}
                      style={{ color: i <= newRating ? '#f59e0b' : '#d1d5db', cursor: 'pointer', fontSize: 24 }}
                      onClick={() => setNewRating(i)}
                    >
                      ★
                    </span>
                  ))}
                </div>
              )}
              <div className={styles.commentActions}>
                <span className={styles.charCount}>{newComment.length}/500</span>
                <button
                  className={styles.submitComment}
                  onClick={handleCreateComment}
                  disabled={!newComment.trim()}
                >
                  Publicar
                </button>
              </div>
              <CommentImagePicker value={commentImages} onChange={setCommentImages} />
              {commentError && <p className={styles.commentError} role="alert">{commentError}</p>}
            </div>
          )}

          {/* Comments List */}
          {commentsLoading ? (
            <div className={styles.commentsList} aria-busy="true" aria-label="Cargando comentarios">
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.commentCard}>
                  <div className={styles.skeletonHeader}>
                    <div className={`${styles.skeleton} ${styles.skeletonAvatar}`} />
                    <div className={`${styles.skeleton} ${styles.skeletonLineShort}`} />
                  </div>
                  <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
                  <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
                </div>
              ))}
            </div>
          ) : commentsData && commentsData.comments.length > 0 ? (
            <div className={styles.commentsList}>
              {commentsData.comments.map((c) => (
                <div key={c.id} className={`${styles.commentCard} ${c.type === 'question' ? styles.commentQuestion : ''}`}>
                  <div className={styles.commentHeader}>
                    <div className={styles.commentAvatar}>{c.user.initials}</div>
                    <div>
                      <span className={styles.commentUser}>{c.user.name}</span>
                      <span className={styles.commentDate}>{new Date(c.createdAt).toLocaleDateString('es-VE')}</span>
                    </div>
                    <span className={styles.commentTypeBadge}>
                      {c.type === 'question' ? '❓ Pregunta' : c.type === 'reply' ? '↩️ Respuesta' : '💬 Comentario'}
                    </span>
                    {c.type === 'comment' && c.rating && (
                      <span className={styles.commentRating}>{renderStars(c.rating, 12)}</span>
                    )}
                    {c.type === 'question' && c.resolved && (
                      <span className={styles.resolvedBadge}>✓ Resuelta</span>
                    )}
                  </div>
                  <p className={styles.commentContent}>{c.content}</p>
                  {c.images && c.images.length > 0 && (
                    <div className={styles.commentImages}>
                      {c.images.map((img, i) => (
                        <button
                          key={img}
                          type="button"
                          className={styles.commentImage}
                          onClick={() => setPreviewImage(img)}
                          aria-label={`Ampliar foto ${i + 1} de ${c.user.name}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt={`Foto ${i + 1} de ${c.user.name}`} loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={styles.commentFooter}>
                    <button className={styles.reactBtn} onClick={() => handleReact(c.id)}>
                      👍 Útil ({c.reactions?.helpful || 0})
                    </button>
                    {user && (
                      <button className={styles.replyBtn} onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}>
                        Responder
                      </button>
                    )}
                    {isAdmin && c.type === 'question' && !c.resolved && (
                      <button className={styles.resolveBtn} onClick={() => handleResolve(c.id)}>
                        Marcar resuelta
                      </button>
                    )}
                  </div>

                  {/* Replies */}
                  {c.replies && c.replies.length > 0 && (
                    <div className={styles.replies}>
                      {c.replies.map((r) => (
                        <div key={r.id} className={styles.replyCard}>
                          <div className={styles.commentHeader}>
                            <div className={`${styles.commentAvatar} ${styles.replyAvatar}`}>{r.user.initials}</div>
                            <span className={styles.commentUser}>{r.user.name}</span>
                            <span className={styles.commentDate}>{new Date(r.createdAt).toLocaleDateString('es-VE')}</span>
                          </div>
                          <p className={styles.commentContent}>{r.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input */}
                  {replyingTo === c.id && user && (
                    <div className={styles.replyInput}>
                      <textarea
                        className={styles.commentInput}
                        placeholder="Escribe tu respuesta..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        maxLength={500}
                        rows={2}
                      />
                      <div className={styles.commentActions}>
                        <button className={styles.submitComment} onClick={() => handleReply(c.id)} disabled={!replyContent.trim()}>
                          Responder
                        </button>
                        <button className={styles.cancelReply} onClick={() => { setReplyingTo(null); setReplyContent(''); }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyComments}>Aun no hay comentarios. ¡Se el primero!</p>
          )}
        </div>

        {/* Related Products */}
        {relatedData && (relatedData.sameCategory.length > 0 || relatedData.boughtTogether.length > 0) && (
          <div className={styles.relatedSection}>
            {relatedData.boughtTogether.length > 0 && (
              <>
                <h2 className={styles.sectionTitle}>Comprados juntos</h2>
                <div className={styles.relatedGrid}>
                  {relatedData.boughtTogether.map((p) => (
                    <Link key={p.id} href={`/products/${p.id}`} className={styles.relatedCard}>
                      <div className={styles.relatedImg} style={p.images?.[0] ? { backgroundImage: `url(${p.images[0]})` } : {}}>
                        {!p.images?.[0] && '❄️'}
                      </div>
                      <p className={styles.relatedName}>{p.name}</p>
                      <p className={styles.relatedPrice}>{p.displayPrice}</p>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {relatedData.sameCategory.length > 0 && (
              <>
                <h2 className={styles.sectionTitle}>Productos similares</h2>
                <div className={styles.relatedGrid}>
                  {relatedData.sameCategory.map((p) => (
                    <Link key={p.id} href={`/products/${p.id}`} className={styles.relatedCard}>
                      <div className={styles.relatedImg} style={p.images?.[0] ? { backgroundImage: `url(${p.images[0]})` } : {}}>
                        {!p.images?.[0] && '❄️'}
                      </div>
                      <p className={styles.relatedName}>{p.name}</p>
                      <p className={styles.relatedPrice}>{p.displayPrice}</p>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && hasImages && (
        <div className={styles.lightbox} onClick={() => setLightboxOpen(false)}>
          <button className={styles.lightboxClose} onClick={() => setLightboxOpen(false)}>✕</button>
          <button
            className={styles.lightboxNav}
            onClick={(e) => { e.stopPropagation(); setActiveImage((prev) => (prev > 0 ? prev - 1 : product.images.length - 1)); }}
          >
            ‹
          </button>
          <img
            src={product.images[activeImage]}
            alt={product.name}
            className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className={`${styles.lightboxNav} ${styles.lightboxNext}`}
            onClick={(e) => { e.stopPropagation(); setActiveImage((prev) => (prev < product.images.length - 1 ? prev + 1 : 0)); }}
          >
            ›
          </button>
          <span className={styles.lightboxCounter}>{activeImage + 1}/{product.images.length}</span>
        </div>
      )}

      {/* Comment image lightbox */}
      {previewImage && (
        <div
          className={styles.lightbox}
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Foto del comentario"
        >
          <button className={styles.lightboxClose} onClick={() => setPreviewImage(null)} aria-label="Cerrar">✕</button>
          <img
            src={previewImage}
            alt="Foto del comentario"
            className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Report Modal */}
      {reportOpen && (
        <div className={styles.modal} onClick={() => setReportOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Reportar producto</h3>
            {reportSent ? (
              <p className={styles.reportSent}>✓ Gracias, revisaremos tu reporte</p>
            ) : (
              <>
                <div className={styles.reportReasons}>
                  {REPORT_REASONS.map((r) => (
                    <label key={r.value} className={styles.reportOption}>
                      <input
                        type="radio"
                        name="report"
                        value={r.value}
                        checked={reportReason === r.value}
                        onChange={() => setReportReason(r.value)}
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
                {reportReason === 'other' && (
                  <textarea
                    className={styles.commentInput}
                    placeholder="Describe el problema..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={3}
                  />
                )}
                <div className={styles.modalActions}>
                  <button className={styles.cancelBtn} onClick={() => setReportOpen(false)}>Cancelar</button>
                  <button
                    className={styles.submitReport}
                    onClick={handleReport}
                    disabled={!reportReason || (reportReason === 'other' && !reportDetails.trim())}
                  >
                    Enviar reporte
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
