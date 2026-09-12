'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { MenuItem, MenuOption, Customization, formatMenuPrice } from '@/lib/fastfood';
import styles from './MenuItemModal.module.css';

interface Props {
  item: MenuItem;
  onClose: () => void;
}

type Selection = Record<string, string | string[]>;

export default function MenuItemModal({ item, onClose }: Props) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [selection, setSelection] = useState<Selection>({});
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  const singleChoiceDefaults = useMemo(() => {
    const defaults: Selection = {};
    item.options?.forEach((opt) => {
      if (opt.type === 'single' && opt.required && opt.choices.length > 0) {
        defaults[opt.id] = opt.choices[0].id;
      }
    });
    return defaults;
  }, [item.options]);

  const activeSelection: Selection = { ...singleChoiceDefaults, ...selection };

  const toggleSingle = (optionId: string, choiceId: string) => {
    setSelection((prev) => ({ ...prev, [optionId]: choiceId }));
  };

  const toggleMultiple = (optionId: string, choiceId: string) => {
    setSelection((prev) => {
      const current = (prev[optionId] as string[]) || [];
      const next = current.includes(choiceId)
        ? current.filter((c) => c !== choiceId)
        : [...current, choiceId];
      return { ...prev, [optionId]: next };
    });
  };

  const unitModifier = useMemo(() => {
    let sum = 0;
    item.options?.forEach((opt) => {
      const val = activeSelection[opt.id];
      const ids = Array.isArray(val) ? val : val ? [val] : [];
      opt.choices.forEach((c) => {
        if (ids.includes(c.id)) sum += Number(c.priceModifier);
      });
    });
    return sum;
  }, [item.options, activeSelection]);

  const unitPrice = Number(item.basePrice) + unitModifier;
  const totalPrice = unitPrice * quantity;

  const validationError = useMemo(() => {
    const missing: string[] = [];
    item.options?.forEach((opt) => {
      if (!opt.required) return;
      const val = activeSelection[opt.id];
      const empty = Array.isArray(val) ? val.length === 0 : !val;
      if (empty) missing.push(opt.name);
    });
    if (missing.length > 0) {
      return `Selecciona una opción para: ${missing.join(', ')}`;
    }
    return '';
  }, [item.options, activeSelection]);

  const buildCustomizations = (): Customization[] => {
    const list: Customization[] = [];
    item.options?.forEach((opt) => {
      const val = activeSelection[opt.id];
      const ids = Array.isArray(val) ? val : val ? [val] : [];
      ids.forEach((choiceId) => list.push({ optionId: opt.id, choiceId }));
    });
    return list;
  };

  const handleAdd = async () => {
    if (!user) { window.location.href = '/login'; return; }
    if (validationError) { setError(validationError); return; }
    setError('');
    setAdding(true);
    const res = await api.post('/cart/items', {
      menuItemId: item.id,
      quantity,
      customizations: buildCustomizations(),
    });
    if (res.ok) {
      setAdded(true);
      setTimeout(() => onClose(), 1200);
    } else {
      setError(res.error || 'No se pudo agregar al carrito');
    }
    setAdding(false);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose} aria-label="Cerrar">✕</button>

        <div className={styles.body}>
          <div className={styles.left}>
            <div
              className={styles.image}
              style={item.image
                ? { backgroundImage: `url(${item.image})` }
                : { backgroundColor: '#E8EDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px' }}
            >
              {!item.image && '🍔'}
            </div>
          </div>

          <div className={styles.right}>
            {item.category && <span className={styles.category}>{item.category}</span>}
            <h2 className={styles.name}>{item.name}</h2>
            {item.preparationTime > 0 && (
              <span className={styles.time}>⏱ {item.preparationTime} min</span>
            )}
            {item.description && <p className={styles.desc}>{item.description}</p>}

            {item.options?.map((opt) => (
              <OptionGroup
                key={opt.id}
                option={opt}
                selection={activeSelection}
                currency={item.currency}
                onSingle={toggleSingle}
                onMultiple={toggleMultiple}
              />
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.qtyControl}>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className={styles.qtyBtn}>-</button>
            <span className={styles.qty}>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className={styles.qtyBtn}>+</button>
          </div>

          <div className={styles.priceBlock}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.total}>{formatMenuPrice(totalPrice, item.currency)}</span>
          </div>

          <button
            onClick={handleAdd}
            className={`${styles.addBtn} ${added ? styles.added : ''}`}
            disabled={adding || added}
          >
            {added ? '✓ Agregado' : adding ? 'Agregando...' : 'Agregar al carrito'}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

interface OptionGroupProps {
  option: MenuOption;
  selection: Selection;
  currency: string;
  onSingle: (optionId: string, choiceId: string) => void;
  onMultiple: (optionId: string, choiceId: string) => void;
}

function OptionGroup({ option, selection, currency, onSingle, onMultiple }: OptionGroupProps) {
  const value = selection[option.id];

  return (
    <div className={styles.optionGroup}>
      <div className={styles.optionHeader}>
        <span className={styles.optionName}>{option.name}</span>
        {option.required
          ? <span className={styles.required}>Obligatorio</span>
          : <span className={styles.optional}>Opcional</span>}
      </div>

      {option.choices.map((choice) => {
        const isSelected = option.type === 'single'
          ? value === choice.id
          : Array.isArray(value) && value.includes(choice.id);

        return (
          <label
            key={choice.id}
            className={`${styles.choice} ${isSelected ? styles.choiceSelected : ''}`}
          >
            <input
              type={option.type === 'single' ? 'radio' : 'checkbox'}
              name={option.id}
              checked={isSelected}
              onChange={() => (option.type === 'single'
                ? onSingle(option.id, choice.id)
                : onMultiple(option.id, choice.id))}
            />
            <span className={styles.choiceName}>{choice.name}</span>
            {Number(choice.priceModifier) > 0 && (
              <span className={styles.modifier}>+{formatMenuPrice(Number(choice.priceModifier), currency)}</span>
            )}
            {Number(choice.priceModifier) < 0 && (
              <span className={styles.modifierNegative}>{formatMenuPrice(Number(choice.priceModifier), currency)}</span>
            )}
          </label>
        );
      })}
    </div>
  );
}
