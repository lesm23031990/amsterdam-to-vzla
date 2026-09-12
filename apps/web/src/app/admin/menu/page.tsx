'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { MenuItem, formatMenuPrice } from '@/lib/fastfood';
import styles from './page.module.css';

interface DraftChoice {
  key: string;
  name: string;
  priceModifier: string;
}

interface DraftOption {
  key: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  choices: DraftChoice[];
}

interface FormState {
  name: string;
  description: string;
  basePrice: string;
  currency: string;
  category: string;
  image: string;
  preparationTime: string;
}

const EMPTY_FORM: FormState = {
  name: '', description: '', basePrice: '', currency: 'USD', category: '', image: '', preparationTime: '10',
};

let localKey = 0;
const nextKey = () => `draft-${Date.now()}-${localKey++}`;

const newDraftOption = (): DraftOption => ({
  key: nextKey(),
  name: '',
  type: 'single',
  required: false,
  choices: [{ key: nextKey(), name: '', priceModifier: '0' }],
});

export default function AdminMenuPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/'); return; }
    loadItems();
  }, [user]);

  const loadItems = useCallback(async () => {
    const res = await api.get<MenuItem[]>('/fastfood/menu');
    if (res.ok && res.data) setItems(res.data);
    setLoading(false);
  }, []);

  const toggleAvailability = async (item: MenuItem) => {
    const res = await api.patch<MenuItem>(`/fastfood/menu/${item.id}`, { isAvailable: !item.isAvailable });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i)));
    }
  };

  const removeItem = async (item: MenuItem) => {
    if (!window.confirm(`¿Eliminar "${item.name}" del menú? Esta acción no se puede deshacer.`)) return;
    const res = await api.delete(`/fastfood/menu/${item.id}`);
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  if (loading) return <p className={styles.loading}>Cargando menú...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Menú Fast Food</h1>
            <p className={styles.subtitle}>Gestiona los elementos del menú y sus opciones de personalización</p>
          </div>
          <button className={styles.createBtn} onClick={() => setEditing('new')}>
            + Nuevo elemento
          </button>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>No hay elementos en el menú</p>
            <button onClick={() => setEditing('new')}>Crear el primero</button>
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Elemento</span>
              <span>Categoría</span>
              <span>Precio base</span>
              <span>Preparación</span>
              <span>Opciones</span>
              <span>Disponible</span>
              <span>Acciones</span>
            </div>
            {items.map((item) => (
              <div key={item.id} className={styles.tableRow}>
                <span className={styles.itemName}>
                  {item.image && <img src={item.image} alt="" className={styles.thumb} />}
                  {item.name}
                </span>
                <span>{item.category || '—'}</span>
                <span>{formatMenuPrice(Number(item.basePrice), item.currency)}</span>
                <span>{item.preparationTime > 0 ? `${item.preparationTime} min` : '—'}</span>
                <span>{item.options?.length || 0} grupo(s)</span>
                <span>
                  <button
                    className={`${styles.toggle} ${item.isAvailable ? styles.toggleOn : ''}`}
                    onClick={() => toggleAvailability(item)}
                    aria-label="Cambiar disponibilidad"
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </span>
                <span className={styles.actions}>
                  <button className={styles.editBtn} onClick={() => setEditing(item)}>Editar</button>
                  <button className={styles.deleteBtn} onClick={() => removeItem(item)}>Eliminar</button>
                </span>
              </div>
            ))}
          </div>
        )}

        <p className={styles.notice}>
          ⚠️ El endpoint público solo devuelve elementos disponibles: los elementos que desactives
          dejarán de mostrarse aquí hasta que recargues, hasta que el backend exponga un listado admin completo.
        </p>
      </div>

      {editing && (
        <ItemFormModal
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadItems(); }}
        />
      )}
    </div>
  );
}

interface ItemFormModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function ItemFormModal({ item, onClose, onSaved }: ItemFormModalProps) {
  const isEdit = !!item;
  const [form, setForm] = useState<FormState>({
    name: item?.name || '',
    description: item?.description || '',
    basePrice: item ? String(item.basePrice) : '',
    currency: item?.currency || 'USD',
    category: item?.category || '',
    image: item?.image || '',
    preparationTime: item ? String(item.preparationTime) : '10',
  });
  const [options, setOptions] = useState<DraftOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateOption = (key: string, updates: Partial<DraftOption>) =>
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, ...updates } : o)));

  const removeOption = (key: string) =>
    setOptions((prev) => prev.filter((o) => o.key !== key));

  const addChoice = (key: string) =>
    setOptions((prev) => prev.map((o) => (
      o.key === key ? { ...o, choices: [...o.choices, { key: nextKey(), name: '', priceModifier: '0' }] } : o
    )));

  const updateChoice = (optKey: string, choiceKey: string, updates: Partial<DraftChoice>) =>
    setOptions((prev) => prev.map((o) => (
      o.key === optKey
        ? { ...o, choices: o.choices.map((c) => (c.key === choiceKey ? { ...c, ...updates } : c)) }
        : o
    )));

  const removeChoice = (optKey: string, choiceKey: string) =>
    setOptions((prev) => prev.map((o) => (
      o.key === optKey ? { ...o, choices: o.choices.filter((c) => c.key !== choiceKey) } : o
    )));

  const validOptions = options.filter((o) => o.name.trim() && o.choices.some((c) => c.name.trim()));

  const handleSave = async () => {
    if (!form.name.trim()) { setError('El nombre es requerido'); return; }
    const price = parseFloat(form.basePrice);
    if (isNaN(price) || price <= 0) { setError('El precio base debe ser un número mayor a 0'); return; }
    setError('');
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      basePrice: price,
      currency: form.currency,
      category: form.category.trim() || null,
      image: form.image.trim() || null,
      preparationTime: parseInt(form.preparationTime, 10) || 0,
    };

    let targetId = item?.id;
    if (isEdit && targetId) {
      const res = await api.patch<MenuItem>(`/fastfood/menu/${targetId}`, payload);
      if (!res.ok) { setError(res.error || 'Error al guardar'); setSaving(false); return; }
    } else {
      const res = await api.post<MenuItem>('/fastfood/menu', payload);
      if (!res.ok || !res.data) { setError(res.error || 'Error al crear'); setSaving(false); return; }
      targetId = res.data.id;
    }

    for (const opt of validOptions) {
      const res = await api.post(`/fastfood/menu/${targetId}/options`, {
        name: opt.name.trim(),
        type: opt.type,
        required: opt.required,
        choices: opt.choices
          .filter((c) => c.name.trim())
          .map((c) => ({ name: c.name.trim(), priceModifier: parseFloat(c.priceModifier) || 0 })),
      });
      if (!res.ok) { setError(`Elemento guardado, pero falló la opción "${opt.name}": ${res.error}`); setSaving(false); return; }
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{isEdit ? `Editar: ${item?.name}` : 'Nuevo elemento del menú'}</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label>Nombre *</label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Hamburguesa clásica" />
            </div>
            <div className={styles.field}>
              <label>Categoría</label>
              <input value={form.category} onChange={(e) => setField('category', e.target.value)} placeholder="hamburguesas" />
            </div>
          </div>

          <div className={styles.field}>
            <label>Descripción</label>
            <textarea rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Ingredientes, presentación..." />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label>Precio base *</label>
              <input type="number" min="0" step="0.01" value={form.basePrice} onChange={(e) => setField('basePrice', e.target.value)} placeholder="5.50" />
            </div>
            <div className={styles.field}>
              <label>Moneda</label>
              <select value={form.currency} onChange={(e) => setField('currency', e.target.value)}>
                <option value="USD">USD</option>
                <option value="COP">COP</option>
                <option value="Bs">Bs</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Tiempo de preparación (min)</label>
              <input type="number" min="0" value={form.preparationTime} onChange={(e) => setField('preparationTime', e.target.value)} />
            </div>
          </div>

          <div className={styles.field}>
            <label>URL de imagen</label>
            <input value={form.image} onChange={(e) => setField('image', e.target.value)} placeholder="https://..." />
          </div>

          {/* Option builder */}
          <div className={styles.builder}>
            <div className={styles.builderHeader}>
              <h3>Opciones de personalización</h3>
              <button className={styles.addOptionBtn} onClick={() => setOptions((prev) => [...prev, newDraftOption()])}>
                + Agregar grupo
              </button>
            </div>

            {isEdit && item && item.options?.length > 0 && (
              <div className={styles.existingOptions}>
                <span>Opciones actuales:</span>
                {item.options.map((o) => (
                  <span key={o.id} className={styles.existingChip}>
                    {o.name} ({o.type === 'single' ? 'una' : 'varias'}{o.required ? ', obligatoria' : ''}): {o.choices.map((c) => c.name).join(', ')}
                  </span>
                ))}
              </div>
            )}

            {options.length === 0 ? (
              <p className={styles.builderEmpty}>Sin grupos nuevos. Usa &quot;+ Agregar grupo&quot; para permitir personalizar este elemento.</p>
            ) : (
              options.map((opt) => (
                <div key={opt.key} className={styles.optionCard}>
                  <div className={styles.optionCardHeader}>
                    <input
                      className={styles.optionNameInput}
                      value={opt.name}
                      onChange={(e) => updateOption(opt.key, { name: e.target.value })}
                      placeholder="Nombre del grupo (ej: Tamaño)"
                    />
                    <select
                      value={opt.type}
                      onChange={(e) => updateOption(opt.key, { type: e.target.value as 'single' | 'multiple' })}
                    >
                      <option value="single">Selección única</option>
                      <option value="multiple">Selección múltiple</option>
                    </select>
                    <label className={styles.requiredToggle}>
                      <input
                        type="checkbox"
                        checked={opt.required}
                        onChange={(e) => updateOption(opt.key, { required: e.target.checked })}
                      />
                      Obligatoria
                    </label>
                    <button className={styles.removeOptionBtn} onClick={() => removeOption(opt.key)} aria-label="Quitar grupo">✕</button>
                  </div>

                  {opt.choices.map((choice) => (
                    <div key={choice.key} className={styles.choiceRow}>
                      <input
                        value={choice.name}
                        onChange={(e) => updateChoice(opt.key, choice.key, { name: e.target.value })}
                        placeholder="Opción (ej: Grande)"
                      />
                      <div className={styles.modifierWrap}>
                        <span>+</span>
                        <input
                          type="number"
                          step="0.01"
                          value={choice.priceModifier}
                          onChange={(e) => updateChoice(opt.key, choice.key, { priceModifier: e.target.value })}
                          title="Modificador de precio"
                        />
                      </div>
                      <button
                        className={styles.removeChoiceBtn}
                        onClick={() => removeChoice(opt.key, choice.key)}
                        disabled={opt.choices.length <= 1}
                        aria-label="Quitar opción"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <button className={styles.addChoiceBtn} onClick={() => addChoice(opt.key)}>+ Agregar opción</button>
                </div>
              ))
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>Cancelar</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear elemento'}
          </button>
        </div>
      </div>
    </div>
  );
}
