'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Product {
  id: string; name: string; price: number; currency: string;
  description?: string; category?: string; images: string[]; stock: number;
  store?: { name: string; slug: string };
}

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});
  const pageSize = 12;

  useEffect(() => {
    setLoading(true);
    api.get<Product[]>(`/products?page=${page}&perPage=${pageSize}`).then((res) => {
      if (res.ok && res.data) {
        const items = res.data;
        setProducts(prev => page === 1 ? items : [...prev, ...items]);
        setHasMore(items.length === pageSize);
      }
      setLoading(false);
    });
  }, [page]);

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
      <div className={styles.header}>
        <h1>Todos los productos</h1>
        <p>{products.length} producto(s) encontrados</p>
      </div>

      {loading && page === 1 ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeleton}>
              <div className={styles.skelImg} />
              <div className={styles.skelLine} style={{ width: '70%' }} />
              <div className={styles.skelLine} style={{ width: '40%' }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {products.map(p => (
              <div key={p.id} className={styles.card}>
                <Link href={`/products/${p.id}`} className={styles.imgWrap}>
                  <div className={styles.img} style={p.images?.[0] ? { backgroundImage: `url(${p.images[0]})` } : { backgroundColor: '#E8EDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
                    {!p.images?.[0] && '❄️'}
                  </div>
                  {p.stock <= 5 && p.stock > 0 && <span className={styles.badgeLow}>Quedan {p.stock}</span>}
                  {p.price < 8 && <span className={styles.badgeOffer}>🔥 Oferta</span>}
                </Link>
                <div className={styles.info}>
                  {p.store && <Link href={`/stores/${p.store.slug}`} className={styles.storeLink}>{p.store.name}</Link>}
                  <Link href={`/products/${p.id}`} className={styles.name}>{p.name}</Link>
                  <div className={styles.priceRow}>
                    <span className={styles.price}>${p.price.toFixed(2)}</span>
                    {p.price < 8 && <span className={styles.oldPrice}>${(p.price * 1.4).toFixed(2)}</span>}
                  </div>
                  <button
                    onClick={() => handleQuickAdd(p.id)}
                    className={`${styles.addBtn} ${addedToCart[p.id] ? styles.added : ''}`}
                    disabled={!!addedToCart[p.id]}
                  >
                    {addedToCart[p.id] ? '✓ Agregado' : 'Agregar'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className={styles.loadMoreWrap}>
              <button
                onClick={() => setPage(p => p + 1)}
                className={styles.loadMore}
                disabled={loading}
              >
                {loading ? 'Cargando...' : 'Cargar más productos →'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
