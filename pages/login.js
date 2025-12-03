import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import styles from "../styles/Auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, senha);

      if (result.success) {
        // Redirecionar para página anterior ou home
        const redirect = router.query.redirect || "/";
        router.push(redirect);
      } else {
        setError(result.error || "Erro ao fazer login");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  // Não mostrar se já autenticado (vai redirecionar)
  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Entrar | Drive Price X</title>
        <meta
          name="description"
          content="Faça login na sua conta Drive Price X"
        />
      </Head>

      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Voltar para o início
        </Link>

        <div className={styles.logo}>Drive Price X</div>
        <p className={styles.subtitle}>Monitore preços de veículos FIPE</p>

        <div className={styles.card}>
          <h1 className={styles.title}>Entrar na sua conta</h1>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                E-mail
              </label>
              <input
                type="email"
                id="email"
                className={styles.input}
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="senha" className={styles.label}>
                Senha
              </label>
              <input
                type="password"
                id="senha"
                className={styles.input}
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <p className={styles.linkText}>
            Não tem uma conta?{" "}
            <Link href="/registro" className={styles.link}>
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
