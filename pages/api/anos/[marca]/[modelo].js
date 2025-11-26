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
    // Usando API Parallelum (mais confiável)
    const response = await axios.get(
      `https://parallelum.com.br/fipe/api/v1/carros/marcas/${marca}/modelos/${modelo}/anos`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 10000,
      }
    );

    // Converter formato Parallelum para formato FIPE
    // Parallelum: [{ codigo: "2014-5", nome: "2014 Flex" }]
    // FIPE: [{ Label: "2014 Flex", Value: "2014-5" }]
    const anos = response.data.map((ano) => ({
      Label: ano.nome,
      Value: ano.codigo,
    }));

    res.status(200).json(anos);
  } catch (error) {
    console.error("Erro ao buscar anos:", error);
    res.status(500).json({ error: "Erro ao consultar anos" });
  }
}
