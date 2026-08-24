'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  logoImage: string | null;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceCop: number;
  currency: string;
  category: string | null;
  images: string[];
  stock: number;
  brandId: string | null;
  isFeatured: boolean;
  hasDiscount: boolean;
  discountPercent: number;
  brand?: Brand | null;
}

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    const slug = params.slug as string;
    Promise.all([
      api.get<Brand>(`/brands/${slug}`),
      api.get<Product[]>(`/products?brand=${slug}`),
    ]).then(([brandRes, productsRes]) => {
      if (brandRes.ok && brandRes.data) {
        setBrand(brandRes.data);
      }
      if (productsRes.ok && productsRes.data) {
        setProducts(productsRes.data);
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

  if (loading) return <p className={styles.loading}>Cargando marca...</p>;
  if (!brand) return <p className={styles.loading}>Marca no encontrada</p>;

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.coverBg} />
        <div className={styles.heroContent}>
          {brand.logoImage && <img src={brand.logoImage} alt="" className={styles.logo} />}
          <h1>{brand.name}</h1>
          <p className={styles.description}>{brand.description || ''}</p>
          <div className={styles.meta}>
            {brand.phone && <span className={styles.phone}>{brand.phone}</span>}
          </div>
        </div>
      </div>

      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Productos</h2>
        {products.length === 0 ? (
          <p className={styles.empty}>Esta marca no tiene productos disponibles</p>
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
                    <p className={styles.productDesc}>{product.description?.slice(0, 60) || ''}</p>
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
