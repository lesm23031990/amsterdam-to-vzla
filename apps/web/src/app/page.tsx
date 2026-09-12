'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Product {
  id: string; name: string; description: string | null;
  price: number; displayPrice: string;
  discountPrice: number | null; displayDiscountPrice: string | null;
  images: string[]; stock: number;
  isFeatured: boolean; hasDiscount: boolean; discountPercent: number;
  badges?: unknown;
}

interface OrderSummary {
  id: string; status: string; total: number; currency: string;
  createdAt: string;
  items: { name: string; quantity: number }[];
}

function makeFoodImg(w: number, h: number, emoji: string, bg1: string, bg2: string, accent: string) {
  const id = `g${Math.random().toString(36).substr(2, 6)}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs>` +
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${bg1}"/>` +
    `<stop offset="100%" stop-color="${bg2}"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect width="${w}" height="${h}" fill="url(%23${id})"/>` +
    `<circle cx="${w * 0.5}" cy="${h * 0.5}" r="${Math.min(w, h) * 0.2}" fill="${accent}" opacity="0.12"/>` +
    `<text x="${w * 0.5}" y="${h * 0.52}" text-anchor="middle" dominant-baseline="central" font-size="${Math.min(w, h) * 0.2}" font-family="sans-serif">${emoji}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const THEMES = {
  warm: { bg1: '#D4891A', bg2: '#F5A623', accent: '#FFF3DB' },
  light: { bg1: '#1A3660', bg2: '#4A7EC1', accent: '#E8EDF5' },
};

function ProductImg({ product, className, variant = 'light', dims = [400, 300] }: {
  product: Product; className: string; variant?: 'light' | 'warm'; dims?: [number, number];
}) {
  const theme = THEMES[variant];
  const fallback = makeFoodImg(dims[0], dims[1], '🧊', theme.bg1, theme.bg2, theme.accent);
  const src = product.images[0] || fallback;
  return (
    <img
      src={src}
      alt={product.name}
      className={className}
      onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
    />
  );
}

function productTag(p: Product): string | null {
  const badges = Array.isArray(p.badges) ? p.badges as { label?: string }[] : [];
  if (badges[0]?.label) return badges[0].label;
  if (p.hasDiscount) return `-${p.discountPercent}%`;
  return null;
}

function SkeletonCard({ className }: { className: string }) {
  return <div className={className} style={{ minHeight: 180, opacity: 0.35 }} aria-hidden="true" />;
}

const ORDER_LABELS: Record<string, string> = {
  pending_payment: 'Pago pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

function DeliveryStatusModule({ orders }: { orders: OrderSummary[] | null }) {
  return (
    <div className={styles.logisticsCard}>
      <div className={styles.logisticsHeader}>
        <h3 className={styles.logisticsTitle}>Mis Pedidos</h3>
        <Link href="/orders" className={styles.logisticsLink}>Ver todos →</Link>
      </div>
      {orders && orders.length === 0 && (
        <p className={styles.deliveryItems}>Aún no tienes pedidos. ¡Explora el catálogo y haz el primero!</p>
      )}
      {orders?.map(o => {
        const label = ORDER_LABELS[o.status] || o.status;
        const itemsSummary = o.items.slice(0, 2).map(i => `${i.name} x${i.quantity}`).join(', ')
          + (o.items.length > 2 ? '…' : '');
        return (
          <Link key={o.id} href={`/orders/${o.id}`} className={styles.deliveryCard}>
            <div className={styles.deliveryTop}>
              <span className={styles.deliveryId}>#{o.id.slice(-6).toUpperCase()}</span>
              <span className={`${styles.statusPill} ${styles[label.toLowerCase().replace(/ /g, '-')]}`}>
                {label}
              </span>
            </div>
            <p className={styles.deliveryItems}>{itemsSummary}</p>
            <div className={styles.deliveryBottom}>
              <span className={styles.deliveryEta}>${o.total.toFixed(2)} · {new Date(o.createdAt).toLocaleDateString('es-VE')}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function QuickAccessModule() {
  const quickLinks = [
    { icon: '📍', label: 'Tracking en vivo', desc: 'Rastrea tu pedido en el mapa', href: '/orders' },
    { icon: '🕐', label: 'Horario de delivery', desc: 'Lun-Sáb: 8am - 8pm', href: '/brands' },
    { icon: '💳', label: 'Métodos de pago', desc: 'Bs, USD, transferencia, Binance', href: '/checkout' },
    { icon: '📦', label: 'Pedido mínimo', desc: 'Desde $10 para delivery gratis', href: '/products' },
  ];

  return (
    <div className={styles.logisticsCard}>
      <div className={styles.logisticsHeader}>
        <h3 className={styles.logisticsTitle}>Información Útil</h3>
      </div>
      <div className={styles.quickGrid}>
        {quickLinks.map(q => (
          <Link href={q.href} key={q.label} className={styles.quickItem}>
            <span className={styles.quickIcon}>{q.icon}</span>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>{q.label}</span>
              <span className={styles.quickDesc}>{q.desc}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const router = useRouter();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [offerProducts, setOfferProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const qs = (extra: string) => `/products?${extra}&currency=${encodeURIComponent(currency)}`;
    Promise.all([
      api.get<Product[]>(qs('featured=true&perPage=3&orderBy=relevance')),
      api.get<Product[]>(qs('perPage=6&orderBy=relevance')),
      api.get<Product[]>(qs('discount=true&perPage=4&orderBy=relevance')),
    ]).then(([f, c, o]) => {
      if (f.ok && Array.isArray(f.data)) setFeaturedProducts(f.data);
      if (c.ok && Array.isArray(c.data)) setCatalogProducts(c.data);
      if (o.ok && Array.isArray(o.data)) setOfferProducts(o.data);
      setLoading(false);
    });
  }, [currency]);

  useEffect(() => {
    if (!user) { setOrders(null); return; }
    api.get<OrderSummary[]>('/checkout/orders').then(res => {
      if (res.ok && Array.isArray(res.data)) setOrders(res.data.slice(0, 3));
      else setOrders([]);
    });
  }, [user]);

  const handleQuickAdd = async (productId: string) => {
    if (!user) { router.push('/login'); return; }
    const res = await api.post(`/cart/items`, { productId, quantity: 1 });
    if (res.ok) {
      setAddedToCart(prev => ({ ...prev, [productId]: true }));
      setTimeout(() => setAddedToCart(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      }), 2000);
    }
  };

  return (
    <div className={styles.page}>
      {/* HERO */}
      <section className={styles.heroBanner}>
        <div className={styles.heroBg}>
          <img src="https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=1920&h=800&fit=crop" alt="Amsterdam Frozen Foods" className={styles.heroBgImg} />
          <div className={styles.heroOverlay} />
        </div>

        {/* Animated Particles */}
        <div className={styles.particles}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className={styles.particle} style={{
              left: `${(i * 5) % 100}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${3 + (i % 4)}s`,
              width: `${4 + (i % 3) * 2}px`,
              height: `${4 + (i % 3) * 2}px`,
            }} />
          ))}
        </div>

        {/* Floating Snowflakes */}
        <div className={styles.floatingIcons}>
          <span className={styles.floatIcon} style={{ left: '5%', animationDelay: '0s' }}>❄️</span>
          <span className={styles.floatIcon} style={{ left: '18%', animationDelay: '1s' }}>❄️</span>
          <span className={styles.floatIcon} style={{ left: '32%', animationDelay: '2s' }}>❄️</span>
          <span className={styles.floatIcon} style={{ left: '48%', animationDelay: '0.5s' }}>❄️</span>
          <span className={styles.floatIcon} style={{ left: '62%', animationDelay: '1.5s' }}>❄️</span>
          <span className={styles.floatIcon} style={{ left: '76%', animationDelay: '0.8s' }}>❄️</span>
          <span className={styles.floatIcon} style={{ left: '90%', animationDelay: '2.2s' }}>❄️</span>
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.heroBadgeWrap}>
              <span className={styles.heroBadge}>❄️ Calidad y frescura en cada producto</span>
            </div>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroTitleLine}>Alimentos Congelados</span>
              <span className={styles.heroAccent}>para tu Hogar y Negocio</span>
            </h1>
            <p className={styles.heroSub}>
              Productos congelados e insumos de comida rápida con delivery en San Cristóbal.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/products" className={styles.heroCta}>
                <span>🛒</span> Ver Catálogo
              </Link>
              <Link href={user ? '/orders' : '/register'} className={styles.heroCtaOutline}>
                {user ? 'Mis Pedidos' : 'Hacer Pedido'}
              </Link>
            </div>

            {/* Trust Badges */}
            <div className={styles.trustBadges}>
              <span className={styles.trustBadge}>🚚 Delivery gratis</span>
              <span className={styles.trustBadge}>⚡ Entrega en 30 min</span>
              <span className={styles.trustBadge}>💳 Paga en Bs o USD</span>
            </div>
          </div>
        </div>

        {/* Animated Gradient Orbs */}
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
      </section>

      {/* BENTO GRID - Productos Destacados */}
      <section className={styles.bentoSection}>
        <div className={styles.sectionInner}>
          <div className={styles.bentoHeader}>
            <h2 className={styles.sectionTitle}>Productos Destacados</h2>
            <Link href="/products?tab=featured" className={styles.viewAllLink}>Ver catálogo →</Link>
          </div>
          <div className={styles.bentoGrid}>
            {loading && Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} className={`${styles.bentoCard} ${styles[`bento${i + 1}`]}`} />
            ))}
            {featuredProducts.map((p, i) => {
              const tag = productTag(p);
              return (
                <Link href={`/products/${p.id}`} key={p.id} className={`${styles.bentoCard} ${styles[`bento${(i % 3) + 1}`]}`}>
                  <ProductImg product={p} className={styles.bentoImg} variant={i % 2 === 0 ? 'warm' : 'light'} dims={[600, 400]} />
                  <div className={styles.bentoOverlay}>
                    {tag && <span className={styles.bentoTag}>{tag}</span>}
                    <div className={styles.bentoInfo}>
                      <h3 className={styles.bentoName}>{p.name}</h3>
                      <span className={styles.bentoPrice}>{p.displayPrice}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
            {!loading && featuredProducts.length === 0 && (
              <div className={styles.emptySection}>
                <span className={styles.emptySectionIcon}>⭐</span>
                <span>Próximamente: nuestros productos destacados. ¡Vuelve pronto!</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CATÁLOGO EXPRESS + LOGÍSTICA */}
      <section className={styles.splitSection}>
        <div className={styles.splitContainer}>
          <div className={styles.catalogSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Catálogo Express</h2>
                <p className={styles.sectionSub}>Productos listos para agregar</p>
              </div>
              <Link href="/products" className={styles.viewAllLink}>Ver todo →</Link>
            </div>
            <div className={styles.productGrid}>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} className={styles.productCard} />
              ))}
              {catalogProducts.map((p, i) => (
                <div key={p.id} className={styles.productCard}>
                  <Link href={`/products/${p.id}`} className={styles.productImgWrap}>
                    <ProductImg product={p} className={styles.productImg} variant={i % 2 === 0 ? 'light' : 'warm'} />
                  </Link>
                  <div className={styles.productInfo}>
                    <Link href={`/products/${p.id}`} className={styles.productNameLink}>
                      <h3 className={styles.productName}>{p.name}</h3>
                    </Link>
                    <p className={styles.productDesc}>{p.description || 'Producto Amsterdam Frozen Foods'}</p>
                    <div className={styles.productPriceRow}>
                      <span className={styles.productPrice}>{p.hasDiscount && p.displayDiscountPrice ? p.displayDiscountPrice : p.displayPrice}</span>
                      <span className={styles.productStock}>Stock: {p.stock}</span>
                    </div>
                    <button
                      onClick={() => handleQuickAdd(p.id)}
                      className={`${styles.addBtn} ${addedToCart[p.id] ? styles.addedBtn : ''}`}
                      disabled={!!addedToCart[p.id] || p.stock === 0}
                    >
                      {addedToCart[p.id] ? '✓ Agregado' : p.stock === 0 ? 'Agotado' : 'Agregar'}
                    </button>
                  </div>
                </div>
              ))}
              {!loading && catalogProducts.length === 0 && (
                <div className={styles.emptySection}>
                  <span className={styles.emptySectionIcon}>📦</span>
                  <span>Estamos cargando el catálogo. ¡Vuelve en un momento!</span>
                </div>
              )}
            </div>
          </div>
          <div className={styles.logisticsSection}>
            {user && <DeliveryStatusModule orders={orders} />}
            <QuickAccessModule />
          </div>
        </div>
      </section>

      {/* OFERTAS */}
      <section className={styles.offersSection}>
        <div className={styles.sectionInner}>
          <div className={styles.offersHeader}>
            <div className={styles.offersTitleWrap}>
              <span className={styles.offersFire}>🔥</span>
              <div>
                <h2 className={styles.offersTitle}>Ofertas del Día</h2>
                <p className={styles.offersSub}>Precios especiales por tiempo limitado</p>
              </div>
            </div>
            <Link href="/products?tab=offers" className={styles.offersLink}>Ver todas →</Link>
          </div>
          <div className={styles.offersGrid}>
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} className={styles.offerCard} />
            ))}
            {offerProducts.map((p, i) => (
              <div key={p.id} className={styles.offerCard}>
                <Link href={`/products/${p.id}`} className={styles.offerImgWrap}>
                  <ProductImg product={p} className={styles.offerImg} variant={i % 2 === 0 ? 'light' : 'warm'} dims={[400, 400]} />
                  <span className={styles.discountPill}>-{p.discountPercent}%</span>
                </Link>
                <div className={styles.offerInfo}>
                  <Link href={`/products/${p.id}`} className={styles.productNameLink}>
                    <h3 className={styles.offerName}>{p.name}</h3>
                  </Link>
                  <p className={styles.offerDesc}>{p.description || 'Producto Amsterdam Frozen Foods'}</p>
                  <div className={styles.offerPriceRow}>
                    <span className={styles.offerPrice}>{p.displayDiscountPrice || p.displayPrice}</span>
                    <span className={styles.offerOld}>{p.displayPrice}</span>
                  </div>
                  <button
                    onClick={() => handleQuickAdd(p.id)}
                    className={`${styles.offerBtn} ${addedToCart[p.id] ? styles.offerBtnAdded : ''}`}
                    disabled={!!addedToCart[p.id] || p.stock === 0}
                  >
                    {addedToCart[p.id] ? '✓ Agregado' : p.stock === 0 ? 'Agotado' : 'Comprar'}
                  </button>
                </div>
              </div>
            ))}
            {!loading && offerProducts.length === 0 && (
              <div className={styles.emptySection}>
                <span className={styles.emptySectionIcon}>🔥</span>
                <span>Muy pronto: nuevas ofertas del día con precios especiales</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className={styles.ctaBanner}>
          <div className={styles.ctaInner}>
            <h2 className={styles.ctaTitle}>¿Listo para disfrutar los mejores productos congelados?</h2>
            <p className={styles.ctaText}>Regístrate y accede a ofertas exclusivas con delivery hasta tu puerta.</p>
            <Link href="/register" className={styles.ctaBtn}>Crear cuenta →</Link>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <strong>Amsterdam Frozen Foods</strong>
            <p>Productos congelados con delivery en San Cristóbal</p>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/products">Catálogo</Link>
            <Link href="/brands">Marcas</Link>
            <Link href="/orders">Pedidos</Link>
            <Link href="/assistant">Contacto</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
