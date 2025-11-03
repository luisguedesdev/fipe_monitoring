#!/usr/bin/env node

/**
 * Teste rápido do FipeRequestManager
 */

require("dotenv").config();
const { fipeRequestManager } = require("./backend/config/fipeRequestManager");

const FIPE_BASE_URL =
  process.env.FIPE_BASE_URL || "https://veiculos.fipe.org.br/api/veiculos";

async function quickTest() {
  console.log("\n🔍 Teste Rápido do FipeRequestManager\n");

  try {
    // Teste 1: Requisição simples
    console.log("1️⃣  Testando requisição simples...");
    const response = await fipeRequestManager.request(
      `${FIPE_BASE_URL}/ConsultarTabelaDeReferencia`,
      {}
    );

    if (response.data && response.data.length > 0) {
      console.log(`   ✅ ${response.data.length} tabelas obtidas`);
      console.log(
        `   📅 Primeira: ${
          response.data[0].Mes || response.data[0].MesReferencia
        }\n`
      );
    }

    // Teste 2: Múltiplas requisições
    console.log("2️⃣  Testando 5 requisições sequenciais...");
    const codigoTabela = String(response.data[0].Codigo);
    const startTime = Date.now();

    for (let i = 0; i < 5; i++) {
      await fipeRequestManager.request(`${FIPE_BASE_URL}/ConsultarMarcas`, {
        codigoTabelaReferencia: codigoTabela,
        codigoTipoVeiculo: 1,
      });
      process.stdout.write(`   📤 Requisição ${i + 1}/5 completa\n`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`   ✅ Completado em ${(elapsed / 1000).toFixed(2)}s`);
    console.log(`   ⏱️  Média: ${(elapsed / 5).toFixed(0)}ms por requisição\n`);

    // Estatísticas
    const stats = fipeRequestManager.getStats();
    console.log("📊 Estatísticas:");
    console.log(`   Total: ${stats.totalRequests} requisições`);
    console.log(`   Sucesso: ${stats.successfulRequests}`);
    console.log(`   Falhas: ${stats.failedRequests}`);
    console.log(
      `   Taxa de sucesso: ${(
        (stats.successfulRequests / stats.totalRequests) *
        100
      ).toFixed(1)}%`
    );
    console.log(`   Delay médio: ${stats.averageDelay.toFixed(0)}ms`);

    console.log("\n✅ Sistema funcionando corretamente!\n");
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Erro: ${error.message}\n`);
    process.exit(1);
  }
}

quickTest();
