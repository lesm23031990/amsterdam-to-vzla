'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { name: string };
}

interface Order {
  id: string;
  status: string;
  total: number;
  currency: string;
  deliveryAddress: string;
  contactPhone: string;
  notes?: string;
  createdAt: string;
  items: OrderItem[];
}

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  preparando: 'En preparación',
  enviado: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export default function DashboardOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'tienda') { router.push('/'); return; }
    api.get<Order[]>('/delivery/orders').then((res) => {
      if (res.ok && res.data) setOrders(res.data);
      setLoading(false);
    });
  }, [user]);

  const updateStatus = async (orderId: string, status: string) => {
    await api.patch(`/delivery/orders/${orderId}/status`, { status });
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
  };

  if (loading) return <p className={styles.loading}>Cargando pedidos...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Pedidos entrantes</h1>

        {orders.length === 0 ? (
          <p className={styles.empty}>No hay pedidos aún</p>
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

                <div className={styles.cardBody}>
                  <div className={styles.items}>
                    {order.items.map((item) => (
                      <div key={item.id} className={styles.item}>
                        <span>{item.product.name} x{item.quantity}</span>
                        <span>{order.currency} {(Number(item.price) * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.total}>
                    <span>Total:</span>
                    <strong>{order.currency} {Number(order.total).toLocaleString()}</strong>
                  </div>
                  <div className={styles.details}>
                    <p><strong>Dirección:</strong> {order.deliveryAddress}</p>
                    <p><strong>Contacto:</strong> {order.contactPhone}</p>
                    {order.notes && <p><strong>Notas:</strong> {order.notes}</p>}
                    <p><strong>Fecha:</strong> {new Date(order.createdAt).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.label}>Cambiar estado:</span>
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className={styles.statusSelect}
                  >
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
