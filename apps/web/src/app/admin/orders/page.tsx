'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface AdminOrder {
  id: string;
  status: string;
  total: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
  user?: { id: string; name: string; email: string; phone?: string | null };
  delivery?: { id: string; status: string; driver?: { id: string; name: string; phone?: string | null } | null };
}

const statusLabels: Record<string, string> = {
  pending_payment: 'Pago pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
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
      const res = await api.get<AdminOrder[]>('/admin/orders');
      if (cancelled) return;
      if (res.ok && Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        setError(res.error || 'No se pudieron cargar los pedidos');
      }
      setFetching(false);
    })();
    return () => { cancelled = true; };
  }, [authReady]);

  if (!authReady || fetching) {
    return <p className={styles.loading}>Cargando pedidos...</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Pedidos</h1>
        <p className={styles.description}>{orders.length} pedidos en la plataforma</p>

        {error ? (
          <div className={styles.info}><p>{error}</p></div>
        ) : orders.length === 0 ? (
          <div className={styles.empty}><p>Aún no hay pedidos.</p></div>
        ) : (
          <div className={styles.list}>
            {orders.map((order) => (
              <div key={order.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.orderId}>#{order.id.slice(0, 8)}</span>
                  <span className={`${styles.status} ${styles[order.status] || ''}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
                <div className={styles.cardMeta}>
                  <span className={styles.customer}>{order.user?.name || 'Cliente'}</span>
                  <span>{order.user?.email}</span>
                  <span>{new Date(order.createdAt).toLocaleDateString('es-VE')} · {new Date(order.createdAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={styles.items}>
                  {order.items?.map((item) => (
                    <p key={item.id} className={styles.itemLine}>
                      {item.quantity} × {item.name} — {order.currency} {(item.price * item.quantity).toLocaleString()}
                    </p>
                  ))}
                </div>
                {order.delivery && (
                  <p className={styles.delivery}>
                    Delivery: {order.delivery.status}
                    {order.delivery.driver ? ` · Repartidor: ${order.delivery.driver.name}` : ''}
                  </p>
                )}
                <div className={styles.cardFooter}>
                  <span className={styles.total}>
                    {order.currency} {Number(order.total).toLocaleString()}
                  </span>
                  <span className={styles.paymentMethod}>
                    {order.paymentMethod} · {order.paymentStatus === 'paid' ? 'Pagado' : order.paymentStatus === 'failed' ? 'Fallido' : 'Por pagar'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
