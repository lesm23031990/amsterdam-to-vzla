'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Order {
  id: string;
  status: string;
  total: number;
  currency: string;
  paymentMethod: string;
  deliveryAddress: string;
  contactPhone: string;
  notes: string;
  referenceNumber?: string;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    price: number;
    product: { id: string; name: string; images: string[] };
  }[];
  tracking?: { lat: number; lng: number; updatedAt: string }[];
}

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  preparando: 'En preparación',
  enviado: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const statusSteps = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado'];

export default function OrderDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payForm, setPayForm] = useState({ paymentMethod: '', paymentRef: '' });

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    const id = params.id as string;
    api.get<Order>(`/checkout/orders/${id}`).then((res) => {
      if (res.ok && res.data) setOrder(res.data);
      setLoading(false);
    });
  }, [params.id, user]);

  const handlePay = async () => {
    setPaying(true);
    const res = await api.post(`/checkout/orders/${order!.id}/pay`, payForm);
    if (res.ok) {
      api.get<Order>(`/checkout/orders/${order!.id}`).then((r) => {
        if (r.ok && r.data) setOrder(r.data);
      });
    }
    setPaying(false);
  };

  if (loading) return <p className={styles.loading}>Cargando pedido...</p>;
  if (!order) return <p className={styles.loading}>Pedido no encontrado</p>;

  const currentStep = statusSteps.indexOf(order.status);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Pedido #{order.id.slice(0, 8)}</h1>
          <span className={`${styles.status} ${styles[order.status] || ''}`}>
            {statusLabels[order.status] || order.status}
          </span>
        </div>

        <div className={styles.tracker}>
          <div className={styles.steps}>
            {statusSteps.map((step, idx) => (
              <div key={step} className={`${styles.step} ${idx <= currentStep ? styles.stepActive : ''}`}>
                <div className={styles.stepDot} />
                <span className={styles.stepLabel}>{statusLabels[step]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.section}>
            <h3>Productos</h3>
            <div className={styles.items}>
              {order.items.map((item) => (
                <div key={item.id} className={styles.item}>
                  <div
                    className={styles.itemImage}
                    style={{ backgroundImage: item.product.images?.[0] ? `url(${item.product.images[0]})` : undefined }}
                  />
                  <div className={styles.itemInfo}>
                    <Link href={`/products/${item.product.id}`} className={styles.itemName}>
                      {item.product.name}
                    </Link>
                    <p className={styles.itemMeta}>
                      {item.quantity} x {order.currency} {Number(item.price).toLocaleString()}
                    </p>
                  </div>
                  <span className={styles.itemTotal}>
                    {order.currency} {(Number(item.price) * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.totalRow}>
              <span>Total</span>
              <span className={styles.totalAmount}>{order.currency} {Number(order.total).toLocaleString()}</span>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Detalles del pedido</h3>
            <div className={styles.details}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Fecha</span>
                <span>{new Date(order.createdAt).toLocaleDateString('es-ES', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Método de pago</span>
                <span>{order.paymentMethod}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Dirección</span>
                <span>{order.deliveryAddress}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Contacto</span>
                <span>{order.contactPhone}</span>
              </div>
              {order.notes && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Notas</span>
                  <span>{order.notes}</span>
                </div>
              )}
            </div>

            {(order.status === 'pendiente' || order.status === 'confirmado') && (
              <div className={styles.paySection}>
                <h3>Realizar pago</h3>
                <div className={styles.payForm}>
                  <select
                    value={payForm.paymentMethod}
                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    className={styles.input}
                  >
                    <option value="">Seleccionar método</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="binance">Binance Pay</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Número de referencia"
                    value={payForm.paymentRef}
                    onChange={(e) => setPayForm({ ...payForm, paymentRef: e.target.value })}
                    className={styles.input}
                  />
                  <button onClick={handlePay} className={styles.payBtn} disabled={paying || !payForm.paymentMethod}>
                    {paying ? 'Procesando...' : 'Confirmar pago'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
