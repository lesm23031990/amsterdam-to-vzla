'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { api } from '@/lib/api';
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
  const { currency, formatPrice } = useCurrency();
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
  const [commentFilter, setCommentFilter] = useState('all');
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [commentType, setCommentType] = useState<'question' | 'comment'>('comment');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [commentsPage, setCommentsPage] = useState(1);

  // Related
  const [relatedData, setRelatedData] = useState<RelatedData | null>(null);

  // Report
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSent, setReportSent] = useState(false);

  // Stock notification
  const [subscribedStock, setSubscribedStock] = useState(false);

  // Share
  const [copied, setCopied] = useState(false);

  const productId = params.id as string;

  useEffect(() => {
    Promise.all([
      api.get<Product>(`/products/${productId}?currency=${currency}`),
      api.get<CommentsData>(`/products/${productId}/comments?perPage=10`),
      api.get<RelatedData>(`/products/${productId}/related?currency=${currency}`),
    ]).then(([productRes, commentsRes, relatedRes]) => {
      if (productRes.ok && productRes.data) {
        setProduct(productRes.data);
      }
      if (commentsRes.ok && commentsRes.data) {
        setCommentsData(commentsRes.data);
      }
      if (relatedRes.ok && relatedRes.data) {
        setRelatedData(relatedRes.data);
      }
      setLoading(false);
      setCommentsLoading(false);
    });
  }, [productId, currency]);

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

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Mira este producto en Amsterdam Frozen Foods: ${product?.name} - ${product?.displayPrice}`;
    if (navigator.share) {
      try { await navigator.share({ title: product?.name, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateComment = async () => {
    if (!user || !newComment.trim()) return;
    const res = await api.post(`/products/${productId}/comments`, {
      type: commentType,
      content: newComment.trim(),
      rating: commentType === 'comment' && newRating > 0 ? newRating : undefined,
    });
    if (res.ok) {
      setNewComment('');
      setNewRating(0);
      const commentsRes = await api.get<CommentsData>(`/products/${productId}/comments?perPage=10`);
      if (commentsRes.ok && commentsRes.data) setCommentsData(commentsRes.data);
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
      const commentsRes = await api.get<CommentsData>(`/products/${productId}/comments?perPage=10`);
      if (commentsRes.ok && commentsRes.data) setCommentsData(commentsRes.data);
    }
  };

  const handleReact = async (commentId: string) => {
    if (!user) return;
    const res = await api.post(`/products/${productId}/comments/${commentId}/react`, {
      reaction: 'helpful',
    });
    if (res.ok) {
      const commentsRes = await api.get<CommentsData>(`/products/${productId}/comments?perPage=10`);
      if (commentsRes.ok && commentsRes.data) setCommentsData(commentsRes.data);
    }
  };

  const handleResolve = async (commentId: string) => {
    const res = await api.post(`/products/${productId}/comments/${commentId}/resolve`, {});
    if (res.ok) {
      const commentsRes = await api.get<CommentsData>(`/products/${productId}/comments?perPage=10`);
      if (commentsRes.ok && commentsRes.data) setCommentsData(commentsRes.data);
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

  if (loading) return <p className={styles.loading}>Cargando producto...</p>;
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
              <button className={styles.shareBtn} onClick={handleShare}>
                {copied ? '✓ Link copiado' : '📤 Compartir'}
              </button>
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
              {new Date(product.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
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
          <div className={styles.commentFilters}>
            {['all', 'question', 'comment'].map((f) => (
              <button
                key={f}
                className={`${styles.commentFilter} ${commentFilter === f ? styles.commentFilterActive : ''}`}
                onClick={() => setCommentFilter(f)}
              >
                {f === 'all' ? 'Todos' : f === 'question' ? `Preguntas (${commentsData?.totalQuestions || 0})` : `Comentarios (${commentsData?.totalComments || 0})`}
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
            </div>
          )}

          {/* Comments List */}
          {commentsLoading ? (
            <p className={styles.loading}>Cargando comentarios...</p>
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
