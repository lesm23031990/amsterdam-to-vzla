'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  productCount?: number;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<Brand[]>('/brands').then((res) => {
      if (res.ok && res.data) setBrands(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Marcas</h1>

        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Buscar marcas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {loading ? (
          <p className={styles.loading}>Cargando marcas...</p>
        ) : filtered.length === 0 ? (
          <p className={styles.empty}>No se encontraron marcas</p>
        ) : (
          <div className={styles.grid}>
            {filtered.map((brand) => (
              <Link href={`/brands/${brand.slug}`} key={brand.id} className={styles.card}>
                <div
                  className={styles.cover}
                  style={{ backgroundImage: brand.logoImage ? `url(${brand.logoImage})` : undefined }}
                />
                <div className={styles.info}>
                  <h3>{brand.name}</h3>
                  <p>{brand.description?.slice(0, 100) || 'Sin descripción'}</p>
                  <div className={styles.meta}>
                    <span className={styles.category}>{brand.productCount || 0} productos</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
