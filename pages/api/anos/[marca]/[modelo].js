import { getTabelaReferencia, getAnos } from "../../../../lib/fipe";

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
    // Obter tabela de referência mais recente
    const tabela = await getTabelaReferencia();

    // Buscar anos da API oficial FIPE
    const anos = await getAnos(tabela.Codigo, marca, modelo, 1); // 1 = carros

    // Converter formato FIPE para o formato esperado pelo frontend
    // FIPE: { Label: "2014 Diesel", Value: "2014-3" }
    const anosFormatados = anos.map((ano) => ({
      Label: ano.Label,
      Value: ano.Value,
    }));

    res.status(200).json(anosFormatados);
  } catch (error) {
    console.error("Erro ao buscar anos:", error);
    res.status(500).json({ error: "Erro ao consultar anos da FIPE" });
  }
}
