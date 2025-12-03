import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import styles from "../styles/Header.module.css";

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    router.push("/");
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>💰</span>
          <span className={styles.logoText}>Drive Price X</span>
        </Link>

        <nav className={styles.nav}>
          <Link
            href="/"
            className={`${styles.navLink} ${
              router.pathname === "/" ? styles.active : ""
            }`}
          >
            <span className={styles.navIcon}>➕</span>
            <span className={styles.navText}>Adicionar</span>
          </Link>

          <Link
            href="/todos"
            className={`${styles.navLink} ${
              router.pathname === "/todos" || router.pathname === "/resultado"
                ? styles.active
                : ""
            }`}
          >
            <span className={styles.navIcon}>📋</span>
            <span className={styles.navText}>Veículos</span>
          </Link>

          {isAuthenticated && (
            <Link
              href="/meus-veiculos"
              className={`${styles.navLink} ${
                router.pathname === "/meus-veiculos" ? styles.active : ""
              }`}
            >
              <span className={styles.navIcon}>⭐</span>
              <span className={styles.navText}>Meus</span>
            </Link>
          )}

          {isAuthenticated && user?.isAdmin && (
            <Link
              href="/admin"
              className={`${styles.navLink} ${styles.adminLink} ${
                router.pathname.startsWith("/admin") ? styles.active : ""
              }`}
            >
              <span className={styles.navIcon}>🛡️</span>
              <span className={styles.navText}>Admin</span>
            </Link>
          )}
        </nav>

        {/* Área de autenticação */}
        <div className={styles.authArea}>
          {loading ? (
            <div className={styles.authLoading}></div>
          ) : isAuthenticated ? (
            <div className={styles.userMenu} ref={menuRef}>
              <button
                className={styles.userButton}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <span className={styles.userAvatar}>
                  {user?.nome?.charAt(0).toUpperCase() || "U"}
                </span>
                <span className={styles.userName}>
                  {user?.nome?.split(" ")[0]}
                </span>
                <span className={styles.chevron}>▼</span>
              </button>

              {menuOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownName}>{user?.nome}</span>
                    <span className={styles.dropdownEmail}>{user?.email}</span>
                  </div>
                  <div className={styles.dropdownDivider}></div>
                  <Link
                    href="/meus-veiculos"
                    className={styles.dropdownItem}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>⭐</span> Meus Veículos
                  </Link>
                  {user?.isAdmin && (
                    <Link
                      href="/admin"
                      className={`${styles.dropdownItem} ${styles.adminDropdownItem}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span>🛡️</span> Painel Admin
                    </Link>
                  )}
                  <div className={styles.dropdownDivider}></div>
                  <button
                    className={styles.dropdownItem}
                    onClick={handleLogout}
                  >
                    <span>🚪</span> Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authButtons}>
              <Link href="/login" className={styles.loginButton}>
                Entrar
              </Link>
              <Link href="/registro" className={styles.registerButton}>
                Criar conta
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
