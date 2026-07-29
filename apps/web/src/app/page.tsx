'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Product {
  id: string; name: string; price: number; currency: string;
  description?: string; category?: string; images: string[]; stock: number;
  storeId: string; store?: { name: string; slug: string };
}

const categories = [
  { id: 'comida', label: 'Comida', emoji: '🍽️' },
  { id: 'bebida', label: 'Bebidas', emoji: '🥤' },
  { id: 'ropa', label: 'Ropa', emoji: '👕' },
  { id: 'electronica', label: 'Electrónica', emoji: '📱' },
  { id: 'hogar', label: 'Hogar', emoji: '🏠' },
  { id: 'artesania', label: 'Artesanía', emoji: '🎨' },
];

export default function Home() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (selectedCategory) params.set('category', selectedCategory);
    api.get<Product[]>(`/products?${params}`).then((res) => {
      if (res.ok && res.data) setProducts(res.data);
      setLoading(false);
    });
  }, [q, selectedCategory]);

  useEffect(() => { if (q) setSelectedCategory(''); }, [q]);

  const featuredProducts = useMemo(() => products.filter(p => p.stock > 0).slice(0, 8), [products]);

  const handleQuickAdd = async (productId: string) => {
    if (!user) { window.location.href = '/login'; return; }
    const res = await api.post('/cart/items', { productId, quantity: 1 });
    if (res.ok) {
      setAddedToCart(prev => ({ ...prev, [productId]: true }));
      setTimeout(() => setAddedToCart(prev => ({ ...prev, [productId]: false })), 2000);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <span className={styles.heroBadge}>🚀 Envío gratis en tu primera compra</span>
            <h1 className={styles.heroTitle}>Lo mejor de San Cristóbal,<br /><span className={styles.heroAccent}>en un solo lugar</span></h1>
            <p className={styles.heroSub}>Compra directo a las mejores tiendas locales. Pan recién horneado, tecnología, ropa y más.</p>
            <div className={styles.heroCtas}>
              <Link href="#products" className={styles.heroCta}>Ver productos</Link>
              <Link href="/register" className={styles.heroCtaOutline} onClick={(e) => { if (user) e.preventDefault(); }}>{user ? 'Mis pedidos' : 'Crear cuenta'}</Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.heroCard1}>
              <span className={styles.heroCardEmoji}>🍞</span>
              <span>Pan artesanal</span>
              <strong>$3.50</strong>
            </div>
            <div className={styles.heroCard2}>
              <span className={styles.heroCardEmoji}>📱</span>
              <span>Auriculares</span>
              <strong>$45.00</strong>
            </div>
            <div className={styles.heroCard3}>
              <span className={styles.heroCardEmoji}>🍕</span>
              <span>Pizza Margherita</span>
              <strong>$10.00</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.categoriesBar}>
        <div className={styles.catInner}>
          <button
            className={`${styles.catPill} ${!selectedCategory ? styles.catActive : ''}`}
            onClick={() => setSelectedCategory('')}
          >✨ Todos</button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`${styles.catPill} ${selectedCategory === cat.id ? styles.catActive : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
            >{cat.emoji} {cat.label}</button>
          ))}
        </div>
      </section>

      <section id="products" className={styles.productsSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                {q ? `Resultados para "${q}"` : selectedCategory ? categories.find(c => c.id === selectedCategory)?.label : 'Productos destacados'}
              </h2>
              <p className={styles.sectionCount}>{products.length} producto(s)</p>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingGrid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeleton}>
                  <div className={styles.skeletonImg} />
                  <div className={styles.skeletonLine} style={{ width: '70%' }} />
                  <div className={styles.skeletonLine} style={{ width: '40%' }} />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyEmoji}>🔍</span>
              <h3>No encontramos productos</h3>
              <p>Intenta con otra búsqueda o categoría</p>
            </div>
          ) : (
            <div className={styles.productGrid}>
              {products.map((p, i) => (
                <div key={p.id} className={styles.productCard} style={{ animationDelay: `${i * 0.05}s` }}>
                  <Link href={`/products/${p.id}`} className={styles.productImageWrap}>
                    <div className={styles.productImage} style={{ backgroundImage: `url(${p.images?.[0] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'})` }} />
                    {p.stock <= 5 && p.stock > 0 && <span className={styles.badgeLow}>Quedan {p.stock}</span>}
                    {p.price < 5 && <span className={styles.badgeOffer}>🔥 Oferta</span>}
                  </Link>
                  <div className={styles.productInfo}>
                    {p.store && <Link href={`/stores/${p.store.slug}`} className={styles.productStore}>{p.store.name}</Link>}
                    <Link href={`/products/${p.id}`} className={styles.productName}>{p.name}</Link>
                    <div className={styles.productPriceRow}>
                      <span className={styles.productPrice}>{p.currency === 'USD' ? '$' : ''}{p.price.toFixed(2)}</span>
                      {p.price < 5 && <span className={styles.productOldPrice}>${(p.price * 1.3).toFixed(2)}</span>}
                    </div>
                    <button
                      onClick={() => handleQuickAdd(p.id)}
                      className={`${styles.addBtn} ${addedToCart[p.id] ? styles.addedBtn : ''}`}
                      disabled={addedToCart[p.id] as boolean}
                    >
                      {addedToCart[p.id] ? '✓ Agregado' : 'Agregar al carrito'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {!user && (
        <section className={styles.ctaBanner}>
          <div className={styles.ctaInner}>
            <h2 className={styles.ctaTitle}>¿Tienes un negocio?</h2>
            <p className={styles.ctaText}>Regístrate como tienda y llega a cientos de clientes en San Cristóbal</p>
            <Link href="/register" className={styles.ctaBtn}>Crear cuenta de tienda →</Link>
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <strong>🛍️ amsterdamToVzla</strong>
            <p>Tu mercado local de San Cristóbal</p>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/stores">Tiendas</Link>
            <Link href="/cart">Carrito</Link>
            <Link href="/assistant">Ayuda</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
