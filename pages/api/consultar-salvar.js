import {
  consultarPrecoComFallback,
  getTabelaPorMes,
  getTabelaReferencia,
} from "../../lib/fipe";
import { gerarDatasRetroativas, formatarData } from "../../lib/utils";
import db from "../../lib/db";

// Handler principal da rota
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { marcaId, modeloId, anoId, meses = 24 } = req.body;

  if (!marcaId || !modeloId || !anoId) {
    return res.status(400).json({
      success: false,
      error: "Parâmetros obrigatórios: marcaId, modeloId, anoId",
    });
  }

  try {
    // Inicializar contadores e arrays
    let registrosSalvos = 0;
    let erros = 0;
    let simulados = 0;
    const resultados = [];
    const datasConsulta = gerarDatasRetroativas(meses);

    console.log("🔄 Iniciando processo de consulta e salvamento");
    console.log(
      `📅 Período: ${formatarData(datasConsulta[0])} até ${formatarData(
        datasConsulta[datasConsulta.length - 1]
      )}`
    );

    // Obter tabela FIPE mais recente
    console.log("\n🔍 Obtendo tabela FIPE mais recente...");
    let tabelaFIPE;
    try {
      tabelaFIPE = await getTabelaReferencia();
      console.log(`✅ Usando tabela: ${tabelaFIPE.Mes}`);
    } catch (error) {
      console.log("⚠️ Erro ao obter tabela, usando código padrão");
      tabelaFIPE = { Codigo: 320, Mes: "novembro/2025" };
    }

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

    // Processar cada mês
    for (let i = 0; i < datasConsulta.length; i++) {
      const dataConsulta = datasConsulta[i];
      const mesAno = formatarData(dataConsulta);

      try {
        console.log(
          `\n📊 Processando ${mesAno} (${i + 1}/${datasConsulta.length})...`
        );

        // Obter tabela para o mês específico
        const tabelaMes = await getTabelaPorMes(i);

        // Consultar preço (com fallback para simulação)
        console.log(`🔍 Consultando FIPE para ${mesAno}...`);
        const consultaFIPE = await consultarPrecoComFallback(
          {
            codigoTabelaReferencia: tabelaMes.Codigo,
            codigoTipoVeiculo: 1, // Carro
            codigoMarca: marcaId,
            codigoModelo: modeloId,
            anoModelo: anoId,
            codigoTipoCombustivel: 1,
          },
          i
        );

        if (!consultaFIPE.success) {
          throw new Error(`Falha ao consultar FIPE: ${consultaFIPE.error}`);
        }

        if (consultaFIPE.simulado) {
          simulados++;
        }

        // Salvar no banco
        console.log(`💾 Salvando dados de ${mesAno}...`);
        const query = `
          INSERT INTO historico_precos
          (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo,
           ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano, data_consulta)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `;

        const valores = [
          tabelaMes.Codigo,
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
            mes: i,
            mesAno,
            preco: consultaFIPE.preco,
            data: dataConsulta.toISOString(),
            id: result.rows[0].id,
            simulado: consultaFIPE.simulado || false,
          });

          console.log(
            `✅ ${mesAno} salvo com sucesso! (${registrosSalvos}/${
              datasConsulta.length
            })${consultaFIPE.simulado ? " [simulado]" : ""}`
          );
        } else {
          throw new Error("Falha ao inserir registro");
        }

        // Delay entre registros (exceto último)
        if (i < datasConsulta.length - 1) {
          const delay = 1500 + Math.random() * 1000;
          console.log(`⏳ Aguardando ${Math.round(delay / 1000)}s...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        erros++;
        console.error(`❌ Erro ao processar ${mesAno}:`, error.message);
      }
    }

    // Resumo final da operação
    const total = datasConsulta.length;
    const sucesso =
      registrosSalvos === total || (registrosSalvos > 0 && erros === 0);
    const percentualSucesso = ((registrosSalvos / total) * 100).toFixed(1);

    const status = {
      success: sucesso,
      registrosSalvos,
      simulados,
      erros,
      total,
      percentualSucesso,
      resultados,
      periodo: {
        inicio: formatarData(datasConsulta[0]),
        fim: formatarData(datasConsulta[datasConsulta.length - 1]),
      },
      message: sucesso
        ? `✅ ${registrosSalvos} registros salvos com sucesso!${
            simulados > 0 ? ` (${simulados} simulados)` : ""
          }`
        : `⚠️ ${registrosSalvos} de ${total} registros salvos. ${erros} falhas.`,
    };

    // Log detalhado
    console.log("\n📊 Resumo da operação:");
    console.log(`Período: ${status.periodo.inicio} até ${status.periodo.fim}`);
    console.log(`Total esperado: ${total}`);
    console.log(`Salvos: ${registrosSalvos}`);
    console.log(`Simulados: ${simulados}`);
    console.log(`Erros: ${erros}`);
    console.log(`Taxa de sucesso: ${percentualSucesso}%`);

    res.json(status);
  } catch (error) {
    console.error("\n❌ Erro crítico na operação:", error);

    res.status(500).json({
      success: false,
      error: error.message,
      message: "Falha ao processar a requisição. Tente novamente.",
    });
  }
}
