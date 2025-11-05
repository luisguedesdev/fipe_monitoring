import db from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { meses = 12 } = req.query;

  try {
    const result = await db.query(`
      SELECT
        nome_marca,
        nome_modelo,
        nome_ano,
        preco,
        data_consulta,
        EXTRACT(YEAR FROM data_consulta) as ano,
        EXTRACT(MONTH FROM data_consulta) as mes
      FROM historico_precos
      WHERE data_consulta >= NOW() - INTERVAL '${parseInt(meses)} months'
      ORDER BY data_consulta DESC
    `);

    res.json({
      success: true,
      periodo: `${meses} meses`,
      registros: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
