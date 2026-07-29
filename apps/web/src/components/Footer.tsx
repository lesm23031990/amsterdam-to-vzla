import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p>&copy; {new Date().getFullYear()} amsterdamToVzla & asociados. Todos los derechos reservados.</p>
        <p className={styles.tagline}>San Cristóbal, Venezuela</p>
      </div>
    </footer>
  );
}
