// Mapas globais para armazenar os códigos correspondentes aos rótulos
let marcasMap = {};
let modelosMap = {};
let anosMap = {};

// Carrega as marcas e popula o datalist "marcasList"
async function carregarMarcas() {
  try {
    const response = await fetch("/api/marcas");
    const data = await response.json();
    const datalist = document.getElementById("marcasList");
    datalist.innerHTML = "";
    // Aceita ambas as chaves "marcas" ou "Marcas"
    const marcas = data.marcas || data.Marcas;
    if (marcas && Array.isArray(marcas)) {
      marcasMap = {}; // Reinicia o mapa
      marcas.forEach((item) => {
        const label = item.Label || item.Nome || item.Descricao;
        const code = item.Value || item.Codigo;
        marcasMap[label.toLowerCase()] = code;
        const option = document.createElement("option");
        option.value = label;
        datalist.appendChild(option);
      });
    } else {
      console.error("Nenhuma marca encontrada:", data);
    }
  } catch (error) {
    console.error("Erro ao carregar marcas:", error);
  }
}

// Carrega os modelos com base no código da marca selecionada e popula o datalist "modelosList"
async function carregarModelos(marcaCode) {
  try {
    const response = await fetch(`/api/modelos?marca=${marcaCode}`);
    const data = await response.json();
    const datalist = document.getElementById("modelosList");
    datalist.innerHTML = "";
    // O endpoint pode retornar { Modelos: [...] } ou apenas um array
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
        option.value = label;
        datalist.appendChild(option);
      });
      document.getElementById("modeloInput").disabled = false;
    } else {
      document.getElementById("modeloInput").disabled = true;
    }
  } catch (error) {
    console.error("Erro ao carregar modelos:", error);
  }
}

// Carrega os anos disponíveis com base no código da marca e modelo e popula o datalist "anosList"
async function carregarAnos(marcaCode, modeloCode) {
  try {
    const response = await fetch(
      `/api/anos?marca=${marcaCode}&modelo=${modeloCode}`
    );
    const data = await response.json();
    const datalist = document.getElementById("anosList");
    datalist.innerHTML = "";
    let anos = [];
    if (data.anos) {
      if (Array.isArray(data.anos)) {
        anos = data.anos;
      } else if (data.anos.Anos && Array.isArray(data.anos.Anos)) {
        anos = data.anos.Anos;
      }
    } else if (data.Anos && Array.isArray(data.Anos)) {
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
    } else {
      document.getElementById("anoInput").disabled = true;
    }
  } catch (error) {
    console.error("Erro ao carregar anos:", error);
  }
}

// Ao sair do campo de marca, obtém o código correspondente e carrega os modelos
document.getElementById("marcaInput").addEventListener("change", (e) => {
  const marcaLabel = e.target.value;
  const marcaCode = marcasMap[marcaLabel.toLowerCase()];
  // Limpa os campos de modelo e ano
  document.getElementById("modeloInput").value = "";
  document.getElementById("anoInput").value = "";
  document.getElementById("modelosList").innerHTML = "";
  document.getElementById("anosList").innerHTML = "";
  if (marcaCode) {
    carregarModelos(marcaCode);
  } else {
    document.getElementById("modeloInput").disabled = true;
    document.getElementById("anoInput").disabled = true;
  }
});

// Ao sair do campo de modelo, obtém o código correspondente e carrega os anos
document.getElementById("modeloInput").addEventListener("change", (e) => {
  const modeloLabel = e.target.value;
  const modeloCode = modelosMap[modeloLabel.toLowerCase()];
  // Limpa o campo de ano
  document.getElementById("anoInput").value = "";
  document.getElementById("anosList").innerHTML = "";
  const marcaLabel = document.getElementById("marcaInput").value;
  const marcaCode = marcasMap[marcaLabel.toLowerCase()];
  if (marcaCode && modeloCode) {
    carregarAnos(marcaCode, modeloCode);
  } else {
    document.getElementById("anoInput").disabled = true;
  }
});

// Ao submeter o formulário, usa os códigos obtidos para chamar o endpoint histórico
document
  .getElementById("consultaForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const marcaLabel = document.getElementById("marcaInput").value;
    const modeloLabel = document.getElementById("modeloInput").value;
    const anoLabel = document.getElementById("anoInput").value;
    const marcaCode = marcasMap[marcaLabel.toLowerCase()];
    const modeloCode = modelosMap[modeloLabel.toLowerCase()];
    // O endpoint /api/historico espera o valor do ano exatamente como está (por exemplo, "2018 Diesel")
    if (!marcaCode || !modeloCode || !anoLabel) {
      alert("Por favor, selecione marca, modelo e ano.");
      return;
    }
    try {
      const response = await fetch(
        `/api/historico?marca=${marcaCode}&modelo=${modeloCode}&ano=${encodeURIComponent(
          anoLabel
        )}`
      );
      const data = await response.json();
      const resultadoDiv = document.getElementById("resultado");
      resultadoDiv.innerHTML =
        "<h2>Histórico de Preços (últimos 12 meses):</h2>";
      if (data.historico && data.historico.length > 0) {
        const ul = document.createElement("ul");
        data.historico.forEach((item) => {
          const li = document.createElement("li");
          li.textContent = `Referência: ${item.referencia} – Preço: ${item.preco}`;
          ul.appendChild(li);
        });
        resultadoDiv.appendChild(ul);
      } else {
        resultadoDiv.textContent = "Nenhum dado encontrado.";
      }
    } catch (error) {
      console.error("Erro ao consultar histórico:", error);
    }
  });

// Inicializa o carregamento de marcas quando a página carregar
window.addEventListener("load", carregarMarcas);
