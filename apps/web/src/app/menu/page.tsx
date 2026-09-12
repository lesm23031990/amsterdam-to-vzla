'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { MenuItem, formatMenuPrice } from '@/lib/fastfood';
import MenuItemModal from '@/components/MenuItemModal';
import styles from './page.module.css';

const CATEGORY_ICONS: Record<string, string> = {
  hamburguesas: '🍔',
  pollo: '🍗',
  papas: '🍟',
  bebidas: '🥤',
  postres: '🍰',
  combos: '🍱',
  desayunos: '🍳',
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    api.get<MenuItem[]>('/fastfood/menu').then((res) => {
      if (res.ok && res.data) setItems(res.data);
      setLoading(false);
    });
  }, []);

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];
  const visible = categoryFilter ? items.filter((i) => i.category === categoryFilter) : items;

  const handleSelect = (item: MenuItem) => {
    setSelected(item);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Menú Fast Food</h1>
          <p>Elige tu favorito, personalízalo y agrégalo al carrito</p>
        </div>

        {categories.length > 0 && (
          <div className={styles.chips}>
            <button
              className={`${styles.chip} ${!categoryFilter ? styles.chipActive : ''}`}
              onClick={() => setCategoryFilter('')}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`${styles.chip} ${categoryFilter === c ? styles.chipActive : ''}`}
                onClick={() => setCategoryFilter(c)}
              >
                {CATEGORY_ICONS[c.toLowerCase()] || '🍽️'} {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeleton}>
                <div className={styles.skelImg} />
                <div className={styles.skelLine} style={{ width: '70%' }} />
                <div className={styles.skelLine} style={{ width: '40%' }} />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.empty}>
            <p>🍽️ No hay elementos en el menú todavía</p>
            <button onClick={() => setCategoryFilter('')}>Ver todo el menú</button>
          </div>
        ) : (
          <div className={styles.grid}>
            {visible.map((item) => (
              <button key={item.id} className={styles.card} onClick={() => handleSelect(item)}>
                <div className={styles.imgWrap}>
                  <div
                    className={styles.img}
                    style={item.image
                      ? { backgroundImage: `url(${item.image})` }
                      : { backgroundColor: '#E8EDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}
                  >
                    {!item.image && (CATEGORY_ICONS[(item.category || '').toLowerCase()] || '🍔')}
                  </div>
                  {item.preparationTime > 0 && (
                    <span className={styles.timeBadge}>⏱ {item.preparationTime} min</span>
                  )}
                </div>
                <div className={styles.info}>
                  {item.category && <span className={styles.category}>{item.category}</span>}
                  <span className={styles.name}>{item.name}</span>
                  {item.description && <p className={styles.desc}>{item.description}</p>}
                  <div className={styles.priceRow}>
                    <span className={styles.price}>{formatMenuPrice(Number(item.basePrice), item.currency)}</span>
                    {item.options?.length > 0 && <span className={styles.customizable}>Personalizable</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <MenuItemModal item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
