'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cartItems, setCartItems] = useState<{ product: { name: string; price: number; currency: string }; quantity: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    deliveryAddress: '',
    contactPhone: '',
    notes: '',
    paymentMethod: 'efectivo',
  });

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    api.get<{ items: any[] }>('/cart').then((res) => {
      if (res.ok && res.data) setCartItems(res.data.items || []);
      setLoading(false);
    });
  }, [user]);

  const total = cartItems.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);
  const currency = cartItems[0]?.product.currency || 'USD';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const res = await api.post('/checkout', form);
    if (res.ok) {
      router.push('/orders');
    } else {
      setError(res.error || 'Error al procesar el pedido');
      setSubmitting(false);
    }
  };

  if (loading) return <p className={styles.loading}>Cargando...</p>;

  if (cartItems.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.empty}>
            <p>Tu carrito está vacío</p>
            <Link href="/stores" className={styles.shopBtn}>Ir a tiendas</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Finalizar compra</h1>

        <div className={styles.grid}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.field}>
              <label className={styles.label}>Dirección de entrega</label>
              <textarea
                value={form.deliveryAddress}
                onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                className={styles.textarea}
                required
                rows={3}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Teléfono de contacto</label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Método de pago</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className={styles.input}
              >
                <option value="efectivo">Efectivo (Bs/COP/USD)</option>
                <option value="transferencia">Transferencia</option>
                <option value="binance">Binance Pay</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Notas adicionales</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={styles.textarea}
                rows={2}
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Procesando...' : `Confirmar pedido - ${currency} ${total.toLocaleString()}`}
            </button>
          </form>

          <div className={styles.summary}>
            <h3>Resumen del pedido</h3>
            <div className={styles.itemsList}>
              {cartItems.map((item, idx) => (
                <div key={idx} className={styles.summaryItem}>
                  <span className={styles.summaryName}>{item.product.name} x{item.quantity}</span>
                  <span className={styles.summaryPrice}>
                    {item.product.currency} {(Number(item.product.price) * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.summaryTotal}>
              <span>Total</span>
              <span className={styles.totalAmount}>{currency} {total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
