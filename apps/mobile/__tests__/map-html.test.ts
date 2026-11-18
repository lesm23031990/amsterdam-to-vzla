import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ZOOM,
  FOLLOW_ZOOM,
  RECENTER_THRESHOLD_METERS,
  SAN_CRISTOBAL_CENTER,
  buildOrderMapHtml,
  distanceMeters,
  isValidLatLng,
  parseMapMessage,
} from '../src/lib/mapHtml';

describe('mapHtml', () => {
  it('usa el mismo centro y zooms que el mapa de la web', () => {
    expect(SAN_CRISTOBAL_CENTER).toEqual([7.7713, -72.2218]);
    expect(DEFAULT_ZOOM).toBe(15);
    expect(FOLLOW_ZOOM).toBe(16);
    expect(RECENTER_THRESHOLD_METERS).toBe(150);
  });

  it('genera un documento Leaflet + OpenStreetMap sin API key de Google', () => {
    const html = buildOrderMapHtml();

    expect(html).toContain('leaflet@1.9.4');
    expect(html).toContain('tile.openstreetmap.org');
    expect(html).toContain('window.setDriver = function');
    expect(html).toContain('window.recenter = function');
    expect(html).toContain('ReactNativeWebView.postMessage');
    expect(html).not.toContain('googleapis');
  });

  it('inyecta las constantes compartidas en el script', () => {
    const html = buildOrderMapHtml();

    expect(html).toContain('var DEFAULT_CENTER = [7.7713,-72.2218];');
    expect(html).toContain('var DEFAULT_ZOOM = 15;');
    expect(html).toContain('var FOLLOW_ZOOM = 16;');
    expect(html).toContain('var RECENTER_THRESHOLD_METERS = 150;');
  });

  it('valida coordenadas antes de inyectarlas en el WebView', () => {
    expect(isValidLatLng({ lat: 7.7713, lng: -72.2218 })).toBe(true);
    expect(isValidLatLng(null)).toBe(false);
    expect(isValidLatLng(undefined)).toBe(false);
    expect(isValidLatLng({ lat: Number.NaN, lng: -72.2218 })).toBe(false);
    expect(isValidLatLng({ lat: 91, lng: 0 })).toBe(false);
    expect(isValidLatLng({ lat: 0, lng: 181 })).toBe(false);
  });

  it('mide distancias para decidir cuándo mostrar "Centrar"', () => {
    const center = { lat: 7.7713, lng: -72.2218 };

    expect(distanceMeters(center, center)).toBe(0);

    const near = distanceMeters(center, { lat: 7.7713, lng: -72.2218 + 0.0005 });
    expect(near).toBeGreaterThan(40);
    expect(near).toBeLessThan(70);

    const far = distanceMeters(center, { lat: 7.7713 + 0.002, lng: -72.2218 });
    expect(far).toBeGreaterThan(RECENTER_THRESHOLD_METERS);
  });

  it('solo acepta mensajes conocidos del puente', () => {
    expect(parseMapMessage('{"type":"ready"}')).toEqual({ type: 'ready' });
    expect(parseMapMessage('{"type":"recenter"}')).toEqual({ type: 'recenter' });
    expect(parseMapMessage('{"type":"panned","distance":320}')).toEqual({ type: 'panned', distance: 320 });
    expect(parseMapMessage('{"type":"following","distance":12}')).toEqual({ type: 'following', distance: 12 });
    expect(parseMapMessage('{"type":"panned"}')).toBeNull();
    expect(parseMapMessage('{"type":"desconocido"}')).toBeNull();
    expect(parseMapMessage('no es json')).toBeNull();
  });
});
