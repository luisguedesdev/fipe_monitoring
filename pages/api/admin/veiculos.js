import { withAdmin } from "../../../lib/auth";
import db from "../../../lib/db";

/**
 * API de Admin para gerenciar veículos do banco central
 * GET - Listar todos os veículos únicos com contagem de registros
 * DELETE - Deletar veículo do banco central (todos os registros de histórico)
 */
async function handler(req, res) {
  if (req.method === "GET") {
    return listarVeiculos(req, res);
  } else if (req.method === "DELETE") {
    return deletarVeiculo(req, res);
  }

  return res.status(405).json({ error: "Método não permitido" });
}

async function listarVeiculos(req, res) {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Query para buscar veículos únicos com contagem de registros
    let query = `
      SELECT 
        codigo_marca,
        codigo_modelo,
        ano_modelo,
        nome_marca,
        nome_modelo,
        nome_ano,
        COUNT(*) as total_registros,
        MAX(preco) as preco_maximo,
        MIN(preco) as preco_minimo,
        MAX(data_consulta) as ultima_consulta,
        MIN(data_consulta) as primeira_consulta
      FROM historico_precos
    `;

    const params = [];

    if (search) {
      query += ` WHERE LOWER(nome_marca) LIKE $1 OR LOWER(nome_modelo) LIKE $1`;
      params.push(`%${search.toLowerCase()}%`);
    }

    query += `
      GROUP BY codigo_marca, codigo_modelo, ano_modelo, nome_marca, nome_modelo, nome_ano
      ORDER BY ultima_consulta DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(parseInt(limit), offset);

    const result = await db.query(query, params);

    // Contar total de veículos únicos
    let countQuery = `
      SELECT COUNT(DISTINCT (codigo_marca, codigo_modelo, ano_modelo)) as total
      FROM historico_precos
    `;

    if (search) {
      countQuery += ` WHERE LOWER(nome_marca) LIKE $1 OR LOWER(nome_modelo) LIKE $1`;
    }

    const countResult = await db.query(
      countQuery,
      search ? [`%${search.toLowerCase()}%`] : []
    );

    const total = parseInt(countResult.rows[0]?.total || 0);

    res.json({
      success: true,
      veiculos: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Erro ao listar veículos (admin):", error);
    res.status(500).json({
      success: false,
      error: "Erro ao listar veículos",
    });
  }
}

async function deletarVeiculo(req, res) {
  try {
    const { codigo_marca, codigo_modelo, ano_modelo } = req.body;

    if (!codigo_marca || !codigo_modelo || !ano_modelo) {
      return res.status(400).json({
        success: false,
        error:
          "Parâmetros obrigatórios: codigo_marca, codigo_modelo, ano_modelo",
      });
    }

    // Deletar todos os registros de histórico deste veículo
    const result = await db.query(
      `DELETE FROM historico_precos 
       WHERE codigo_marca = $1 AND codigo_modelo = $2 AND ano_modelo = $3
       RETURNING id`,
      [codigo_marca, codigo_modelo, ano_modelo]
    );

    const deletados = result.rowCount;

    // Log da ação de admin
    console.log(
      `🗑️ Admin ${req.user.email} deletou veículo: marca=${codigo_marca}, modelo=${codigo_modelo}, ano=${ano_modelo} (${deletados} registros)`
    );

    res.json({
      success: true,
      message: `${deletados} registro(s) deletado(s) com sucesso`,
      deletados,
    });
  } catch (error) {
    console.error("Erro ao deletar veículo (admin):", error);
    res.status(500).json({
      success: false,
      error: "Erro ao deletar veículo",
    });
  }
}

export default withAdmin(handler);
