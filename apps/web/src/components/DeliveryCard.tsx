'use client';

import styles from './DeliveryCard.module.css';

export interface DriverDelivery {
  id: string;
  orderId: string;
  customerName: string;
  contactPhone?: string | null;
  deliveryAddress?: string | null;
  status: string;
  total: number;
  currency: string;
  items: { name: string; quantity: number }[];
  createdAt?: string;
}

interface Props {
  delivery: DriverDelivery;
  busy?: boolean;
  sharingLocation?: boolean;
  onStatusChange: (deliveryId: string, status: string) => void;
  onToggleLocation: (deliveryId: string) => void;
}

const statusLabels: Record<string, string> = {
  assigned: 'Asignado',
  pending: 'Pendiente',
  accepted: 'Aceptado',
  picked_up: 'Recogido',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const nextActions: Record<string, { label: string; status: string }> = {
  assigned: { label: 'Aceptar', status: 'accepted' },
  pending: { label: 'Aceptar', status: 'accepted' },
  accepted: { label: 'Recogido', status: 'picked_up' },
  picked_up: { label: 'En camino', status: 'in_transit' },
  in_transit: { label: 'Entregado', status: 'delivered' },
};

export default function DeliveryCard({
  delivery,
  busy = false,
  sharingLocation = false,
  onStatusChange,
  onToggleLocation,
}: Props) {
  const action = nextActions[delivery.status];

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div>
          <p className={styles.orderId}>Pedido #{delivery.orderId.slice(-6)}</p>
          <h3 className={styles.customer}>{delivery.customerName}</h3>
        </div>
        <span className={`${styles.status} ${styles[delivery.status] || ''}`}>
          {statusLabels[delivery.status] || delivery.status}
        </span>
      </header>

      <p className={styles.address}>📍 {delivery.deliveryAddress || 'Dirección no registrada'}</p>
      {delivery.contactPhone && <p className={styles.phone}>📞 {delivery.contactPhone}</p>}

      <ul className={styles.items}>
        {delivery.items.map((item, index) => (
          <li key={`${delivery.id}-${index}`}>
            {item.quantity} × {item.name}
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <span className={styles.total}>
          {delivery.currency} {Number(delivery.total).toLocaleString('es-VE')}
        </span>
        {action && (
          <button
            type="button"
            className={styles.actionButton}
            disabled={busy}
            onClick={() => onStatusChange(delivery.id, action.status)}
          >
            {busy ? 'Actualizando...' : action.label}
          </button>
        )}
      </div>

      {delivery.status === 'in_transit' && (
        <button
          type="button"
          className={`${styles.locationButton} ${sharingLocation ? styles.locationActive : ''}`}
          onClick={() => onToggleLocation(delivery.id)}
        >
          {sharingLocation ? '🟢 Compartiendo ubicación en vivo' : '📍 Compartir ubicación'}
        </button>
      )}
    </article>
  );
}
