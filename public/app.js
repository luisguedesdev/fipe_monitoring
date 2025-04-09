// Carrega as marcas ao iniciar a página
async function carregarMarcas() {
  try {
    const response = await fetch("/api/marcas");
    const data = await response.json();
    const selectMarca = document.getElementById("marca");
    // Limpa e popula o select de marcas
    selectMarca.innerHTML = '<option value="">Selecione a marca</option>';
    data.marcas.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.Value || item.Codigo;
      option.text = item.Label || item.Nome || item.Descricao;
      selectMarca.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar marcas:", error);
  }
}

// Carrega os modelos com base na marca selecionada
async function carregarModelos(marca) {
  try {
    const response = await fetch(`/api/modelos?marca=${marca}`);
    const data = await response.json();
    const selectModelo = document.getElementById("modelo");
    selectModelo.innerHTML = '<option value="">Selecione o modelo</option>';
    if (data.modelos && Array.isArray(data.modelos)) {
      data.modelos.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.Value || item.Codigo;
        option.text = item.Label || item.Nome || item.Descricao;
        selectModelo.appendChild(option);
      });
      selectModelo.disabled = false;
    } else {
      selectModelo.disabled = true;
    }
  } catch (error) {
    console.error("Erro ao carregar modelos:", error);
  }
}

// Carrega os anos disponíveis para o modelo selecionado
async function carregarAnos(marca, modelo) {
  try {
    const response = await fetch(`/api/anos?marca=${marca}&modelo=${modelo}`);
    const data = await response.json();
    const selectAno = document.getElementById("ano");
    selectAno.innerHTML = '<option value="">Selecione o ano</option>';
    if (data.anos && Array.isArray(data.anos)) {
      data.anos.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.Value || item.Codigo;
        option.text = item.Label || item.Descricao || item.Mes || item.Ano;
        selectAno.appendChild(option);
      });
      selectAno.disabled = false;
    } else {
      selectAno.disabled = true;
    }
  } catch (error) {
    console.error("Erro ao carregar anos:", error);
  }
}

// Eventos: Quando a marca for selecionada, carrega os modelos
document.getElementById("marca").addEventListener("change", (e) => {
  const marca = e.target.value;
  document.getElementById("modelo").innerHTML =
    '<option value="">Selecione o modelo</option>';
  document.getElementById("modelo").disabled = true;
  document.getElementById("ano").innerHTML =
    '<option value="">Selecione o ano</option>';
  document.getElementById("ano").disabled = true;
  if (marca) {
    carregarModelos(marca);
  }
});

// Quando o modelo for selecionado, carrega os anos
document.getElementById("modelo").addEventListener("change", (e) => {
  const marca = document.getElementById("marca").value;
  const modelo = e.target.value;
  document.getElementById("ano").innerHTML =
    '<option value="">Selecione o ano</option>';
  document.getElementById("ano").disabled = true;
  if (marca && modelo) {
    carregarAnos(marca, modelo);
  }
});

// Ao submeter o formulário, consulta o histórico dos últimos 12 meses
document
  .getElementById("consultaForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const marca = document.getElementById("marca").value;
    const modelo = document.getElementById("modelo").value;
    const ano = document.getElementById("ano").value;
    if (!marca || !modelo || !ano) {
      alert("Por favor, selecione marca, modelo e ano.");
      return;
    }
    try {
      const response = await fetch(
        `/api/historico?marca=${marca}&modelo=${modelo}&ano=${ano}`
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

// Inicializa o carregamento de marcas ao carregar a página
window.addEventListener("load", carregarMarcas);
