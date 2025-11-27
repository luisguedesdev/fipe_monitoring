import { getTabelaReferencia, getMarcas } from "../../lib/fipe";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Obter tabela de referência mais recente
    const tabela = await getTabelaReferencia();

    // Buscar marcas da API oficial FIPE
    const marcas = await getMarcas(tabela.Codigo, 1); // 1 = carros

    // Converter formato FIPE para o formato esperado pelo frontend
    // FIPE: { Label: "Acura", Value: "1" }
    const marcasFormatadas = marcas.map((marca) => ({
      Label: marca.Label,
      Value: parseInt(marca.Value),
    }));

    res.status(200).json(marcasFormatadas);
  } catch (error) {
    console.error("Erro ao buscar marcas:", error);
    res.status(500).json({ error: "Erro ao consultar marcas da FIPE" });
  }
}
