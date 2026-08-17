'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ users: 0, stores: 0, products: 0, orders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/'); return; }

    Promise.all([
      api.get('/stores'),
      api.get('/products'),
    ]).then(([storesRes, productsRes]) => {
      const stores = (storesRes.ok && Array.isArray(storesRes.data)) ? storesRes.data : [];
      const products = (productsRes.ok && Array.isArray(productsRes.data)) ? productsRes.data : [];
      setStats({
        users: 0,
        stores: stores.length,
        products: products.length,
        orders: 0,
      });
      setLoading(false);
    });
  }, [user]);

  if (loading) return <p className={styles.loading}>Cargando panel...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Panel de Administración</h1>
          <p className={styles.subtitle}>Gestión del sistema</p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statEmoji}>📦</span>
            <span className={styles.statValue}>{stats.products}</span>
            <span className={styles.statLabel}>Productos</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statEmoji}>🏪</span>
            <span className={styles.statValue}>{stats.stores}</span>
            <span className={styles.statLabel}>Tiendas</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statEmoji}>👥</span>
            <span className={styles.statValue}>{stats.users}</span>
            <span className={styles.statLabel}>Usuarios</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statEmoji}>📋</span>
            <span className={styles.statValue}>{stats.orders}</span>
            <span className={styles.statLabel}>Pedidos</span>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Acciones rápidas</h2>
          <div className={styles.actionsGrid}>
            <Link href="/admin/users" className={styles.actionCard}>
              <span className={styles.actionEmoji}>👥</span>
              <h3>Usuarios</h3>
              <p>Ver lista de usuarios registrados</p>
            </Link>
            <Link href="/admin/stores" className={styles.actionCard}>
              <span className={styles.actionEmoji}>🏪</span>
              <h3>Tiendas</h3>
              <p>Gestionar tiendas del sistema</p>
            </Link>
            <Link href="/products" className={styles.actionCard}>
              <span className={styles.actionEmoji}>📦</span>
              <h3>Productos</h3>
              <p>Ver catálogo completo</p>
            </Link>
            <Link href="/orders" className={styles.actionCard}>
              <span className={styles.actionEmoji}>📋</span>
              <h3>Pedidos</h3>
              <p>Ver todos los pedidos</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
