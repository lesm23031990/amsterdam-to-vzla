'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import styles from './Navbar.module.css';

const navLinks = [
  { href: '/products', label: 'Catálogo' },
  { href: '/offers', label: 'Ofertas' },
  { href: '/orders', label: 'Pedidos' },
];

const currencies: { value: 'COP' | 'Bs' | 'USD'; label: string }[] = [
  { value: 'COP', label: 'COP' },
  { value: 'Bs', label: 'Bs' },
  { value: 'USD', label: 'USD' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/notifications?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch {}
  };

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch {}
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch {}
  };

  const handleLogout = () => { logout(); router.push('/'); };

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) router.push(`/products?q=${encodeURIComponent(search.trim())}`);
  }, [search, router]);

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
            <img src="/logo-light.png" alt="Amsterdam Frozen Foods" className={styles.logoImg} />
          </Link>

          <form onSubmit={handleSearch} className={`${styles.searchBar} ${searchFocused ? styles.searchFocused : ''}`}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
            <input
              type="text"
              placeholder="¿Qué estás buscando hoy?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={styles.searchInput}
            />
            {search && (
              <button type="button" className={styles.clearBtn} onClick={() => setSearch('')}>✕</button>
            )}
            <button type="submit" className={styles.searchBtn}>Buscar</button>
          </form>

          <div className={styles.navLinks}>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className={styles.navLink}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className={styles.actions}>
            {/* Currency Selector */}
            <div className={styles.currencySelector}>
              <button className={styles.currencyBtn} onClick={() => setCurrencyOpen(!currencyOpen)}>
                {currency}
              </button>
              {currencyOpen && (
                <div className={styles.currencyDropdown}>
                  {currencies.map(c => (
                    <button
                      key={c.value}
                      className={`${styles.currencyOption} ${currency === c.value ? styles.currencyActive : ''}`}
                      onClick={() => { setCurrency(c.value); setCurrencyOpen(false); }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href="/cart" className={styles.cartBtn}>
              <span className={styles.cartIcon}>🛒</span>
              <span className={styles.cartLabel}>Carrito</span>
            </Link>

            {user && (
              <div className={styles.notifDropdown}>
                <button className={styles.notifBtn} onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifications(); }}>
                  <span className={styles.notifIcon}>🔔</span>
                  {unreadCount > 0 && <span className={styles.notifBadge}>{unreadCount}</span>}
                </button>
                {notifOpen && (
                  <div className={styles.notifDropdownMenu}>
                    <div className={styles.notifHeader}>
                      <span>Notificaciones</span>
                      <button onClick={markAllRead} className={styles.markAllBtn}>Marcar todas</button>
                    </div>
                    {notifications.length === 0 ? (
                      <div className={styles.notifEmpty}>Sin notificaciones</div>
                    ) : (
                      notifications.slice(0, 10).map(n => (
                        <div
                          key={n.id}
                          className={`${styles.notifItem} ${!n.read ? styles.notifUnread : ''}`}
                          onClick={() => { markAsRead(n.id); if (n.orderId) router.push(`/orders/${n.orderId}`); setNotifOpen(false); }}
                        >
                          <div className={styles.notifContent}>
                            <div className={styles.notifTitle}>{n.title}</div>
                            <div className={styles.notifMessage}>{n.message}</div>
                          </div>
                        </div>
                      ))
                    )}
                    <Link href="/notifications" className={styles.notifSeeAll} onClick={() => setNotifOpen(false)}>
                      Ver todas
                    </Link>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className={styles.userDropdown}>
                <button className={styles.userBtn} onClick={() => setMenuOpen(!menuOpen)}>
                  <span className={styles.userAvatar}>{user.name.charAt(0).toUpperCase()}</span>
                </button>
                {menuOpen && (
                  <div className={styles.dropdownMenu}>
                    <Link href="/orders" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                      📦 Mis pedidos
                    </Link>
                    <Link href="/assistant" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                      🤖 Asistente IA
                    </Link>
                    {user.role === 'admin' && (
                      <>
                        <div className={styles.dropdownDivider} />
                        <Link href="/admin" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>
                          ⚙️ Panel Admin
                        </Link>
                      </>
                    )}
                    <div className={styles.dropdownDivider} />
                    <button onClick={handleLogout} className={styles.dropdownItem}>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.authBtns}>
                <Link href="/login" className={styles.loginBtn}>Entrar</Link>
                <Link href="/register" className={styles.registerBtn}>Crear cuenta</Link>
              </div>
            )}

            <button className={styles.mobileToggle} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menú">
              <span className={styles.hamburger} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <div className={styles.mobileCurrency}>
              {currencies.map(c => (
                <button
                  key={c.value}
                  className={`${styles.mobileCurrencyBtn} ${currency === c.value ? styles.mobileCurrencyActive : ''}`}
                  onClick={() => { setCurrency(c.value); setMobileMenuOpen(false); }}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <Link href="/cart" className={styles.mobileLink} onClick={() => setMobileMenuOpen(false)}>
              🛒 Carrito
            </Link>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className={styles.mobileLink} onClick={() => setMobileMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            {!user && (
              <div className={styles.mobileAuth}>
                <Link href="/login" className={styles.mobileLogin}>Entrar</Link>
                <Link href="/register" className={styles.mobileRegister}>Crear cuenta</Link>
              </div>
            )}
          </div>
        )}
      </nav>

      <Link href="/assistant" className={styles.aiBubble}>
        <div className={styles.aiBubbleInner}>
          <span className={styles.aiRobot}>🤖</span>
          <span className={styles.aiPulse} />
        </div>
        <span className={styles.aiTooltip}>¡Pregúntame!</span>
      </Link>
    </>
  );
}
