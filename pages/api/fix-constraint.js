import db from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🔄 Removendo constraint única...");

    // Remover a constraint única existente
    await db.query(`DROP INDEX IF EXISTS idx_historico_unique`);

    console.log("✅ Constraint removida com sucesso!");

    res.json({
      success: true,
      message:
        "Constraint única removida. Agora é possível inserir múltiplos registros por veículo.",
    });
  } catch (error) {
    console.error("❌ Erro ao remover constraint:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
