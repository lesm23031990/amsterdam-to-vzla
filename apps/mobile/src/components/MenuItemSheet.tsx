import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PricingOption } from '@/lib/menuPricing';

interface MenuItemSheetProps {
  visible: boolean;
  name: string;
  currency: string;
  options: PricingOption[];
  selected: Record<string, string[]>;
  quantity: number;
  total: number;
  adding: boolean;
  formatMoney: (amount: number, currency: string) => string;
  onToggleChoice: (option: PricingOption, choiceId: string) => void;
  onQuantityChange: (next: number) => void;
  onClose: () => void;
  onAdd: () => void;
}

/**
 * Bottom sheet de personalización de un MenuItem: opciones, cantidad y CTA
 * con el total actualizado. Se abre desde la barra inferior del detalle.
 */
export default function MenuItemSheet({
  visible,
  name,
  currency,
  options,
  selected,
  quantity,
  total,
  adding,
  formatMoney,
  onToggleChoice,
  onQuantityChange,
  onClose,
  onAdd,
}: MenuItemSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar personalización"
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>Personaliza tu pedido</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{name}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {options.length === 0 && (
              <Text style={styles.emptyText}>Este platillo no tiene opciones de personalización.</Text>
            )}

            {options.map((option) => (
              <View key={option.id} style={styles.optionCard}>
                <View style={styles.optionHeader}>
                  <Text style={styles.optionName}>{option.name}</Text>
                  <Text style={styles.optionType}>
                    {option.required
                      ? 'Obligatorio'
                      : option.type === 'single'
                        ? 'Elige 1'
                        : 'Elige varios'}
                  </Text>
                </View>
                {option.choices.map((choice) => {
                  const isChecked = (selected[option.id] || []).includes(choice.id);
                  return (
                    <TouchableOpacity
                      key={choice.id}
                      style={styles.choiceRow}
                      onPress={() => onToggleChoice(option, choice.id)}
                      accessibilityRole={option.type === 'single' ? 'radio' : 'checkbox'}
                      accessibilityState={{ checked: isChecked }}
                    >
                      <Ionicons
                        name={
                          option.type === 'single'
                            ? isChecked
                              ? 'radio-button-on'
                              : 'radio-button-off'
                            : isChecked
                              ? 'checkbox'
                              : 'square-outline'
                        }
                        size={20}
                        color={isChecked ? '#1E40AF' : '#9CA3AF'}
                      />
                      <Text style={[styles.choiceName, isChecked && styles.choiceNameSelected]}>
                        {choice.name}
                      </Text>
                      {(choice.priceModifier || 0) > 0 && (
                        <Text style={styles.choicePrice}>
                          +{formatMoney(choice.priceModifier || 0, currency)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            <View style={styles.quantityCard}>
              <Text style={styles.quantityLabel}>Cantidad</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar una unidad"
                >
                  <Ionicons name="remove" size={20} color="#1E40AF" />
                </TouchableOpacity>
                <Text style={styles.quantity}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => onQuantityChange(quantity + 1)}
                  accessibilityRole="button"
                  accessibilityLabel="Agregar una unidad"
                >
                  <Ionicons name="add" size={20} color="#1E40AF" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatMoney(total, currency)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, adding && styles.addButtonDisabled]}
              onPress={onAdd}
              disabled={adding}
              accessibilityRole="button"
              accessibilityLabel="Agregar al carrito"
            >
              {adding ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Agregar al carrito</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    paddingVertical: 12,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  optionType: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  choiceName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  choiceNameSelected: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  choicePrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  quantityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginTop: 6,
  },
  quantityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
    color: '#111827',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalBox: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  addButton: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    paddingVertical: 14,
  },
  addButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

