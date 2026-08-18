import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p>&copy; {new Date().getFullYear()} Amsterdam Frozen Foods. Todos los derechos reservados.</p>
        <p className={styles.tagline}>San Cristóbal, Venezuela · Alimentos congelados con delivery</p>
      </div>
    </footer>
  );
}
