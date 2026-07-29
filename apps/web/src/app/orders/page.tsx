'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  createdAt: string;
  items: { product: { name: string }; quantity: number; price: number }[];
}

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  preparando: 'En preparación',
  enviado: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export default function OrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    api.get<Order[]>('/checkout/orders').then((res) => {
      if (res.ok && res.data) setOrders(res.data);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <p className={styles.loading}>Cargando pedidos...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Mis pedidos</h1>
        {orders.length === 0 ? (
          <div className={styles.empty}>
            <p>No tienes pedidos aún</p>
            <Link href="/stores" className={styles.shopBtn}>Ir a tiendas</Link>
          </div>
        ) : (
          <div className={styles.list}>
            {orders.map((order) => (
              <Link href={`/orders/${order.id}`} key={order.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.orderId}>#{order.id.slice(0, 8)}</span>
                  <span className={`${styles.status} ${styles[order.status] || ''}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.itemCount}>
                    {order.items?.length || 0} producto(s)
                  </p>
                  <p className={styles.orderDate}>
                    {new Date(order.createdAt).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.total}>
                    {order.currency} {Number(order.total).toLocaleString()}
                  </span>
                  <span className={styles.paymentMethod}>{order.paymentMethod}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
