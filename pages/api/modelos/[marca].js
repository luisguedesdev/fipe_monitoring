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
    // Usando API Parallelum (mais confiável)
    const response = await axios.get(
      `https://parallelum.com.br/fipe/api/v1/carros/marcas/${marca}/modelos`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 10000,
      }
    );

    // Converter formato Parallelum para formato FIPE
    // Parallelum: { modelos: [{ codigo: 1, nome: "Model" }] }
    // FIPE: { Modelos: [{ Label: "Model", Value: 1 }] }
    const modelos = response.data.modelos.map((modelo) => ({
      Label: modelo.nome,
      Value: modelo.codigo,
    }));

    res.status(200).json({ Modelos: modelos, Anos: response.data.anos || [] });
  } catch (error) {
    console.error("Erro ao buscar modelos:", error);
    res.status(500).json({ error: "Erro ao consultar modelos" });
  }
}
