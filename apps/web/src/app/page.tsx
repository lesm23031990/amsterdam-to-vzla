'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Product {
  id: string; name: string; price: number; currency: string;
  description?: string; category?: string; images: string[]; stock: number;
  storeId: string; store?: { name: string; slug: string };
}

const categories = [
  { id: 'congelados', label: 'Congelados', emoji: '❄️' },
  { id: 'comida-rapida', label: 'Comida Rápida', emoji: '🍔' },
];

export default function Home() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    api.get<Product[]>(`/products?${params}`).then((res) => {
      if (res.ok && res.data) setProducts(res.data);
      setLoading(false);
    });
  }, [selectedCategory]);

  const offers = useMemo(() => products.filter(p => p.price < 8 && p.stock > 0).slice(0, 6), [products]);
  const featured = useMemo(() => products.filter(p => p.price >= 8 && p.stock > 0).slice(0, 12), [products]);
  const hasMoreProducts = products.length > 12;

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
            <p className={styles.heroSub}>Productos congelados e insumos de comida rápida a domicilio</p>
            <div className={styles.heroCtas}>
              <Link href="#offers" className={styles.heroCta}>Ver ofertas</Link>
              <Link href={user ? '/orders' : '/register'} className={styles.heroCtaOutline}>{user ? 'Mis pedidos' : 'Crear cuenta'}</Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <a href="/products?category=congelados" className={styles.heroCard1}>
              <div className={styles.heroCardImg} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1627485937980-221c88ac04f9?w=600)' }} />
              <div className={styles.heroCardLabel}>
                <span className={styles.heroCardTag}>❄️ Más vendido</span>
                <strong className={styles.heroCardName}>Nuggets de Pollo x1kg</strong>
                <span className={styles.heroCardPrice}>$8.50</span>
              </div>
            </a>
            <a href="/products?category=comida-rapida" className={styles.heroCard2}>
              <div className={styles.heroCardImg} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600)' }} />
              <div className={styles.heroCardLabel}>
                <span className={styles.heroCardTag}>🍔 Popular</span>
                <strong className={styles.heroCardName}>Pan de Hamburguesa x12</strong>
                <span className={styles.heroCardPrice}>$4.00</span>
              </div>
            </a>
            <a href="/products?category=congelados" className={styles.heroCard3}>
              <div className={styles.heroCardImg} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600)' }} />
              <div className={styles.heroCardLabel}>
                <span className={styles.heroCardTag}>🍩 Nuevo</span>
                <strong className={styles.heroCardName}>Donas Congeladas x24</strong>
                <span className={styles.heroCardPrice}>$12.00</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <section className={styles.categoriesBar}>
        <div className={styles.catInner}>
          <button className={`${styles.catPill} ${!selectedCategory ? styles.catActive : ''}`} onClick={() => setSelectedCategory('')}>✨ Todos</button>
          {categories.map(cat => (
            <button key={cat.id} className={`${styles.catPill} ${selectedCategory === cat.id ? styles.catActive : ''}`} onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}>{cat.emoji} {cat.label}</button>
          ))}
        </div>
      </section>

      {offers.length > 0 && (
        <section id="offers" className={styles.offersSection}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.offersTitle}>🔥 Ofertas del día</h2>
                <p className={styles.offersSub}>Precios increíbles por tiempo limitado</p>
              </div>
              <Link href="/offers" className={styles.offersLink}>Ver todas →</Link>
            </div>
            <div className={styles.offersGrid}>
              {offers.map(p => {
                const discount = Math.round((1 - p.price / (p.price * 1.4)) * 100);
                return (
                  <div key={p.id} className={styles.offerCard}>
                    <Link href={`/products/${p.id}`} className={styles.offerImgWrap}>
                      <div className={styles.offerImg} style={{ backgroundImage: `url(${p.images?.[0] || ''})` }} />
                      <span className={styles.discountPill}>-{discount}%</span>
                    </Link>
                    <div className={styles.offerInfo}>
                      <Link href={`/products/${p.id}`} className={styles.offerName}>{p.name}</Link>
                      <div className={styles.offerPriceRow}>
                        <span className={styles.offerPrice}>${p.price.toFixed(2)}</span>
                        <span className={styles.offerOld}>${(p.price * 1.4).toFixed(2)}</span>
                      </div>
                      <button onClick={() => handleQuickAdd(p.id)} className={`${styles.offerBtn} ${addedToCart[p.id] ? styles.offerBtnAdded : ''}`} disabled={!!addedToCart[p.id]}>
                        {addedToCart[p.id] ? '✓ Agregado' : 'Comprar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className={styles.featuredSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>{selectedCategory ? categories.find(c => c.id === selectedCategory)?.label : 'Productos destacados'}</h2>
              <p className={styles.sectionSub}>Los más populares de la semana</p>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingGrid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeleton}><div className={styles.skelImg} /><div className={styles.skelLine} style={{width:'70%'}} /><div className={styles.skelLine} style={{width:'40%'}} /></div>
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyEmoji}>🔍</span>
              <h3>No hay productos en esta categoría</h3>
              <p>Prueba con otra categoría</p>
            </div>
          ) : (
            <>
              <div className={styles.productGrid}>
                {featured.map((p, i) => (
                  <div key={p.id} className={styles.productCard} style={{ animationDelay: `${i * 0.05}s` }}>
                    <Link href={`/products/${p.id}`} className={styles.productImgWrap}>
                      <div className={styles.productImg} style={{ backgroundImage: `url(${p.images?.[0] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'})` }} />
                      {p.stock <= 5 && p.stock > 0 && <span className={styles.badgeLow}>Quedan {p.stock}</span>}
                    </Link>
                    <div className={styles.productInfo}>
                      {p.store && <Link href={`/stores/${p.store.slug}`} className={styles.productStore}>{p.store.name}</Link>}
                      <Link href={`/products/${p.id}`} className={styles.productName}>{p.name}</Link>
                      <div className={styles.productPriceRow}>
                        <span className={styles.productPrice}>{p.currency === 'USD' ? '$' : ''}{p.price.toFixed(2)}</span>
                      </div>
                      <button onClick={() => handleQuickAdd(p.id)} className={`${styles.addBtn} ${addedToCart[p.id] ? styles.addedBtn : ''}`} disabled={!!addedToCart[p.id]}>
                        {addedToCart[p.id] ? '✓ Agregado' : 'Agregar al carrito'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.viewMoreWrap}>
                {hasMoreProducts && (
                  <Link href="/products" className={styles.viewMoreBtn}>
                    Ver todos los productos ({products.length}) →
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {!user && (
        <section className={styles.ctaBanner}>
          <div className={styles.ctaInner}>
            <h2 className={styles.ctaTitle}>Productos congelados y de comida rápida</h2>
            <p className={styles.ctaText}>La mejor calidad para tu hogar o negocio en San Cristóbal</p>
            <Link href="/products" className={styles.ctaBtn}>Ver productos →</Link>
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}><strong>🛍️ amsterdamToVzla</strong><p>Tu mercado local de San Cristóbal</p></div>
          <div className={styles.footerLinks}>
            <Link href="/offers">Ofertas</Link>
            <Link href="/products">Productos</Link>
            <Link href="/stores">Tiendas</Link>
            <Link href="/cart">Carrito</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
