'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Product {
  id: string; name: string; price: number; currency: string;
  description?: string; images: string[]; stock: number;
  store?: { name: string; slug: string };
}

export default function OffersPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.get<Product[]>('/products?perPage=100').then((res) => {
      if (res.ok && res.data) {
        setProducts(res.data.filter(p => p.price < 8));
      }
      setLoading(false);
    });
  }, []);

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
      <div className={styles.hero}>
        <span className={styles.heroEmoji}>🔥</span>
        <h1 className={styles.heroTitle}>Ofertas del día</h1>
        <p className={styles.heroSub}>Productos con precios increíbles por tiempo limitado</p>
        <div className={styles.countdown}>
          <div className={styles.countItem}><span className={styles.countNum}>12</span><span>Horas</span></div>
          <span className={styles.countSep}>:</span>
          <div className={styles.countItem}><span className={styles.countNum}>45</span><span>Minutos</span></div>
          <span className={styles.countSep}>:</span>
          <div className={styles.countItem}><span className={styles.countNum}>32</span><span>Segundos</span></div>
        </div>
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton}><div className={styles.skelImg} /><div className={styles.skelLine} style={{width:'60%'}} /><div className={styles.skelLine} style={{width:'40%'}} /></div>
          ))}
        </div>
      ) : (
        <>
          <div className={styles.stats}>
            <span>🔥 {products.length} ofertas activas</span>
            <span>⏰ Ofertas válidas hoy</span>
            <span>🚚 Envío disponible</span>
          </div>

          <div className={styles.grid}>
            {products.map(p => {
              const discount = Math.round((1 - p.price / (p.price * 1.4)) * 100);
              return (
                <div key={p.id} className={styles.card}>
                  <Link href={`/products/${p.id}`} className={styles.imgWrap}>
                    <div className={styles.img} style={{ backgroundImage: `url(${p.images?.[0] || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400'})` }} />
                    <span className={styles.discountBadge}>-{discount}%</span>
                  </Link>
                  <div className={styles.info}>
                    {p.store && <Link href={`/stores/${p.store.slug}`} className={styles.storeLink}>{p.store.name}</Link>}
                    <Link href={`/products/${p.id}`} className={styles.name}>{p.name}</Link>
                    <div className={styles.priceRow}>
                      <span className={styles.price}>${p.price.toFixed(2)}</span>
                      <span className={styles.oldPrice}>${(p.price * 1.4).toFixed(2)}</span>
                      <span className={styles.discountText}>-{discount}%</span>
                    </div>
                    <button
                      onClick={() => handleQuickAdd(p.id)}
                      className={`${styles.addBtn} ${addedToCart[p.id] ? styles.added : ''}`}
                      disabled={!!addedToCart[p.id]}
                    >
                      {addedToCart[p.id] ? '✓ Agregado' : 'Aprovechar oferta'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
