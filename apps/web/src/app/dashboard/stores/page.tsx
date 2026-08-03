'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  phone?: string;
  address?: string;
  coverImage?: string;
  logoImage?: string;
}

export default function ManageStorePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', slug: '', description: '', category: '', phone: '', address: '', coverImage: '', logoImage: '',
  });

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'tienda') { router.push('/'); return; }
    api.get<Store>('/stores/mine').then((res) => {
      if (res.ok && res.data) {
        setStore(res.data);
        setForm({
          name: res.data.name,
          slug: res.data.slug,
          description: res.data.description || '',
          category: res.data.category || '',
          phone: res.data.phone || '',
          address: res.data.address || '',
          coverImage: res.data.coverImage || '',
          logoImage: res.data.logoImage || '',
        });
      }
      setLoading(false);
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    if (store) {
      const res = await api.patch(`/stores/${store.id}`, form);
      if (!res.ok) setError(res.error || 'Error al actualizar');
    } else {
      const res = await api.post<Store>('/stores', form);
      if (res.ok && res.data) setStore(res.data);
      else setError(res.error || 'Error al crear');
    }
    setSaving(false);
  };

  const categories = ['Ropa', 'Electrónica', 'Hogar', 'Alimentos', 'Salud', 'Deportes', 'Juguetes', 'Otros'];

  if (loading) return <p className={styles.loading}>Cargando...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{store ? 'Mi Tienda' : 'Crear Tienda'}</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.field}>
            <label className={styles.label}>Nombre de la tienda</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Slug (URL única)</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={styles.textarea}
              rows={3}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={styles.input}
              >
                <option value="">Seleccionar</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Dirección</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>URL de imagen de portada</label>
            <input
              type="text"
              value={form.coverImage}
              onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>URL de logo</label>
            <input
              type="text"
              value={form.logoImage}
              onChange={(e) => setForm({ ...form, logoImage: e.target.value })}
              className={styles.input}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={saving}>
            {saving ? 'Guardando...' : store ? 'Actualizar tienda' : 'Crear tienda'}
          </button>
        </form>
      </div>
    </div>
  );
}
