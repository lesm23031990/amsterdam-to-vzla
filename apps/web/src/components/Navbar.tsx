'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handleLogout = () => { logout(); router.push('/'); };

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) router.push(`/?q=${encodeURIComponent(search.trim())}`);
  }, [search, router]);

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoEmoji}>🛍️</span>
          <span className={styles.logoText}>amsterdamToVzla</span>
        </Link>

        <form onSubmit={handleSearch} className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Buscar productos, categorías..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn}>Buscar</button>
        </form>

        <div className={styles.actions}>
          <Link href="/cart" className={styles.actionBtn}>
            <span>🛒</span>
            <span className={styles.actionLabel}>Carrito</span>
          </Link>

          {user ? (
            <div className={styles.userDropdown}>
              <button className={styles.actionBtn} onClick={() => setMenuOpen(!menuOpen)}>
                <span>👤</span>
                <span className={styles.actionLabel}>{user.name.split(' ')[0]}</span>
              </button>
              {menuOpen && (
                <div className={styles.dropdownMenu}>
                  {user.role === 'cliente' && <Link href="/orders" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>Mis pedidos</Link>}
                  {user.role === 'cliente' && <Link href="/assistant" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>Asistente</Link>}
                  {user.role === 'tienda' && <Link href="/dashboard" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>Dashboard</Link>}
                  {user.role === 'tienda' && <Link href="/dashboard/products" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>Mis productos</Link>}
                  {user.role === 'tienda' && <Link href="/dashboard/orders" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>Pedidos</Link>}
                  {user.role === 'admin' && <Link href="/admin/stores" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>Admin tiendas</Link>}
                  {user.role === 'admin' && <Link href="/admin/users" className={styles.dropdownItem} onClick={() => setMenuOpen(false)}>Admin usuarios</Link>}
                  <div className={styles.dropdownDivider} />
                  <button onClick={handleLogout} className={styles.dropdownItem}>Cerrar sesión</button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authBtns}>
              <Link href="/login" className={styles.loginBtn}>Entrar</Link>
              <Link href="/register" className={styles.registerBtn}>Registrarse</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
