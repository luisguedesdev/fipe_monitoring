import { withAdmin } from "../../../lib/auth";
import db from "../../../lib/db";

/**
 * API de Admin para obter estatísticas do sistema
 */
async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // Total de usuários
    const usersResult = await db.query("SELECT COUNT(*) as total FROM users");
    const totalUsuarios = parseInt(usersResult.rows[0]?.total || 0);

    // Total de veículos únicos no banco central
    const veiculosResult = await db.query(`
      SELECT COUNT(DISTINCT (codigo_marca, codigo_modelo, ano_modelo)) as total
      FROM historico_precos
    `);
    const totalVeiculos = parseInt(veiculosResult.rows[0]?.total || 0);

    // Total de registros de preço
    const registrosResult = await db.query(
      "SELECT COUNT(*) as total FROM historico_precos"
    );
    const totalRegistros = parseInt(registrosResult.rows[0]?.total || 0);

    // Veículos salvos por usuários
    const userVeiculosResult = await db.query(
      "SELECT COUNT(*) as total FROM user_veiculos"
    );
    const totalUserVeiculos = parseInt(userVeiculosResult.rows[0]?.total || 0);

    // Últimos usuários cadastrados
    const ultimosUsuarios = await db.query(`
      SELECT id, nome, email, is_admin, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    // Veículos mais consultados (com mais registros)
    const veiculosMaisConsultados = await db.query(`
      SELECT 
        nome_marca, 
        nome_modelo, 
        ano_modelo,
        COUNT(*) as total_registros
      FROM historico_precos
      GROUP BY nome_marca, nome_modelo, ano_modelo
      ORDER BY total_registros DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      stats: {
        totalUsuarios,
        totalVeiculos,
        totalRegistros,
        totalUserVeiculos,
      },
      ultimosUsuarios: ultimosUsuarios.rows,
      veiculosMaisConsultados: veiculosMaisConsultados.rows,
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas (admin):", error);
    res.status(500).json({
      success: false,
      error: "Erro ao obter estatísticas",
    });
  }
}

export default withAdmin(handler);
