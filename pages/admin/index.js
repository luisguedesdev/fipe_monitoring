import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Header from "../../components/Header";
import { useAuth } from "../../contexts/AuthContext";
import styles from "../../styles/Admin.module.css";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/login?redirect=/admin");
      } else if (!user?.isAdmin) {
        router.push("/");
      } else {
        carregarStats();
      }
    }
  }, [isAuthenticated, user, authLoading, router]);

  const carregarStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();

      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Carregando painel admin...</p>
        </div>
      </>
    );
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return null;
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <Head>
          <title>Painel Admin - Drive Price X</title>
        </Head>

        <div className={styles.pageHeader}>
          <h1>🛡️ Painel Administrativo</h1>
          <p>Gerencie o sistema Drive Price X</p>
        </div>

        <div className={styles.content}>
          {/* Cards de estatísticas */}
          {stats && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>👥</div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>
                    {stats.stats.totalUsuarios}
                  </span>
                  <span className={styles.statLabel}>Usuários</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>🚗</div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>
                    {stats.stats.totalVeiculos}
                  </span>
                  <span className={styles.statLabel}>Veículos no Banco</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>📊</div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>
                    {stats.stats.totalRegistros.toLocaleString("pt-BR")}
                  </span>
                  <span className={styles.statLabel}>Registros de Preço</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>⭐</div>
                <div className={styles.statInfo}>
                  <span className={styles.statValue}>
                    {stats.stats.totalUserVeiculos}
                  </span>
                  <span className={styles.statLabel}>Veículos Salvos</span>
                </div>
              </div>
            </div>
          )}

          {/* Menu de ações */}
          <div className={styles.actionsSection}>
            <h2>Ações de Administração</h2>
            <div className={styles.actionsGrid}>
              <Link href="/admin/veiculos" className={styles.actionCard}>
                <div className={styles.actionIcon}>🗑️</div>
                <div className={styles.actionInfo}>
                  <h3>Gerenciar Veículos</h3>
                  <p>Visualizar e deletar veículos do banco central</p>
                </div>
              </Link>

              <Link href="/todos" className={styles.actionCard}>
                <div className={styles.actionIcon}>📋</div>
                <div className={styles.actionInfo}>
                  <h3>Ver Todos Veículos</h3>
                  <p>Visualizar lista pública de veículos</p>
                </div>
              </Link>

              <Link href="/" className={styles.actionCard}>
                <div className={styles.actionIcon}>🔍</div>
                <div className={styles.actionInfo}>
                  <h3>Nova Consulta</h3>
                  <p>Consultar e adicionar novos veículos</p>
                </div>
              </Link>

              <Link href="/conta" className={styles.actionCard}>
                <div className={styles.actionIcon}>👤</div>
                <div className={styles.actionInfo}>
                  <h3>Minha Conta</h3>
                  <p>Gerenciar veículos pessoais salvos</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Últimos usuários */}
          {stats?.ultimosUsuarios && stats.ultimosUsuarios.length > 0 && (
            <div className={styles.section}>
              <h2>👥 Últimos Usuários Cadastrados</h2>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Admin</th>
                      <th>Data Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.ultimosUsuarios.map((usuario) => (
                      <tr key={usuario.id}>
                        <td>{usuario.nome}</td>
                        <td>{usuario.email}</td>
                        <td>
                          {usuario.is_admin ? (
                            <span className={styles.badgeAdmin}>Admin</span>
                          ) : (
                            <span className={styles.badgeUser}>Usuário</span>
                          )}
                        </td>
                        <td>
                          {new Date(usuario.created_at).toLocaleDateString(
                            "pt-BR"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Veículos mais consultados */}
          {stats?.veiculosMaisConsultados &&
            stats.veiculosMaisConsultados.length > 0 && (
              <div className={styles.section}>
                <h2>🔥 Veículos com Mais Registros</h2>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Marca</th>
                        <th>Modelo</th>
                        <th>Ano</th>
                        <th>Registros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.veiculosMaisConsultados.map((veiculo, index) => (
                        <tr key={index}>
                          <td>{veiculo.nome_marca}</td>
                          <td>{veiculo.nome_modelo}</td>
                          <td>{veiculo.ano_modelo}</td>
                          <td>
                            <span className={styles.badge}>
                              {veiculo.total_registros}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      </div>
    </>
  );
}
