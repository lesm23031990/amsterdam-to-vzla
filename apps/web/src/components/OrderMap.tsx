'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import styles from './OrderMap.module.css';

export interface LatLng {
  lat: number;
  lng: number;
}

interface OrderMapProps {
  driverPos: LatLng | null;
  destinationLabel?: string;
  onRecenter?: () => void;
}

const DEFAULT_CENTER: [number, number] = [7.7713, -72.2218];
const DEFAULT_ZOOM = 15;
const FOLLOW_ZOOM = 16;
const RECENTER_THRESHOLD_METERS = 150;

// Icono inline: evita el bug clásico de Leaflet con las rutas de assets en bundlers.
const driverIcon = L.divIcon({
  className: styles.driverIcon,
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#1d4ed8" stroke="#ffffff" stroke-width="2" />
      <circle cx="13" cy="26" r="4" fill="none" stroke="#ffffff" stroke-width="2" />
      <circle cx="27" cy="26" r="4" fill="none" stroke="#ffffff" stroke-width="2" />
      <path d="M13 26 L17 18 H24 L27 26 M17 18 L15 14 H11" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

export default function OrderMap({ driverPos, destinationLabel, onRecenter }: OrderMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const followingRef = useRef(true);
  const [showRecenter, setShowRecenter] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on('dragstart', () => {
      followingRef.current = false;
    });

    map.on('moveend', () => {
      const markerPos = markerRef.current?.getLatLng();
      if (!markerPos) return;
      const distance = map.getCenter().distanceTo(markerPos);
      setShowRecenter(distance > RECENTER_THRESHOLD_METERS);
    });

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    // El contenedor se monta dentro de un import dinámico; recalcula su tamaño.
    const timer = window.setTimeout(() => map.invalidateSize(), 120);

    mapRef.current = map;

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!driverPos) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const nextLatLng: L.LatLngExpression = [driverPos.lat, driverPos.lng];

    if (markerRef.current) {
      markerRef.current.setLatLng(nextLatLng);
    } else {
      markerRef.current = L.marker(nextLatLng, { icon: driverIcon, title: 'Repartidor' }).addTo(map);
    }

    // Auto-centrado inicial y mientras el usuario no haya paneado el mapa.
    if (followingRef.current) {
      map.setView(nextLatLng, Math.max(map.getZoom(), FOLLOW_ZOOM));
      setShowRecenter(false);
    }
  }, [driverPos]);

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map || !driverPos) return;
    followingRef.current = true;
    map.setView([driverPos.lat, driverPos.lng], FOLLOW_ZOOM);
    setShowRecenter(false);
    onRecenter?.();
  };

  return (
    <div className={styles.wrapper}>
      <div
        ref={containerRef}
        className={styles.map}
        role="region"
        aria-label="Mapa de seguimiento del repartidor"
      />

      {destinationLabel && <p className={styles.destination}>Entrega: {destinationLabel}</p>}

      {!driverPos && (
        <div className={styles.fallback} role="status">
          <span className={styles.pulse} aria-hidden="true" />
          Esperando ubicación del repartidor...
        </div>
      )}

      {showRecenter && driverPos && (
        <button type="button" className={styles.recenter} onClick={handleRecenter}>
          Centrar
        </button>
      )}
    </div>
  );
}
