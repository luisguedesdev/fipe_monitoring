import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Usando API Parallelum (mais confiável)
    const response = await axios.get(
      "https://parallelum.com.br/fipe/api/v1/carros/marcas",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 10000,
      }
    );

    // Converter formato Parallelum para formato FIPE
    // Parallelum: { codigo: "1", nome: "Acura" }
    // FIPE: { Label: "Acura", Value: 1 }
    const marcas = response.data.map((marca) => ({
      Label: marca.nome,
      Value: parseInt(marca.codigo),
    }));

    res.status(200).json(marcas);
  } catch (error) {
    console.error("Erro ao buscar marcas:", error);
    res.status(500).json({ error: "Erro ao consultar marcas" });
  }
}
