'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  ordersCount: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/'); return; }
    setAuthReady(true);
  }, [user, router]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      setFetching(true);
      const res = await api.get<AdminUser[]>('/admin/users');
      if (cancelled) return;
      if (res.ok && Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        setError(res.error || 'No se pudieron cargar los usuarios');
      }
      setFetching(false);
    })();
    return () => { cancelled = true; };
  }, [authReady]);

  if (!authReady || fetching) {
    return <p className={styles.loading}>Cargando usuarios...</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Usuarios</h1>
        <p className={styles.description}>{users.length} usuarios registrados</p>

        {error ? (
          <div className={styles.info}><p>{error}</p></div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Pedidos</th>
                  <th>Registrado</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={styles.roleBadge}>{u.role}</span></td>
                    <td>{u.ordersCount}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString('es-VE')}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className={styles.empty}>Aún no hay usuarios registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
