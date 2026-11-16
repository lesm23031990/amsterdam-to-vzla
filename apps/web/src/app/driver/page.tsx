'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import DeliveryCard, { type DriverDelivery } from '@/components/DeliveryCard';
import styles from './page.module.css';

const geolocationOptions: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10000,
  timeout: 15000,
};

export default function DriverPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DriverDelivery[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const loadDeliveries = useCallback(async () => {
    setFetching(true);
    const res = await api.get<{ deliveries: DriverDelivery[] }>('/delivery/my-deliveries');

    if (res.ok && res.data) {
      setDeliveries(res.data.deliveries || []);
      setError(null);
    } else {
      setError(res.error || 'No se pudieron cargar tus entregas');
    }
    setFetching(false);
  }, []);

  useEffect(() => {
    if (user) loadDeliveries();
  }, [user, loadDeliveries]);

  const stopSharing = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setSharingId(null);
  }, []);

  useEffect(() => {
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  const toggleLocation = useCallback((deliveryId: string) => {
    if (sharingId === deliveryId) {
      stopSharing();
      return;
    }

    stopSharing();
    setActionError(null);

    if (!('geolocation' in navigator)) {
      setActionError('Tu navegador no soporta geolocalización');
      return;
    }

    const sendPosition = (position: GeolocationPosition) => {
      api.patch(`/delivery/${deliveryId}/location`, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }).then((res) => {
        if (!res.ok) {
          setActionError(res.error || 'No se pudo compartir la ubicación');
        }
      });
    }

    setSharingId(deliveryId);
    watchRef.current = navigator.geolocation.watchPosition(
      sendPosition,
      () => {
        setActionError('No pudimos obtener tu ubicación. Revisa los permisos del navegador.');
        stopSharing();
      },
      geolocationOptions
    );
  }, [sharingId, stopSharing]);

  const updateStatus = useCallback(async (deliveryId: string, status: string) => {
    setBusyId(deliveryId);
    setActionError(null);

    const res = await api.patch(`/delivery/${deliveryId}/status`, { status });

    if (!res.ok) {
      setActionError(res.error || 'No se pudo actualizar el estado');
    } else {
      if (status === 'delivered') stopSharing();
      await loadDeliveries();
    }

    setBusyId(null);
  }, [loadDeliveries, stopSharing]);

  if (authLoading || fetching) {
    return <p className={styles.loading}>Cargando tus entregas...</p>;
  }

  if (!user) return null;

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorBox}>
            <h1 className={styles.title}>Panel de repartidor</h1>
            <p>{error}</p>
            <p className={styles.hint}>
              Si eres repartidor, pide al administrador que active tu cuenta en el panel de repartidores.
            </p>
            <div className={styles.errorActions}>
              <button type="button" className={styles.secondaryButton} onClick={loadDeliveries}>
                Reintentar
              </button>
              <Link href="/" className={styles.primaryLink}>Volver al inicio</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Mis entregas</h1>
            <p className={styles.subtitle}>
              Hola {user.name}. {deliveries.length === 0 ? 'No tienes entregas activas.' : `${deliveries.length} entregas activas.`}
            </p>
          </div>
          <button type="button" className={styles.secondaryButton} onClick={loadDeliveries}>
            Actualizar
          </button>
        </header>

        {actionError && <p className={styles.actionError}>{actionError}</p>}

        {deliveries.length === 0 ? (
          <div className={styles.empty}>
            <p>🛵 No hay entregas asignadas por ahora.</p>
            <p className={styles.hint}>Cuando el administrador te asigne un pedido aparecerá aquí.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {deliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                busy={busyId === delivery.id}
                sharingLocation={sharingId === delivery.id}
                onStatusChange={updateStatus}
                onToggleLocation={toggleLocation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
