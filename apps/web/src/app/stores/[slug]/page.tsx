'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  phone?: string;
  address?: string;
  coverImage?: string;
  logoImage?: string;
}

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

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    const slug = params.slug as string;
    Promise.all([
      api.get<Store>(`/stores/${slug}`),
      api.get<Product[]>('/products'),
    ]).then(([storeRes]) => {
      if (storeRes.ok && storeRes.data) {
        setStore(storeRes.data);
        api.get<Product[]>(`/products?storeId=${storeRes.data.id}`).then((prodRes) => {
          if (prodRes.ok && prodRes.data) setProducts(prodRes.data);
        });
      }
      setLoading(false);
    });
  }, [params.slug]);

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }
    setAddingId(productId);
    await api.post('/cart/items', { productId, quantity: 1 });
    setAddingId(null);
  };

  if (loading) return <p className={styles.loading}>Cargando tienda...</p>;
  if (!store) return <p className={styles.loading}>Tienda no encontrada</p>;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div
          className={styles.coverBg}
          style={{ backgroundImage: store.coverImage ? `url(${store.coverImage})` : undefined }}
        />
        <div className={styles.heroContent}>
          {store.logoImage && <img src={store.logoImage} alt="" className={styles.logo} />}
          <h1>{store.name}</h1>
          <p className={styles.description}>{store.description}</p>
          <div className={styles.meta}>
            <span className={styles.category}>{store.category}</span>
            {store.address && <span className={styles.address}>{store.address}</span>}
            {store.phone && <span className={styles.phone}>{store.phone}</span>}
          </div>
        </div>
      </div>

      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Productos</h2>
        {products.length === 0 ? (
          <p className={styles.empty}>Esta tienda no tiene productos disponibles</p>
        ) : (
          <div className={styles.grid}>
            {products.map((product) => (
              <div key={product.id} className={styles.productCard}>
                <Link href={`/products/${product.id}`} className={styles.productLink}>
                  <div
                    className={styles.productImage}
                    style={{ backgroundImage: product.images?.[0] ? `url(${product.images[0]})` : undefined }}
                  />
                  <div className={styles.productInfo}>
                    <h3>{product.name}</h3>
                    <p className={styles.productDesc}>{product.description?.slice(0, 60)}</p>
                    <div className={styles.productMeta}>
                      <span className={styles.price}>
                        {product.currency} {Number(product.price).toLocaleString()}
                      </span>
                      <span className={styles.stock}>
                        {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
                      </span>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => handleAddToCart(product.id)}
                  className={styles.addBtn}
                  disabled={addingId === product.id || product.stock === 0}
                >
                  {addingId === product.id ? 'Agregando...' : 'Agregar al carrito'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
