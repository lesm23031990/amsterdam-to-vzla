'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './Navbar.module.css';

const navLinks = [
  { href: '/products', label: 'Catálogo' },
  { href: '/offers', label: 'Ofertas' },
  { href: '/orders', label: 'Pedidos' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => { logout(); router.push('/'); };

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) router.push(`/products?q=${encodeURIComponent(search.trim())}`);
  }, [search, router]);

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.container}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <img
              src="/logo-light.png"
              alt="Amsterdam Frozen Foods"
              className={styles.logoImg}
            />
          </Link>

          {/* Search Bar */}
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

          {/* Navigation Links */}
          <div className={styles.navLinks}>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className={styles.navLink}>
                {link.label}
              </Link>
            ))}
          </div>

        {/* Right Actions */}
        <div className={styles.actions}>
          {/* Desktop cart and auth */}
          <Link href="/cart" className={styles.cartBtn}>
            <span className={styles.cartIcon}>🛒</span>
            <span className={styles.cartLabel}>Carrito</span>
          </Link>

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

          {/* Mobile Menu Toggle */}
          <button
            className={styles.mobileToggle}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menú"
          >
            <span className={styles.hamburger} />
          </button>
        </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <Link href="/cart" className={styles.mobileLink} onClick={() => setMobileMenuOpen(false)}>
              🛒 Carrito
            </Link>
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={styles.mobileLink}
                onClick={() => setMobileMenuOpen(false)}
              >
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

      {/* Floating AI Assistant */}
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
