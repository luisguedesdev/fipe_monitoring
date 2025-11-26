import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import styles from "../styles/Dashboard.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [dadosBanco, setDadosBanco] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [anos, setAnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultsVisible, setResultsVisible] = useState(false);

  // Estados dos selects
  const [marcaSelecionada, setMarcaSelecionada] = useState("");
  const [modeloSelecionado, setModeloSelecionado] = useState("");
  const [anoSelecionado, setAnoSelecionado] = useState("");

  // Dados para gráficos
  const [estatisticas, setEstatisticas] = useState({
    precoAtual: "-",
    variacao: "-",
    totalRegistros: "-",
    tendencia: "-",
  });

  // Carregar dados do banco ao montar componente
  useEffect(() => {
    carregarDadosBanco();
  }, []);

  const carregarDadosBanco = async () => {
    try {
      const response = await fetch("/api/historico");
      const data = await response.json();

      if (data.success) {
        setDadosBanco(data.registros);
        const marcasUnicas = [
          ...new Set(data.registros.map((r) => r.nome_marca).filter(Boolean)),
        ];
        setMarcas(marcasUnicas);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do banco:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarModelos = () => {
    if (!marcaSelecionada) return;

    const modelosFiltrados = [
      ...new Set(
        dadosBanco
          .filter((r) => r.nome_marca === marcaSelecionada)
          .map((r) => r.nome_modelo)
          .filter(Boolean)
      ),
    ];
    setModelos(modelosFiltrados);
    setAnoSelecionado("");
    setAnos([]);
  };

  const carregarAnos = () => {
    if (!marcaSelecionada || !modeloSelecionado) return;

    const anosFiltrados = [
      ...new Set(
        dadosBanco
          .filter(
            (r) =>
              r.nome_marca === marcaSelecionada &&
              r.nome_modelo === modeloSelecionado
          )
          .map((r) => r.nome_ano)
          .filter(Boolean)
      ),
    ];
    setAnos(anosFiltrados);
  };

  useEffect(() => {
    carregarModelos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcaSelecionada, dadosBanco]);

  useEffect(() => {
    carregarAnos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeloSelecionado, dadosBanco]);

  const analisarDados = () => {
    if (!marcaSelecionada || !modeloSelecionado || !anoSelecionado) {
      alert("Selecione marca, modelo e ano!");
      return;
    }

    setLoading(true);

    try {
      // Filtrar dados
      const dadosFiltrados = dadosBanco
        .filter(
          (r) =>
            r.nome_marca === marcaSelecionada &&
            r.nome_modelo === modeloSelecionado &&
            r.nome_ano === anoSelecionado
        )
        .sort((a, b) => new Date(a.data_consulta) - new Date(b.data_consulta));

      if (dadosFiltrados.length === 0) {
        alert("Nenhum dado encontrado para a seleção atual.");
        return;
      }

      // Calcular estatísticas
      const precos = dadosFiltrados.map((d) =>
        parseFloat(d.preco.replace(/[^\d,]/g, "").replace(",", "."))
      );
      const precoAtual = precos[precos.length - 1];
      const precoAnterior =
        precos.length > 1 ? precos[precos.length - 2] : precoAtual;
      const variacao = (
        ((precoAtual - precoAnterior) / precoAnterior) *
        100
      ).toFixed(2);

      // Atualizar estatísticas
      setEstatisticas({
        precoAtual: `R$ ${precoAtual.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}`,
        variacao: `${variacao > 0 ? "+" : ""}${variacao}%`,
        totalRegistros: dadosFiltrados.length,
        tendencia:
          variacao > 0 ? "📈 Alta" : variacao < 0 ? "📉 Baixa" : "➡️ Estável",
      });

      setResultsVisible(true);
    } catch (error) {
      console.error("Erro na análise:", error);
      alert("Erro ao analisar dados.");
    } finally {
      setLoading(false);
    }
  };

  const dadosGrafico = dadosBanco
    .filter(
      (r) =>
        r.nome_marca === marcaSelecionada &&
        r.nome_modelo === modeloSelecionado &&
        r.nome_ano === anoSelecionado
    )
    .sort((a, b) => new Date(a.data_consulta) - new Date(b.data_consulta));

  const chartData = {
    labels: dadosGrafico.map((d) =>
      new Date(d.data_consulta).toLocaleDateString("pt-BR")
    ),
    datasets: [
      {
        label: "Preço (R$)",
        data: dadosGrafico.map((d) =>
          parseFloat(d.preco.replace(/[^\d,]/g, "").replace(",", "."))
        ),
        borderColor: "#667eea",
        backgroundColor: "rgba(102, 126, 234, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function (value) {
            return "R$ " + value.toLocaleString("pt-BR");
          },
        },
      },
    },
  };

  if (loading && dadosBanco.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Dashboard FIPE - Análise e Previsão</title>
        <meta
          name="description"
          content="Dashboard de análise de preços FIPE"
        />
      </Head>

      <div className={styles.header}>
        <h1>📊 Dashboard FIPE</h1>
        <p>Análise e Previsão de Preços de Veículos</p>
      </div>

      <div className={styles.dashboardContent}>
        <div className={styles.filters}>
          <h3>🔍 Selecionar Veículo</h3>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <label>Marca</label>
              <select
                value={marcaSelecionada}
                onChange={(e) => setMarcaSelecionada(e.target.value)}
                className={styles.select}
              >
                <option value="">Selecione uma marca</option>
                {marcas.map((marca) => (
                  <option key={marca} value={marca}>
                    {marca}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Modelo</label>
              <select
                value={modeloSelecionado}
                onChange={(e) => setModeloSelecionado(e.target.value)}
                disabled={!marcaSelecionada}
                className={styles.select}
              >
                <option value="">
                  {marcaSelecionada
                    ? "Selecione um modelo"
                    : "Primeiro selecione uma marca"}
                </option>
                {modelos.map((modelo) => (
                  <option key={modelo} value={modelo}>
                    {modelo}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Ano</label>
              <select
                value={anoSelecionado}
                onChange={(e) => setAnoSelecionado(e.target.value)}
                disabled={!modeloSelecionado}
                className={styles.select}
              >
                <option value="">
                  {modeloSelecionado
                    ? "Selecione um ano"
                    : "Primeiro selecione um modelo"}
                </option>
                {anos.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>&nbsp;</label>
              <button
                onClick={analisarDados}
                disabled={
                  !marcaSelecionada ||
                  !modeloSelecionado ||
                  !anoSelecionado ||
                  loading
                }
                className={styles.btnAnalisar}
              >
                📊 Analisar e Prever
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Analisando dados e gerando previsões...</p>
          </div>
        )}

        {resultsVisible && (
          <div id="resultsContainer">
            <div className={styles.statsContainer}>
              <div className={styles.statCard}>
                <h4>Preço Atual</h4>
                <div className={styles.value}>{estatisticas.precoAtual}</div>
                <div className={styles.label}>Último registro</div>
              </div>

              <div className={styles.statCard}>
                <h4>Variação</h4>
                <div className={styles.value}>{estatisticas.variacao}</div>
                <div className={styles.label}>Último período</div>
              </div>

              <div className={styles.statCard}>
                <h4>Registros</h4>
                <div className={styles.value}>
                  {estatisticas.totalRegistros}
                </div>
                <div className={styles.label}>No banco de dados</div>
              </div>

              <div className={styles.statCard}>
                <h4>Tendência</h4>
                <div className={styles.value}>{estatisticas.tendencia}</div>
                <div className={styles.label}>Previsão</div>
              </div>
            </div>

            <div className={styles.chartsContainer}>
              <div className={styles.chartCard}>
                <h4>📈 Evolução de Preços</h4>
                <div className={styles.chartContainer}>
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>

              <div className={styles.chartCard}>
                <h4>🔮 Previsão Futura</h4>
                <div className={styles.chartContainer}>
                  <Bar data={chartData} options={chartOptions} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.navigation}>
        <Link href="/" className={styles.navLink}>
          🔍 Nova Consulta
        </Link>
        <Link href="/todos" className={styles.navLink}>
          📋 Ver Registros
        </Link>
      </div>
    </div>
  );
}
