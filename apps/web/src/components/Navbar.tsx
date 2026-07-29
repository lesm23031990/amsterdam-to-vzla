'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🍞</span>
          <span className={styles.logoText}>amsterdamToVzla</span>
        </Link>

        <button className={styles.menuToggle} onClick={() => setMenuOpen(!menuOpen)}>
          <span className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`} />
        </button>

        <div className={`${styles.links} ${menuOpen ? styles.linksOpen : ''}`}>
          <Link href="/stores" className={styles.link} onClick={() => setMenuOpen(false)}>Tiendas</Link>

          {user && user.role === 'cliente' && (
            <>
              <Link href="/cart" className={styles.link} onClick={() => setMenuOpen(false)}>Carrito</Link>
              <Link href="/orders" className={styles.link} onClick={() => setMenuOpen(false)}>Pedidos</Link>
              <Link href="/assistant" className={styles.link} onClick={() => setMenuOpen(false)}>Asistente</Link>
            </>
          )}
          {user && user.role === 'tienda' && (
            <>
              <Link href="/dashboard" className={styles.link} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link href="/dashboard/products" className={styles.link} onClick={() => setMenuOpen(false)}>Productos</Link>
              <Link href="/dashboard/orders" className={styles.link} onClick={() => setMenuOpen(false)}>Pedidos</Link>
            </>
          )}
          {user && user.role === 'admin' && (
            <>
              <Link href="/admin/stores" className={styles.link} onClick={() => setMenuOpen(false)}>Tiendas</Link>
              <Link href="/admin/users" className={styles.link} onClick={() => setMenuOpen(false)}>Usuarios</Link>
            </>
          )}

          <div className={styles.authSection}>
            {user ? (
              <div className={styles.userMenu}>
                <span className={styles.userName}>{user.name}</span>
                <button onClick={handleLogout} className={styles.logoutBtn}>Cerrar sesión</button>
              </div>
            ) : (
              <div className={styles.authLinks}>
                <Link href="/login" className={styles.link} onClick={() => setMenuOpen(false)}>Entrar</Link>
                <Link href="/register" className={styles.registerBtn} onClick={() => setMenuOpen(false)}>Registrarse</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
