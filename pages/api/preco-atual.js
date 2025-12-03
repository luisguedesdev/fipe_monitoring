import { consultarPrecoAtual, parsePreco } from "../../lib/fipe";

/**
 * API para consulta FIPE do mês atual apenas (para visitantes)
 * Consulta diretamente na FIPE oficial, não no banco de dados
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { marca, modelo, ano } = req.query;

  if (!marca || !modelo || !ano) {
    return res.status(400).json({
      success: false,
      error: "Parâmetros marca, modelo e ano são obrigatórios",
    });
  }

  try {
    console.log("🔍 Consulta FIPE atual para visitante");
    console.log(`📊 Veículo: marca=${marca}, modelo=${modelo}, ano=${ano}`);

    // Consultar preço atual diretamente na FIPE oficial
    const resultado = await consultarPrecoAtual(marca, modelo, ano, 1);

    if (!resultado.success) {
      return res.status(404).json({
        success: false,
        error: resultado.error || "Veículo não encontrado na FIPE",
      });
    }

    res.json({
      success: true,
      veiculo: {
        marca: resultado.marca,
        modelo: resultado.modelo,
        ano: resultado.anoModelo,
        codigoMarca: marca,
        codigoModelo: modelo,
        anoModelo: ano,
        codigoFipe: resultado.codigoFipe,
        combustivel: resultado.combustivel,
      },
      precoAtual: {
        valor: resultado.preco,
        valorNumerico: parsePreco(resultado.preco),
        mesReferencia: resultado.mesReferencia,
        dataConsulta: resultado.dataConsulta,
      },
      // Informar que precisa de login para ver histórico
      historicoDisponivel: false,
      mensagem: "Faça login para ver o histórico completo de preços",
    });
  } catch (error) {
    console.error("Erro ao buscar preço atual:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar dados do veículo",
    });
  }
}
