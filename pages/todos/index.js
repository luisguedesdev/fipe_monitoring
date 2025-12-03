import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Header from "../../components/Header";
import OfflineIndicator from "../../components/OfflineIndicator";
import {
  saveVeiculos,
  getVeiculos as getOfflineVeiculos,
  getLastSyncTime,
} from "../../lib/offlineStorage";
import styles from "../../styles/TodosAgrupado.module.css";

export default function TodosVeiculosAgrupado() {
  const router = useRouter();
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [marcaExpandida, setMarcaExpandida] = useState(null);
  const [atualizando, setAtualizando] = useState(false);
  const [atualizacaoStatus, setAtualizacaoStatus] = useState(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      carregarVeiculos();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    carregarVeiculos();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarVeiculos = async () => {
    try {
      if (navigator.onLine) {
        const response = await fetch("/api/veiculos");
        const data = await response.json();

        if (data.success) {
          setVeiculos(data.veiculos);
          setIsOfflineData(false);
          await saveVeiculos(data.veiculos);
          setLastSync(new Date());
        }
      } else {
        await carregarDadosOffline();
      }
    } catch (error) {
      console.error("Erro ao carregar veículos:", error);
      await carregarDadosOffline();
    } finally {
      setLoading(false);
    }
  };

  const carregarDadosOffline = async () => {
    try {
      const offlineVeiculos = await getOfflineVeiculos();
      if (offlineVeiculos.length > 0) {
        setVeiculos(offlineVeiculos);
        setIsOfflineData(true);
        const syncTime = await getLastSyncTime();
        setLastSync(syncTime);
      }
    } catch (error) {
      console.error("Erro ao carregar dados offline:", error);
    }
  };

  const atualizarTodos = async () => {
    if (atualizando) return;

    setAtualizando(true);
    setAtualizacaoStatus({
      tipo: "info",
      mensagem: "Verificando meses faltantes...",
    });

    try {
      const response = await fetch("/api/atualizar-todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        if (data.totalAtualizados > 0) {
          setAtualizacaoStatus({
            tipo: "sucesso",
            mensagem: `✅ ${data.totalAtualizados} registro(s) adicionado(s)!`,
          });
          await carregarVeiculos();
        } else {
          setAtualizacaoStatus({
            tipo: "info",
            mensagem: "✓ Todos os veículos já estão atualizados!",
          });
        }
      } else {
        setAtualizacaoStatus({
          tipo: "erro",
          mensagem: `Erro: ${data.error}`,
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      setAtualizacaoStatus({
        tipo: "erro",
        mensagem: "Erro ao conectar com o servidor",
      });
    } finally {
      setAtualizando(false);
      setTimeout(() => setAtualizacaoStatus(null), 5000);
    }
  };

  // Agrupar veículos por marca
  const veiculosPorMarca = veiculos.reduce((acc, veiculo) => {
    const marca = veiculo.nomeMarca;
    if (!acc[marca]) {
      acc[marca] = [];
    }
    acc[marca].push(veiculo);
    return acc;
  }, {});

  // Ordenar marcas alfabeticamente e veículos por preço
  const marcasOrdenadas = Object.keys(veiculosPorMarca).sort();
  marcasOrdenadas.forEach((marca) => {
    veiculosPorMarca[marca].sort((a, b) => b.ultimoPrecoNum - a.ultimoPrecoNum);
  });

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const formatarVariacao = (valor) => {
    const sinal = valor > 0 ? "+" : "";
    return `${sinal}${valor.toFixed(2)}%`;
  };

  const formatarDataHora = (data) => {
    if (!data) return "Nunca";
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleMarca = (marca) => {
    setMarcaExpandida(marcaExpandida === marca ? null : marca);
  };

  // Calcular estatísticas por marca
  const getEstatisticasMarca = (veiculosMarca) => {
    const total = veiculosMarca.length;
    const totalRegistros = veiculosMarca.reduce(
      (acc, v) => acc + v.totalRegistros,
      0
    );
    const mediaPreco =
      veiculosMarca.reduce((acc, v) => acc + v.ultimoPrecoNum, 0) / total;
    const mediaVariacao =
      veiculosMarca.reduce((acc, v) => acc + v.variacao, 0) / total;

    return { total, totalRegistros, mediaPreco, mediaVariacao };
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingContent}>
            <div className={styles.loadingIcon}>🚗</div>
            <h2 className={styles.loadingTitle}>Carregando veículos</h2>
            <p className={styles.loadingText}>Buscando dados do servidor...</p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill}></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <OfflineIndicator
        isOnline={isOnline}
        isOfflineData={isOfflineData}
        lastSync={lastSync}
        onSync={carregarVeiculos}
      />
      <div className={styles.container}>
        <Head>
          <title>Veículos por Marca - Drive Price X</title>
          <meta
            name="description"
            content="Lista de veículos monitorados agrupados por marca"
          />
        </Head>

        {/* Page Header */}
        <div className={styles.pageHeader}>
          <h1>📋 Veículos Monitorados</h1>
          <p>
            {veiculos.length} veículo{veiculos.length !== 1 ? "s" : ""} em{" "}
            {marcasOrdenadas.length} marca
            {marcasOrdenadas.length !== 1 ? "s" : ""}
          </p>
          {isOfflineData && (
            <span className={styles.offlineBadge}>
              📱 Modo Offline • Sincronizado: {formatarDataHora(lastSync)}
            </span>
          )}
        </div>

        {/* Botões de ação */}
        <div className={styles.acoesContainer}>
          <Link href="/todos/lista" className={styles.btnSecundario}>
            📋 Ver lista completa
          </Link>
          <button
            className={`${styles.btnAtualizar} ${
              atualizando ? styles.btnAtualizando : ""
            }`}
            onClick={atualizarTodos}
            disabled={atualizando || !isOnline}
          >
            {atualizando ? (
              <>
                <span className={styles.spinnerSmall}></span>
                Atualizando...
              </>
            ) : (
              "🔄 Atualizar todos"
            )}
          </button>
        </div>

        {/* Status da atualização */}
        {atualizacaoStatus && (
          <div
            className={`${styles.statusBar} ${styles[atualizacaoStatus.tipo]}`}
          >
            {atualizacaoStatus.mensagem}
          </div>
        )}

        {/* Resumo */}
        <div className={styles.resumoCards}>
          <div className={styles.resumoCard}>
            <span className={styles.resumoIcon}>🏭</span>
            <span className={styles.resumoValor}>{marcasOrdenadas.length}</span>
            <span className={styles.resumoLabel}>Marcas</span>
          </div>
          <div className={styles.resumoCard}>
            <span className={styles.resumoIcon}>🚗</span>
            <span className={styles.resumoValor}>{veiculos.length}</span>
            <span className={styles.resumoLabel}>Veículos</span>
          </div>
          <div className={styles.resumoCard}>
            <span className={styles.resumoIcon}>📊</span>
            <span className={styles.resumoValor}>
              {veiculos.reduce((acc, v) => acc + v.totalRegistros, 0)}
            </span>
            <span className={styles.resumoLabel}>Registros</span>
          </div>
        </div>

        {/* Lista de marcas */}
        {marcasOrdenadas.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔍</span>
            <h2>Nenhum veículo cadastrado</h2>
            <p>Faça sua primeira consulta na página inicial</p>
            {isOnline && (
              <Link href="/" className={styles.btnPrimary}>
                Consultar veículo
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.marcasContainer}>
            {marcasOrdenadas.map((marca) => {
              const veiculosMarca = veiculosPorMarca[marca];
              const stats = getEstatisticasMarca(veiculosMarca);
              const isExpandida = marcaExpandida === marca;

              return (
                <div key={marca} className={styles.marcaCard}>
                  <button
                    className={`${styles.marcaHeader} ${
                      isExpandida ? styles.marcaExpandida : ""
                    }`}
                    onClick={() => toggleMarca(marca)}
                  >
                    <div className={styles.marcaInfo}>
                      <h2 className={styles.marcaNome}>{marca}</h2>
                      <div className={styles.marcaStats}>
                        <span className={styles.statItem}>
                          🚗 {stats.total} veículo{stats.total !== 1 ? "s" : ""}
                        </span>
                        <span className={styles.statItem}>
                          📊 {stats.totalRegistros} registros
                        </span>
                        <span
                          className={`${styles.statItem} ${
                            stats.mediaVariacao > 0
                              ? styles.variacaoUp
                              : stats.mediaVariacao < 0
                              ? styles.variacaoDown
                              : ""
                          }`}
                        >
                          {formatarVariacao(stats.mediaVariacao)} média
                        </span>
                      </div>
                    </div>
                    <span className={styles.expandIcon}>
                      {isExpandida ? "▼" : "▶"}
                    </span>
                  </button>

                  {isExpandida && (
                    <div className={styles.veiculosLista}>
                      {veiculosMarca.map((veiculo) => {
                        const chave = `${veiculo.codigoMarca}-${veiculo.codigoModelo}-${veiculo.anoModelo}`;
                        return (
                          <Link
                            key={chave}
                            href={`/resultado?marca=${veiculo.codigoMarca}&modelo=${veiculo.codigoModelo}&ano=${veiculo.anoModelo}`}
                            className={styles.veiculoItem}
                          >
                            <div className={styles.veiculoInfo}>
                              <span className={styles.veiculoModelo}>
                                {veiculo.nomeModelo}
                              </span>
                              <span className={styles.veiculoAno}>
                                {veiculo.nomeAno}
                              </span>
                            </div>
                            <div className={styles.veiculoDados}>
                              <span className={styles.veiculoPreco}>
                                {formatarMoeda(veiculo.ultimoPrecoNum)}
                              </span>
                              <span
                                className={`${styles.veiculoVariacao} ${
                                  veiculo.variacao > 0
                                    ? styles.variacaoUp
                                    : veiculo.variacao < 0
                                    ? styles.variacaoDown
                                    : ""
                                }`}
                              >
                                {formatarVariacao(veiculo.variacao)}
                              </span>
                            </div>
                            <span className={styles.veiculoArrow}>→</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Link para lista completa */}
        {veiculos.length > 0 && (
          <div className={styles.footerLinks}>
            <Link href="/todos/lista" className={styles.linkLista}>
              📋 Ver lista completa com filtros e comparação →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
