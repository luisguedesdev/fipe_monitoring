import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
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

  const [loading, setLoading] = useState(true);
  const [veiculo, setVeiculo] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [periodoSelecionado, setPeriodoSelecionado] = useState(12);

  useEffect(() => {
    if (marca && modelo && ano) {
      carregarDados();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marca, modelo, ano, periodoSelecionado]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/historico-veiculo?marca=${marca}&modelo=${modelo}&ano=${ano}&meses=${periodoSelecionado}`
      );
      const data = await response.json();

      if (data.success) {
        setVeiculo(data.veiculo);
        setHistorico(data.historico);
        calcularEstatisticas(data.historico);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
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
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Carregando dados do veículo...</p>
      </div>
    );
  }

  if (!veiculo || !historico.length) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Nenhum dado encontrado</h2>
          <p>Não há histórico de preços para este veículo.</p>
          <Link href="/" className={styles.navButtonPrimary}>
            ← Fazer nova consulta
          </Link>
        </div>
      </div>
    );
  }

  return (
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

        <div className={styles.priceBox}>
          <span className={styles.priceLabel}>Preço FIPE Atual</span>
          <span className={styles.priceValue}>
            {estatisticas && formatarMoeda(estatisticas.precoAtual)}
          </span>
          {estatisticas && (
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

      {/* Cards de estatísticas */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Variação Mensal Média</span>
            <span className={styles.statValue}>
              {estatisticas && formatarVariacao(estatisticas.variacaoMensal)}
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

      {/* Seletor de período */}
      <div className={styles.periodSelector}>
        <span>Período:</span>
        <div className={styles.periodButtons}>
          {[6, 12, 24].map((meses) => (
            <button
              key={meses}
              className={`${styles.periodButton} ${
                periodoSelecionado === meses ? styles.periodButtonActive : ""
              }`}
              onClick={() => setPeriodoSelecionado(meses)}
            >
              {meses} meses
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico de evolução */}
      <div className={styles.chartSection}>
        <h2 className={styles.sectionTitle}>📈 Evolução do Preço FIPE</h2>
        <div className={styles.chartContainer}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Previsão */}
      {estatisticas && (
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

      {/* Tabela de histórico */}
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
                    <td>
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

      {/* Navegação */}
      <div className={styles.navigation}>
        <Link href="/" className={styles.navButton}>
          ← Nova Consulta
        </Link>
        <Link href="/dashboard" className={styles.navButtonPrimary}>
          Ver Dashboard Completo →
        </Link>
      </div>
    </div>
  );
}
