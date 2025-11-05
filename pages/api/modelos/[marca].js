import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { marca } = req.query;

  if (!marca) {
    return res.status(400).json({ error: "Parâmetro marca é obrigatório" });
  }

  try {
    const response = await axios.post(
      "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos",
      {
        codigoTabelaReferencia: 320,
        codigoTipoVeiculo: 1,
        codigoMarca: parseInt(marca),
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 10000,
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Erro ao buscar modelos:", error);
    res.status(500).json({ error: "Erro ao consultar modelos" });
  }
}
