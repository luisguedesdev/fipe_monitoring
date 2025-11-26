import db from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { codigoMarca, codigoModelo, anoModelo } = req.body;

  if (!codigoMarca || !codigoModelo || !anoModelo) {
    return res.status(400).json({
      success: false,
      error: "Parâmetros obrigatórios: codigoMarca, codigoModelo, anoModelo",
    });
  }

  try {
    // Deletar todos os registros do veículo
    const query = `
      DELETE FROM historico_precos
      WHERE codigo_marca = $1 
        AND codigo_modelo = $2 
        AND ano_modelo = $3
      RETURNING id
    `;

    const result = await db.query(query, [codigoMarca, codigoModelo, anoModelo]);

    res.json({
      success: true,
      message: `Veículo removido com sucesso`,
      registrosDeletados: result.rowCount,
    });
  } catch (error) {
    console.error("Erro ao deletar veículo:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
