'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { connectNotificationSocket } from '@/lib/socket';
import type { LatLng } from '@/components/OrderMap';
import styles from './page.module.css';

const OrderMap = dynamic(() => import('@/components/OrderMap'), {
  ssr: false,
  loading: () => <p className={styles.mapLoading}>Cargando mapa...</p>,
});

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

interface BinancePayLink {
  paymentUrl: string | null;
  qrContent?: string | null;
  prepayId?: string | null;
  expiresAt: string;
  reused?: boolean;
}

interface TrackingInfo {
  deliveryId: string;
  status: string;
  driver: { id: string; name: string; phone: string } | null;
  latestLocation: { lat: number; lng: number; createdAt: string } | null;
  orderStatus: string;
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
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [driverPos, setDriverPos] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payRef, setPayRef] = useState('');
  const [binancePay, setBinancePay] = useState<BinancePayLink | null>(null);
  const [payLinkError, setPayLinkError] = useState('');
  const [copied, setCopied] = useState(false);
  const driverPosAtRef = useRef<string | null>(null);

  // Descarta posiciones viejas si las respuestas llegan desordenadas.
  const applyDriverPos = useCallback((lat: number, lng: number, at?: string) => {
    const timestamp = at || new Date().toISOString();
    if (driverPosAtRef.current && timestamp < driverPosAtRef.current) return;
    driverPosAtRef.current = timestamp;
    setDriverPos({ lat, lng });
  }, []);

  const loadOrderData = useCallback(async (id: string) => {
    const [orderRes, paymentRes, trackingRes] = await Promise.all([
      api.get<Order>(`/checkout/orders/${id}`),
      api.get<PaymentStatus>(`/checkout/orders/${id}/payment-status`),
      api.get<TrackingInfo | null>(`/delivery/orders/${id}/tracking`),
    ]);

    const nextOrder = orderRes.ok ? orderRes.data : undefined;
    if (nextOrder) setOrder(nextOrder);
    if (paymentRes.ok && paymentRes.data) setPayment(paymentRes.data);

    if (trackingRes.ok && trackingRes.data) {
      setTracking(trackingRes.data);
      const latest = trackingRes.data.latestLocation;
      if (latest) applyDriverPos(latest.lat, latest.lng, latest.createdAt);
    } else {
      const fallback = nextOrder?.delivery?.locations?.[0];
      if (fallback) applyDriverPos(fallback.lat, fallback.lng, fallback.createdAt);
    }
  }, [applyDriverPos]);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    const id = params.id as string;
    void loadOrderData(id).finally(() => setLoading(false));
  }, [params.id, user, router, loadOrderData]);

  // Tracking en vivo por socket: solo el dueño del pedido (o admin) recibe sus rooms.
  useEffect(() => {
    const orderId = params.id as string;
    if (!user || !orderId) return;

    const token = localStorage.getItem('token');
    const socket = token ? connectNotificationSocket(token) : null;
    if (!socket) return;

    const joinOrder = () => { socket.emit('join:order', orderId); };
    if (socket.connected) joinOrder();
    socket.on('connect', joinOrder);

    const handleLocation = (payload: { orderId: string; lat: number; lng: number; timestamp: string }) => {
      if (payload.orderId !== orderId) return;
      applyDriverPos(payload.lat, payload.lng, payload.timestamp);
      setTracking((current) => (current ? {
        ...current,
        latestLocation: { lat: payload.lat, lng: payload.lng, createdAt: payload.timestamp },
      } : current));
    };

    const handleOrderChange = (payload: { orderId: string }) => {
      if (payload.orderId !== orderId) return;
      void loadOrderData(orderId);
    };

    socket.on('delivery:location', handleLocation);
    socket.on('delivery:status', handleOrderChange);
    socket.on('order:status', handleOrderChange);

    return () => {
      socket.off('connect', joinOrder);
      socket.off('delivery:location', handleLocation);
      socket.off('delivery:status', handleOrderChange);
      socket.off('order:status', handleOrderChange);
      socket.disconnect();
    };
  }, [params.id, user, applyDriverPos, loadOrderData]);

  // Polling de respaldo cada 15s mientras el pedido va en camino (cubre la demo sin sockets).
  useEffect(() => {
    if (!order || order.status !== 'in_transit') return;
    const id = order.id;
    const interval = window.setInterval(() => { void loadOrderData(id); }, 15000);
    return () => window.clearInterval(interval);
  }, [order?.id, order?.status, loadOrderData]);

  // Binance Pay: recupera el link vigente o crea uno nuevo al abrir el pedido.
  // El endpoint es idempotente, así que recargar la página no duplica la orden.
  useEffect(() => {
    if (!order || order.paymentMethod !== 'binance_pay') return;
    if (order.paymentStatus !== 'pending' || order.status !== 'pending_payment') return;
    if (binancePay?.paymentUrl) return;

    const id = order.id;
    let cancelled = false;
    void (async () => {
      const res = await api.post<BinancePayLink>('/checkout/pay/binance', { orderId: id });
      if (cancelled) return;
      if (res.ok && res.data) {
        setBinancePay(res.data);
        setPayLinkError('');
      } else {
        setPayLinkError(res.error || 'No se pudo generar el enlace de pago con Binance Pay');
      }
    })();

    return () => { cancelled = true; };
  }, [order?.id, order?.paymentMethod, order?.paymentStatus, order?.status, binancePay?.paymentUrl]);

  // Respaldo del webhook: consulta Binance cada 5s hasta que el pago se confirme.
  useEffect(() => {
    if (!order || order.paymentMethod !== 'binance_pay' || order.paymentStatus !== 'pending') return;
    const id = order.id;

    const tick = async () => {
      const res = await api.get<PaymentStatus>(`/checkout/pay/binance/${id}/status`);
      const next = res.data;
      if (!res.ok || !next) return;
      setPayment((current) => (current ? { ...current, ...next } : next));
      if (next.paymentStatus !== 'pending') await loadOrderData(id);
    };

    const interval = window.setInterval(() => { void tick(); }, 5000);
    return () => window.clearInterval(interval);
  }, [order?.id, order?.paymentMethod, order?.paymentStatus, loadOrderData]);

  const handlePay = async () => {
    if (!order) return;
    setPaying(true);
    const res = await api.post(`/checkout/orders/${order.id}/pay`, { paymentRef: payRef });
    if (res.ok) {
      await loadOrderData(order.id);
      setPayRef('');
    }
    setPaying(false);
  };

  const payUrl = binancePay?.paymentUrl || payment?.paymentUrl || null;

  const handleCopyPayLink = async () => {
    if (!payUrl) return;
    try {
      await navigator.clipboard.writeText(payUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
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

        {order.status === 'in_transit' && (
          <div className={styles.trackingSection}>
            <div className={styles.trackingHeader}>
              <h3>Seguimiento en vivo</h3>
              {tracking?.driver && (
                <div className={styles.driverInfo}>
                  <span>{tracking.driver.name}</span>
                  {tracking.driver.phone && (
                    <a href={`tel:${tracking.driver.phone}`} className={styles.driverPhone}>
                      {tracking.driver.phone}
                    </a>
                  )}
                </div>
              )}
            </div>
            <OrderMap driverPos={driverPos} destinationLabel={order.deliveryAddress} />
          </div>
        )}

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
                    <p>La ventana de pago de 15 minutos venció y el pedido fue cancelado.</p>
                    <p>Vuelve a hacer el pedido desde el carrito para generar un nuevo link.</p>
                  </div>
                ) : (
                  <div className={styles.payForm}>
                    <p className={styles.payInfo}>
                      Total a pagar: <strong>{order.currency} {Number(order.total).toLocaleString()}</strong>
                    </p>
                    {payUrl ? (
                      <>
                        <a
                          href={payUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.payLink}
                        >
                          Abrir Binance Pay
                        </a>
                        <button type="button" onClick={handleCopyPayLink} className={styles.payBtn}>
                          {copied ? 'Enlace copiado' : 'Copiar enlace de pago'}
                        </button>
                      </>
                    ) : payLinkError ? (
                      <p className={styles.payError}>{payLinkError}</p>
                    ) : (
                      <p className={styles.payHint}>Generando enlace de pago seguro…</p>
                    )}
                    {payment && (
                      <p className={styles.payHint}>
                        Tienes hasta el{' '}
                        {new Date(payment.expiresAt).toLocaleString('es-VE', {
                          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                        })}{' '}
                        para completar el pago. El cargo se hace en USD/USDT al tipo de cambio del día.
                      </p>
                    )}
                    <p className={styles.payHint}>
                      Esta pantalla se actualiza automáticamente en cuanto Binance confirma el pago.
                    </p>
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
