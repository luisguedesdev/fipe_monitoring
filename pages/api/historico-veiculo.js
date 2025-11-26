import db from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { marca, modelo, ano, meses = 24 } = req.query;

  if (!marca || !modelo || !ano) {
    return res.status(400).json({
      success: false,
      error: "Parâmetros obrigatórios: marca, modelo, ano",
    });
  }

  try {
    // Buscar histórico de preços do veículo (últimos N meses mais recentes)
    const query = `
      SELECT 
        id,
        codigo_marca,
        codigo_modelo,
        ano_modelo,
        preco,
        nome_marca,
        nome_modelo,
        nome_ano,
        data_consulta,
        codigo_tabela_referencia
      FROM (
        SELECT *
        FROM historico_precos
        WHERE codigo_marca = $1 
          AND codigo_modelo = $2 
          AND ano_modelo = $3
        ORDER BY data_consulta DESC
        LIMIT $4
      ) AS ultimos
      ORDER BY data_consulta DESC
    `;

    const result = await db.query(query, [marca, modelo, ano, parseInt(meses)]);

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        error: "Nenhum registro encontrado para este veículo",
        veiculo: null,
        historico: [],
      });
    }

    // Processar os dados
    const historico = result.rows.map((row) => {
      // Extrair valor numérico do preço
      const precoNumerico = parseFloat(
        row.preco.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()
      );

      return {
        id: row.id,
        preco: row.preco,
        preco_numerico: precoNumerico,
        data_consulta: row.data_consulta,
        tabela_referencia: row.codigo_tabela_referencia,
      };
    });

    // Informações do veículo
    const primeiroRegistro = result.rows[0];
    const veiculo = {
      marca: primeiroRegistro.nome_marca,
      modelo: primeiroRegistro.nome_modelo,
      ano: primeiroRegistro.nome_ano || primeiroRegistro.ano_modelo,
      codigoMarca: primeiroRegistro.codigo_marca,
      codigoModelo: primeiroRegistro.codigo_modelo,
    };

    res.json({
      success: true,
      veiculo,
      historico,
      totalRegistros: historico.length,
    });
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
