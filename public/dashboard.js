// dashboard.js

// Mapas globais para armazenar os dados dos selects
let marcasMap = {}; // key: nome da marca (em minúsculo) → valor: código da marca
let modelosMap = {}; // key: nome do modelo (em minúsculo) → valor: código do modelo

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
        option.value = code; // armazena o código da marca
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

// Função para carregar os modelos para uma marca (endpoint /api/modelos)
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
        option.value = code; // armazena o código do modelo
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

// Função para carregar os anos históricos registrados no banco (endpoint /api/anosHistoricos)
// Para o veículo selecionado, espera que cada item tenha a propriedade "anoModelo" (ex.: "2019-3")
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
        const option = document.createElement("option");
        option.value = item.anoModelo; // deve ser o mesmo formato registrado no banco
        option.textContent = item.anoModelo;
        select.appendChild(option);
      });
      select.disabled = false;
    } else {
      // Se nenhum ano for encontrado, permite digitação manual
      select.disabled = false;
    }
  } catch (error) {
    console.error("Erro ao carregar anos históricos:", error);
  }
}

// Eventos para os selects:

// Quando a marca mudar, limpa os selects de modelo e ano e chama carregarModelos
document.getElementById("marcaSelect").addEventListener("change", (e) => {
  const marcaCode = e.target.value;
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

// Quando o modelo mudar, limpa o select de ano e chama carregarAnosHistoricos
document.getElementById("modeloSelect").addEventListener("change", (e) => {
  const marcaCode = document.getElementById("marcaSelect").value;
  const modeloCode = e.target.value;
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

// Evento submit do formulário: consulta o endpoint /api/historico para obter o histórico
document
  .getElementById("dashboardForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const marcaCode = document.getElementById("marcaSelect").value;
    const modeloCode = document.getElementById("modeloSelect").value;
    const anoSelecionado = document.getElementById("anoSelect").value;
    if (!marcaCode || !modeloCode || !anoSelecionado) {
      alert("Preencha os campos Marca, Modelo e Ano.");
      return;
    }
    try {
      // O endpoint /api/historico espera que o parâmetro "ano" seja exatamente o que foi registrado (por exemplo, "2019-3")
      const response = await fetch(
        `/api/historico?marca=${marcaCode}&modelo=${modeloCode}&ano=${encodeURIComponent(
          anoSelecionado
        )}&tipoVeiculo=1`
      );
      const data = await response.json();
      if (data.error || !data.historico || data.historico.length === 0) {
        alert("Nenhum dado encontrado ou erro na consulta.");
        return;
      }
      console.log("Histórico recebido:", data.historico); // Debug: mostra os dados no console

      // Processa os dados para gerar o gráfico e indicadores
      const labels = [];
      const valores = [];
      data.historico.forEach((item) => {
        labels.push(item.referencia);
        let valorStr = item.preco;
        if (!valorStr || valorStr.trim().toUpperCase() === "N/D") {
          console.warn("Preço inválido para item, ignorando:", item);
          return;
        }
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

      // Calcula a média dos preços
      const soma = valores.reduce((a, b) => a + b, 0);
      const media = soma / valores.length;
      document.getElementById(
        "mediaValor"
      ).textContent = `Média dos Preços: R$ ${media.toFixed(2)}`;

      // Calcula a depreciação: assume que os registros estão ordenados cronologicamente
      const precoInicial = valores[0];
      const precoAtual = valores[valores.length - 1];
      const depreciacaoPercent =
        ((precoInicial - precoAtual) / precoInicial) * 100;
      document.getElementById(
        "depreciacao"
      ).textContent = `Depreciação: ${depreciacaoPercent.toFixed(2)}%`;

      // Previsão simples utilizando regressão linear
      const n = valores.length;
      const xVals = Array.from({ length: n }, (_, i) => i);
      const sumX = xVals.reduce((a, b) => a + b, 0);
      const sumY = valores.reduce((a, b) => a + b, 0);
      const sumXY = xVals.reduce((a, b, i) => a + b * valores[i], 0);
      const sumX2 = xVals.reduce((a, b) => a + b * b, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const futureX = n + 3; // Previsão para 3 meses à frente
      const previsaoFutura = valores[0] + slope * futureX;
      document.getElementById(
        "previsao"
      ).textContent = `Preço Futuro (Previsão em 3 meses): R$ ${previsaoFutura.toFixed(
        2
      )}`;

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

// Evento para limpar o formulário e os resultados do dashboard
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
  document.getElementById("depreciacao").textContent = "Depreciação: N/A";
  document.getElementById("previsao").textContent =
    "Preço Futuro (Previsão): N/A";
}
document
  .getElementById("limparDashboard")
  .addEventListener("click", limparCamposDashboard);

// Ao carregar a página, carrega as marcas
window.addEventListener("load", carregarMarcas);
