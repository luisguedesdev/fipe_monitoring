import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../styles/Header.module.css";

export default function Header() {
  const router = useRouter();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🚗</span>
          <span className={styles.logoText}>FIPE Monitor</span>
        </Link>

        <nav className={styles.nav}>
          <Link
            href="/"
            className={`${styles.navLink} ${
              router.pathname === "/" ? styles.active : ""
            }`}
          >
            <span className={styles.navIcon}>🔍</span>
            <span className={styles.navText}>Nova Consulta</span>
          </Link>

          <Link
            href="/todos"
            className={`${styles.navLink} ${
              router.pathname === "/todos" ? styles.active : ""
            }`}
          >
            <span className={styles.navIcon}>📋</span>
            <span className={styles.navText}>Meus Veículos</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
