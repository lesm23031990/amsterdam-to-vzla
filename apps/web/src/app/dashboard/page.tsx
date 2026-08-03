'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [store, setStore] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'tienda') { router.push('/'); return; }
    api.get<{ id: string; name: string; slug: string }>('/stores/mine').then((res) => {
      if (res.ok && res.data) setStore(res.data);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <p className={styles.loading}>Cargando...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.welcome}>Bienvenido, {user?.name}</p>

        <div className={styles.grid}>
          <Link href="/dashboard/stores" className={styles.card}>
            <h3>Mi Tienda</h3>
            <p>{store ? store.name : 'Crear o gestionar tu tienda'}</p>
          </Link>
          <Link href="/dashboard/products" className={styles.card}>
            <h3>Productos</h3>
            <p>Gestionar catálogo de productos</p>
          </Link>
          <Link href="/dashboard/orders" className={styles.card}>
            <h3>Pedidos</h3>
            <p>Ver pedidos entrantes</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
