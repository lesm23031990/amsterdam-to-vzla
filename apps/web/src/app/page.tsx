'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Store {
  id: string; name: string; slug: string; description?: string;
  category?: string; coverImage?: string; logoImage?: string;
}

const categories = [
  { id: 'comida', label: 'Comida', emoji: '🍽️' },
  { id: 'bebida', label: 'Bebidas', emoji: '🥤' },
  { id: 'ropa', label: 'Ropa', emoji: '👕' },
  { id: 'electronica', label: 'Electrónica', emoji: '📱' },
  { id: 'hogar', label: 'Hogar', emoji: '🏠' },
  { id: 'artesania', label: 'Artesanía', emoji: '🎨' },
]

export default function Home() {
  const { user } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  useEffect(() => {
    api.get<Store[]>('/stores').then((res) => {
      if (res.ok && res.data) setStores(res.data)
      setLoading(false)
    })
  }, [])

  const filtered = stores.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !selectedCategory || s.category === selectedCategory
    return matchSearch && matchCategory
  })

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}></div>
          <h1 className={styles.heroTitle}>
            San Cristóbal<span className={styles.heroAccent}> en tu mesa</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Descubre los sabores, productos y servicios de las mejores tiendas locales.
            Todo desde un solo lugar. 🚀
          </p>
          <div className={styles.heroSearch}>
            <input
              type="text"
              placeholder="¿Qué antojo tienes hoy?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.heroInput}
            />
            <Link href="/stores" className={styles.heroBtn}>Explorar</Link>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{stores.length}</span>
              <span className={styles.statLabel}>Tiendas</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>100+</span>
              <span className={styles.statLabel}>Productos</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>24/7</span>
              <span className={styles.statLabel}>Delivery</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.categoriesSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Categorías</h2>
          <p className={styles.sectionSub}>Encuentra lo que buscas</p>
          <div className={styles.categoriesGrid}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                className={`${styles.categoryCard} ${selectedCategory === cat.id ? styles.categoryActive : ''}`}
              >
                <span className={styles.categoryEmoji}>{cat.emoji}</span>
                <span className={styles.categoryLabel}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.storesSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Tiendas destacadas</h2>
              <p className={styles.sectionSub}>
                {selectedCategory
                  ? `Mostrando ${filtered.length} tienda(s) en esta categoría`
                  : 'Las mejores tiendas de San Cristóbal'}
              </p>
            </div>
            <Link href="/stores" className={styles.seeAll}>Ver todas →</Link>
          </div>

          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner} />
              <p>Buscando las mejores tiendas...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyEmoji}>🔍</span>
              <h3>No encontramos tiendas</h3>
              <p>Intenta con otra búsqueda o categoría</p>
            </div>
          ) : (
            <div className={styles.storeGrid}>
              {filtered.slice(0, 6).map((store, i) => (
                <Link
                  href={`/stores/${store.slug}`}
                  key={store.id}
                  className={styles.storeCard}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className={styles.storeCover}>
                    <div
                      className={styles.storeImage}
                      style={{ backgroundImage: `url(${store.coverImage || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600'})` }}
                    />
                    {store.category && (
                      <span className={styles.storeCategory}>
                        {categories.find(c => c.id === store.category)?.emoji} {store.category}
                      </span>
                    )}
                  </div>
                  <div className={styles.storeBody}>
                    <h3 className={styles.storeName}>{store.name}</h3>
                    <p className={styles.storeDesc}>{store.description?.slice(0, 80)}...</p>
                    <span className={styles.storeLink}>Ver tienda →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={styles.featuresSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>¿Por qué amsterdamToVzla?</h2>
          <p className={styles.sectionSub}>La mejor forma de comprar en San Cristóbal</p>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🛒</span>
              <h3>Carrito Universal</h3>
              <p>Compra de varias tiendas en un solo carrito. Un pago, un delivery.</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🚚</span>
              <h3>Delivery en vivo</h3>
              <p>Rastrea tu pedido en tiempo real con mapa interactivo.</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>💳</span>
              <h3>Múltiples formas de pago</h3>
              <p>Binance Pay, efectivo o transferencia. Tú eliges.</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🤖</span>
              <h3>Asistente IA</h3>
              <p>¿Dudas? Nuestro asistente inteligente te ayuda al instante.</p>
            </div>
          </div>
        </div>
      </section>

      {!user && (
        <section className={styles.ctaSection}>
          <div className={styles.sectionInner}>
            <div className={styles.ctaContent}>
              <h2 className={styles.ctaTitle}>¿Tienes un negocio en San Cristóbal?</h2>
              <p className={styles.ctaText}>Llega a más clientes, gestiona tus pedidos y haz crecer tu negocio.</p>
              <div className={styles.ctaButtons}>
                <Link href="/register" className={styles.ctaPrimary}>Crear cuenta de tienda</Link>
                <Link href="/stores" className={styles.ctaSecondary}>Explorar como cliente</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className={styles.instagramSection}>
        <div className={styles.sectionInner}>
          <div className={styles.instaGrid}>
            <div className={styles.instaItem} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400)' }} />
            <div className={styles.instaItem} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400)' }} />
            <div className={styles.instaItem} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400)' }} />
            <div className={styles.instaItem} style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400)' }} />
          </div>
        </div>
      </section>
    </div>
  )
}
