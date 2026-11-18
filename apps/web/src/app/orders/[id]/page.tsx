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
  paymentStatus: string;
  deliveryAddress: string;
  contactPhone: string;
  notes: string;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    price: number;
    name: string;
    subtotal: number;
  }[];
  store: { id: string; name: string; slug: string };
  delivery?: {
    id: string;
    status: string;
    driver: { id: string; name: string; phone: string };
    locations: { lat: number; lng: number; createdAt: string }[];
  };
}

interface PaymentStatus {
  orderId: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentRef: string | null;
  paymentUrl: string | null;
  expiresAt: string;
  expired: boolean;
}

const statusLabels: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const statusSteps = ['pending_payment', 'confirmed', 'preparing', 'in_transit', 'delivered'];

const paymentLabels: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  binance_pay: 'Binance Pay',
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  pending_review: 'En revisión',
  paid: 'Pagado',
  failed: 'Vencido / rechazado',
};

export default function OrderDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payRef, setPayRef] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    const id = params.id as string;
    Promise.all([
      api.get<Order>(`/checkout/orders/${id}`),
      api.get<PaymentStatus>(`/checkout/orders/${id}/payment-status`),
    ]).then(([orderRes, paymentRes]) => {
      if (orderRes.ok && orderRes.data) setOrder(orderRes.data);
      if (paymentRes.ok && paymentRes.data) setPayment(paymentRes.data);
      setLoading(false);
    });
  }, [params.id, user]);

  const handlePay = async () => {
    if (!order) return;
    setPaying(true);
    const res = await api.post(`/checkout/orders/${order.id}/pay`, { paymentRef: payRef });
    if (res.ok) {
      const [orderRes, paymentRes] = await Promise.all([
        api.get<Order>(`/checkout/orders/${order.id}`),
        api.get<PaymentStatus>(`/checkout/orders/${order.id}/payment-status`),
      ]);
      if (orderRes.ok && orderRes.data) setOrder(orderRes.data);
      if (paymentRes.ok && paymentRes.data) setPayment(paymentRes.data);
      setPayRef('');
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
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.name}</span>
                    <p className={styles.itemMeta}>
                      {item.quantity} x {order.currency} {Number(item.price).toLocaleString()}
                    </p>
                  </div>
                  <span className={styles.itemTotal}>
                    {order.currency} {Number(item.subtotal).toLocaleString()}
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
                <span>{paymentLabels[order.paymentMethod] || order.paymentMethod}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Estado del pago</span>
                <span>{paymentStatusLabels[order.paymentStatus] || order.paymentStatus}</span>
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

            {order.paymentMethod === 'binance_pay' && order.paymentStatus !== 'paid' && (
              <div className={styles.paySection}>
                <h3>Pago con Binance Pay</h3>
                {payment?.expired || order.status === 'cancelled' ? (
                  <div className={styles.expiredBox}>
                    <p>La ventana de pago de 24 horas venció y el pedido fue cancelado.</p>
                    <p>Vuelve a hacer el pedido desde el carrito para generar un nuevo link.</p>
                  </div>
                ) : (
                  <div className={styles.payForm}>
                    <p className={styles.payInfo}>
                      Total a pagar: <strong>{order.currency} {Number(order.total).toLocaleString()}</strong>
                    </p>
                    {payment?.paymentUrl && (
                      <a
                        href={payment.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.payLink}
                      >
                        Pagar con Binance
                      </a>
                    )}
                    {payment && (
                      <p className={styles.payHint}>
                        Tienes hasta el{' '}
                        {new Date(payment.expiresAt).toLocaleString('es-VE', {
                          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                        })}{' '}
                        para completar el pago (link de demostración del MVP).
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {(order.paymentMethod === 'cash' || order.paymentMethod === 'transfer') && order.paymentStatus !== 'paid' && (
              <div className={styles.paySection}>
                <h3>Registrar pago</h3>
                <div className={styles.payForm}>
                  <p className={styles.payInfo}>
                    Método: {order.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
                  </p>
                  <input
                    type="text"
                    placeholder="Número de referencia"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className={styles.input}
                  />
                  <button onClick={handlePay} className={styles.payBtn} disabled={paying || !payRef}>
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
