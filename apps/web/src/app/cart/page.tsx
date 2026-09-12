'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface CartCustomization {
  id?: string;
  optionId?: string;
  choiceId?: string;
  optionName?: string;
  choiceName?: string;
  priceModifier?: number;
  option?: { id?: string; name?: string };
  choice?: { id?: string; name?: string; priceModifier?: number };
}

interface CartItem {
  id: string;
  productId: string;
  menuItemId?: string;
  quantity: number;
  price?: number;
  customizations?: CartCustomization[];
  product?: {
    id: string;
    name: string;
    price: number;
    currency: string;
    images: string[];
    brand: { id: string; name: string; slug: string };
  };
  menuItem?: {
    id: string;
    name: string;
    basePrice: number;
    currency: string;
    image: string | null;
    preparationTime: number;
    category: string | null;
  };
}

interface GroupedBrand {
  brandId: string;
  brandName: string;
  brandSlug: string;
  isFastFood?: boolean;
  items: CartItem[];
}

const FASTFOOD_GROUP = '__fastfood__';

const isMenuLine = (item: CartItem) => !item.product && !!item.menuItem;
const lineName = (item: CartItem) => isMenuLine(item) ? item.menuItem!.name : (item.product?.name || '');
const lineImage = (item: CartItem) => isMenuLine(item) ? (item.menuItem!.image || undefined) : item.product?.images?.[0];
const lineLink = (item: CartItem) => isMenuLine(item) ? '/menu' : `/products/${item.product?.id}`;
const lineUnitPrice = (item: CartItem) => isMenuLine(item)
  ? Number(item.price ?? item.menuItem!.basePrice)
  : Number(item.product?.price || 0);
const lineCurrency = (item: CartItem) => isMenuLine(item) ? item.menuItem!.currency : (item.product?.currency || 'USD');

export default function CartPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadCart();
  }, [user]);

  const loadCart = async () => {
    const res = await api.get<{ items: CartItem[] }>('/cart');
    if (res.ok && res.data) setItems(res.data.items || []);
    setLoading(false);
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    await api.patch(`/cart/items/${itemId}`, { quantity });
    loadCart();
  };

  const removeItem = async (itemId: string) => {
    await api.delete(`/cart/items/${itemId}`);
    loadCart();
  };

  const clearCart = async () => {
    await api.delete('/cart');
    loadCart();
  };

  const grouped: GroupedBrand[] = [];
  const brandMap = new Map<string, CartItem[]>();
  items.forEach((item) => {
    const brandId = isMenuLine(item) ? FASTFOOD_GROUP : item.product?.brand?.id;
    if (!brandId) return;
    if (!brandMap.has(brandId)) brandMap.set(brandId, []);
    brandMap.get(brandId)!.push(item);
  });
  brandMap.forEach((brandItems, brandId) => {
    const first = brandItems[0];
    const isFastFood = brandId === FASTFOOD_GROUP;
    grouped.push({
      brandId,
      brandName: isFastFood ? 'Menú Fast Food' : (first.product?.brand?.name || 'Sin marca'),
      brandSlug: isFastFood ? 'menu' : (first.product?.brand?.slug || ''),
      isFastFood,
      items: brandItems,
    });
  });

  const total = items.reduce((sum, i) => sum + lineUnitPrice(i) * i.quantity, 0);

  if (loading) return <p className={styles.loading}>Cargando carrito...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Carrito de compras</h1>
          {items.length > 0 && (
            <button onClick={clearCart} className={styles.clearBtn}>Vaciar carrito</button>
          )}
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <p>Tu carrito está vacío</p>
            <Link href="/brands" className={styles.shopBtn}>Ver marcas</Link>
          </div>
        ) : (
          <>
            {grouped.map((group) => (
              <div key={group.brandId} className={styles.group}>
                <Link href={group.isFastFood ? '/menu' : `/brands/${group.brandSlug}`} className={styles.storeHeader}>
                  {group.brandName}
                </Link>
                {group.items.map((item) => (
                  <div key={item.id} className={styles.item}>
                    <div
                      className={styles.itemImage}
                      style={lineImage(item) ? { backgroundImage: `url(${lineImage(item)})` } : undefined}
                    >
                      {!lineImage(item) && <span className={styles.imageFallback}>{isMenuLine(item) ? '🍔' : '❄️'}</span>}
                    </div>
                    <div className={styles.itemInfo}>
                      <Link href={lineLink(item)} className={styles.itemName}>
                        {lineName(item)}
                      </Link>
                      {isMenuLine(item) && item.customizations && item.customizations.length > 0 && (
                        <ul className={styles.customizations}>
                          {item.customizations.map((c, idx) => {
                            const optionName = c.optionName || c.option?.name;
                            const choiceName = c.choiceName || c.choice?.name;
                            return <li key={c.id || `${c.optionId}-${c.choiceId}-${idx}`}>
                              {optionName ? `${optionName}: ` : ''}{choiceName || ''}
                            </li>;
                          })}
                        </ul>
                      )}
                      <p className={styles.itemPrice}>
                        {lineCurrency(item)} {lineUnitPrice(item).toLocaleString()} c/u
                      </p>
                    </div>
                    <div className={styles.quantityControl}>
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className={styles.qtyBtn}>-</button>
                      <span className={styles.qty}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className={styles.qtyBtn}>+</button>
                    </div>
                    <p className={styles.subtotal}>
                      {lineCurrency(item)} {(lineUnitPrice(item) * item.quantity).toLocaleString()}
                    </p>
                    <button onClick={() => removeItem(item.id)} className={styles.removeBtn}>✕</button>
                  </div>
                ))}
              </div>
            ))}

            <div className={styles.footer}>
              <div className={styles.total}>
                <span>Total:</span>
                <span className={styles.totalAmount}>
                  {items[0] ? lineCurrency(items[0]) : 'USD'} {total.toLocaleString()}
                </span>
              </div>
              <Link href="/checkout" className={styles.checkoutBtn}>Proceder al pago</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
