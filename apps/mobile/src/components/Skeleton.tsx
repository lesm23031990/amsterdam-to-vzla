import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface SkeletonBlockProps {
  style?: StyleProp<ViewStyle>;
  radius?: number;
}

/** Bloque gris con pulso suave para estados de carga. */
export function SkeletonBlock({ style, radius = 8 }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, { opacity, borderRadius: radius }, style]} />;
}

/** Placeholder del detalle de producto: hero, info y tabs. */
export function ProductDetailSkeleton() {
  return (
    <View
      style={styles.screen}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando producto"
    >
      <SkeletonBlock style={styles.hero} radius={0} />
      <View style={styles.card}>
        <SkeletonBlock style={styles.badge} />
        <SkeletonBlock style={styles.title} />
        <SkeletonBlock style={styles.lineShort} />
        <SkeletonBlock style={styles.price} />
        <SkeletonBlock style={styles.lineShort} />
      </View>
      <View style={styles.tabs}>
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} style={styles.tab} />
        ))}
      </View>
      <View style={styles.card}>
        <SkeletonBlock style={styles.line} />
        <SkeletonBlock style={styles.line} />
        <SkeletonBlock style={styles.lineShort} />
      </View>
    </View>
  );
}

/** Placeholder del detalle de MenuItem: hero, título y tarjetas de opciones. */
export function MenuItemDetailSkeleton() {
  return (
    <View
      style={styles.screen}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando platillo"
    >
      <SkeletonBlock style={styles.hero} radius={0} />
      <View style={styles.card}>
        <SkeletonBlock style={styles.title} />
        <SkeletonBlock style={styles.lineShort} />
        <SkeletonBlock style={styles.line} />
      </View>
      <View style={styles.card}>
        <SkeletonBlock style={styles.lineShort} />
        <SkeletonBlock style={styles.line} />
      </View>
    </View>
  );
}

/** Placeholder de la lista de comentarios. */
export function CommentsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Cargando comentarios">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.commentCard}>
          <View style={styles.commentHeader}>
            <SkeletonBlock style={styles.avatar} radius={18} />
            <SkeletonBlock style={styles.lineShort} />
          </View>
          <SkeletonBlock style={styles.line} />
          <SkeletonBlock style={styles.line} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#E5E7EB',
  },
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  hero: {
    width: '100%',
    height: 260,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 12,
    gap: 10,
  },
  badge: {
    width: 90,
    height: 18,
    borderRadius: 9,
  },
  title: {
    width: '80%',
    height: 24,
  },
  line: {
    width: '100%',
    height: 14,
  },
  lineShort: {
    width: '55%',
    height: 14,
  },
  price: {
    width: 120,
    height: 26,
    marginTop: 6,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    flex: 1,
    height: 32,
    borderRadius: 16,
  },
  commentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
  },
});
