'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function AdminBrandsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/'); return; }
    api.get<Brand[]>('/brands').then((res) => {
      if (res.ok && res.data) setBrands(res.data);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <p className={styles.loading}>Cargando marcas...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Marcas</h1>

        {brands.length === 0 ? (
          <p className={styles.empty}>No hay marcas registradas</p>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Nombre</span>
              <span>Slug</span>
              <span>Acciones</span>
            </div>
            {brands.map((brand) => (
              <div key={brand.id} className={styles.tableRow}>
                <span className={styles.storeName}>
                  <Link href={`/brands/${brand.slug}`}>{brand.name}</Link>
                </span>
                <span className={styles.slug}>{brand.slug}</span>
                <span className={styles.actions}>
                  <Link href={`/brands/${brand.slug}`} className={styles.viewBtn}>Ver</Link>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
