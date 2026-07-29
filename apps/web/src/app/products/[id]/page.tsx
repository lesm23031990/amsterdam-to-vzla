'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  images: string[];
  stock: number;
  storeId: string;
}

interface Store {
  id: string;
  name: string;
  slug: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const id = params.id as string;
    api.get<Product>(`/products/${id}`).then((res) => {
      if (res.ok && res.data) {
        setProduct(res.data);
        api.get<Store>(`/stores/${res.data.storeId}`).then((storeRes) => {
          if (storeRes.ok && storeRes.data) setStore(storeRes.data);
        });
      }
      setLoading(false);
    });
  }, [params.id]);

  const handleAddToCart = async () => {
    if (!user) { router.push('/login'); return; }
    if (!product) return;
    setAdding(true);
    await api.post('/cart/items', { productId: product.id, quantity });
    setAdding(false);
  };

  if (loading) return <p className={styles.loading}>Cargando producto...</p>;
  if (!product) return <p className={styles.loading}>Producto no encontrado</p>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          {store && <Link href={`/stores/${store.slug}`}>{store.name}</Link>}
          <span> / </span>
          <span>{product.name}</span>
        </div>

        <div className={styles.content}>
          <div className={styles.imageSection}>
            <div
              className={styles.mainImage}
              style={{ backgroundImage: product.images?.[0] ? `url(${product.images[0]})` : undefined }}
            />
          </div>

          <div className={styles.infoSection}>
            <h1 className={styles.name}>{product.name}</h1>
            <p className={styles.category}>{product.category}</p>
            <p className={styles.price}>
              {product.currency} {Number(product.price).toLocaleString()}
            </p>
            <p className={styles.description}>{product.description}</p>

            <div className={styles.stockInfo}>
              {product.stock > 0 ? (
                <span className={styles.inStock}>{product.stock} unidades disponibles</span>
              ) : (
                <span className={styles.outOfStock}>Agotado</span>
              )}
            </div>

            {product.stock > 0 && (
              <div className={styles.actions}>
                <div className={styles.quantityControl}>
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className={styles.qtyBtn}>-</button>
                  <span className={styles.qty}>{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className={styles.qtyBtn}>+</button>
                </div>
                <button onClick={handleAddToCart} className={styles.addBtn} disabled={adding}>
                  {adding ? 'Agregando...' : 'Agregar al carrito'}
                </button>
              </div>
            )}

            {store && (
              <div className={styles.storeInfo}>
                <span>Vendido por: </span>
                <Link href={`/stores/${store.slug}`} className={styles.storeLink}>{store.name}</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
