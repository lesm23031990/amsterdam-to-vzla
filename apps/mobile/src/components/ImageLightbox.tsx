import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ZOOM_SCALE = 2.5;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface ImageLightboxProps {
  images: string[];
  index?: number;
  visible: boolean;
  onClose: () => void;
}

/**
 * Galería a pantalla completa con swipe y doble toque para zoom.
 * Al hacer zoom la imagen se puede arrastrar dentro de los bordes.
 */
export default function ImageLightbox({ images, index = 0, visible, onClose }: ImageLightboxProps) {
  const [current, setCurrent] = useState(index);

  useEffect(() => {
    if (visible) setCurrent(index);
  }, [visible, index]);

  if (images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.header}>
          <Text style={styles.counter}>
            {images.length > 1 ? `${Math.min(current + 1, images.length)} / ${images.length}` : ''}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Cerrar galería"
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) =>
            setCurrent(Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH))
          }
        >
          {images.map((uri, i) => (
            <ZoomableImage key={`${uri}-${i}`} uri={uri} />
          ))}
        </ScrollView>

        <Text style={styles.hint}>Doble toque para zoom · desliza para ver más</Text>
      </View>
    </Modal>
  );
}

function ZoomableImage({ uri }: { uri: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const zoomed = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);

  const maxX = (SCREEN_WIDTH * (ZOOM_SCALE - 1)) / 2;
  const maxY = (SCREEN_HEIGHT * (ZOOM_SCALE - 1)) / 2;

  const animateTo = (nextScale: number, nextX: number, nextY: number) => {
    zoomed.current = nextScale > 1;
    offset.current = { x: nextX, y: nextY };
    Animated.parallel([
      Animated.spring(scale, { toValue: nextScale, useNativeDriver: true, friction: 8 }),
      Animated.spring(translate, { toValue: { x: nextX, y: nextY }, useNativeDriver: true, friction: 8 }),
    ]).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        zoomed.current && (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4),
      onPanResponderMove: (_event, gesture) => {
        translate.setValue({
          x: clamp(offset.current.x + gesture.dx, -maxX, maxX),
          y: clamp(offset.current.y + gesture.dy, -maxY, maxY),
        });
      },
      onPanResponderRelease: (_event, gesture) => {
        const x = clamp(offset.current.x + gesture.dx, -maxX, maxX);
        const y = clamp(offset.current.y + gesture.dy, -maxY, maxY);
        offset.current = { x, y };
        Animated.spring(translate, { toValue: { x, y }, useNativeDriver: true, friction: 8 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translate, {
          toValue: offset.current,
          useNativeDriver: true,
          friction: 8,
        }).start();
      },
    }),
  ).current;

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      if (zoomed.current) {
        animateTo(1, 0, 0);
      } else {
        animateTo(ZOOM_SCALE, 0, 0);
      }
      return;
    }
    lastTap.current = now;
  };

  return (
    <View style={styles.page} {...panResponder.panHandlers}>
      <TouchableWithoutFeedback
        onPress={handlePress}
        accessibilityRole="imagebutton"
        accessibilityLabel="Imagen ampliada. Doble toque para hacer zoom"
      >
        <Animated.Image
          source={{ uri }}
          resizeMode="contain"
          style={[
            styles.image,
            { transform: [{ scale }, { translateX: translate.x }, { translateY: translate.y }] },
          ]}
        />
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 8,
  },
  counter: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 160,
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 24,
  },
});
