import { getTabelaReferencia, getAnos } from "../../lib/fipe";
import db from "../../lib/db";

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
    // Buscar tabela de referência atual
    const tabela = await getTabelaReferencia();

    // Buscar todos os anos disponíveis na FIPE para este modelo
    const anosDisponiveis = await getAnos(tabela.Codigo, marca, modelo, 1);

    // Buscar quais anos já foram adicionados no banco
    const anosAdicionadosQuery = `
      SELECT DISTINCT ano_modelo 
      FROM historico_precos
      WHERE codigo_marca = $1 AND codigo_modelo = $2
    `;
    const anosAdicionadosResult = await db.query(anosAdicionadosQuery, [
      marca,
      modelo,
    ]);
    const anosAdicionados = new Set(
      anosAdicionadosResult.rows.map((r) => r.ano_modelo)
    );

    // Separar anos já adicionados dos não adicionados
    const anosComStatus = anosDisponiveis.map((ano) => ({
      ...ano,
      jaAdicionado: anosAdicionados.has(ano.Value),
    }));

    // Anos que ainda não foram adicionados (sugestões)
    const sugestoes = anosComStatus.filter((a) => !a.jaAdicionado);
    const adicionados = anosComStatus.filter((a) => a.jaAdicionado);

    res.status(200).json({
      success: true,
      marca,
      modelo,
      totalDisponiveis: anosDisponiveis.length,
      totalAdicionados: adicionados.length,
      totalSugestoes: sugestoes.length,
      sugestoes,
      adicionados,
      todosAnos: anosComStatus,
    });
  } catch (error) {
    console.error("Erro ao buscar anos disponíveis:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao consultar anos disponíveis",
    });
  }
}
