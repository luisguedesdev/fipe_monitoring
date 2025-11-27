import {
  consultarPreco,
  getTabelaPorMes,
  getTabelaReferencia,
  getTabelasReferencia,
} from "../../lib/fipe";
import { gerarDatasRetroativas, formatarData } from "../../lib/utils";
import db from "../../lib/db";

// Handler principal da rota
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { marcaId, modeloId, anoId, meses = 12 } = req.body;

  if (!marcaId || !modeloId || !anoId) {
    return res.status(400).json({
      success: false,
      error: "Parâmetros obrigatórios: marcaId, modeloId, anoId",
    });
  }

  try {
    console.log("🔄 Iniciando processo de consulta e salvamento");
    console.log(
      `📊 Veículo: marca=${marcaId}, modelo=${modeloId}, ano=${anoId}`
    );

    // Obter tabelas de referência disponíveis
    const tabelas = await getTabelasReferencia();
    const mesesParaBuscar = Math.min(meses, tabelas.length);

    console.log(`📅 Buscando dados para os últimos ${mesesParaBuscar} meses`);

    // Limpar registros antigos
    console.log("\n🗑️ Removendo registros antigos...");
    try {
      const deleteResult = await db.query(
        `DELETE FROM historico_precos 
         WHERE codigo_marca = $1 AND codigo_modelo = $2 AND ano_modelo = $3`,
        [marcaId, modeloId, anoId]
      );
      console.log(
        `✅ ${deleteResult.rowCount || 0} registros antigos removidos`
      );
    } catch (deleteError) {
      console.error("⚠️ Erro ao limpar registros:", deleteError.message);
    }

    let registrosSalvos = 0;
    let erros = 0;
    let errosConsecutivos = 0;
    const MAX_ERROS_CONSECUTIVOS = 2; // Para depois de 2 erros seguidos (veículo não existia)
    const resultados = [];

    // Processar cada mês
    for (let i = 0; i < mesesParaBuscar; i++) {
      const tabela = tabelas[i];

      // Se teve muitos erros consecutivos, provavelmente o veículo não existia antes
      if (errosConsecutivos >= MAX_ERROS_CONSECUTIVOS) {
        console.log(
          `\n⏹️ Parando busca: veículo provavelmente não existia antes de ${
            tabelas[i - 1]?.Mes || "N/A"
          }`
        );
        break;
      }

      try {
        console.log(
          `\n📊 Processando ${tabela.Mes} (${i + 1}/${mesesParaBuscar})...`
        );

        // Consultar preço FIPE
        const consultaFIPE = await consultarPreco(
          tabela.Codigo,
          marcaId,
          modeloId,
          anoId,
          1 // tipo veículo = carros
        );

        if (!consultaFIPE.success) {
          throw new Error(`Falha na consulta: ${consultaFIPE.error}`);
        }

        // Resetar contador de erros consecutivos
        errosConsecutivos = 0;

        // Calcular data de consulta baseado no mês da tabela
        const dataConsulta = calcularDataDaTabela(tabela.Mes);

        // Salvar no banco
        console.log(`💾 Salvando: ${consultaFIPE.preco} (${tabela.Mes})`);

        const query = `
          INSERT INTO historico_precos
          (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo,
           ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano, data_consulta)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `;

        const valores = [
          tabela.Codigo,
          1,
          marcaId,
          modeloId,
          anoId,
          consultaFIPE.preco,
          1,
          consultaFIPE.marca || "Marca",
          consultaFIPE.modelo || "Modelo",
          anoId,
          dataConsulta,
        ];

        const result = await db.query(query, valores);

        if (result.rows && result.rows.length > 0) {
          registrosSalvos++;
          resultados.push({
            mes: tabela.Mes,
            preco: consultaFIPE.preco,
            mesReferencia: consultaFIPE.mesReferencia,
            data: dataConsulta.toISOString(),
            id: result.rows[0].id,
            fonte: consultaFIPE.fonte,
          });
          console.log(`✅ Salvo com sucesso! (fonte: ${consultaFIPE.fonte})`);
        }

        // Delay entre requisições (1-1.5s para evitar bloqueio da API)
        if (i < mesesParaBuscar - 1) {
          const delayMs = 1000 + Math.random() * 500;
          console.log(`⏳ Aguardando ${(delayMs / 1000).toFixed(1)}s...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        erros++;
        errosConsecutivos++;
        console.error(`❌ Erro ao processar ${tabela.Mes}:`, error.message);

        // Delay mesmo em caso de erro para não sobrecarregar API
        if (i < mesesParaBuscar - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    // Resumo
    const sucesso = registrosSalvos > 0;

    // Mensagem personalizada baseada na situação
    let message;
    if (sucesso) {
      if (registrosSalvos < meses) {
        message = `✅ ${registrosSalvos} meses de histórico obtidos! (veículo existe na FIPE desde ${
          resultados[resultados.length - 1]?.mes || "N/A"
        })`;
      } else {
        message = `✅ ${registrosSalvos} meses de histórico FIPE oficial obtidos!`;
      }
    } else {
      message = `⚠️ Não foi possível obter dados da FIPE para este veículo.`;
    }

    const status = {
      success: sucesso,
      registrosSalvos,
      erros,
      total: mesesParaBuscar,
      mesesDisponiveis: registrosSalvos,
      resultados,
      message,
    };

    console.log("\n📊 Resumo:");
    console.log(`   Salvos: ${registrosSalvos}/${mesesParaBuscar}`);
    console.log(`   Erros: ${erros}`);

    res.json(status);
  } catch (error) {
    console.error("❌ Erro crítico:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Calcula a data correspondente a um mês da tabela FIPE
 * Ex: "novembro/2025" -> Date(2025, 10, 15)
 */
function calcularDataDaTabela(mesStr) {
  const mesTexto = mesStr.replace(" de ", "/").toLowerCase();
  const partes = mesTexto.split("/");
  const mesNome = partes[0]?.trim();
  const anoTexto = partes[1]?.trim();

  const mesesMap = {
    janeiro: 0,
    fevereiro: 1,
    março: 2,
    marco: 2,
    abril: 3,
    maio: 4,
    junho: 5,
    julho: 6,
    agosto: 7,
    setembro: 8,
    outubro: 9,
    novembro: 10,
    dezembro: 11,
  };

  const mesNum = mesesMap[mesNome] ?? 0;
  const anoNum = parseInt(anoTexto) || new Date().getFullYear();

  return new Date(anoNum, mesNum, 15);
}
