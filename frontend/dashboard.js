let veiculos = [];
let currentChart = null;
let historicoDados = null;

// Configurações de cores e estilos
const colors = {
  primary: "#667eea",
  secondary: "#764ba2",
  success: "#27ae60",
  danger: "#e74c3c",
  warning: "#f39c12",
  info: "#3498db",
  gradient: ["#667eea", "#764ba2", "#f093fb", "#f5576c", "#4facfe", "#00f2fe"],
};

// Utilitários
function showLoading(show = true) {
  document.getElementById("loading").style.display = show ? "block" : "none";
}

function showElement(elementId, show = true) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = show ? "block" : "none";
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parsePriceToNumber(priceStr) {
  if (!priceStr || priceStr === "N/D") return 0;
  return parseFloat(priceStr.replace(/[R$\.\s]/g, "").replace(",", "."));
}

function calcularEstatisticas(dados) {
  const precos = dados
    .filter((item) => item.preco !== "N/D")
    .map((item) => parsePriceToNumber(item.preco));

  if (precos.length === 0) return null;

  const precoAtual = precos[0];
  const precoAntigo = precos[precos.length - 1];
  const variacao =
    precos.length > 1 ? ((precoAtual - precoAntigo) / precoAntigo) * 100 : 0;
  const media = precos.reduce((a, b) => a + b, 0) / precos.length;
  const maximo = Math.max(...precos);
  const minimo = Math.min(...precos);

  // Calcular volatilidade (desvio padrão)
  const variancia =
    precos.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) /
    precos.length;
  const volatilidade = Math.sqrt(variancia);

  return {
    precoAtual,
    precoAntigo,
    variacao,
    media,
    maximo,
    minimo,
    volatilidade,
    totalMeses: precos.length,
  };
}

function criarAlertas(stats) {
  if (!stats) return "";

  let alertas = [];

  if (Math.abs(stats.variacao) > 15) {
    const tipo = stats.variacao > 0 ? "alta" : "baixa";
    const cor = stats.variacao > 0 ? colors.danger : colors.success;
    alertas.push({
      texto: `Variação significativa de ${stats.variacao.toFixed(
        1
      )}% (${tipo} acentuada)`,
      cor: cor,
      icone: stats.variacao > 0 ? "fa-arrow-up" : "fa-arrow-down",
    });
  }

  if (stats.volatilidade > stats.media * 0.1) {
    alertas.push({
      texto: "Alta volatilidade detectada - preços instáveis",
      cor: colors.warning,
      icone: "fa-exclamation-triangle",
    });
  }

  if (stats.precoAtual === stats.maximo) {
    alertas.push({
      texto: "Preço atual está no pico histórico",
      cor: colors.danger,
      icone: "fa-mountain",
    });
  }

  if (stats.precoAtual === stats.minimo) {
    alertas.push({
      texto: "Preço atual está no mínimo histórico",
      cor: colors.success,
      icone: "fa-valley",
    });
  }

  if (alertas.length === 0) {
    alertas.push({
      texto: "Preços estáveis dentro da normalidade",
      cor: colors.success,
      icone: "fa-check-circle",
    });
  }

  return alertas
    .map(
      (alerta) => `
    <div style="background: ${alerta.cor}; color: white; padding: 15px; margin: 10px 0; border-radius: 10px; display: flex; align-items: center; gap: 10px;">
      <i class="fas ${alerta.icone}"></i>
      <span>${alerta.texto}</span>
    </div>
  `
    )
    .join("");
}

function calcularPrevisaoAvancada(dados, meses = 3) {
  const precos = dados
    .filter((item) => item.preco !== "N/D")
    .map((item) => parsePriceToNumber(item.preco))
    .reverse(); // Ordem cronológica crescente

  if (precos.length < 3) return null;

  // Regressão linear simples
  const n = precos.length;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const y = precos;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calcular R²
  const yMean = sumY / n;
  const ssRes = y.reduce((sum, yi, i) => {
    const predicted = slope * x[i] + intercept;
    return sum + Math.pow(yi - predicted, 2);
  }, 0);
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const r2 = 1 - ssRes / ssTot;

  // Gerar previsões
  const previsoes = [];
  for (let i = 1; i <= meses; i++) {
    const previsao = slope * (n + i) + intercept;
    previsoes.push(Math.max(0, previsao)); // Não permitir preços negativos
  }

  return {
    previsoes,
    tendencia: slope > 0 ? "alta" : slope < 0 ? "baixa" : "estável",
    confianca: r2,
    slope,
  };
}

async function carregarVeiculos() {
  try {
    showLoading(true);
    console.log("🔄 Buscando registros do backend...");
    const res = await fetch("/api/todos-registros");
    const data = await res.json();

    console.log("✅ Dados recebidos:", data.registros);

    const veiculosMap = new Map();

    data.registros.forEach((registro) => {
      const key = `${registro.codigoMarca}-${registro.codigoModelo}`;
      if (!veiculosMap.has(key)) {
        veiculosMap.set(key, {
          codigoMarca: registro.codigoMarca,
          codigoModelo: registro.codigoModelo,
          nomeMarca: registro.nomeMarca,
          nomeModelo: registro.nomeModelo,
          anos: new Set(),
        });
      }
      veiculosMap.get(key).anos.add(registro.nomeAno);
    });

    veiculos = Array.from(veiculosMap.values()).map((v) => ({
      ...v,
      anos: Array.from(v.anos),
    }));

    console.log("📦 Veículos processados:", veiculos);

    const veiculosSelect = document.getElementById("veiculosSelect");
    veiculosSelect.innerHTML = '<option value="">Selecione um veículo</option>';

    veiculos.forEach((v, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `${v.nomeMarca} - ${v.nomeModelo}`;
      veiculosSelect.appendChild(opt);
    });

    console.log("✅ Select de veículos populado.");
  } catch (err) {
    console.error("❌ Erro ao carregar veículos:", err);
    showElement("alertas", true);
    document.getElementById("alertas").innerHTML = `
      <div style="background: ${colors.danger}; color: white; padding: 15px; border-radius: 10px;">
        <i class="fas fa-exclamation-circle"></i> Erro ao carregar veículos. Tente recarregar a página.
      </div>
    `;
  } finally {
    showLoading(false);
  }
}

function atualizarAnos(index) {
  console.log(
    "🔁 Atualizando anos para o veículo selecionado:",
    veiculos[index]
  );
  const anosSelect = document.getElementById("anosSelect");
  anosSelect.innerHTML = "";

  if (veiculos[index]) {
    anosSelect.innerHTML = '<option value="">Selecione um ano</option>';
    veiculos[index].anos.forEach((ano) => {
      const opt = document.createElement("option");
      opt.value = ano;
      opt.textContent = ano;
      anosSelect.appendChild(opt);
    });
    console.log("✅ Anos inseridos no select:", veiculos[index].anos);
  } else {
    anosSelect.innerHTML =
      '<option value="">Selecione primeiro um veículo</option>';
    console.warn("⚠️ Nenhum veículo válido selecionado.");
  }
}

async function gerarGrafico() {
  const veiculoIndex = document.getElementById("veiculosSelect").value;
  const nomeAno = document.getElementById("anosSelect").value;
  const mesesAdiante = parseInt(document.getElementById("mesFuturo").value);
  const tipoGrafico = document.getElementById("tipoGrafico").value;

  const veiculo = veiculos[veiculoIndex];
  if (!veiculo || !nomeAno) {
    showElement("alertas", true);
    document.getElementById("alertas").innerHTML = `
      <div style="background: ${colors.warning}; color: white; padding: 15px; border-radius: 10px;">
        <i class="fas fa-exclamation-circle"></i> Selecione um veículo e ano para continuar.
      </div>
    `;
    return;
  }

  console.log(`📊 Gerando gráfico para:`, veiculo, "Ano:", nomeAno);

  try {
    showLoading(true);
    const res = await fetch(
      `/api/dashboard/${veiculo.codigoMarca}/${
        veiculo.codigoModelo
      }?ano=${encodeURIComponent(nomeAno)}`
    );
    const data = await res.json();

    console.log("📈 Dados de histórico recebidos:", data);

    if (!data.historico || data.historico.length === 0) {
      showElement("alertas", true);
      document.getElementById("alertas").innerHTML = `
        <div style="background: ${colors.danger}; color: white; padding: 15px; border-radius: 10px;">
          <i class="fas fa-exclamation-circle"></i> Sem dados históricos para o ano selecionado.
        </div>
      `;
      return;
    }

    historicoDados = data.historico;
    const stats = calcularEstatisticas(data.historico);
    const previsaoData = calcularPrevisaoAvancada(data.historico, mesesAdiante);

    // Mostrar estatísticas
    showElement("estatisticas", true);
    document.getElementById("estatisticas").innerHTML = `
      <div class="card">
        <h2><i class="fas fa-analytics"></i> Estatísticas - ${
          veiculo.nomeMarca
        } ${veiculo.nomeModelo} ${nomeAno}</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${formatCurrency(stats.precoAtual)}</div>
            <div class="stat-label">Preço Atual</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${
              stats.variacao >= 0 ? "+" : ""
            }${stats.variacao.toFixed(1)}%</div>
            <div class="stat-label">Variação Total</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${formatCurrency(stats.media)}</div>
            <div class="stat-label">Preço Médio</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${formatCurrency(stats.volatilidade)}</div>
            <div class="stat-label">Volatilidade</div>
          </div>
        </div>
      </div>
    `;

    // Preparar dados do gráfico
    const labels = data.historico.map((item) => item.referencia);
    const valores = data.historico.map((item) =>
      parsePriceToNumber(item.preco)
    );

    // Adicionar previsões
    const labelsComPrevisao = [...labels];
    const valoresComPrevisao = [...valores];
    const previsaoValues = [];

    if (previsaoData) {
      for (let i = 0; i < mesesAdiante; i++) {
        labelsComPrevisao.push(`Previsão ${i + 1}m`);
        valoresComPrevisao.push(null);
        previsaoValues.push(previsaoData.previsoes[i]);
      }
    }

    // Criar gráfico
    const ctx = document.getElementById("grafico").getContext("2d");
    if (currentChart) currentChart.destroy();

    const datasets = [
      {
        label: `Histórico - ${nomeAno}`,
        data: valores,
        borderColor: colors.primary,
        backgroundColor:
          tipoGrafico === "area" ? `${colors.primary}20` : colors.primary,
        borderWidth: 3,
        fill: tipoGrafico === "area",
        tension: 0.4,
        pointBackgroundColor: colors.primary,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ];

    if (previsaoData && previsaoData.previsoes.length > 0) {
      datasets.push({
        label: `Previsão (${(previsaoData.confianca * 100).toFixed(
          1
        )}% confiança)`,
        data: [...Array(valores.length).fill(null), ...previsaoData.previsoes],
        borderColor: colors.warning,
        backgroundColor: `${colors.warning}20`,
        borderWidth: 3,
        borderDash: [10, 5],
        fill: false,
        tension: 0.4,
        pointBackgroundColor: colors.warning,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      });
    }

    currentChart = new Chart(ctx, {
      type: tipoGrafico === "area" ? "line" : tipoGrafico,
      data: {
        labels: labelsComPrevisao,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              font: {
                size: 14,
                weight: "bold",
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleColor: "#fff",
            bodyColor: "#fff",
            borderColor: colors.primary,
            borderWidth: 1,
            cornerRadius: 10,
            displayColors: true,
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${formatCurrency(
                  context.parsed.y
                )}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
            ticks: {
              callback: function (value) {
                return formatCurrency(value);
              },
              font: {
                size: 12,
              },
            },
          },
          x: {
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
            ticks: {
              font: {
                size: 12,
              },
            },
          },
        },
        animation: {
          duration: 2000,
          easing: "easeInOutQuart",
        },
      },
    });

    showElement("chartContainer", true);

    // Mostrar informações de previsão
    if (previsaoData) {
      showElement("previsaoInfo", true);
      const tendenciaIcon =
        previsaoData.tendencia === "alta"
          ? "fa-arrow-up"
          : previsaoData.tendencia === "baixa"
          ? "fa-arrow-down"
          : "fa-minus";
      const tendenciaCor =
        previsaoData.tendencia === "alta"
          ? colors.success
          : previsaoData.tendencia === "baixa"
          ? colors.danger
          : colors.info;

      document.getElementById("previsaoInfo").innerHTML = `
        <div class="prediction-info">
          <h3><i class="fas fa-crystal-ball"></i> Análise Preditiva</h3>
          <p><strong>Tendência:</strong> 
            <i class="fas ${tendenciaIcon}" style="color: ${tendenciaCor}"></i> 
            ${previsaoData.tendencia.toUpperCase()}
          </p>
          <p><strong>Previsão para ${mesesAdiante} mês(es):</strong> ${formatCurrency(
        previsaoData.previsoes[mesesAdiante - 1]
      )}</p>
          <p><strong>Confiança do modelo:</strong> ${(
            previsaoData.confianca * 100
          ).toFixed(1)}%</p>
          <p><strong>Taxa de crescimento mensal:</strong> ${formatCurrency(
            Math.abs(previsaoData.slope)
          )}</p>
        </div>
      `;
    }

    // Mostrar alertas
    showElement("alertas", true);
    document.getElementById("alertas").innerHTML = `
      <div class="card">
        <h2><i class="fas fa-bell"></i> Alertas e Insights</h2>
        ${criarAlertas(stats)}
      </div>
    `;
  } catch (err) {
    console.error("❌ Erro ao gerar gráfico:", err);
    showElement("alertas", true);
    document.getElementById("alertas").innerHTML = `
      <div style="background: ${colors.danger}; color: white; padding: 15px; border-radius: 10px;">
        <i class="fas fa-exclamation-circle"></i> Erro ao gerar gráfico. Tente novamente.
      </div>
    `;
  } finally {
    showLoading(false);
  }
}

function exportChart() {
  if (currentChart) {
    const link = document.createElement("a");
    link.download = "grafico-fipe.png";
    link.href = currentChart.toBase64Image();
    link.click();
  }
}

function toggleFullscreen() {
  const container = document.getElementById("chartContainer");
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch((err) => {
      console.log(`Erro ao entrar em tela cheia: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  carregarVeiculos();

  document.getElementById("veiculosSelect").addEventListener("change", (e) => {
    atualizarAnos(e.target.value);
    // Esconder resultados anteriores
    showElement("estatisticas", false);
    showElement("chartContainer", false);
    showElement("previsaoInfo", false);
    showElement("alertas", false);
  });

  document.getElementById("btnPrever").addEventListener("click", gerarGrafico);

  document.getElementById("anosSelect").addEventListener("change", () => {
    // Esconder resultados anteriores quando trocar ano
    showElement("estatisticas", false);
    showElement("chartContainer", false);
    showElement("previsaoInfo", false);
    showElement("alertas", false);
  });
});
