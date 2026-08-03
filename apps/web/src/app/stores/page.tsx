'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  coverImage?: string;
  logoImage?: string;
  address?: string;
}

const categories = [
  'Todas',
  'Ropa',
  'Electrónica',
  'Hogar',
  'Alimentos',
  'Salud',
  'Deportes',
  'Juguetes',
  'Otros',
];

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category !== 'Todas') params.set('category', category);
    api.get<Store[]>(`/stores?${params.toString()}`).then((res) => {
      if (res.ok && res.data) setStores(res.data);
      setLoading(false);
    });
  }, []);

  const handleSearch = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category !== 'Todas') params.set('category', category);
    api.get<Store[]>(`/stores?${params.toString()}`).then((res) => {
      if (res.ok && res.data) setStores(res.data);
      setLoading(false);
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Tiendas</h1>

        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Buscar tiendas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); }}
            className={styles.select}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button onClick={handleSearch} className={styles.searchBtn}>Buscar</button>
        </div>

        {loading ? (
          <p className={styles.loading}>Cargando tiendas...</p>
        ) : stores.length === 0 ? (
          <p className={styles.empty}>No se encontraron tiendas</p>
        ) : (
          <div className={styles.grid}>
            {stores.map((store) => (
              <Link href={`/stores/${store.slug}`} key={store.id} className={styles.card}>
                <div
                  className={styles.cover}
                  style={{ backgroundImage: store.coverImage ? `url(${store.coverImage})` : undefined }}
                />
                <div className={styles.info}>
                  <h3>{store.name}</h3>
                  <p>{store.description?.slice(0, 100)}</p>
                  <div className={styles.meta}>
                    <span className={styles.category}>{store.category}</span>
                    {store.address && <span className={styles.address}>{store.address}</span>}
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
