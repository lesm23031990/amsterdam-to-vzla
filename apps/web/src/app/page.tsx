'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

function ProductImageBox({ emoji, label, className, variant = 'light' }: { emoji: string; label: string; className: string; variant?: 'light' | 'warm' }) {
  return (
    <div className={`${className} ${styles.imgPlaceholder}`} style={{
      backgroundColor: variant === 'warm' ? '#FFF3DB' : '#E8EDF5',
    }}>
      <span className={styles.imgEmoji}>{emoji}</span>
      <span className={styles.imgLabel}>{label}</span>
    </div>
  );
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

const FOOD_PHOTOS: Record<string, string> = {
  tequenos: '1504674900247-0877df9cc836',
  pastelitos: '1509440159596-0249088772ff',
  minipizza: '1565299624946-b28f40a0ae38',
  croquetas: '1544025162-d76694265947',
  empanadas: '1607532941433-304659e8198a',
  deditos: '1504674900247-0877df9cc836',
  papas: '1573080496219-bb080dd4f877',
  burgers: '1568901346375-23c9450c58cd',
  mozzarella: '1504674900247-0877df9cc836',
  aros: '1639024471283-03518883512d',
  alitas: '1504674900247-0877df9cc836',
  tequenos2: '1504674900247-0877df9cc836',
  papas2: '1573080496219-bb080dd4f877',
  nuggets: '1618413409033-68c4ac6b4e95',
};

function ProductImg({ emoji, className, variant = 'light', photoKey }: { emoji: string; className: string; variant?: 'light' | 'warm'; photoKey: string }) {
  const theme = THEMES[variant];
  const dims = className.includes('offerImg') ? [400, 400] : className.includes('bentoImg') ? [600, 400] : [400, 300];
  const photoId = FOOD_PHOTOS[photoKey];
  const fallback = makeFoodImg(dims[0], dims[1], emoji, theme.bg1, theme.bg2, theme.accent);
  const src = photoId
    ? `https://images.unsplash.com/photo-${photoId}?w=${dims[0]}&h=${dims[1]}&fit=crop`
    : fallback;

  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
    />
  );
}

const featuredProducts = [
  { id: '1', name: 'Tequeños de Queso', price: 5.50, emoji: '🧀', variant: 'warm' as const, stock: 120, tag: 'Más vendido', photoKey: 'tequenos' },
  { id: '2', name: 'Pastelitos de Pollo', price: 4.80, emoji: '🥟', variant: 'light' as const, stock: 85, photoKey: 'pastelitos' },
  { id: '3', name: 'Mini Pizzas', price: 7.00, emoji: '🍕', variant: 'warm' as const, stock: 60, tag: 'Nuevo', photoKey: 'minipizza' },
];

const catalogProducts = [
  { id: '5', name: 'Croquetas de Jamón', description: 'Caja x30 unidades', price: 3.90, currency: 'USD', emoji: '🟤', variant: 'light' as const, stock: 200, photoKey: 'croquetas' },
  { id: '6', name: 'Empanadas de Carne', description: 'Caja x12 unidades', price: 6.20, currency: 'USD', emoji: '🥟', variant: 'warm' as const, stock: 45, photoKey: 'empanadas' },
  { id: '7', name: 'Deditos de Queso', description: 'Caja x18 unidades', price: 4.50, currency: 'USD', emoji: '🧀', variant: 'light' as const, stock: 150, photoKey: 'deditos' },
  { id: '8', name: 'Papas Fritas Congeladas', description: 'Bolsa x2kg', price: 3.20, currency: 'USD', emoji: '🍟', variant: 'warm' as const, stock: 180, photoKey: 'papas' },
  { id: '9', name: 'Hamburguesas Listas', description: 'Pack x12 unidades', price: 9.50, currency: 'USD', emoji: '🍔', variant: 'light' as const, stock: 90, photoKey: 'burgers' },
  { id: '10', name: 'Palitos de Mozzarella', description: 'Caja x20 unidades', price: 5.00, currency: 'USD', emoji: '🧀', variant: 'warm' as const, stock: 75, photoKey: 'mozzarella' },
];

const offerProducts = [
  { id: '11', name: 'Aros de Cebolla', description: 'Bolsa x500g', price: 4.20, originalPrice: 6.50, emoji: '🧅', variant: 'light' as const, stock: 110, photoKey: 'aros' },
  { id: '12', name: 'Alitas de Pollo', description: 'Bolsa x1kg', price: 7.50, originalPrice: 11.00, emoji: '🍗', variant: 'warm' as const, stock: 65, photoKey: 'alitas' },
  { id: '1', name: 'Tequeños de Queso', description: 'Caja x24 unidades', price: 5.50, originalPrice: 8.00, emoji: '🧀', variant: 'light' as const, stock: 120, photoKey: 'tequenos2' },
  { id: '8', name: 'Papas Fritas Congeladas', description: 'Bolsa x2kg', price: 3.20, originalPrice: 5.00, emoji: '🍟', variant: 'warm' as const, stock: 180, photoKey: 'papas2' },
];

const mockDeliveries = [];

function ProductCard({ product, onAdd, added }: { product: typeof catalogProducts[0]; onAdd: (id: string) => void; added: boolean }) {
  return (
    <div className={styles.productCard}>
      <div className={styles.productImgWrap}>
        <ProductImg emoji={product.emoji} className={styles.productImg} variant={product.variant} photoKey={product.photoKey} />
      </div>
      <div className={styles.productInfo}>
        <h3 className={styles.productName}>{product.name}</h3>
        <p className={styles.productDesc}>{product.description}</p>
        <div className={styles.productPriceRow}>
          <span className={styles.productPrice}>${product.price.toFixed(2)}</span>
          <span className={styles.productStock}>Stock: {product.stock}</span>
        </div>
        <button
          onClick={() => onAdd(product.id)}
          className={`${styles.addBtn} ${added ? styles.addedBtn : ''}`}
          disabled={added}
        >
          {added ? '✓ Agregado' : 'Agregar'}
        </button>
      </div>
    </div>
  );
}

function DeliveryStatusModule() {
  const deliveries = [
    { id: '#4521', status: 'En camino', eta: '15-20 min', items: 'Tequeños x2, Papas Fritas', driver: 'Carlos M.', phone: '+58 414-1234567' },
    { id: '#4518', status: 'Preparando', eta: '30-40 min', items: 'Mini Pizzas x3, Nuggets', driver: 'Asignando...', phone: '' },
    { id: '#4512', status: 'Entregado', eta: 'Hoy 3:45pm', items: 'Empanadas x1, Deditos', driver: 'María R.', phone: '+58 412-7654321' },
  ];

  return (
    <div className={styles.logisticsCard}>
      <div className={styles.logisticsHeader}>
        <h3 className={styles.logisticsTitle}>Mis Pedidos</h3>
        <Link href="/orders" className={styles.logisticsLink}>Ver todos →</Link>
      </div>
      {deliveries.map(d => (
        <div key={d.id} className={styles.deliveryCard}>
          <div className={styles.deliveryTop}>
            <span className={styles.deliveryId}>{d.id}</span>
            <span className={`${styles.statusPill} ${styles[d.status.toLowerCase().replace(/ /g, '-')]}`}>
              {d.status}
            </span>
          </div>
          <p className={styles.deliveryItems}>{d.items}</p>
          <div className={styles.deliveryBottom}>
            <div className={styles.driverInfo}>
              <span className={styles.driverIcon}>🚴</span>
              <span className={styles.driverName}>{d.driver}</span>
            </div>
            <span className={styles.deliveryEta}>⏱ {d.eta}</span>
          </div>
          {d.phone && (
            <a href={`tel:${d.phone}`} className={styles.callBtn}>📞 Llamar al repartidor</a>
          )}
        </div>
      ))}
    </div>
  );
}

function QuickAccessModule() {
  const quickLinks = [
    { icon: '📍', label: 'Tracking en vivo', desc: 'Rastrea tu pedido en el mapa', href: '/orders' },
    { icon: '🕐', label: 'Horario de delivery', desc: 'Lun-Sáb: 8am - 8pm', href: '/stores' },
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
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});

  const handleQuickAdd = (productId: string) => {
    setAddedToCart(prev => ({ ...prev, [productId]: true }));
    setTimeout(() => setAddedToCart(prev => ({ ...prev, [productId]: false })), 2000);
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
            <Link href="/products" className={styles.viewAllLink}>Ver catálogo →</Link>
          </div>
          <div className={styles.bentoGrid}>
            {featuredProducts.map((p, i) => (
              <Link href={`/products/${p.id}`} key={p.id} className={`${styles.bentoCard} ${styles[`bento${i + 1}`]}`}>
                <ProductImg emoji={p.emoji} className={styles.bentoImg} variant={p.variant} photoKey={p.photoKey} />
                <div className={styles.bentoOverlay}>
                  {p.tag && <span className={styles.bentoTag}>{p.tag}</span>}
                  <div className={styles.bentoInfo}>
                    <h3 className={styles.bentoName}>{p.name}</h3>
                    <span className={styles.bentoPrice}>${p.price.toFixed(2)}</span>
                  </div>
                </div>
              </Link>
            ))}
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
              {catalogProducts.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAdd={handleQuickAdd}
                  added={!!addedToCart[p.id]}
                />
              ))}
            </div>
          </div>
          <div className={styles.logisticsSection}>
            <DeliveryStatusModule />
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
            <Link href="/offers" className={styles.offersLink}>Ver todas →</Link>
          </div>
          <div className={styles.offersGrid}>
            {offerProducts.map(p => {
              const discount = Math.round((1 - p.price / p.originalPrice) * 100);
              return (
                <div key={p.id} className={styles.offerCard}>
                  <div className={styles.offerImgWrap}>
                    <ProductImg emoji={p.emoji} className={styles.offerImg} variant={p.variant} photoKey={p.photoKey} />
                    <span className={styles.discountPill}>-{discount}%</span>
                  </div>
                  <div className={styles.offerInfo}>
                    <h3 className={styles.offerName}>{p.name}</h3>
                    <p className={styles.offerDesc}>{p.description}</p>
                    <div className={styles.offerPriceRow}>
                      <span className={styles.offerPrice}>${p.price.toFixed(2)}</span>
                      <span className={styles.offerOld}>${p.originalPrice.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => handleQuickAdd(p.id)}
                      className={`${styles.offerBtn} ${addedToCart[p.id] ? styles.offerBtnAdded : ''}`}
                      disabled={!!addedToCart[p.id]}
                    >
                      {addedToCart[p.id] ? '✓ Agregado' : 'Comprar'}
                    </button>
                  </div>
                </div>
              );
            })}
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
            <Link href="/stores">Logística</Link>
            <Link href="/orders">Pedidos</Link>
            <Link href="/assistant">Contacto</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
