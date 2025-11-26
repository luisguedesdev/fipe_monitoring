import db from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔧 Tentando remover a constraint...");

    // Primeiro, vamos verificar o nome exato da constraint
    const constraintCheck = await db.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'historico_precos'::regclass
        AND contype = 'u'
    `);

    console.log("Constraints encontradas:", constraintCheck.rows);

    if (constraintCheck.rows.length === 0) {
      return res.json({
        success: true,
        message: "Nenhuma constraint única encontrada",
      });
    }

    // Remover cada constraint única
    const results = [];
    for (const constraint of constraintCheck.rows) {
      try {
        await db.query(
          `ALTER TABLE historico_precos DROP CONSTRAINT ${constraint.conname}`
        );
        results.push({
          constraint: constraint.conname,
          status: "removida",
        });
        console.log(`✅ Constraint ${constraint.conname} removida`);
      } catch (error) {
        results.push({
          constraint: constraint.conname,
          status: "erro",
          error: error.message,
        });
        console.error(`❌ Erro ao remover ${constraint.conname}:`, error);
      }
    }

    res.json({
      success: true,
      message: "Constraints processadas",
      results,
    });
  } catch (error) {
    console.error("Erro ao remover constraint:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
