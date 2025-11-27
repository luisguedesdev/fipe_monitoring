import { getTabelaReferencia, getModelos } from "../../../lib/fipe";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { marca } = req.query;

  if (!marca) {
    return res.status(400).json({ error: "Parâmetro marca é obrigatório" });
  }

  try {
    // Obter tabela de referência mais recente
    const tabela = await getTabelaReferencia();

    // Buscar modelos da API oficial FIPE
    const modelos = await getModelos(tabela.Codigo, marca, 1); // 1 = carros

    // Converter formato FIPE para o formato esperado pelo frontend
    const modelosFormatados = modelos.map((modelo) => ({
      Label: modelo.Label,
      Value: modelo.Value,
    }));

    res.status(200).json({ Modelos: modelosFormatados, Anos: [] });
  } catch (error) {
    console.error("Erro ao buscar modelos:", error);
    res.status(500).json({ error: "Erro ao consultar modelos da FIPE" });
  }
}
