import { consultarPreco, getTabelasReferencia } from "../../lib/fipe";
import db from "../../lib/db";

// Mapa de meses para converter texto em número
const MESES_MAP = {
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

/**
 * Converte o texto do mês FIPE para Date
 * Ex: "novembro de 2025" ou "novembro/2025" -> Date(2025, 10, 15)
 */
function parseMesFipe(mesTexto) {
  const texto = mesTexto.replace(" de ", "/").toLowerCase();
  const partes = texto.split("/");
  const mesNome = partes[0]?.trim();
  const anoTexto = partes[1]?.trim();

  const mesNum = MESES_MAP[mesNome];
  const anoNum = parseInt(anoTexto);

  if (mesNum !== undefined && !isNaN(anoNum)) {
    return new Date(anoNum, mesNum, 15);
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Configurações
  const MAX_MESES = parseInt(req.query.maxMeses) || 24; // Quantos meses buscar (padrão: 24)
  const DELAY_MS = 1200; // Delay entre requisições (1.2s)

  try {
    console.log("🔄 Iniciando atualização de TODOS os meses faltantes...");
    console.log(`📅 Buscando até ${MAX_MESES} meses de histórico`);

    // 1. Buscar TODAS as tabelas de referência disponíveis na FIPE
    let tabelas;
    try {
      tabelas = await getTabelasReferencia();
      console.log(`✅ ${tabelas.length} tabelas disponíveis na FIPE`);
    } catch (error) {
      console.error("❌ Erro ao obter tabelas:", error.message);
      return res.status(500).json({
        success: false,
        error: "Não foi possível obter tabelas da FIPE",
      });
    }

    // Pegar apenas os últimos X meses
    const tabelasParaVerificar = tabelas.slice(0, MAX_MESES);
    console.log(
      `📋 Verificando ${tabelasParaVerificar.length} meses: ${
        tabelasParaVerificar[0]?.Mes
      } até ${tabelasParaVerificar[tabelasParaVerificar.length - 1]?.Mes}`
    );

    // 2. Buscar todos os veículos únicos
    const veiculosQuery = `
      SELECT DISTINCT 
        codigo_marca,
        codigo_modelo,
        ano_modelo,
        nome_marca,
        nome_modelo
      FROM historico_precos
    `;
    const veiculosResult = await db.query(veiculosQuery);
    const veiculos = veiculosResult.rows;

    console.log(`📊 Total de veículos cadastrados: ${veiculos.length}`);

    let totalAtualizados = 0;
    let totalErros = 0;
    let totalJaExiste = 0;
    const resultados = [];

    // 3. Para cada veículo, verificar TODOS os meses faltantes
    for (const veiculo of veiculos) {
      const {
        codigo_marca,
        codigo_modelo,
        ano_modelo,
        nome_marca,
        nome_modelo,
      } = veiculo;

      console.log(
        `\n🚗 Verificando: ${nome_marca} ${nome_modelo} (${ano_modelo})`
      );

      // Buscar quais tabelas já existem para este veículo
      const registrosQuery = `
        SELECT codigo_tabela_referencia 
        FROM historico_precos
        WHERE codigo_marca = $1 AND codigo_modelo = $2 AND ano_modelo = $3
      `;
      const registrosResult = await db.query(registrosQuery, [
        codigo_marca,
        codigo_modelo,
        ano_modelo,
      ]);

      const tabelasExistentes = new Set(
        registrosResult.rows.map((r) => Number(r.codigo_tabela_referencia))
      );
      console.log(`  📁 ${tabelasExistentes.size} meses já registrados`);

      // Identificar meses faltantes
      const mesesFaltantes = tabelasParaVerificar.filter(
        (t) => !tabelasExistentes.has(Number(t.Codigo))
      );

      if (mesesFaltantes.length === 0) {
        console.log(`  ✅ Todos os ${MAX_MESES} meses já estão completos`);
        totalJaExiste += tabelasParaVerificar.length;
        continue;
      }

      console.log(`  🔍 ${mesesFaltantes.length} meses faltantes para buscar`);

      // Contador de erros consecutivos para este veículo
      let errosConsecutivos = 0;
      const MAX_ERROS_CONSECUTIVOS = 2;

      // Buscar cada mês faltante
      for (const tabela of mesesFaltantes) {
        // Se teve muitos erros consecutivos, veículo provavelmente não existia
        if (errosConsecutivos >= MAX_ERROS_CONSECUTIVOS) {
          console.log(
            `    ⏹️ Parando: veículo não existia antes deste período`
          );
          break;
        }

        console.log(`    📅 Buscando ${tabela.Mes}...`);

        try {
          // Consultar FIPE oficial
          const consultaFIPE = await consultarPreco(
            tabela.Codigo,
            codigo_marca,
            codigo_modelo,
            ano_modelo,
            1 // tipo veículo = carros
          );

          if (!consultaFIPE.success) {
            console.log(
              `    ⚠️ ${tabela.Mes}: ${consultaFIPE.error || "Falha"}`
            );
            totalErros++;
            errosConsecutivos++;
            // Continuar para próximo mês
            await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
            continue;
          }

          // Resetar contador de erros consecutivos
          errosConsecutivos = 0;

          // Calcular data de consulta
          const dataConsulta = parseMesFipe(tabela.Mes) || new Date();

          // Salvar no banco
          const insertQuery = `
            INSERT INTO historico_precos
            (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo,
             ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano, data_consulta)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT DO NOTHING
            RETURNING id
          `;

          const valores = [
            tabela.Codigo,
            1,
            codigo_marca,
            codigo_modelo,
            ano_modelo,
            consultaFIPE.preco,
            consultaFIPE.siglaCombustivel === "D" ? 3 : 1, // Diesel = 3, outros = 1
            consultaFIPE.marca || nome_marca,
            consultaFIPE.modelo || nome_modelo,
            ano_modelo,
            dataConsulta,
          ];

          const result = await db.query(insertQuery, valores);

          if (result.rows && result.rows.length > 0) {
            totalAtualizados++;
            console.log(`    ✅ ${tabela.Mes}: ${consultaFIPE.preco}`);
            resultados.push({
              veiculo: `${nome_marca} ${nome_modelo}`,
              mes: tabela.Mes,
              preco: consultaFIPE.preco,
            });
          } else {
            console.log(`    ⚠️ ${tabela.Mes}: Já existia (conflito)`);
            totalJaExiste++;
          }

          // Delay entre requisições para evitar bloqueio
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        } catch (error) {
          console.error(`    ❌ ${tabela.Mes}: ${error.message}`);
          totalErros++;
          // Continuar mesmo com erro
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }
    }

    console.log(`\n✅ Atualização de meses faltantes concluída!`);
    console.log(`   - Novos registros: ${totalAtualizados}`);
    console.log(`   - Já existentes: ${totalJaExiste}`);
    console.log(`   - Erros: ${totalErros}`);

    res.json({
      success: true,
      message: `Atualização concluída! ${totalAtualizados} novos registros de ${MAX_MESES} meses`,
      maxMeses: MAX_MESES,
      totalVeiculos: veiculos.length,
      totalAtualizados,
      totalJaExiste,
      totalErros,
      resultados,
    });
  } catch (error) {
    console.error("❌ Erro na atualização:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
