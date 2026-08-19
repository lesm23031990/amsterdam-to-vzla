'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { api } from '@/lib/api';
import styles from './page.module.css';

interface Product {
  id: string; name: string; price: number; priceCop: number; currency: string;
  displayPrice: string; discountPrice: number | null; displayDiscountPrice: string | null;
  description?: string; category?: string; images: string[]; stock: number;
  isFeatured: boolean; hasDiscount: boolean; discountPercent: number;
  brand?: { name: string; slug: string; logoImage: string | null };
}

interface Category { name: string; count: number }
interface Brand { id: string; name: string; slug: string; logoImage: string | null }

const tabs = [
  { key: 'all', label: 'Todos' },
  { key: 'featured', label: 'Productos Destacados' },
  { key: 'offers', label: 'Ofertas' },
];

export default function ProductsPage() {
  const { user } = useAuth();
  const { currency, formatPrice } = useCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tab = searchParams.get('tab') || 'all';
  const categoryFilter = searchParams.get('category') || '';
  const brandFilter = searchParams.get('brand') || '';
  const searchQuery = searchParams.get('q') || '';
  const orderBy = searchParams.get('orderBy') || 'relevance';
  const inStock = searchParams.get('inStock') === 'true';
  const page = parseInt(searchParams.get('page') || '1');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});
  const [total, setTotal] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const pageSize = 24;

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    });
    params.set('page', '1');
    router.push(`/products?${params.toString()}`);
  }, [searchParams, router]);

  useEffect(() => {
    setLoading(true);
    const query: Record<string, string> = { page: String(page), perPage: String(pageSize), currency };
    if (tab === 'featured') query.featured = 'true';
    if (tab === 'offers') query.discount = 'true';
    if (categoryFilter) query.category = categoryFilter;
    if (brandFilter) query.brand = brandFilter;
    if (searchQuery) query.q = searchQuery;
    if (orderBy) query.orderBy = orderBy;
    if (inStock) query.inStock = 'true';

    const qs = Object.entries(query).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

    Promise.all([
      api.get<Product[]>(`/products?${qs}`),
      api.get<{ categories: Category[] }>('/products/categories'),
      api.get<Brand[]>('/brands'),
    ]).then(([productsRes, categoriesRes, brandsRes]) => {
      if (productsRes.ok && productsRes.data) {
        setProducts(productsRes.data);
        setTotal(productsRes.pagination?.total || 0);
        setHasMore(productsRes.data.length === pageSize);
      }
      if (categoriesRes.ok && categoriesRes.data) setCategories(categoriesRes.data.categories);
      if (brandsRes.ok && brandsRes.data) setBrands(brandsRes.data);
      setLoading(false);
    });
  }, [tab, categoryFilter, brandFilter, searchQuery, orderBy, inStock, page, currency]);

  const handleQuickAdd = async (productId: string) => {
    if (!user) { window.location.href = '/login'; return; }
    const res = await api.post('/cart/items', { productId, quantity: 1 });
    if (res.ok) {
      setAddedToCart(prev => ({ ...prev, [productId]: true }));
      setTimeout(() => setAddedToCart(prev => ({ ...prev, [productId]: false })), 2000);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className={styles.page}>
      {/* Mobile filter toggle */}
      <div className={styles.mobileFilterBar}>
        <button className={styles.filterToggle} onClick={() => setFiltersOpen(true)}>
          ⚙️ Filtros
        </button>
        <div className={styles.mobileTabs}>
          {tabs.map(t => (
            <button
              key={t.key}
              className={`${styles.mobileTab} ${tab === t.key ? styles.mobileTabActive : ''}`}
              onClick={() => updateParams({ tab: t.key })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.layout}>
        {/* Sidebar Filters */}
        <aside className={`${styles.sidebar} ${filtersOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <h3>Filtros</h3>
            <button className={styles.closeSidebar} onClick={() => setFiltersOpen(false)}>✕</button>
          </div>

          {/* Categories */}
          <div className={styles.filterSection}>
            <h4>Categorías</h4>
            <button
              className={`${styles.filterChip} ${!categoryFilter ? styles.filterChipActive : ''}`}
              onClick={() => updateParams({ category: '' })}
            >
              Todas ({total})
            </button>
            {categories.map(c => (
              <button
                key={c.name}
                className={`${styles.filterChip} ${categoryFilter === c.name ? styles.filterChipActive : ''}`}
                onClick={() => updateParams({ category: c.name })}
              >
                {c.name.charAt(0).toUpperCase() + c.name.slice(1)} ({c.count})
              </button>
            ))}
          </div>

          {/* Brands */}
          <div className={styles.filterSection}>
            <h4>Marca</h4>
            <button
              className={`${styles.filterChip} ${!brandFilter ? styles.filterChipActive : ''}`}
              onClick={() => updateParams({ brand: '' })}
            >
              Todas
            </button>
            {brands.map(b => (
              <button
                key={b.id}
                className={`${styles.filterChip} ${brandFilter === b.slug ? styles.filterChipActive : ''}`}
                onClick={() => updateParams({ brand: b.slug })}
              >
                {b.name}
              </button>
            ))}
          </div>

          {/* Order */}
          <div className={styles.filterSection}>
            <h4>Ordenar por</h4>
            <select
              className={styles.orderSelect}
              value={orderBy}
              onChange={(e) => updateParams({ orderBy: e.target.value })}
            >
              <option value="relevance">Relevancia</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
              <option value="newest">Más recientes</option>
              <option value="name_asc">Nombre A-Z</option>
            </select>
          </div>

          {/* Stock */}
          <div className={styles.filterSection}>
            <label className={styles.stockToggle}>
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => updateParams({ inStock: e.target.checked ? 'true' : null })}
              />
              Solo con stock disponible
            </label>
          </div>

          {/* Clear */}
          <button
            className={styles.clearFilters}
            onClick={() => { updateParams({ category: '', brand: '', orderBy: '', inStock: '', tab: 'all' }); }}
          >
            Limpiar filtros
          </button>
        </aside>

        {/* Overlay for mobile */}
        {filtersOpen && <div className={styles.sidebarOverlay} onClick={() => setFiltersOpen(false)} />}

        {/* Main Content */}
        <main className={styles.main}>
          {/* Desktop tabs */}
          <div className={styles.desktopTabs}>
            {tabs.map(t => (
              <button
                key={t.key}
                className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
                onClick={() => updateParams({ tab: t.key })}
              >
                {t.key === 'featured' && '⭐ '}{t.key === 'offers' && '🔥 '}{t.label}
              </button>
            ))}
          </div>

          <div className={styles.header}>
            <h1>
              {tab === 'featured' ? 'Productos Destacados' : tab === 'offers' ? 'Ofertas' : 'Todos los productos'}
            </h1>
            <p>{total} producto(s) encontrado(s)</p>
          </div>

          {loading && page === 1 ? (
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeleton}>
                  <div className={styles.skelImg} />
                  <div className={styles.skelLine} style={{ width: '70%' }} />
                  <div className={styles.skelLine} style={{ width: '40%' }} />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className={styles.empty}>
              <p>No se encontraron productos</p>
              <button onClick={() => updateParams({ category: '', brand: '', tab: 'all' })}>
                Ver todos los productos
              </button>
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {products.map(p => (
                  <div key={p.id} className={`${styles.card} ${p.isFeatured ? styles.cardFeatured : ''} ${p.hasDiscount ? styles.cardOffer : ''}`}>
                    <Link href={`/products/${p.id}`} className={styles.imgWrap}>
                      <div className={styles.img} style={p.images?.[0] ? { backgroundImage: `url(${p.images[0]})` } : { backgroundColor: '#E8EDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
                        {!p.images?.[0] && '❄️'}
                      </div>
                      {p.isFeatured && <span className={styles.badgeFeatured}>⭐ Destacado</span>}
                      {p.hasDiscount && p.discountPercent > 0 && (
                        <span className={styles.badgeOffer}>-{p.discountPercent}%</span>
                      )}
                      {p.stock <= 5 && p.stock > 0 && <span className={styles.badgeLow}>Quedan {p.stock}</span>}
                    </Link>
                    <div className={styles.info}>
                      {p.brand && <Link href={`/brands/${p.brand.slug}`} className={styles.storeLink}>{p.brand.name}</Link>}
                      <Link href={`/products/${p.id}`} className={styles.name}>{p.name}</Link>
                      <div className={styles.priceRow}>
                        {p.hasDiscount && p.displayDiscountPrice ? (
                          <>
                            <span className={styles.price}>{p.displayDiscountPrice}</span>
                            <span className={styles.oldPrice}>{p.displayPrice}</span>
                          </>
                        ) : (
                          <span className={styles.price}>{p.displayPrice || formatPrice(p.priceCop)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleQuickAdd(p.id)}
                        className={`${styles.addBtn} ${addedToCart[p.id] ? styles.added : ''}`}
                        disabled={!!addedToCart[p.id]}
                      >
                        {addedToCart[p.id] ? '✓ Agregado' : (p.hasDiscount ? 'Aprovechar oferta' : 'Agregar')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`}
                      onClick={() => updateParams({ page: String(p) })}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
