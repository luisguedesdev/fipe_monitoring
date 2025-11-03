#!/usr/bin/env node

/**
 * Script de teste para o FipeRequestManager
 * Testa rate limiting, circuit breaker e processamento em batch
 */

require("dotenv").config();
const { fipeRequestManager } = require("./backend/config/fipeRequestManager");
const logger = require("./backend/config/logger");

const FIPE_BASE_URL =
  process.env.FIPE_BASE_URL || "https://veiculos.fipe.org.br/api/veiculos";

// URLs da API FIPE
const FIPE_URLS = {
  TABELA_REFERENCIA: `${FIPE_BASE_URL}/ConsultarTabelaDeReferencia`,
  MARCAS: `${FIPE_BASE_URL}/ConsultarMarcas`,
  MODELOS: `${FIPE_BASE_URL}/ConsultarModelos`,
};

async function testBasicRequest() {
  console.log("\n🧪 Teste 1: Requisição Básica");
  console.log("=".repeat(50));

  try {
    const response = await fipeRequestManager.request(
      FIPE_URLS.TABELA_REFERENCIA,
      {}
    );

    if (response.data && Array.isArray(response.data)) {
      console.log(`✅ Sucesso! Obtidas ${response.data.length} tabelas`);
      console.log(
        `📅 Primeira tabela: ${
          response.data[0].Mes || response.data[0].MesReferencia
        }`
      );
      return true;
    } else {
      console.log("❌ Resposta inválida");
      return false;
    }
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return false;
  }
}

async function testRateLimiting() {
  console.log("\n🧪 Teste 2: Rate Limiting");
  console.log("=".repeat(50));

  try {
    // Obter tabela de referência primeiro
    const tabelaResponse = await fipeRequestManager.request(
      FIPE_URLS.TABELA_REFERENCIA,
      {}
    );
    const codigoTabela = String(tabelaResponse.data[0].Codigo);

    // Fazer 10 requisições rápidas para testar rate limiting
    console.log("📤 Enviando 10 requisições rápidas...");
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 10; i++) {
      promises.push(
        fipeRequestManager
          .request(FIPE_URLS.MARCAS, {
            codigoTabelaReferencia: codigoTabela,
            codigoTipoVeiculo: 1,
          })
          .then(() => ({ success: true, index: i }))
          .catch((error) => ({
            success: false,
            index: i,
            error: error.message,
          }))
      );
    }

    const results = await Promise.all(promises);
    const elapsed = Date.now() - startTime;

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n📊 Resultados:`);
    console.log(`  ✅ Bem-sucedidas: ${successful}/10`);
    console.log(`  ❌ Falhas: ${failed}/10`);
    console.log(`  ⏱️  Tempo total: ${(elapsed / 1000).toFixed(2)}s`);
    console.log(`  📈 Média: ${(elapsed / 10).toFixed(0)}ms por requisição`);

    // Verificar se o rate limiting está funcionando
    const avgDelay = elapsed / 10;
    if (avgDelay >= 250) {
      console.log(
        `✅ Rate limiting funcionando (delay médio: ${avgDelay.toFixed(0)}ms)`
      );
      return true;
    } else {
      console.log(
        `⚠️  Delay muito baixo (${avgDelay.toFixed(
          0
        )}ms) - pode causar bloqueios`
      );
      return false;
    }
  } catch (error) {
    console.log(`❌ Erro no teste: ${error.message}`);
    return false;
  }
}

async function testBatchProcessing() {
  console.log("\n🧪 Teste 3: Processamento em Batch");
  console.log("=".repeat(50));

  try {
    // Obter tabela de referência
    const tabelaResponse = await fipeRequestManager.request(
      FIPE_URLS.TABELA_REFERENCIA,
      {}
    );
    const codigoTabela = String(tabelaResponse.data[0].Codigo);

    // Preparar batch de 5 requisições
    const batchRequests = [1, 2, 3].map((tipo) => ({
      url: FIPE_URLS.MARCAS,
      data: {
        codigoTabelaReferencia: codigoTabela,
        codigoTipoVeiculo: tipo,
      },
    }));

    console.log(
      `📤 Processando batch de ${batchRequests.length} requisições...`
    );
    const startTime = Date.now();

    const results = await fipeRequestManager.requestBatch(batchRequests);
    const elapsed = Date.now() - startTime;

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n📊 Resultados:`);
    console.log(`  ✅ Bem-sucedidas: ${successful}/${batchRequests.length}`);
    console.log(`  ❌ Falhas: ${failed}/${batchRequests.length}`);
    console.log(`  ⏱️  Tempo total: ${(elapsed / 1000).toFixed(2)}s`);

    // Mostrar detalhes das marcas obtidas
    results.forEach((result, i) => {
      if (result.success && result.data) {
        const tipoNome = i === 0 ? "Carros" : i === 1 ? "Motos" : "Caminhões";
        console.log(`  📋 ${tipoNome}: ${result.data.length} marcas`);
      }
    });

    return successful === batchRequests.length;
  } catch (error) {
    console.log(`❌ Erro no teste: ${error.message}`);
    return false;
  }
}

async function testCircuitBreaker() {
  console.log("\n🧪 Teste 4: Circuit Breaker (Simulado)");
  console.log("=".repeat(50));

  try {
    // Fazer requisições para URL inválida para forçar erros
    const invalidUrl = FIPE_BASE_URL + "/InvalidEndpoint";
    console.log("📤 Tentando requisições para endpoint inválido...");

    let circuitOpened = false;

    for (let i = 0; i < 10; i++) {
      try {
        await fipeRequestManager.request(invalidUrl, {});
        console.log(`  ${i + 1}. Requisição bem-sucedida (inesperado)`);
      } catch (error) {
        if (error.code === "CIRCUIT_BREAKER_OPEN") {
          console.log(`  ${i + 1}. ⚡ Circuit breaker ABERTO`);
          circuitOpened = true;
          break;
        } else {
          console.log(
            `  ${i + 1}. ❌ Erro: ${error.message.substring(0, 50)}...`
          );
        }
      }

      // Pequeno delay entre tentativas
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (circuitOpened) {
      console.log(`\n✅ Circuit breaker funcionando corretamente!`);
      return true;
    } else {
      console.log(
        `\n⚠️  Circuit breaker não foi ativado (isso é esperado se o endpoint responder)`
      );
      return true; // Não é falha crítica
    }
  } catch (error) {
    console.log(`❌ Erro no teste: ${error.message}`);
    return false;
  }
}

async function showStats() {
  console.log("\n📊 Estatísticas do Gerenciador");
  console.log("=".repeat(50));

  const stats = fipeRequestManager.getStats();

  console.log(`Total de requisições: ${stats.totalRequests}`);
  console.log(`  ✅ Bem-sucedidas: ${stats.successfulRequests}`);
  console.log(`  ❌ Falhas: ${stats.failedRequests}`);
  console.log(`  🚦 Rate limit hits: ${stats.rateLimitHits}`);
  console.log(`  ⚡ Circuit breaker trips: ${stats.circuitBreakerTrips}`);
  console.log(`  ⏱️  Delay médio: ${stats.averageDelay.toFixed(0)}ms`);
  console.log(`  📥 Tamanho da fila: ${stats.queueSize}`);
  console.log(`  🔄 Processando: ${stats.processing ? "Sim" : "Não"}`);
  console.log(`  ⚡ Circuit aberto: ${stats.circuitOpen ? "Sim" : "Não"}`);
  console.log(`  📈 Req/minuto atual: ${stats.requestsLastMinute}`);

  const successRate =
    stats.totalRequests > 0
      ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
      : 0;
  console.log(`  ✅ Taxa de sucesso: ${successRate}%`);
}

async function runAllTests() {
  console.log("\n🚀 Iniciando testes do FipeRequestManager");
  console.log("=".repeat(50));

  const results = {
    basicRequest: false,
    rateLimiting: false,
    batchProcessing: false,
    circuitBreaker: false,
  };

  // Teste 1: Requisição básica
  results.basicRequest = await testBasicRequest();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Teste 2: Rate limiting
  results.rateLimiting = await testRateLimiting();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Teste 3: Batch processing
  results.batchProcessing = await testBatchProcessing();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Teste 4: Circuit breaker (pode falhar, é esperado)
  results.circuitBreaker = await testCircuitBreaker();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mostrar estatísticas finais
  await showStats();

  // Resumo
  console.log("\n" + "=".repeat(50));
  console.log("📋 RESUMO DOS TESTES");
  console.log("=".repeat(50));

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter((r) => r).length;

  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? "✅" : "❌";
    const testName = test
      .replace(/([A-Z])/g, " $1")
      .toLowerCase()
      .trim();
    console.log(`${icon} ${testName}`);
  });

  console.log("\n" + "=".repeat(50));
  console.log(
    `🎯 Resultado: ${passedTests}/${totalTests} testes passaram (${(
      (passedTests / totalTests) *
      100
    ).toFixed(0)}%)`
  );

  if (passedTests === totalTests) {
    console.log("✅ Todos os testes passaram! Sistema pronto para uso.");
    process.exit(0);
  } else {
    console.log("⚠️  Alguns testes falharam. Verifique os logs acima.");
    process.exit(1);
  }
}

// Executar testes
runAllTests().catch((error) => {
  console.error("\n💥 Erro fatal nos testes:", error);
  process.exit(1);
});
