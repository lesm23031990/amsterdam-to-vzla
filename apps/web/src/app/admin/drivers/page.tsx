'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Driver {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  document?: string | null;
  isActive: boolean;
  isOnline: boolean;
  status: 'activo' | 'en_delivery' | 'offline';
  activeDeliveries: number;
  createdAt: string;
}

interface AdminOrder {
  id: string;
  status: string;
  total: number;
  currency: string;
  user?: { name: string };
  delivery?: { id: string } | null;
}

interface AdminDelivery {
  id: string;
  orderId: string;
  status: string;
  order?: {
    deliveryAddress?: string | null;
    user?: { name: string };
  };
  driver?: { id: string; name: string };
}

const driverStatusLabels: Record<Driver['status'], string> = {
  activo: 'Activo',
  en_delivery: 'En entrega',
  offline: 'Offline',
};

const deliveryStatusLabels: Record<string, string> = {
  assigned: 'Asignado',
  pending: 'Pendiente',
  accepted: 'Aceptado',
  picked_up: 'Recogido',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const initialForm = { name: '', email: '', phone: '', document: '', password: '' };

export default function AdminDriversPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [deliveries, setDeliveries] = useState<AdminDelivery[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/'); return; }
    setAuthReady(true);
  }, [user, router]);

  const loadData = useCallback(async () => {
    setFetching(true);
    const [driversRes, ordersRes, deliveriesRes] = await Promise.all([
      api.get<Driver[]>('/admin/drivers'),
      api.get<AdminOrder[]>('/admin/orders'),
      api.get<AdminDelivery[]>('/admin/deliveries'),
    ]);

    const firstError = !driversRes.ok ? driversRes.error : !ordersRes.ok ? ordersRes.error : !deliveriesRes.ok ? deliveriesRes.error : null;

    setDrivers(driversRes.ok && Array.isArray(driversRes.data) ? driversRes.data : []);
    setOrders(ordersRes.ok && Array.isArray(ordersRes.data) ? ordersRes.data : []);
    setDeliveries(deliveriesRes.ok && Array.isArray(deliveriesRes.data) ? deliveriesRes.data : []);
    setError(firstError || null);
    setFetching(false);
  }, []);

  useEffect(() => {
    if (authReady) loadData();
  }, [authReady, loadData]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    setTemporaryPassword(null);

    const res = await api.post<{ temporaryPassword?: string }>('/admin/drivers', {
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      document: form.document || undefined,
      password: form.password || undefined,
    });

    if (res.ok && res.data) {
      setForm(initialForm);
      setTemporaryPassword(res.data.temporaryPassword || null);
      await loadData();
    } else {
      setCreateError(res.error || 'No se pudo crear el repartidor');
    }

    setCreating(false);
  };

  const handleAssign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOrder || !selectedDriver) {
      setAssignError('Selecciona un pedido y un repartidor');
      return;
    }

    setAssigning(true);
    setAssignError(null);

    const res = await api.post('/admin/deliveries', { orderId: selectedOrder, driverId: selectedDriver });

    if (res.ok) {
      setSelectedOrder('');
      setSelectedDriver('');
      await loadData();
    } else {
      setAssignError(res.error || 'No se pudo asignar la entrega');
    }

    setAssigning(false);
  };

  if (!authReady || fetching) {
    return <p className={styles.loading}>Cargando repartidores...</p>;
  }

  const availableOrders = orders.filter(
    (order) => !order.delivery && ['confirmed', 'preparing'].includes(order.status)
  );
  const activeDrivers = drivers.filter((driver) => driver.isActive);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Repartidores</h1>
        <p className={styles.description}>{drivers.length} repartidores registrados</p>

        {error && <div className={styles.info}><p>{error}</p></div>}

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Nuevo repartidor</h2>
            <p className={styles.cardHint}>
              Se crea una cuenta con rol cliente y perfil de repartidor. Si dejas la contraseña vacía se genera una temporal.
            </p>

            {temporaryPassword && (
              <div className={styles.successBox}>
                Repartidor creado. Contraseña temporal: <strong>{temporaryPassword}</strong>
                <span>Compártela con el repartidor; no se volverá a mostrar.</span>
              </div>
            )}
            {createError && <div className={styles.errorBox}>{createError}</div>}

            <form className={styles.form} onSubmit={handleCreate}>
              <label className={styles.field}>
                <span>Nombre</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nombre completo"
                />
              </label>
              <label className={styles.field}>
                <span>Email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="repartidor@email.com"
                />
              </label>
              <label className={styles.field}>
                <span>Teléfono</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+58 424 123 4567"
                />
              </label>
              <label className={styles.field}>
                <span>Cédula / documento</span>
                <input
                  value={form.document}
                  onChange={(e) => setForm({ ...form, document: e.target.value })}
                  placeholder="V-12345678"
                />
              </label>
              <label className={styles.field}>
                <span>Contraseña (opcional)</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mín. 8 caracteres, 1 mayúscula y 1 número"
                />
              </label>
              <button type="submit" className={styles.primaryButton} disabled={creating}>
                {creating ? 'Creando...' : 'Crear repartidor'}
              </button>
            </form>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Asignar entrega</h2>
            <p className={styles.cardHint}>
              Selecciona un pedido confirmado o en preparación que aún no tenga repartidor.
            </p>

            {assignError && <div className={styles.errorBox}>{assignError}</div>}

            <form className={styles.form} onSubmit={handleAssign}>
              <label className={styles.field}>
                <span>Pedido</span>
                <select value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)}>
                  <option value="">Selecciona un pedido</option>
                  {availableOrders.map((order) => (
                    <option key={order.id} value={order.id}>
                      #{order.id.slice(-6)} · {order.user?.name || 'Cliente'} · {order.currency} {order.total}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Repartidor</span>
                <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
                  <option value="">Selecciona un repartidor</option>
                  {activeDrivers.map((driver) => (
                    <option key={driver.id} value={driver.userId}>
                      {driver.name} · {driverStatusLabels[driver.status]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={styles.primaryButton} disabled={assigning}>
                {assigning ? 'Asignando...' : 'Asignar entrega'}
              </button>
            </form>

            {availableOrders.length === 0 && (
              <p className={styles.cardHint}>No hay pedidos pendientes de asignación.</p>
            )}
          </section>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Repartidores</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Contacto</th>
                  <th>Documento</th>
                  <th>Estado</th>
                  <th>Entregas activas</th>
                  <th>Registrado</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr key={driver.id}>
                    <td>{driver.name}</td>
                    <td>
                      <div>{driver.email}</div>
                      {driver.phone && <div className={styles.muted}>{driver.phone}</div>}
                    </td>
                    <td>{driver.document || '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[driver.status] || ''}`}>
                        {driverStatusLabels[driver.status]}
                      </span>
                    </td>
                    <td>{driver.activeDeliveries}</td>
                    <td>{new Date(driver.createdAt).toLocaleDateString('es-VE')}</td>
                  </tr>
                ))}
                {drivers.length === 0 && (
                  <tr><td colSpan={6} className={styles.empty}>Aún no hay repartidores. Crea el primero arriba.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Entregas activas</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Dirección</th>
                  <th>Repartidor</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td>#{delivery.orderId.slice(-6)}</td>
                    <td>{delivery.order?.user?.name || 'Cliente'}</td>
                    <td className={styles.muted}>{delivery.order?.deliveryAddress || '—'}</td>
                    <td>{delivery.driver?.name || 'Sin asignar'}</td>
                    <td>
                      <span className={styles.badge}>
                        {deliveryStatusLabels[delivery.status] || delivery.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {deliveries.length === 0 && (
                  <tr><td colSpan={5} className={styles.empty}>No hay entregas activas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
