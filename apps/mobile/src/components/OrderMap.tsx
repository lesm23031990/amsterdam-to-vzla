import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildOrderMapHtml, isValidLatLng, parseMapMessage, type LatLng } from '@/lib/mapHtml';

interface OrderMapProps {
  driverPos: LatLng | null;
  destinationLabel?: string | null;
}

/**
 * Mapa de seguimiento del repartidor: WebView con Leaflet + OpenStreetMap.
 * Replica el comportamiento de apps/web/src/components/OrderMap.tsx
 * (auto-centrado, botón "Centrar" tras paneo y fallback de espera).
 */
export default function OrderMap({ driverPos, destinationLabel }: OrderMapProps) {
  const webViewRef = useRef<WebView | null>(null);
  const [ready, setReady] = useState(false);
  const [showRecenter, setShowRecenter] = useState(false);
  const html = useMemo(() => buildOrderMapHtml(), []);

  const lat = driverPos?.lat ?? null;
  const lng = driverPos?.lng ?? null;

  useEffect(() => {
    if (!ready || lat === null || lng === null) return;
    webViewRef.current?.injectJavaScript(`window.setDriver(${lat}, ${lng}); true;`);
  }, [ready, lat, lng]);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    const message = parseMapMessage(event.nativeEvent.data);
    if (!message) return;

    if (message.type === 'ready') {
      setReady(true);
      return;
    }

    setShowRecenter(message.type === 'panned');
  };

  const handleRecenter = () => {
    webViewRef.current?.injectJavaScript('window.recenter(); true;');
    setShowRecenter(false);
  };

  const hasDriverPosition = isValidLatLng(driverPos);

  return (
    <View style={styles.wrapper}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.map}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={handleMessage}
      />

      {destinationLabel ? (
        <Text style={styles.destination} numberOfLines={1}>
          Entrega: {destinationLabel}
        </Text>
      ) : null}

      {!hasDriverPosition && (
        <View style={styles.fallback} pointerEvents="none">
          <Text style={styles.fallbackText}>Esperando ubicación del repartidor...</Text>
        </View>
      )}

      {showRecenter && hasDriverPosition && (
        <TouchableOpacity style={styles.recenter} onPress={handleRecenter} accessibilityRole="button">
          <Text style={styles.recenterText}>Centrar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  map: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  destination: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#374151',
  },
  fallback: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 231, 235, 0.85)',
  },
  fallbackText: {
    fontSize: 14,
    color: '#6B7280',
  },
  recenter: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#1E40AF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recenterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
