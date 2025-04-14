let marcasMap = {};
let modelosMap = {};
let anosMap = {};

async function carregarMarcas() {
  try {
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
      console.error("Nenhuma marca encontrada:", data);
    }
  } catch (error) {
    console.error("Erro ao carregar marcas:", error);
  }
}

async function carregarModelos(marcaCode) {
  try {
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
    } else {
      document.getElementById("modeloInput").disabled = true;
    }
  } catch (error) {
    console.error("Erro ao carregar modelos:", error);
  }
}

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
    } else {
      document.getElementById("anoInput").disabled = true;
    }
  } catch (error) {
    console.error("Erro ao carregar anos:", error);
  }
}

document.getElementById("marcaInput").addEventListener("change", (e) => {
  const marcaLabel = e.target.value;
  const marcaCode = marcasMap[marcaLabel.toLowerCase()];
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
  }
});

document.getElementById("modeloInput").addEventListener("change", (e) => {
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
  }
});

document.getElementById("anoInput").addEventListener("change", (e) => {
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
    const marcaCode = marcasMap[marcaLabel.toLowerCase()];
    const modeloCode = modelosMap[modeloLabel.toLowerCase()];
    if (!marcaCode || !modeloCode || !anoLabel) {
      alert("Por favor, selecione marca, modelo e ano.");
      return;
    }

    // inclui os nomes no fetch como query string
    try {
      const response = await fetch(
        `/api/historico?marca=${marcaCode}&modelo=${modeloCode}&ano=${encodeURIComponent(
          anoLabel
        )}&nomeMarca=${encodeURIComponent(
          marcaLabel
        )}&nomeModelo=${encodeURIComponent(
          modeloLabel
        )}&nomeAno=${encodeURIComponent(anoLabel)}`
      );
      const data = await response.json();
      const resultadoDiv = document.getElementById("resultado");
      resultadoDiv.innerHTML =
        "<h2>Histórico de Preços (últimos 24 meses):</h2>";
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

function limparCampos() {
  document.getElementById("consultaForm").reset();
  document.getElementById("modelosList").innerHTML = "";
  document.getElementById("anosList").innerHTML = "";
  document.getElementById("modeloInput").disabled = true;
  document.getElementById("anoInput").disabled = true;
  document.getElementById("resultado").innerHTML = "";
  document.getElementById("nomeMarca").value = "";
  document.getElementById("nomeModelo").value = "";
  document.getElementById("nomeAno").value = "";
}

document.getElementById("limparCampos").addEventListener("click", limparCampos);
window.addEventListener("load", carregarMarcas);
