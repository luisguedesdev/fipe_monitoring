import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import styles from "../styles/Auth.module.css";

export default function RegistroPage() {
  const router = useRouter();
  const { register, isAuthenticated, loading: authLoading } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
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

    // Validações
    if (nome.trim().length < 2) {
      setError("Nome deve ter pelo menos 2 caracteres");
      return;
    }

    if (senha.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (senha !== confirmarSenha) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      const result = await register(nome.trim(), email, senha);

      if (result.success) {
        // Redirecionar para home
        router.push("/");
      } else {
        setError(result.error || "Erro ao criar conta");
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
        <title>Criar Conta | Drive Price X</title>
        <meta
          name="description"
          content="Crie sua conta no Drive Price X para monitorar preços de veículos"
        />
      </Head>

      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Voltar para o início
        </Link>

        <div className={styles.logo}>Drive Price X</div>
        <p className={styles.subtitle}>Monitore preços de veículos FIPE</p>

        <div className={styles.card}>
          <h1 className={styles.title}>Criar sua conta</h1>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.inputGroup}>
              <label htmlFor="nome" className={styles.label}>
                Nome
              </label>
              <input
                type="text"
                id="nome"
                className={styles.input}
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                disabled={loading}
                minLength={2}
              />
            </div>

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
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirmarSenha" className={styles.label}>
                Confirmar Senha
              </label>
              <input
                type="password"
                id="confirmarSenha"
                className={styles.input}
                placeholder="Repita a senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? (
                <>
                  <span className={styles.spinner}></span>
                  Criando conta...
                </>
              ) : (
                "Criar conta"
              )}
            </button>
          </form>

          <p className={styles.linkText}>
            Já tem uma conta?{" "}
            <Link href="/login" className={styles.link}>
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
