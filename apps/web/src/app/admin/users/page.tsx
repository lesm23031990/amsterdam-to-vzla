'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/'); return; }
    setLoading(false);
  }, [user]);

  if (loading) return <p className={styles.loading}>Cargando...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Usuarios</h1>
        <p className={styles.description}>Gestión de usuarios del sistema</p>
        <div className={styles.info}>
          <p>La gestión de roles está desactivada en esta versión.</p>
          <p>Todos los usuarios registrados son <strong>clientes</strong>.</p>
        </div>
      </div>
    </div>
  );
}
