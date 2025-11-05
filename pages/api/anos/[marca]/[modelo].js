import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { marca, modelo } = req.query;

  if (!marca || !modelo) {
    return res
      .status(400)
      .json({ error: "Parâmetros marca e modelo são obrigatórios" });
  }

  try {
    const response = await axios.post(
      "https://veiculos.fipe.org.br/api/veiculos/ConsultarAnoModelo",
      {
        codigoTabelaReferencia: 320,
        codigoTipoVeiculo: 1,
        codigoMarca: parseInt(marca),
        codigoModelo: parseInt(modelo),
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

    res.status(200).json(response.data || []);
  } catch (error) {
    console.error("Erro ao buscar anos:", error);
    res.status(500).json({ error: "Erro ao consultar anos" });
  }
}
