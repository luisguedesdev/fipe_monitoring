import db from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Buscar todos os veículos únicos com seu último preço e total de registros
    const query = `
      SELECT 
        hp.codigo_marca,
        hp.codigo_modelo,
        hp.ano_modelo,
        hp.nome_marca,
        hp.nome_modelo,
        hp.nome_ano,
        hp.preco as ultimo_preco,
        hp.data_consulta as ultima_consulta,
        counts.total_registros,
        counts.primeiro_registro,
        primeiro.preco as primeiro_preco
      FROM historico_precos hp
      INNER JOIN (
        SELECT 
          codigo_marca,
          codigo_modelo,
          ano_modelo,
          COUNT(*) as total_registros,
          MIN(data_consulta) as primeiro_registro,
          MAX(data_consulta) as ultima_consulta
        FROM historico_precos
        GROUP BY codigo_marca, codigo_modelo, ano_modelo
      ) counts ON hp.codigo_marca = counts.codigo_marca 
        AND hp.codigo_modelo = counts.codigo_modelo 
        AND hp.ano_modelo = counts.ano_modelo
        AND hp.data_consulta = counts.ultima_consulta
      LEFT JOIN historico_precos primeiro ON primeiro.codigo_marca = counts.codigo_marca
        AND primeiro.codigo_modelo = counts.codigo_modelo
        AND primeiro.ano_modelo = counts.ano_modelo
        AND primeiro.data_consulta = counts.primeiro_registro
      ORDER BY hp.data_consulta DESC
    `;

    const result = await db.query(query);

    // Processar os dados
    const veiculos = result.rows.map((row) => {
      // Extrair valores numéricos dos preços
      const ultimoPrecoNum = parseFloat(
        row.ultimo_preco
          .replace("R$", "")
          .replace(/\./g, "")
          .replace(",", ".")
          .trim()
      );

      const primeiroPrecoNum = row.primeiro_preco
        ? parseFloat(
            row.primeiro_preco
              .replace("R$", "")
              .replace(/\./g, "")
              .replace(",", ".")
              .trim()
          )
        : ultimoPrecoNum;

      // Calcular variação total
      const variacao =
        ((ultimoPrecoNum - primeiroPrecoNum) / primeiroPrecoNum) * 100;

      return {
        codigoMarca: row.codigo_marca,
        codigoModelo: row.codigo_modelo,
        anoModelo: row.ano_modelo,
        nomeMarca: row.nome_marca,
        nomeModelo: row.nome_modelo,
        nomeAno: row.nome_ano,
        ultimoPreco: row.ultimo_preco,
        ultimoPrecoNum,
        primeiroPreco: row.primeiro_preco,
        primeiroPrecoNum,
        variacao: isNaN(variacao) ? 0 : variacao,
        totalRegistros: parseInt(row.total_registros),
        primeiroRegistro: row.primeiro_registro,
        ultimaConsulta: row.ultima_consulta,
      };
    });

    res.json({
      success: true,
      veiculos,
      totalVeiculos: veiculos.length,
    });
  } catch (error) {
    console.error("Erro ao buscar veículos:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
