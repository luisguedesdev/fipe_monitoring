import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Header from "../components/Header";
import { useAuth, withAuth } from "../contexts/AuthContext";
import styles from "../styles/MeusVeiculos.module.css";

function MeusVeiculosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removendo, setRemovendo] = useState(null);

  useEffect(() => {
    carregarVeiculos();
  }, []);

  const carregarVeiculos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/veiculos");
      const data = await res.json();

      if (data.success) {
        setVeiculos(data.veiculos);
      } else {
        setError(data.error || "Erro ao carregar veículos");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  const removerVeiculo = async (veiculo) => {
    if (!confirm(`Remover ${veiculo.nomeModelo} da sua lista?`)) {
      return;
    }

    setRemovendo(veiculo.id);

    try {
      const res = await fetch("/api/user/veiculos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigoMarca: veiculo.codigoMarca,
          codigoModelo: veiculo.codigoModelo,
          anoModelo: veiculo.anoModelo,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setVeiculos(veiculos.filter((v) => v.id !== veiculo.id));
      } else {
        alert(data.error || "Erro ao remover veículo");
      }
    } catch (err) {
      alert("Erro ao conectar com o servidor");
    } finally {
      setRemovendo(null);
    }
  };

  const formatarPreco = (preco) => {
    if (!preco) return "N/A";
    const valor = parseFloat(preco);
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatarData = (data) => {
    if (!data) return "";
    return new Date(data).toLocaleDateString("pt-BR");
  };

  const verHistorico = (veiculo) => {
    router.push(
      `/resultado?marca=${veiculo.codigoMarca}&modelo=${veiculo.codigoModelo}&ano=${veiculo.anoModelo}`
    );
  };

  return (
    <>
      <Head>
        <title>Meus Veículos | Drive Price X</title>
        <meta
          name="description"
          content="Seus veículos salvos para monitoramento de preços FIPE"
        />
      </Head>

      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              <span className={styles.icon}>⭐</span>
              Meus Veículos
            </h1>
            <p className={styles.subtitle}>
              Olá, {user?.nome?.split(" ")[0]}! Gerencie seus veículos
              favoritos.
            </p>
          </div>

          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Carregando seus veículos...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <span className={styles.errorIcon}>⚠️</span>
              <p>{error}</p>
              <button onClick={carregarVeiculos} className={styles.retryButton}>
                Tentar novamente
              </button>
            </div>
          ) : veiculos.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🚗</span>
              <h2>Nenhum veículo salvo</h2>
              <p>
                Você ainda não adicionou nenhum veículo à sua lista de
                favoritos.
              </p>
              <Link href="/" className={styles.addButton}>
                <span>➕</span> Adicionar veículo
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.stats}>
                <div className={styles.statCard}>
                  <span className={styles.statIcon}>🚗</span>
                  <span className={styles.statValue}>{veiculos.length}</span>
                  <span className={styles.statLabel}>Veículos salvos</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statIcon}>📊</span>
                  <span className={styles.statValue}>
                    {veiculos.reduce(
                      (acc, v) => acc + (v.totalRegistros || 0),
                      0
                    )}
                  </span>
                  <span className={styles.statLabel}>Total de registros</span>
                </div>
              </div>

              <div className={styles.veiculosList}>
                {veiculos.map((veiculo) => (
                  <div key={veiculo.id} className={styles.veiculoCard}>
                    <div className={styles.veiculoInfo}>
                      <div className={styles.veiculoHeader}>
                        <h3 className={styles.veiculoNome}>
                          {veiculo.apelido || veiculo.nomeModelo}
                        </h3>
                        {veiculo.apelido && (
                          <span className={styles.veiculoModelo}>
                            {veiculo.nomeModelo}
                          </span>
                        )}
                      </div>

                      <div className={styles.veiculoDetails}>
                        <span className={styles.veiculoMarca}>
                          {veiculo.nomeMarca}
                        </span>
                        <span className={styles.veiculoAno}>
                          {veiculo.anoModelo}
                        </span>
                      </div>

                      <div className={styles.veiculoPreco}>
                        {veiculo.ultimoPreco ? (
                          <>
                            <span className={styles.precoLabel}>
                              Último preço:
                            </span>
                            <span className={styles.precoValue}>
                              {veiculo.ultimoPreco}
                            </span>
                            {veiculo.ultimaConsulta && (
                              <span className={styles.precoData}>
                                em {formatarData(veiculo.ultimaConsulta)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className={styles.semPreco}>
                            Sem dados de preço
                          </span>
                        )}
                      </div>

                      {veiculo.totalRegistros > 0 && (
                        <span className={styles.registrosCount}>
                          📊 {veiculo.totalRegistros} registro
                          {veiculo.totalRegistros !== 1 ? "s" : ""} de preço
                        </span>
                      )}
                    </div>

                    <div className={styles.veiculoActions}>
                      <button
                        className={styles.verButton}
                        onClick={() => verHistorico(veiculo)}
                        title="Ver histórico de preços"
                      >
                        <span>📈</span>
                        <span className={styles.actionText}>Ver histórico</span>
                      </button>

                      <button
                        className={styles.removeButton}
                        onClick={() => removerVeiculo(veiculo)}
                        disabled={removendo === veiculo.id}
                        title="Remover da lista"
                      >
                        {removendo === veiculo.id ? (
                          <span className={styles.miniSpinner}></span>
                        ) : (
                          <span>🗑️</span>
                        )}
                        <span className={styles.actionText}>Remover</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.addMore}>
                <Link href="/" className={styles.addMoreButton}>
                  <span>➕</span> Adicionar outro veículo
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

// Proteger a página - só usuários autenticados
export default withAuth(MeusVeiculosPage);
