import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Header from "../components/Header";
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
import styles from "../styles/Comparar.module.css";

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

// Cores para cada veículo no gráfico
const CORES_VEICULOS = [
  { border: "#e63946", background: "rgba(230, 57, 70, 0.1)" },
  { border: "#3498db", background: "rgba(52, 152, 219, 0.1)" },
  { border: "#2ecc71", background: "rgba(46, 204, 113, 0.1)" },
];

export default function CompararVeiculos() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [veiculos, setVeiculos] = useState([]);
  const [historicos, setHistoricos] = useState([]);
  const [periodoSelecionado, setPeriodoSelecionado] = useState(12);

  useEffect(() => {
    if (router.isReady) {
      // Pegar todos os parâmetros 'v' da URL
      const params = router.query.v;
      console.log("Query params v:", params);

      if (params) {
        // Garantir que seja sempre um array
        const veiculosParams = Array.isArray(params) ? params : [params];
        console.log("Veículos params:", veiculosParams);

        if (veiculosParams.length > 0) {
          carregarDados(veiculosParams);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.v, periodoSelecionado]);

  const carregarDados = async (veiculosParams) => {
    setLoading(true);
    try {
      const promises = veiculosParams.map(async (param) => {
        // Formato: marca-modelo-ano (onde ano pode ser "2015-3")
        // Precisamos separar apenas nos 2 primeiros hífens
        const partes = param.split("-");
        const marca = partes[0];
        const modelo = partes[1];
        // O ano é tudo depois do segundo hífen (pode conter hífen)
        const ano = partes.slice(2).join("-");

        const url = `/api/historico-veiculo?marca=${marca}&modelo=${modelo}&ano=${ano}&meses=${periodoSelecionado}`;
        console.log("Fetching URL:", url);
        const response = await fetch(url);
        const data = await response.json();
        console.log("Response for", param, ":", data);
        return data;
      });

      const resultados = await Promise.all(promises);
      console.log("Todos os resultados:", resultados);

      const veiculosData = [];
      const historicosData = [];

      resultados.forEach((data, index) => {
        if (data.success) {
          veiculosData.push({
            ...data.veiculo,
            cor: CORES_VEICULOS[index],
          });
          historicosData.push({
            veiculo: data.veiculo,
            historico: data.historico,
            cor: CORES_VEICULOS[index],
          });
        }
      });

      console.log("Veículos carregados:", veiculosData.length);
      setVeiculos(veiculosData);
      setHistoricos(historicosData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
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

  // Encontrar todas as datas únicas e criar labels unificados
  const criarLabelsUnificados = () => {
    const todasDatas = new Set();
    historicos.forEach(({ historico }) => {
      historico.forEach((h) => {
        const data = new Date(h.data_consulta);
        todasDatas.add(data.toISOString().split("T")[0]);
      });
    });
    return Array.from(todasDatas).sort();
  };

  // Criar dados do gráfico
  const criarDadosGrafico = () => {
    if (historicos.length === 0) return null;

    const datasUnificadas = criarLabelsUnificados();

    const labels = datasUnificadas.map((d) =>
      new Date(d).toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      })
    );

    const datasets = historicos.map(({ veiculo, historico, cor }) => {
      // Mapear preços para as datas unificadas
      const precosMap = new Map();
      historico.forEach((h) => {
        const dataStr = new Date(h.data_consulta).toISOString().split("T")[0];
        precosMap.set(dataStr, parseFloat(h.preco_numerico));
      });

      const data = datasUnificadas.map((d) => precosMap.get(d) || null);

      return {
        label: `${veiculo.marca} ${veiculo.modelo}`,
        data,
        borderColor: cor.border,
        backgroundColor: cor.background,
        borderWidth: 3,
        tension: 0.4,
        fill: false,
        pointRadius: 4,
        pointBackgroundColor: cor.border,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        spanGaps: true,
      };
    });

    return { labels, datasets };
  };

  const chartData = criarDadosGrafico();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "#fff",
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 12,
        callbacks: {
          label: function (context) {
            if (context.raw === null) return null;
            return `${context.dataset.label}: ${formatarMoeda(context.raw)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
        },
      },
      y: {
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          callback: function (value) {
            return formatarMoeda(value);
          },
        },
      },
    },
  };

  // Calcular estatísticas comparativas
  const calcularComparativo = () => {
    if (historicos.length === 0) return [];

    return historicos
      .map(({ veiculo, historico, cor }) => {
        if (!historico || historico.length === 0) return null;

        const precos = historico.map((h) => parseFloat(h.preco_numerico));
        const precoAtual = precos[0];
        const precoInicial = precos[precos.length - 1];
        const variacao = ((precoAtual - precoInicial) / precoInicial) * 100;

        return {
          veiculo,
          cor,
          precoAtual,
          precoInicial,
          variacao,
          precoMinimo: Math.min(...precos),
          precoMaximo: Math.max(...precos),
          totalRegistros: historico.length,
        };
      })
      .filter(Boolean);
  };

  const comparativo = calcularComparativo();

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Carregando comparação...</p>
        </div>
      </>
    );
  }

  if (veiculos.length === 0) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <Head>
            <title>Comparar Veículos - FIPE Monitor</title>
          </Head>
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📊</span>
            <h2>Nenhum veículo selecionado</h2>
            <p>Selecione até 3 veículos na lista para comparar</p>
            <Link href="/todos" className={styles.btnPrimary}>
              Ir para lista de veículos
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
          <title>Comparar Veículos - FIPE Monitor</title>
          <meta
            name="description"
            content="Compare preços de veículos da tabela FIPE"
          />
        </Head>

        <div className={styles.pageHeader}>
          <h1>📊 Comparar Veículos</h1>
          <p>
            Comparando {veiculos.length} veículo
            {veiculos.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className={styles.periodoContainer}>
          <label>Período de análise:</label>
          <div className={styles.periodoButtons}>
            {[3, 6, 12, 24, 36].map((meses) => (
              <button
                key={meses}
                className={`${styles.periodoBtn} ${
                  periodoSelecionado === meses ? styles.periodoAtivo : ""
                }`}
                onClick={() => setPeriodoSelecionado(meses)}
              >
                {meses}m
              </button>
            ))}
          </div>
        </div>

        <div className={styles.veiculosComparacao}>
          {comparativo.map((item, index) => (
            <div
              key={index}
              className={styles.veiculoCard}
              style={{ borderColor: item.cor.border }}
            >
              <div
                className={styles.corIndicador}
                style={{ backgroundColor: item.cor.border }}
              />
              <div className={styles.veiculoInfo}>
                <span className={styles.marca}>{item.veiculo.marca}</span>
                <h3 className={styles.modelo}>{item.veiculo.modelo}</h3>
                <span className={styles.ano}>{item.veiculo.ano}</span>
              </div>
              <div className={styles.veiculoPreco}>
                <span className={styles.precoAtual}>
                  {formatarMoeda(item.precoAtual)}
                </span>
                <span
                  className={`${styles.variacao} ${
                    item.variacao > 0
                      ? styles.variacaoUp
                      : item.variacao < 0
                      ? styles.variacaoDown
                      : ""
                  }`}
                >
                  {formatarVariacao(item.variacao)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {chartData && (
          <div className={styles.graficoContainer}>
            <h2>📈 Evolução de Preços</h2>
            <div className={styles.grafico}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        <div className={styles.tabelaContainer}>
          <h2>📋 Tabela Comparativa</h2>
          <div className={styles.tabelaWrapper}>
            <table className={styles.tabela}>
              <thead>
                <tr>
                  <th>Veículo</th>
                  <th>Preço Atual</th>
                  <th>Variação</th>
                  <th>Mínimo</th>
                  <th>Máximo</th>
                  <th>Registros</th>
                </tr>
              </thead>
              <tbody>
                {comparativo.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <div className={styles.veiculoTabela}>
                        <span
                          className={styles.corBadge}
                          style={{ backgroundColor: item.cor.border }}
                        />
                        <div>
                          <strong>{item.veiculo.modelo}</strong>
                          <span>
                            {item.veiculo.marca} • {item.veiculo.ano}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.precoCell}>
                      {formatarMoeda(item.precoAtual)}
                    </td>
                    <td>
                      <span
                        className={`${styles.variacaoBadge} ${
                          item.variacao > 0
                            ? styles.variacaoUp
                            : item.variacao < 0
                            ? styles.variacaoDown
                            : ""
                        }`}
                      >
                        {formatarVariacao(item.variacao)}
                      </span>
                    </td>
                    <td>{formatarMoeda(item.precoMinimo)}</td>
                    <td>{formatarMoeda(item.precoMaximo)}</td>
                    <td>{item.totalRegistros}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {comparativo.length >= 2 && (
          <div className={styles.diferencaContainer}>
            <h2>💰 Diferença de Preços</h2>
            <div className={styles.diferencaGrid}>
              {comparativo.map((item1, i) =>
                comparativo.slice(i + 1).map((item2, j) => {
                  const diferenca = item1.precoAtual - item2.precoAtual;
                  const diferencaPercent = (diferenca / item2.precoAtual) * 100;
                  return (
                    <div key={`${i}-${j}`} className={styles.diferencaCard}>
                      <div className={styles.diferencaVeiculos}>
                        <span style={{ color: item1.cor.border }}>
                          {item1.veiculo.modelo}
                        </span>
                        <span className={styles.vs}>vs</span>
                        <span style={{ color: item2.cor.border }}>
                          {item2.veiculo.modelo}
                        </span>
                      </div>
                      <div className={styles.diferencaValor}>
                        <span
                          className={diferenca > 0 ? styles.mais : styles.menos}
                        >
                          {diferenca > 0 ? "+" : ""}
                          {formatarMoeda(diferenca)}
                        </span>
                        <span className={styles.diferencaPercent}>
                          ({diferencaPercent > 0 ? "+" : ""}
                          {diferencaPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className={styles.navigation}>
          <Link href="/todos" className={styles.btnSecondary}>
            ← Voltar para lista
          </Link>
        </div>
      </div>
    </>
  );
}
