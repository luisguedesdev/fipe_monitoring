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

  const {
    marcaId,
    modeloId,
    anoId,
    meses = 12,
    forcarAtualizacao = false,
  } = req.body;

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

    // Verificar se já existe histórico recente no banco
    const historicoExistente = await db.query(
      `SELECT COUNT(*) as total, 
              MAX(data_consulta) as ultima_consulta,
              MAX(codigo_tabela_referencia) as ultima_tabela
       FROM historico_precos
       WHERE codigo_marca = $1 AND codigo_modelo = $2 AND ano_modelo = $3`,
      [marcaId, modeloId, anoId]
    );

    const totalExistente = parseInt(historicoExistente.rows[0]?.total) || 0;
    const ultimaConsulta = historicoExistente.rows[0]?.ultima_consulta;
    const ultimaTabela = historicoExistente.rows[0]?.ultima_tabela;

    // Obter tabela de referência atual
    const tabelaAtual = await getTabelaReferencia();

    // Se já tem histórico E a tabela é atual E não está forçando atualização
    if (totalExistente > 0 && !forcarAtualizacao) {
      // Verificar se já tem o mês atual
      const temMesAtual = ultimaTabela === tabelaAtual.Codigo;

      if (temMesAtual) {
        console.log(
          `✅ Veículo já possui histórico atualizado (${totalExistente} registros)`
        );
        console.log(
          `📅 Última tabela: ${ultimaTabela}, Tabela atual: ${tabelaAtual.Codigo}`
        );

        // Buscar histórico existente para retornar
        const historico = await db.query(
          `SELECT codigo_tabela_referencia, preco, data_consulta, nome_marca, nome_modelo
           FROM historico_precos
           WHERE codigo_marca = $1 AND codigo_modelo = $2 AND ano_modelo = $3
           ORDER BY data_consulta DESC
           LIMIT $4`,
          [marcaId, modeloId, anoId, meses]
        );

        return res.json({
          success: true,
          registrosSalvos: 0,
          registrosExistentes: totalExistente,
          erros: 0,
          total: totalExistente,
          mesesDisponiveis: totalExistente,
          resultados: historico.rows.map((r) => ({
            preco: r.preco,
            data: r.data_consulta,
            fonte: "banco_dados",
          })),
          message: `✅ Veículo já possui ${totalExistente} meses de histórico! (atualizado)`,
          jaExistia: true,
        });
      }

      // Tem histórico mas não tem o mês atual - buscar apenas os meses faltantes
      console.log(
        `📊 Veículo tem ${totalExistente} registros, mas falta atualização do mês atual`
      );
    }

    // Obter tabelas de referência disponíveis
    const tabelas = await getTabelasReferencia();
    const mesesParaBuscar = Math.min(meses, tabelas.length);

    console.log(`📅 Buscando dados para os últimos ${mesesParaBuscar} meses`);

    // Se forçando atualização ou não tem histórico, limpar registros antigos
    if (forcarAtualizacao || totalExistente === 0) {
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
    }

    let registrosSalvos = 0;
    let erros = 0;
    let errosConsecutivos = 0;
    const MAX_ERROS_CONSECUTIVOS = 2; // Para depois de 2 erros seguidos (veículo não existia)
    const resultados = [];

    // Se tem histórico existente e não está forçando, buscar apenas meses faltantes
    const apenasAtualizar = totalExistente > 0 && !forcarAtualizacao;

    // Buscar tabelas que já existem no banco
    let tabelasExistentes = new Set();
    if (apenasAtualizar) {
      const existentes = await db.query(
        `SELECT DISTINCT codigo_tabela_referencia 
         FROM historico_precos 
         WHERE codigo_marca = $1 AND codigo_modelo = $2 AND ano_modelo = $3`,
        [marcaId, modeloId, anoId]
      );
      tabelasExistentes = new Set(
        existentes.rows.map((r) => r.codigo_tabela_referencia)
      );
      console.log(`📊 Já existem ${tabelasExistentes.size} meses no banco`);
    }

    // Processar cada mês
    for (let i = 0; i < mesesParaBuscar; i++) {
      const tabela = tabelas[i];

      // Pular se já existe no banco (quando não está forçando atualização)
      if (apenasAtualizar && tabelasExistentes.has(tabela.Codigo)) {
        console.log(`⏭️ Pulando ${tabela.Mes} (já existe no banco)`);
        continue;
      }

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
    const totalFinal = registrosSalvos + tabelasExistentes.size;
    const sucesso = registrosSalvos > 0 || tabelasExistentes.size > 0;

    // Mensagem personalizada baseada na situação
    let message;
    if (apenasAtualizar && registrosSalvos > 0) {
      message = `✅ ${registrosSalvos} novo(s) mês(es) adicionado(s)! Total: ${totalFinal} meses de histórico.`;
    } else if (apenasAtualizar && registrosSalvos === 0) {
      message = `✅ Histórico já está atualizado! (${tabelasExistentes.size} meses)`;
    } else if (sucesso) {
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
      registrosExistentes: tabelasExistentes.size,
      erros,
      total: totalFinal,
      mesesDisponiveis: totalFinal,
      resultados,
      message,
      jaExistia: apenasAtualizar,
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
