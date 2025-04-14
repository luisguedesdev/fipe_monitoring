document.addEventListener("DOMContentLoaded", () => {
  const veiculosSelect = document.getElementById("veiculosSelect");
  const btnPrever = document.getElementById("btnPrever");
  const mesesInput = document.getElementById("mesFuturo");
  const graficoCanvas = document.getElementById("grafico");
  const previsaoTexto = document.getElementById("previsaoTexto");
  let chart = null;

  // Carrega veículos registrados
  fetch("/api/veiculos")
    .then((res) => res.json())
    .then((data) => {
      console.log("Veículos retornados do backend:", data);
      if (!data.veiculos || data.veiculos.length === 0) {
        veiculosSelect.innerHTML =
          "<option value=''>Nenhum veículo registrado</option>";
        return;
      }

      veiculosSelect.innerHTML = data.veiculos
        .map(
          (v) =>
            `<option value="${v.marca}|${v.modelo}">${v.marca} - ${v.modelo}</option>`
        )
        .join("");
    })
    .catch((err) => {
      console.error("Erro ao buscar veículos:", err);
    });

  btnPrever.addEventListener("click", async () => {
    const selected = veiculosSelect.value;
    if (!selected) {
      alert("Selecione um veículo");
      return;
    }

    const [marca, modelo] = selected.split("|");
    const meses = parseInt(mesesInput.value) || 1;

    try {
      console.log(
        `Buscando histórico para marca ${marca}, modelo ${modelo}, meses ${meses}`
      );
      const res = await fetch(
        `/api/dashboard/${marca}/${modelo}?meses=${meses}`
      );
      const data = await res.json();

      console.log("Dados retornados do dashboard:", data);

      if (data.error) {
        alert(data.error);
        return;
      }

      const labels = data.historico.map((h) => h.referencia);
      const valores = data.historico.map((h) =>
        parseFloat(h.preco.replace("R$", "").replace(".", "").replace(",", "."))
      );

      labels.push(`Previsão +${meses}`);
      valores.push(Number(data.previsao));

      if (chart) chart.destroy();

      chart = new Chart(graficoCanvas.getContext("2d"), {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Preço (R$)",
              data: valores,
              borderColor: "#1a73e8",
              fill: false,
            },
          ],
        },
      });

      previsaoTexto.textContent = `Valor Previsto para +${meses} mês(es): R$ ${Number(
        data.previsao
      ).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`;
    } catch (err) {
      console.error("Erro ao gerar gráfico do dashboard:", err);
    }
  });
});
