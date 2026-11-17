'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
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

function ProductsContent() {
  const { user } = useAuth();
  const { currency, formatPrice } = useCurrency();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tab = searchParams.get('tab') || 'all';
  const categoryFilter = searchParams.get('category') || '';
  const brandFilter = searchParams.get('brand') || '';
  const brandIdsParam = searchParams.get('brandIds') || '';
  const brandFilters = brandIdsParam.split(',').filter(Boolean);
  const minPriceFilter = searchParams.get('minPrice') || '';
  const maxPriceFilter = searchParams.get('maxPrice') || '';
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
  const [priceMin, setPriceMin] = useState(minPriceFilter);
  const [priceMax, setPriceMax] = useState(maxPriceFilter);
  const [priceError, setPriceError] = useState('');
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
    setPriceMin(minPriceFilter);
    setPriceMax(maxPriceFilter);
    setPriceError('');
  }, [minPriceFilter, maxPriceFilter]);

  useEffect(() => {
    setLoading(true);
    const query: Record<string, string> = { page: String(page), perPage: String(pageSize), currency };
    if (tab === 'featured') query.featured = 'true';
    if (tab === 'offers') query.discount = 'true';
    if (categoryFilter) query.category = categoryFilter;
    if (brandFilters.length > 0) query.brandIds = brandFilters.join(',');
    else if (brandFilter) query.brand = brandFilter;
    if (searchQuery) query.q = searchQuery;
    if (minPriceFilter) query.minPrice = minPriceFilter;
    if (maxPriceFilter) query.maxPrice = maxPriceFilter;
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
  }, [tab, categoryFilter, brandFilter, brandIdsParam, minPriceFilter, maxPriceFilter, searchQuery, orderBy, inStock, page, currency]);

  const handleQuickAdd = async (productId: string) => {
    if (!user) { window.location.href = '/login'; return; }
    const res = await api.post('/cart/items', { productId, quantity: 1 });
    if (res.ok) {
      setAddedToCart(prev => ({ ...prev, [productId]: true }));
      setTimeout(() => setAddedToCart(prev => ({ ...prev, [productId]: false })), 2000);
    }
  };

  const toggleBrand = (brand: Brand) => {
    let current = [...brandFilters];
    if (current.length === 0 && brandFilter) {
      const legacyBrand = brands.find((b) => b.slug === brandFilter);
      if (legacyBrand) current = [legacyBrand.id];
    }
    const next = current.includes(brand.id)
      ? current.filter((id) => id !== brand.id)
      : [...current, brand.id];
    updateParams({ brand: null, brandIds: next.join(',') || null });
  };

  const applyPriceRange = () => {
    const min = priceMin.trim();
    const max = priceMax.trim();
    const minValue = min ? Number(min) : null;
    const maxValue = max ? Number(max) : null;
    if (minValue !== null && (!Number.isFinite(minValue) || minValue < 0)) {
      setPriceError('Ingresa un precio mínimo válido');
      return;
    }
    if (maxValue !== null && (!Number.isFinite(maxValue) || maxValue < 0)) {
      setPriceError('Ingresa un precio máximo válido');
      return;
    }
    if (minValue !== null && maxValue !== null && minValue > maxValue) {
      setPriceError('El precio mínimo no puede ser mayor que el máximo');
      return;
    }
    setPriceError('');
    updateParams({ minPrice: min || null, maxPrice: max || null });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className={styles.page}>
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
        <aside className={`${styles.sidebar} ${filtersOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <h3>Filtros</h3>
            <button className={styles.closeSidebar} onClick={() => setFiltersOpen(false)}>✕</button>
          </div>

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

          <div className={styles.filterSection}>
            <h4>Marca</h4>
            <button
              className={`${styles.filterChip} ${brandFilters.length === 0 && !brandFilter ? styles.filterChipActive : ''}`}
              onClick={() => updateParams({ brand: null, brandIds: null })}
            >
              Todas
            </button>
            <div className={styles.brandList}>
              {brands.map((b) => {
                const checked = brandFilters.includes(b.id) || (brandFilters.length === 0 && brandFilter === b.slug);
                return (
                  <label key={b.id} className={`${styles.brandOption} ${checked ? styles.brandOptionActive : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleBrand(b)} />
                    {b.logoImage ? (
                      <img src={b.logoImage} alt="" className={styles.brandLogo} />
                    ) : (
                      <span className={styles.brandLogoPlaceholder}>{b.name.charAt(0).toUpperCase()}</span>
                    )}
                    <span>{b.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className={styles.filterSection}>
            <h4>Precio ({currency})</h4>
            <div className={styles.priceInputs}>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                className={styles.priceInput}
                placeholder="Mín."
                aria-label="Precio mínimo"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyPriceRange(); }}
              />
              <span className={styles.priceSeparator}>—</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                className={styles.priceInput}
                placeholder="Máx."
                aria-label="Precio máximo"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyPriceRange(); }}
              />
            </div>
            {priceError && <p className={styles.filterError}>{priceError}</p>}
            <button className={styles.applyFilters} onClick={applyPriceRange}>Aplicar</button>
          </div>

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

          <button
            className={styles.clearFilters}
            onClick={() => { setPriceMin(''); setPriceMax(''); setPriceError(''); updateParams({ category: '', brand: null, brandIds: null, minPrice: null, maxPrice: null, orderBy: '', inStock: '', tab: 'all' }); }}
          >
            Limpiar filtros
          </button>
        </aside>

        {filtersOpen && <div className={styles.sidebarOverlay} onClick={() => setFiltersOpen(false)} />}

        <main className={styles.main}>
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
              <button onClick={() => { setPriceMin(''); setPriceMax(''); setPriceError(''); updateParams({ category: '', brand: null, brandIds: null, minPrice: null, maxPrice: null, tab: 'all' }); }}>
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
                      <div className={styles.badges}>
                        {p.isFeatured && <span className={styles.badgeFeatured}>⭐ Destacado</span>}
                        {p.hasDiscount && p.discountPercent > 0 && (
                          <span className={styles.badgeOffer}>-{p.discountPercent}%</span>
                        )}
                      </div>
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

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className={styles.page}><p className={styles.loading}>Cargando productos...</p></div>}>
      <ProductsContent />
    </Suspense>
  );
}
