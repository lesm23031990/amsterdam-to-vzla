export interface LatLng {
  lat: number;
  lng: number;
}

// Mismos valores que apps/web/src/components/OrderMap.tsx para que el mapa
// móvil se vea y se comporte igual que el de la web.
export const SAN_CRISTOBAL_CENTER: [number, number] = [7.7713, -72.2218];
export const DEFAULT_ZOOM = 15;
export const FOLLOW_ZOOM = 16;
export const RECENTER_THRESHOLD_METERS = 150;

export const DRIVER_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">' +
  '<circle cx="20" cy="20" r="18" fill="#1d4ed8" stroke="#ffffff" stroke-width="2" />' +
  '<circle cx="13" cy="26" r="4" fill="none" stroke="#ffffff" stroke-width="2" />' +
  '<circle cx="27" cy="26" r="4" fill="none" stroke="#ffffff" stroke-width="2" />' +
  '<path d="M13 26 L17 18 H24 L27 26 M17 18 L15 14 H11" fill="none" stroke="#ffffff" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" /></svg>';

export type MapBridgeMessage =
  | { type: 'ready' }
  | { type: 'recenter' }
  | { type: 'following'; distance: number }
  | { type: 'panned'; distance: number };

/** Valida coordenadas antes de inyectarlas en el WebView. */
export function isValidLatLng(value: LatLng | null | undefined): value is LatLng {
  return Boolean(
    value &&
      Number.isFinite(value.lat) &&
      Number.isFinite(value.lng) &&
      Math.abs(value.lat) <= 90 &&
      Math.abs(value.lng) <= 180
  );
}

/** Distancia haversine en metros (para decidir si mostrar "Centrar"). */
export function distanceMeters(from: LatLng, to: LatLng): number {
  const EARTH_RADIUS_METERS = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const h =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/** Parsea los mensajes que el HTML del mapa envía por `postMessage`. */
export function parseMapMessage(raw: string): MapBridgeMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const { type, distance } = parsed as { type?: unknown; distance?: unknown };
    if (type === 'ready') return { type };
    if (type === 'recenter') return { type };
    if ((type === 'panned' || type === 'following') && typeof distance === 'number' && Number.isFinite(distance)) {
      return { type, distance };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * HTML autocontenido con Leaflet + OpenStreetMap para el WebView.
 * Expone `window.setDriver(lat, lng)` y `window.recenter()` y notifica al
 * componente nativo por `ReactNativeWebView.postMessage`.
 */
export function buildOrderMapHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body { height: 100%; margin: 0; background: #E5E7EB; }
    #map { height: 100%; width: 100%; }
    .driver-icon { background: transparent; border: none; }
  </style>
</head>
<body>
  <div id="map" role="region" aria-label="Mapa de seguimiento del repartidor"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var DEFAULT_CENTER = ${JSON.stringify(SAN_CRISTOBAL_CENTER)};
      var DEFAULT_ZOOM = ${DEFAULT_ZOOM};
      var FOLLOW_ZOOM = ${FOLLOW_ZOOM};
      var RECENTER_THRESHOLD_METERS = ${RECENTER_THRESHOLD_METERS};
      var DRIVER_ICON_HTML = ${JSON.stringify(DRIVER_ICON_SVG)};

      var map = L.map('map', { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, zoomControl: false });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      var icon = L.divIcon({
        className: 'driver-icon',
        html: DRIVER_ICON_HTML,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      var marker = null;
      var following = true;

      function post(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      window.setDriver = function (lat, lng) {
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;
        var next = [lat, lng];
        if (marker) {
          marker.setLatLng(next);
        } else {
          marker = L.marker(next, { icon: icon, title: 'Repartidor' }).addTo(map);
        }
        if (following) {
          map.setView(next, Math.max(map.getZoom(), FOLLOW_ZOOM));
          post({ type: 'recenter' });
        }
      };

      window.recenter = function () {
        if (!marker) return;
        following = true;
        map.setView(marker.getLatLng(), Math.max(map.getZoom(), FOLLOW_ZOOM));
        post({ type: 'recenter' });
      };

      map.on('dragstart', function () { following = false; });

      map.on('moveend', function () {
        if (!marker) return;
        var distance = map.getCenter().distanceTo(marker.getLatLng());
        post({ type: distance > RECENTER_THRESHOLD_METERS ? 'panned' : 'following', distance: distance });
      });

      post({ type: 'ready' });
    })();
  </script>
</body>
</html>`;
}
