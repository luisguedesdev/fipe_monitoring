import { consultarPrecoAtual } from "../../lib/fipe";

/**
 * API para consulta FIPE simples - apenas consulta, sem salvar no banco
 * Ideal para visitantes que querem apenas ver o preço atual
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { marcaId, modeloId, anoId, marcaNome, modeloNome, anoNome } = req.body;

  if (!marcaId || !modeloId || !anoId) {
    return res.status(400).json({
      success: false,
      error: "Parâmetros obrigatórios: marcaId, modeloId, anoId",
    });
  }

  try {
    console.log("🔍 Consulta FIPE simples (sem salvar)");
    console.log(
      `📊 Veículo: marca=${marcaId}, modelo=${modeloId}, ano=${anoId}`
    );

    // Consultar preço atual na FIPE oficial
    const resultado = await consultarPrecoAtual(marcaId, modeloId, anoId, 1);

    if (!resultado.success) {
      return res.status(404).json({
        success: false,
        error: resultado.error || "Veículo não encontrado na FIPE",
      });
    }

    // Retornar dados sem salvar no banco
    res.json({
      success: true,
      veiculo: {
        marca: resultado.marca || marcaNome,
        modelo: resultado.modelo || modeloNome,
        ano: resultado.anoModelo || anoNome,
        codigoMarca: marcaId,
        codigoModelo: modeloId,
        anoModelo: anoId,
        codigoFipe: resultado.codigoFipe,
        combustivel: resultado.combustivel,
      },
      precoAtual: {
        valor: resultado.preco,
        mesReferencia: resultado.mesReferencia,
        dataConsulta: resultado.dataConsulta,
      },
      // Informar que precisa de login para funcionalidades avançadas
      historicoDisponivel: false,
      mensagem:
        "Faça login para ver o histórico completo de 24 meses e adicionar veículos à sua conta",
    });
  } catch (error) {
    console.error("❌ Erro ao consultar FIPE:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao consultar dados da FIPE",
    });
  }
}
