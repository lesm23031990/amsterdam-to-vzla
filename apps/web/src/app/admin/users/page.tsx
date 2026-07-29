'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

const roleLabels: Record<string, string> = {
  cliente: 'Cliente',
  tienda: 'Dueño de tienda',
  admin: 'Administrador',
  repartidor: 'Repartidor',
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/'); return; }
    setLoading(false);
  }, [user]);

  if (loading) return <p className={styles.loading}>Cargando usuarios...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Administrar Usuarios</h1>

        {users.length === 0 ? (
          <p className={styles.empty}>No hay usuarios registrados</p>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Nombre</span>
              <span>Email</span>
              <span>Rol</span>
              <span>Teléfono</span>
            </div>
            {users.map((u) => (
              <div key={u.id} className={styles.tableRow}>
                <span className={styles.name}>{u.name}</span>
                <span className={styles.email}>{u.email}</span>
                <span className={styles.role}>{roleLabels[u.role] || u.role}</span>
                <span className={styles.phone}>{u.phone || '-'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
