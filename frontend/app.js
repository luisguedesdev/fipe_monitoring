let marcasMap = {};
let modelosMap = {};
let anosMap = {};

// Utilitários para mostrar loading e mensagens
function showLoading(show = true) {
  document.getElementById("loading").style.display = show ? "block" : "none";
}

function showMessage(message, type = "success") {
  const resultado = document.getElementById("resultado");
  resultado.innerHTML = `<div class="${type}">${message}</div>`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parsePriceToNumber(priceStr) {
  return parseFloat(priceStr.replace(/[R$\.\s]/g, "").replace(",", "."));
}

async function carregarMarcas() {
  try {
    showLoading(true);
    const response = await fetch("/api/marcas");
    const data = await response.json();
    const datalist = document.getElementById("marcasList");
    datalist.innerHTML = "";

    const marcas = data.marcas || data.Marcas;
    if (marcas && Array.isArray(marcas)) {
      marcasMap = {};
      marcas.forEach((item) => {
        const label = item.Label || item.Nome || item.Descricao;
        const code = item.Value || item.Codigo;
        marcasMap[label.toLowerCase()] = code;
        const option = document.createElement("option");
        option.value = label;
        datalist.appendChild(option);
      });
    } else {
      showMessage("Erro ao carregar marcas. Tente novamente.", "error");
    }
  } catch (error) {
    console.error("Erro ao carregar marcas:", error);
    showMessage("Erro de conexão ao carregar marcas.", "error");
  } finally {
    showLoading(false);
  }
}

async function carregarModelos(marcaCode) {
  try {
    showLoading(true);
    const response = await fetch(`/api/modelos?marca=${marcaCode}`);
    const data = await response.json();
    const datalist = document.getElementById("modelosList");
    datalist.innerHTML = "";

    let modelos = [];
    if (data.modelos) {
      modelos = Array.isArray(data.modelos)
        ? data.modelos
        : data.modelos.Modelos || [];
    } else if (Array.isArray(data.Modelos)) {
      modelos = data.Modelos;
    }

    if (modelos.length > 0) {
      modelosMap = {};
      modelos.forEach((item) => {
        const label = item.Label || item.Nome || item.Descricao;
        const code = item.Value || item.Codigo;
        modelosMap[label.toLowerCase()] = code;
        const option = document.createElement("option");
        option.value = label;
        datalist.appendChild(option);
      });
      document.getElementById("modeloInput").disabled = false;
      document.getElementById("modeloInput").placeholder =
        "Digite ou selecione o modelo";
    } else {
      document.getElementById("modeloInput").disabled = true;
      document.getElementById("modeloInput").placeholder =
        "Nenhum modelo encontrado";
    }
  } catch (error) {
    console.error("Erro ao carregar modelos:", error);
    showMessage("Erro ao carregar modelos.", "error");
  } finally {
    showLoading(false);
  }
}

async function carregarAnos(marcaCode, modeloCode) {
  try {
    showLoading(true);
    const response = await fetch(
      `/api/anos?marca=${marcaCode}&modelo=${modeloCode}`
    );
    const data = await response.json();
    const datalist = document.getElementById("anosList");
    datalist.innerHTML = "";

    let anos = [];
    if (data.anos) {
      anos = Array.isArray(data.anos) ? data.anos : data.anos.Anos || [];
    } else if (Array.isArray(data.Anos)) {
      anos = data.Anos;
    }

    if (anos.length > 0) {
      anosMap = {};
      anos.forEach((item) => {
        const label = item.Label || item.Descricao || item.Mes || item.Ano;
        const code = item.Value || item.Codigo;
        anosMap[label.toLowerCase()] = code;
        const option = document.createElement("option");
        option.value = label;
        datalist.appendChild(option);
      });
      document.getElementById("anoInput").disabled = false;
      document.getElementById("anoInput").placeholder =
        "Digite ou selecione o ano";
    } else {
      document.getElementById("anoInput").disabled = true;
      document.getElementById("anoInput").placeholder = "Nenhum ano encontrado";
    }
  } catch (error) {
    console.error("Erro ao carregar anos:", error);
    showMessage("Erro ao carregar anos.", "error");
  } finally {
    showLoading(false);
  }
}

// Event Listeners
document.getElementById("marcaInput").addEventListener("input", (e) => {
  const marcaLabel = e.target.value;
  const marcaCode = marcasMap[marcaLabel.toLowerCase()];

  // Reset campos dependentes
  document.getElementById("modeloInput").value = "";
  document.getElementById("anoInput").value = "";
  document.getElementById("modelosList").innerHTML = "";
  document.getElementById("anosList").innerHTML = "";
  document.getElementById("nomeMarca").value = marcaLabel;

  if (marcaCode) {
    carregarModelos(marcaCode);
  } else {
    document.getElementById("modeloInput").disabled = true;
    document.getElementById("anoInput").disabled = true;
    document.getElementById("modeloInput").placeholder =
      "Selecione primeiro a marca";
    document.getElementById("anoInput").placeholder =
      "Selecione primeiro o modelo";
  }
});

document.getElementById("modeloInput").addEventListener("input", (e) => {
  const modeloLabel = e.target.value;
  const modeloCode = modelosMap[modeloLabel.toLowerCase()];
  const marcaLabel = document.getElementById("marcaInput").value;
  const marcaCode = marcasMap[marcaLabel.toLowerCase()];

  document.getElementById("anoInput").value = "";
  document.getElementById("anosList").innerHTML = "";
  document.getElementById("nomeModelo").value = modeloLabel;

  if (marcaCode && modeloCode) {
    carregarAnos(marcaCode, modeloCode);
  } else {
    document.getElementById("anoInput").disabled = true;
    document.getElementById("anoInput").placeholder =
      "Selecione primeiro o modelo";
  }
});

document.getElementById("anoInput").addEventListener("input", (e) => {
  const anoLabel = e.target.value;
  document.getElementById("nomeAno").value = anoLabel;
});

document
  .getElementById("consultaForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const marcaLabel = document.getElementById("marcaInput").value;
    const modeloLabel = document.getElementById("modeloInput").value;
    const anoLabel = document.getElementById("anoInput").value;
    const periodo = document.getElementById("periodoSelect").value;
    const marcaCode = marcasMap[marcaLabel.toLowerCase()];
    const modeloCode = modelosMap[modeloLabel.toLowerCase()];

    if (!marcaCode || !modeloCode || !anoLabel) {
      showMessage("Por favor, selecione marca, modelo e ano.", "error");
      return;
    }

    try {
      showLoading(true);
      const response = await fetch(
        `/api/historico?marca=${marcaCode}&modelo=${modeloCode}&ano=${encodeURIComponent(
          anoLabel
        )}&periodo=${periodo}&nomeMarca=${encodeURIComponent(
          marcaLabel
        )}&nomeModelo=${encodeURIComponent(
          modeloLabel
        )}&nomeAno=${encodeURIComponent(anoLabel)}`
      );

      const data = await response.json();
      const resultadoDiv = document.getElementById("resultado");

      if (data.historico && data.historico.length > 0) {
        // Calcular estatísticas
        const precos = data.historico
          .filter((item) => item.preco !== "N/D")
          .map((item) => parsePriceToNumber(item.preco));

        const precoAtual = precos[0] || 0;
        const precoAntigo = precos[precos.length - 1] || 0;
        const variacao =
          precos.length > 1
            ? ((precoAtual - precoAntigo) / precoAntigo) * 100
            : 0;
        const media = precos.reduce((a, b) => a + b, 0) / precos.length;
        const maximo = Math.max(...precos);
        const minimo = Math.min(...precos);

        resultadoDiv.innerHTML = `
        <div class="card">
          <h2>
            <i class="fas fa-chart-line"></i> Histórico de Preços - ${marcaLabel} ${modeloLabel} ${anoLabel}
            <span style="font-size: 0.8em; color: #666; font-weight: normal;"> (${periodo} meses)</span>
          </h2>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${formatCurrency(precoAtual)}</div>
              <div class="stat-label">Preço Atual</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${
                variacao >= 0 ? "+" : ""
              }${variacao.toFixed(1)}%</div>
              <div class="stat-label">Variação Total</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${formatCurrency(media)}</div>
              <div class="stat-label">Preço Médio</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${formatCurrency(maximo)}</div>
              <div class="stat-label">Máximo</div>
            </div>
          </div>
          
          <div style="margin-top: 25px;">
            <table>
              <thead>
                <tr>
                  <th><i class="fas fa-calendar"></i> Mês de Referência</th>
                  <th><i class="fas fa-dollar-sign"></i> Preço</th>
                  <th><i class="fas fa-chart-line"></i> Variação</th>
                </tr>
              </thead>
              <tbody>
                ${data.historico
                  .map((item, index) => {
                    let variacao = "";
                    if (
                      index < data.historico.length - 1 &&
                      item.preco !== "N/D"
                    ) {
                      const precoAtual = parsePriceToNumber(item.preco);
                      const precoAnterior = parsePriceToNumber(
                        data.historico[index + 1].preco
                      );
                      const varPercent =
                        ((precoAtual - precoAnterior) / precoAnterior) * 100;
                      const cor = varPercent >= 0 ? "#27ae60" : "#e74c3c";
                      variacao = `<span style="color: ${cor}">${
                        varPercent >= 0 ? "+" : ""
                      }${varPercent.toFixed(1)}%</span>`;
                    }

                    return `
                    <tr>
                      <td>${item.referencia}</td>
                      <td><strong>${item.preco}</strong></td>
                      <td>${variacao}</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
          
          <div style="text-align: center; margin-top: 25px;">
            <a href="dashboard.html" class="btn-link">
              <i class="fas fa-chart-line"></i> Ver Gráfico Interativo
            </a>
          </div>
        </div>
      `;
      } else {
        showMessage(
          "Nenhum dado histórico encontrado para este veículo.",
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao consultar histórico:", error);
      showMessage("Erro ao consultar histórico. Tente novamente.", "error");
    } finally {
      showLoading(false);
    }
  });

function limparCampos() {
  document.getElementById("consultaForm").reset();
  document.getElementById("modelosList").innerHTML = "";
  document.getElementById("anosList").innerHTML = "";
  document.getElementById("modeloInput").disabled = true;
  document.getElementById("anoInput").disabled = true;
  document.getElementById("modeloInput").placeholder =
    "Selecione primeiro a marca";
  document.getElementById("anoInput").placeholder =
    "Selecione primeiro o modelo";
  document.getElementById("resultado").innerHTML = "";
  document.getElementById("nomeMarca").value = "";
  document.getElementById("nomeModelo").value = "";
  document.getElementById("nomeAno").value = "";
  showMessage("Campos limpos com sucesso!", "success");
  setTimeout(() => {
    document.getElementById("resultado").innerHTML = "";
  }, 2000);
}

document.getElementById("limparCampos").addEventListener("click", limparCampos);
window.addEventListener("load", () => {
  carregarMarcas();
  showMessage(
    "Sistema carregado! Selecione uma marca para começar.",
    "success"
  );
  setTimeout(() => {
    document.getElementById("resultado").innerHTML = "";
  }, 3000);
});
