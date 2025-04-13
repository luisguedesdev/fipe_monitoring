// Mapas globais para armazenar os dados dos selects
let marcasMap = {}; // key: nome da marca em minúsculo → valor: código da marca
let modelosMap = {}; // key: nome do modelo em minúsculo → valor: código do modelo

// Função para carregar as marcas via endpoint /api/marcas e preencher o select "marcaSelect"
async function carregarMarcas() {
  try {
    const response = await fetch("/api/marcas");
    const data = await response.json();
    const select = document.getElementById("marcaSelect");
    select.innerHTML = `<option value="">-- Selecione --</option>`;
    const marcas = data.marcas || data.Marcas;
    if (marcas && Array.isArray(marcas)) {
      marcasMap = {};
      marcas.forEach((item) => {
        const label = item.Label || item.Nome || item.Descricao;
        const code = item.Value || item.Codigo;
        marcasMap[label.toLowerCase()] = code;
        const option = document.createElement("option");
        option.value = code;
        option.textContent = label;
        select.appendChild(option);
      });
    } else {
      console.error("Nenhuma marca encontrada:", data);
    }
  } catch (error) {
    console.error("Erro ao carregar marcas:", error);
  }
}

// Função para carregar os modelos para uma marca via endpoint /api/modelos e preencher o select "modeloSelect"
async function carregarModelos(marcaCode) {
  try {
    const response = await fetch(`/api/modelos?marca=${marcaCode}`);
    const data = await response.json();
    const select = document.getElementById("modeloSelect");
    select.innerHTML = `<option value="">-- Selecione --</option>`;
    let modelos = [];
    if (data.modelos) {
      if (Array.isArray(data.modelos)) {
        modelos = data.modelos;
      } else if (data.modelos.Modelos && Array.isArray(data.modelos.Modelos)) {
        modelos = data.modelos.Modelos;
      }
    } else if (data.Modelos && Array.isArray(data.Modelos)) {
      modelos = data.Modelos;
    }
    if (modelos.length > 0) {
      modelosMap = {};
      modelos.forEach((item) => {
        const label = item.Label || item.Nome || item.Descricao;
        const code = item.Value || item.Codigo;
        modelosMap[label.toLowerCase()] = code;
        const option = document.createElement("option");
        option.value = code;
        option.textContent = label;
        select.appendChild(option);
      });
      select.disabled = false;
    } else {
      select.disabled = true;
    }
  } catch (error) {
    console.error("Erro ao carregar modelos:", error);
  }
}

// Função para carregar os anos históricos registrados no banco via endpoint /api/anosHistoricos e preencher o select "anoSelect"
async function carregarAnosHistoricos(marcaCode, modeloCode) {
  try {
    const response = await fetch(
      `/api/anosHistoricos?marca=${marcaCode}&modelo=${modeloCode}`
    );
    const data = await response.json();
    const select = document.getElementById("anoSelect");
    select.innerHTML = `<option value="">-- Selecione --</option>`;
    if (data.anos && Array.isArray(data.anos) && data.anos.length > 0) {
      data.anos.forEach((item) => {
        // item.anoModelo deve estar no mesmo formato, ex.: "2019-3"
        const option = document.createElement("option");
        option.value = item.anoModelo;
        option.textContent = item.anoModelo;
        select.appendChild(option);
      });
      select.disabled = false;
    } else {
      select.disabled = true;
    }
  } catch (error) {
    console.error("Erro ao carregar anos históricos:", error);
  }
}

// Eventos para os selects
document.getElementById("marcaSelect").addEventListener("change", (e) => {
  const marcaCode = e.target.value;
  // Limpa os selects dependentes
  document.getElementById("modeloSelect").value = "";
  document.getElementById(
    "modeloSelect"
  ).innerHTML = `<option value="">-- Selecione --</option>`;
  document.getElementById("anoSelect").value = "";
  document.getElementById(
    "anoSelect"
  ).innerHTML = `<option value="">-- Selecione --</option>`;
  if (marcaCode) {
    carregarModelos(marcaCode);
  } else {
    document.getElementById("modeloSelect").disabled = true;
    document.getElementById("anoSelect").disabled = true;
  }
});

document.getElementById("modeloSelect").addEventListener("change", (e) => {
  const marcaCode = document.getElementById("marcaSelect").value;
  const modeloCode = e.target.value;
  // Limpa o select de anos
  document.getElementById("anoSelect").value = "";
  document.getElementById(
    "anoSelect"
  ).innerHTML = `<option value="">-- Selecione --</option>`;
  if (marcaCode && modeloCode) {
    carregarAnosHistoricos(marcaCode, modeloCode);
  } else {
    document.getElementById("anoSelect").disabled = true;
  }
});

// Evento submit: consulta o histórico do banco via endpoint /api/historicoDB e exibe os dados
document
  .getElementById("dashboardForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const marcaCode = document.getElementById("marcaSelect").value;
    const modeloCode = document.getElementById("modeloSelect").value;
    const anoSelecionado = document.getElementById("anoSelect").value; // formato esperado: "2019-3"
    if (!marcaCode || !modeloCode || !anoSelecionado) {
      alert("Preencha os campos Marca, Modelo e Ano.");
      return;
    }
    try {
      // Consulta o histórico no banco via endpoint /api/historicoDB
      const response = await fetch(
        `/api/historicoDB?marca=${marcaCode}&modelo=${modeloCode}&ano=${encodeURIComponent(
          anoSelecionado
        )}&tipoVeiculo=1`
      );
      const data = await response.json();
      if (data.error || !data.historico || data.historico.length === 0) {
        alert("Nenhum dado encontrado ou erro na consulta.");
        return;
      }
      console.log("Histórico recebido:", data.historico);

      // Extrai os dados para gráficos e cálculos dos indicadores
      const labels = [];
      const valores = [];
      data.historico.forEach((item) => {
        labels.push(item.referencia);
        let valorStr = item.preco;
        if (!valorStr || valorStr.trim().toUpperCase() === "N/D") {
          console.warn("Preço inválido para item, ignorando:", item);
          return;
        }
        // Ajusta caso o preço esteja salvo sem o "R$"
        const valorNum = parseFloat(
          valorStr
            .replace("R$", "")
            .replace(/\./g, "")
            .replace(/,/g, ".")
            .trim()
        );
        if (!isNaN(valorNum)) {
          valores.push(valorNum);
        } else {
          console.warn("Falha na conversão do preço:", valorStr);
        }
      });
      if (valores.length === 0) {
        alert("Nenhum preço válido encontrado no histórico.");
        return;
      }

      // Cálculo dos Indicadores
      // 1. Média dos preços históricos
      const soma = valores.reduce((a, b) => a + b, 0);
      const media = soma / valores.length;
      document.getElementById(
        "mediaValor"
      ).textContent = `Média dos Preços: R$ ${media.toFixed(2)}`;

      // 2. Depreciação histórica (do primeiro registro até o último)
      const precoInicial = valores[0];
      const precoAtual = valores[valores.length - 1];
      const depreciacaoPercent =
        ((precoInicial - precoAtual) / precoInicial) * 100;
      document.getElementById(
        "depreciacao"
      ).textContent = `Depreciação Histórica: ${depreciacaoPercent.toFixed(
        2
      )}%`;

      // 3. Previsão futura com regressão linear clássica
      const n = valores.length;
      const xVals = Array.from({ length: n }, (_, i) => i);
      const sumX = xVals.reduce((acc, val) => acc + val, 0);
      const sumY = valores.reduce((acc, val) => acc + val, 0);
      const sumXY = xVals.reduce((acc, val, i) => acc + val * valores[i], 0);
      const sumX2 = xVals.reduce((acc, val) => acc + val * val, 0);

      // Calcula a inclinação (slope) e o intercepto
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - Math.pow(sumX, 2));
      const meanX = sumX / n;
      const meanY = sumY / n;
      const intercept = meanY - slope * meanX;

      // Define o horizonte de previsão (ex.: previsão para 4 meses à frente)
      const futureOffset = 4;
      const futureX = n + futureOffset;
      const previsaoFutura = intercept + slope * futureX;

      // Calcula a depreciação futura (variação percentual entre o preço atual e o previsto)
      const depreciacaoFutura =
        ((precoAtual - previsaoFutura) / precoAtual) * 100;

      // Atualiza a exibição dos indicadores futuros
      document.getElementById("previsao").textContent =
        `Preço Futuro (em ${futureOffset} meses): R$ ${previsaoFutura.toFixed(
          2
        )} | ` + `Depreciação Futura: ${depreciacaoFutura.toFixed(2)}%`;

      // Plota o gráfico com Chart.js
      const ctx = document.getElementById("historicoChart").getContext("2d");
      if (window.historicoChartInstance) {
        window.historicoChartInstance.destroy();
      }
      window.historicoChartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Preço",
              data: valores,
              borderColor: "rgba(75, 192, 192, 1)",
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              fill: true,
              tension: 0.1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: false,
              ticks: {
                callback: function (value) {
                  return (
                    "R$ " +
                    value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                  );
                },
              },
            },
          },
        },
      });
    } catch (error) {
      console.error("Erro ao consultar histórico:", error);
      alert("Erro ao consultar histórico.");
    }
  });

// Função para limpar os campos do dashboard e os resultados exibidos
function limparCamposDashboard() {
  document.getElementById("dashboardForm").reset();
  document.getElementById(
    "modeloSelect"
  ).innerHTML = `<option value="">-- Selecione --</option>`;
  document.getElementById(
    "anoSelect"
  ).innerHTML = `<option value="">-- Selecione --</option>`;
  document.getElementById("modeloSelect").disabled = true;
  document.getElementById("anoSelect").disabled = true;
  if (window.historicoChartInstance) {
    window.historicoChartInstance.destroy();
  }
  document.getElementById("mediaValor").textContent = "Média dos Preços: N/A";
  document.getElementById("depreciacao").textContent =
    "Depreciação Histórica: N/A";
  document.getElementById("previsao").textContent =
    "Preço Futuro (Previsão): N/A";
}
document
  .getElementById("limparDashboard")
  .addEventListener("click", limparCamposDashboard);

// Ao carregar a página, carrega as marcas no select "marcaSelect"
window.addEventListener("load", carregarMarcas);
