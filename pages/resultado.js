import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import styles from "../styles/Resultado.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ResultadoFipe() {
  const router = useRouter();
  const { marca, modelo, ano } = router.query;
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [veiculo, setVeiculo] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [periodoSelecionado, setPeriodoSelecionado] = useState(12);

  // Estados para sugestões de outros anos
  const [outrosAnos, setOutrosAnos] = useState([]);
  const [loadingOutrosAnos, setLoadingOutrosAnos] = useState(false);
  const [adicionandoAno, setAdicionandoAno] = useState(null);

  // Estados para salvar veículo
  const [veiculoSalvo, setVeiculoSalvo] = useState(false);
  const [salvandoVeiculo, setSalvandoVeiculo] = useState(false);

  useEffect(() => {
    if (marca && modelo && ano) {
      carregarDados();
      carregarOutrosAnos();
      if (isAuthenticated) {
        verificarVeiculoSalvo();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marca, modelo, ano, periodoSelecionado, isAuthenticated]);

  const verificarVeiculoSalvo = async () => {
    try {
      const res = await fetch("/api/user/veiculos");
      const data = await res.json();
      if (data.success) {
        const salvo = data.veiculos.some(
          (v) =>
            v.codigoMarca === marca &&
            v.codigoModelo === modelo &&
            v.anoModelo === ano
        );
        setVeiculoSalvo(salvo);
      }
    } catch (error) {
      console.error("Erro ao verificar veículo salvo:", error);
    }
  };

  const salvarVeiculo = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    setSalvandoVeiculo(true);
    try {
      const res = await fetch("/api/user/veiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_marca: marca,
          codigo_modelo: modelo,
          ano_modelo: ano,
          nome_marca: veiculo?.marca,
          nome_modelo: veiculo?.modelo,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setVeiculoSalvo(true);
      } else {
        alert(data.error || "Erro ao salvar veículo");
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor");
    } finally {
      setSalvandoVeiculo(false);
    }
  };

  const removerVeiculo = async () => {
    setSalvandoVeiculo(true);
    try {
      const res = await fetch("/api/user/veiculos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_marca: marca,
          codigo_modelo: modelo,
          ano_modelo: ano,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setVeiculoSalvo(false);
      } else {
        alert(data.error || "Erro ao remover veículo");
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor");
    } finally {
      setSalvandoVeiculo(false);
    }
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Se não está autenticado, buscar apenas preço atual
      if (!isAuthenticated) {
        const response = await fetch(
          `/api/preco-atual?marca=${marca}&modelo=${modelo}&ano=${ano}`
        );
        const data = await response.json();

        if (data.success) {
          setVeiculo(data.veiculo);
          // Criar um único registro de histórico para exibir o preço atual
          setHistorico([]);
          setEstatisticas({
            precoAtual: data.precoAtual.valorNumerico,
            precoInicial: data.precoAtual.valorNumerico,
            precoMinimo: data.precoAtual.valorNumerico,
            precoMaximo: data.precoAtual.valorNumerico,
            precoMedio: data.precoAtual.valorNumerico,
            variacaoTotal: 0,
            variacaoMensal: 0,
            previsao3Meses: data.precoAtual.valorNumerico,
            previsao6Meses: data.precoAtual.valorNumerico,
            tendencia: "estavel",
          });
        }
      } else {
        // Usuário logado - buscar histórico completo
        const response = await fetch(
          `/api/historico-veiculo?marca=${marca}&modelo=${modelo}&ano=${ano}&meses=${periodoSelecionado}`
        );
        const data = await response.json();

        if (data.success) {
          setVeiculo(data.veiculo);
          setHistorico(data.historico);
          calcularEstatisticas(data.historico);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarOutrosAnos = async () => {
    // Só carregar outros anos se estiver autenticado
    if (!isAuthenticated) {
      setOutrosAnos([]);
      return;
    }

    setLoadingOutrosAnos(true);
    try {
      const response = await fetch(
        `/api/anos-disponiveis?marca=${marca}&modelo=${modelo}`
      );
      const data = await response.json();

      if (data.success) {
        // Mostrar apenas anos não adicionados (sugestões)
        setOutrosAnos(data.sugestoes || []);
      }
    } catch (error) {
      console.error("Erro ao carregar outros anos:", error);
    } finally {
      setLoadingOutrosAnos(false);
    }
  };

  const adicionarOutroAno = async (anoId, anoLabel) => {
    setAdicionandoAno(anoId);
    try {
      const response = await fetch("/api/consultar-salvar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marcaId: marca,
          modeloId: modelo,
          anoId: anoId,
          meses: 24,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remover da lista de sugestões
        setOutrosAnos((prev) => prev.filter((a) => a.Value !== anoId));
        alert(
          `✅ ${anoLabel} adicionado com sucesso! ${data.registrosSalvos} registros salvos.`
        );
      } else {
        alert(`❌ Erro ao adicionar: ${data.error || "Erro desconhecido"}`);
      }
    } catch (error) {
      console.error("Erro ao adicionar ano:", error);
      alert(`❌ Erro ao adicionar: ${error.message}`);
    } finally {
      setAdicionandoAno(null);
    }
  };

  const calcularEstatisticas = (dados) => {
    if (!dados || dados.length === 0) return;

    const precos = dados.map((d) => parseFloat(d.preco_numerico));
    // Dados vêm do mais recente para o mais antigo
    const precoAtual = precos[0]; // primeiro = mais recente
    const precoInicial = precos[precos.length - 1]; // último = mais antigo
    const precoMinimo = Math.min(...precos);
    const precoMaximo = Math.max(...precos);
    const precoMedio = precos.reduce((a, b) => a + b, 0) / precos.length;

    // Variação total no período (do mais antigo para o mais recente)
    const variacaoTotal = ((precoAtual - precoInicial) / precoInicial) * 100;

    // Variação mensal média
    const variacaoMensal = variacaoTotal / dados.length;

    // Previsão para próximos 3 e 6 meses (baseado na tendência)
    const tendenciaMensal = (precoAtual - precoInicial) / dados.length;
    const previsao3Meses = precoAtual + tendenciaMensal * 3;
    const previsao6Meses = precoAtual + tendenciaMensal * 6;

    setEstatisticas({
      precoAtual,
      precoInicial,
      precoMinimo,
      precoMaximo,
      precoMedio,
      variacaoTotal,
      variacaoMensal,
      previsao3Meses,
      previsao6Meses,
      tendencia:
        variacaoTotal > 0 ? "alta" : variacaoTotal < 0 ? "baixa" : "estavel",
    });
  };

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

  // Dados do gráfico (invertidos para mostrar ordem cronológica: antigo → recente)
  const historicoGrafico = [...historico].reverse();

  const chartData = {
    labels: historicoGrafico.map((d) =>
      new Date(d.data_consulta).toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      })
    ),
    datasets: [
      {
        label: "Preço FIPE",
        data: historicoGrafico.map((d) => parseFloat(d.preco_numerico)),
        borderColor: "#e63946",
        backgroundColor: "rgba(230, 57, 70, 0.1)",
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: "#e63946",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function (context) {
            return formatarMoeda(context.raw);
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#666",
        },
      },
      y: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          color: "#666",
          callback: function (value) {
            return formatarMoeda(value);
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.loadingContent}>
            <div className={styles.loadingIcon}>📈</div>
            <h2 className={styles.loadingTitle}>Carregando histórico</h2>
            <p className={styles.loadingText}>Buscando dados do veículo...</p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill}></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Visitante (não autenticado) - mostrar apenas preço atual
  if (!veiculo && !isAuthenticated) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <h2>Veículo não encontrado</h2>
            <p>Faça uma nova consulta para ver o preço FIPE.</p>
            <Link href="/" className={styles.navButtonPrimary}>
              ← Fazer nova consulta
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!veiculo) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <h2>Nenhum dado encontrado</h2>
            <p>Não há histórico de preços para este veículo.</p>
            <Link href="/" className={styles.navButtonPrimary}>
              ← Fazer nova consulta
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <Head>
          <title>
            {veiculo
              ? `${veiculo.marca} ${veiculo.modelo} ${veiculo.ano} - Tabela FIPE`
              : "Tabela FIPE"}
          </title>
          <meta
            name="description"
            content="Histórico de preços FIPE do veículo"
          />
        </Head>

        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <Link href="/">Início</Link>
          <span>/</span>
          <Link href="/">Tabela FIPE</Link>
          <span>/</span>
          <span>
            {veiculo?.marca} {veiculo?.modelo}
          </span>
        </div>

        {/* Header do veículo */}
        <div className={styles.vehicleHeader}>
          <div className={styles.vehicleInfo}>
            <span className={styles.vehicleType}>Carro</span>
            <h1 className={styles.vehicleTitle}>
              {veiculo?.marca} {veiculo?.modelo}
            </h1>
            <p className={styles.vehicleYear}>{veiculo?.ano}</p>
          </div>

          <div className={styles.vehicleActions}>
            <button
              className={`${styles.saveButton} ${
                veiculoSalvo ? styles.saved : ""
              }`}
              onClick={veiculoSalvo ? removerVeiculo : salvarVeiculo}
              disabled={salvandoVeiculo}
              title={
                veiculoSalvo
                  ? "Remover dos favoritos"
                  : "Adicionar aos favoritos"
              }
            >
              {salvandoVeiculo ? (
                <span className={styles.saveSpinner}></span>
              ) : veiculoSalvo ? (
                <>
                  <span>⭐</span>
                  <span className={styles.saveText}>Salvo</span>
                </>
              ) : (
                <>
                  <span>☆</span>
                  <span className={styles.saveText}>Salvar</span>
                </>
              )}
            </button>

            <div className={styles.priceBox}>
              <span className={styles.priceLabel}>Preço FIPE Atual</span>
              <span className={styles.priceValue}>
                {estatisticas && formatarMoeda(estatisticas.precoAtual)}
              </span>
              {estatisticas && isAuthenticated && historico.length > 0 && (
                <span
                  className={`${styles.variation} ${
                    estatisticas.variacaoTotal > 0
                      ? styles.variationUp
                      : estatisticas.variacaoTotal < 0
                      ? styles.variationDown
                      : ""
                  }`}
                >
                  {formatarVariacao(estatisticas.variacaoTotal)} nos últimos{" "}
                  {periodoSelecionado} meses
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Banner para visitantes se registrarem */}
        {!isAuthenticated && (
          <div className={styles.loginBanner}>
            <div className={styles.loginBannerContent}>
              <span className={styles.loginBannerIcon}>🔒</span>
              <div className={styles.loginBannerText}>
                <h3>Acesse o histórico completo</h3>
                <p>
                  Crie uma conta gratuita para ver gráficos, previsões e todo o
                  histórico de preços FIPE.
                </p>
              </div>
              <div className={styles.loginBannerButtons}>
                <Link
                  href={`/login?redirect=${encodeURIComponent(
                    `/resultado?marca=${marca}&modelo=${modelo}&ano=${ano}`
                  )}`}
                  className={styles.loginBannerBtn}
                >
                  Entrar
                </Link>
                <Link href="/registro" className={styles.loginBannerBtnPrimary}>
                  Criar conta grátis
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Cards de estatísticas - Apenas para usuários logados */}
        {isAuthenticated && historico.length > 0 && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📊</div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Variação Mensal Média</span>
                <span className={styles.statValue}>
                  {estatisticas &&
                    formatarVariacao(estatisticas.variacaoMensal)}
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📉</div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Menor Preço</span>
                <span className={styles.statValue}>
                  {estatisticas && formatarMoeda(estatisticas.precoMinimo)}
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📈</div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Maior Preço</span>
                <span className={styles.statValue}>
                  {estatisticas && formatarMoeda(estatisticas.precoMaximo)}
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>⚖️</div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Preço Médio</span>
                <span className={styles.statValue}>
                  {estatisticas && formatarMoeda(estatisticas.precoMedio)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Seletor de período - Apenas para usuários logados */}
        {isAuthenticated && historico.length > 0 && (
          <div className={styles.periodSelector}>
            <span>Período:</span>
            <div className={styles.periodButtons}>
              {[6, 12, 24].map((meses) => (
                <button
                  key={meses}
                  className={`${styles.periodButton} ${
                    periodoSelecionado === meses
                      ? styles.periodButtonActive
                      : ""
                  }`}
                  onClick={() => setPeriodoSelecionado(meses)}
                >
                  {meses} meses
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Gráfico de evolução - Apenas para usuários logados */}
        {isAuthenticated && historico.length > 0 && (
          <div className={styles.chartSection}>
            <h2 className={styles.sectionTitle}>📈 Evolução do Preço FIPE</h2>
            <div className={styles.chartContainer}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Previsão - Apenas para usuários logados */}
        {isAuthenticated && estatisticas && historico.length > 0 && (
          <div className={styles.forecastSection}>
            <h2 className={styles.sectionTitle}>🔮 Previsão de Preço</h2>
            <div className={styles.forecastGrid}>
              <div className={styles.forecastCard}>
                <span className={styles.forecastPeriod}>Em 3 meses</span>
                <span className={styles.forecastValue}>
                  {formatarMoeda(estatisticas.previsao3Meses)}
                </span>
                <span
                  className={`${styles.forecastTrend} ${
                    estatisticas.previsao3Meses > estatisticas.precoAtual
                      ? styles.trendUp
                      : styles.trendDown
                  }`}
                >
                  {estatisticas.previsao3Meses > estatisticas.precoAtual
                    ? "↑ Tendência de alta"
                    : "↓ Tendência de baixa"}
                </span>
              </div>

              <div className={styles.forecastCard}>
                <span className={styles.forecastPeriod}>Em 6 meses</span>
                <span className={styles.forecastValue}>
                  {formatarMoeda(estatisticas.previsao6Meses)}
                </span>
                <span
                  className={`${styles.forecastTrend} ${
                    estatisticas.previsao6Meses > estatisticas.precoAtual
                      ? styles.trendUp
                      : styles.trendDown
                  }`}
                >
                  {estatisticas.previsao6Meses > estatisticas.precoAtual
                    ? "↑ Tendência de alta"
                    : "↓ Tendência de baixa"}
                </span>
              </div>
            </div>
            <p className={styles.forecastDisclaimer}>
              * Previsão baseada na tendência histórica. Valores podem variar.
            </p>
          </div>
        )}

        {/* Tabela de histórico - Apenas para usuários logados */}
        {isAuthenticated && historico.length > 0 && (
          <div className={styles.historySection}>
            <h2 className={styles.sectionTitle}>📋 Histórico de Preços</h2>
            <div className={styles.tableContainer}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Mês/Ano</th>
                    <th>Preço FIPE</th>
                    <th>Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((item, index) => {
                    const precoAtual = parseFloat(item.preco_numerico);
                    // Variação em relação ao mês anterior (que está na posição seguinte, pois dados são decrescentes)
                    const precoAnterior =
                      index < historico.length - 1
                        ? parseFloat(historico[index + 1].preco_numerico)
                        : precoAtual;
                    const variacao =
                      ((precoAtual - precoAnterior) / precoAnterior) * 100;

                    return (
                      <tr key={index}>
                        <td className={styles.dateCell}>
                          {new Date(item.data_consulta).toLocaleDateString(
                            "pt-BR",
                            {
                              month: "long",
                              year: "numeric",
                            }
                          )}
                        </td>
                        <td className={styles.priceCell}>
                          {formatarMoeda(precoAtual)}
                        </td>
                        <td
                          className={`${styles.variationCell} ${
                            variacao > 0
                              ? styles.variationUp
                              : variacao < 0
                              ? styles.variationDown
                              : ""
                          }`}
                        >
                          {index < historico.length - 1
                            ? formatarVariacao(variacao)
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sugestão de outros anos - Apenas para usuários logados */}
        {isAuthenticated && outrosAnos.length > 0 && (
          <div className={styles.suggestionsSection}>
            <h2 className={styles.sectionTitle}>🚗 Adicionar Outros Anos</h2>
            <p className={styles.suggestionsSubtitle}>
              Existem outros anos disponíveis para este modelo. Adicione para
              comparar a evolução de preços.
            </p>
            <div className={styles.suggestionsGrid}>
              {outrosAnos.map((anoItem) => (
                <div key={anoItem.Value} className={styles.suggestionCard}>
                  <span className={styles.suggestionYear}>{anoItem.Label}</span>
                  <button
                    className={styles.suggestionButton}
                    onClick={() =>
                      adicionarOutroAno(anoItem.Value, anoItem.Label)
                    }
                    disabled={adicionandoAno === anoItem.Value}
                  >
                    {adicionandoAno === anoItem.Value
                      ? "⏳ Adicionando..."
                      : "➕ Adicionar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navegação */}
        <div className={styles.navigation}>
          <Link href="/" className={styles.navButton}>
            ← Nova Consulta
          </Link>
          <Link href="/todos" className={styles.navButtonPrimary}>
            Ver Todos Veículos →
          </Link>
        </div>
      </div>
    </>
  );
}
