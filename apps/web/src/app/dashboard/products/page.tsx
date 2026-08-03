'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  images: string[];
  stock: number;
}

interface Store {
  id: string;
}

export default function DashboardProductsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', price: '', currency: 'USD', category: '', images: '', stock: '0',
  });

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'tienda') { router.push('/'); return; }
    api.get<Store>('/stores/mine').then((res) => {
      if (res.ok && res.data) {
        setStore(res.data);
        api.get<Product[]>(`/products?storeId=${res.data.id}`).then((prodRes) => {
          if (prodRes.ok && prodRes.data) setProducts(prodRes.data);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, [user]);

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', currency: 'USD', category: '', images: '', stock: '0' });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      currency: product.currency,
      category: product.category || '',
      images: (product.images || []).join(', '),
      stock: product.stock.toString(),
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setError('');
    setSaving(true);

    const body = {
      storeId: store.id,
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      currency: form.currency,
      category: form.category,
      images: form.images ? form.images.split(',').map((s) => s.trim()) : [],
      stock: parseInt(form.stock),
    };

    let res;
    if (editingId) {
      res = await api.patch(`/products/${editingId}`, body);
    } else {
      res = await api.post<Product>('/products', body);
    }

    if (res.ok) {
      const prodRes = await api.get<Product[]>(`/products?storeId=${store.id}`);
      if (prodRes.ok && prodRes.data) setProducts(prodRes.data);
      resetForm();
    } else {
      setError(res.error || 'Error al guardar');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    await api.delete(`/products/${id}`);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const categories = ['Ropa', 'Electrónica', 'Hogar', 'Alimentos', 'Salud', 'Deportes', 'Juguetes', 'Otros'];

  if (loading) return <p className={styles.loading}>Cargando...</p>;
  if (!store) return <p className={styles.loading}>Primero crea tu tienda</p>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Mis Productos</h1>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className={styles.addBtn}>
            {showForm ? 'Cancelar' : 'Nuevo producto'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={styles.input} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Categoría</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={styles.input}>
                  <option value="">Seleccionar</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Precio</label>
                <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={styles.input} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Moneda</label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={styles.input}>
                  <option value="USD">USD</option>
                  <option value="Bs">Bs</option>
                  <option value="COP">COP</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Stock</label>
                <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={styles.input} required />
              </div>
              <div className={styles.fieldFull}>
                <label className={styles.label}>Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={styles.textarea} rows={2} />
              </div>
              <div className={styles.fieldFull}>
                <label className={styles.label}>URLs de imágenes (separadas por coma)</label>
                <input type="text" value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className={styles.input} />
              </div>
            </div>
            <button type="submit" className={styles.submitBtn} disabled={saving}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear producto'}
            </button>
          </form>
        )}

        {products.length === 0 ? (
          <p className={styles.empty}>No tienes productos. Crea tu primer producto.</p>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Producto</span>
              <span>Precio</span>
              <span>Stock</span>
              <span>Acciones</span>
            </div>
            {products.map((product) => (
              <div key={product.id} className={styles.tableRow}>
                <span className={styles.productName}>{product.name}</span>
                <span>{product.currency} {Number(product.price).toLocaleString()}</span>
                <span>{product.stock}</span>
                <span className={styles.actions}>
                  <button onClick={() => handleEdit(product)} className={styles.editBtn}>Editar</button>
                  <button onClick={() => handleDelete(product.id)} className={styles.deleteBtn}>Eliminar</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
