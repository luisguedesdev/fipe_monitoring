let veiculos = [];

async function carregarVeiculos() {
  try {
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
    veiculos.forEach((v, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `${v.nomeMarca} - ${v.nomeModelo}`;
      veiculosSelect.appendChild(opt);
    });

    console.log("✅ Select de veículos populado.");
  } catch (err) {
    console.error("❌ Erro ao carregar veículos:", err);
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
    veiculos[index].anos.forEach((ano) => {
      const opt = document.createElement("option");
      opt.value = ano;
      opt.textContent = ano;
      anosSelect.appendChild(opt);
    });
    console.log("✅ Anos inseridos no select:", veiculos[index].anos);
  } else {
    console.warn("⚠️ Nenhum veículo válido selecionado.");
  }
}

async function gerarGrafico() {
  const veiculoIndex = document.getElementById("veiculosSelect").value;
  const nomeAno = document.getElementById("anosSelect").value;
  const mesesAdiante = parseInt(document.getElementById("mesFuturo").value);

  const veiculo = veiculos[veiculoIndex];
  if (!veiculo || !nomeAno) {
    alert("Selecione um veículo e ano.");
    return;
  }

  console.log(`📊 Gerando gráfico para:`, veiculo, "Ano:", nomeAno);

  try {
    const res = await fetch(
      `/api/dashboard/${veiculo.codigoMarca}/${
        veiculo.codigoModelo
      }?ano=${encodeURIComponent(nomeAno)}`
    );
    const data = await res.json();

    console.log("📈 Dados de histórico recebidos:", data);

    if (!data.historico || data.historico.length === 0) {
      return alert("Sem dados para o ano selecionado.");
    }

    const labels = data.historico.map((item) => item.referencia);
    const valores = data.historico.map((item) =>
      parseFloat(
        item.preco.replace("R$", "").replace(".", "").replace(",", ".")
      )
    );

    const previsao = parseFloat(data.previsao);
    const labelPrev = `Previsão (${mesesAdiante} mês${
      mesesAdiante > 1 ? "es" : ""
    })`;
    const precoPrevisto = (
      previsao +
      (mesesAdiante - 1) * (previsao - valores[valores.length - 1])
    ).toFixed(2);

    const ctx = document.getElementById("grafico").getContext("2d");
    if (window.graficoInstancia) window.graficoInstancia.destroy();

    window.graficoInstancia = new Chart(ctx, {
      type: "line",
      data: {
        labels: [...labels, labelPrev],
        datasets: [
          {
            label: `Histórico - ${nomeAno}`,
            data: valores,
            borderWidth: 2,
            fill: false,
            tension: 0.1,
          },
          {
            label: labelPrev,
            data: [...Array(valores.length).fill(null), precoPrevisto],
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top" },
        },
      },
    });

    document.getElementById(
      "previsaoTexto"
    ).textContent = `Preço previsto em ${mesesAdiante} mês(es): R$ ${precoPrevisto}`;
  } catch (err) {
    console.error("❌ Erro ao gerar gráfico:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  carregarVeiculos();

  document.getElementById("veiculosSelect").addEventListener("change", (e) => {
    atualizarAnos(e.target.value);
  });

  document.getElementById("btnPrever").addEventListener("click", gerarGrafico);
});
