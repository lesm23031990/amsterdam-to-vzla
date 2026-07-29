'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Store {
  id: string;
  name: string;
  slug: string;
  category: string;
  owner?: { name: string; email: string };
  status?: string;
}

export default function AdminStoresPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/'); return; }
    api.get<Store[]>('/stores').then((res) => {
      if (res.ok && res.data) setStores(res.data);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <p className={styles.loading}>Cargando tiendas...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Administrar Tiendas</h1>

        {stores.length === 0 ? (
          <p className={styles.empty}>No hay tiendas registradas</p>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Nombre</span>
              <span>Categoría</span>
              <span>Slug</span>
              <span>Acciones</span>
            </div>
            {stores.map((store) => (
              <div key={store.id} className={styles.tableRow}>
                <span className={styles.storeName}>
                  <Link href={`/stores/${store.slug}`}>{store.name}</Link>
                </span>
                <span className={styles.category}>{store.category}</span>
                <span className={styles.slug}>{store.slug}</span>
                <span className={styles.actions}>
                  <Link href={`/stores/${store.slug}`} className={styles.viewBtn}>Ver</Link>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
