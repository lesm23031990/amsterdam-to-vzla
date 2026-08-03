'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    currency: string;
    images: string[];
    store: { id: string; name: string; slug: string };
  };
}

interface GroupedStore {
  storeId: string;
  storeName: string;
  storeSlug: string;
  items: CartItem[];
}

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

  const grouped: GroupedStore[] = [];
  const storeMap = new Map<string, CartItem[]>();
  items.forEach((item) => {
    const storeId = item.product.store.id;
    if (!storeMap.has(storeId)) storeMap.set(storeId, []);
    storeMap.get(storeId)!.push(item);
  });
  storeMap.forEach((storeItems, storeId) => {
    const first = storeItems[0];
    grouped.push({
      storeId,
      storeName: first.product.store.name,
      storeSlug: first.product.store.slug,
      items: storeItems,
    });
  });

  const total = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);

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
            <Link href="/stores" className={styles.shopBtn}>Ir a tiendas</Link>
          </div>
        ) : (
          <>
            {grouped.map((group) => (
              <div key={group.storeId} className={styles.group}>
                <Link href={`/stores/${group.storeSlug}`} className={styles.storeHeader}>
                  {group.storeName}
                </Link>
                {group.items.map((item) => (
                  <div key={item.id} className={styles.item}>
                    <div
                      className={styles.itemImage}
                      style={{ backgroundImage: item.product.images?.[0] ? `url(${item.product.images[0]})` : undefined }}
                    />
                    <div className={styles.itemInfo}>
                      <Link href={`/products/${item.product.id}`} className={styles.itemName}>
                        {item.product.name}
                      </Link>
                      <p className={styles.itemPrice}>
                        {item.product.currency} {Number(item.product.price).toLocaleString()} c/u
                      </p>
                    </div>
                    <div className={styles.quantityControl}>
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className={styles.qtyBtn}>-</button>
                      <span className={styles.qty}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className={styles.qtyBtn}>+</button>
                    </div>
                    <p className={styles.subtotal}>
                      {item.product.currency} {(Number(item.product.price) * item.quantity).toLocaleString()}
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
                  {items[0]?.product.currency || 'USD'} {total.toLocaleString()}
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
