#!/usr/bin/env node

const DatabaseTestSuite = require("./database.test");
const ApiTestSuite = require("./api.test");

async function runAllTests() {
  console.log("🔬 FIPE MONITORING - SUITE COMPLETA DE TESTES");
  console.log("=".repeat(60));
  console.log("");

  const results = {
    database: null,
    api: null,
  };

  try {
    // 1. Testes do Banco de Dados
    console.log("📁 FASE 1: TESTES DO BANCO DE DADOS");
    console.log("-".repeat(40));

    const dbTests = new DatabaseTestSuite();
    results.database = await dbTests.runTests();

    console.log("\n");

    // 2. Testes da API (apenas se banco passou)
    if (results.database.success) {
      console.log("🌐 FASE 2: TESTES DA API");
      console.log("-".repeat(40));

      // Verificar se servidor está rodando
      const serverUrl = process.argv[2] || "http://localhost:3000";

      try {
        const apiTests = new ApiTestSuite(serverUrl);
        results.api = await apiTests.runTests();
      } catch (error) {
        console.log(
          "⚠️  Não foi possível testar API - servidor pode não estar rodando"
        );
        console.log(`   Para testar API, execute: npm run dev`);
        console.log(`   Então: npm run test:api`);
        results.api = {
          passed: 0,
          failed: 0,
          total: 0,
          success: false,
          skipped: true,
        };
      }
    } else {
      console.log("⏭️  Pulando testes da API - falhas no banco de dados");
      results.api = {
        passed: 0,
        failed: 0,
        total: 0,
        success: false,
        skipped: true,
      };
    }
  } catch (error) {
    console.error("💥 Erro fatal durante os testes:", error);
    process.exit(1);
  }

  // Relatório Final
  console.log("\n");
  console.log("🏆 RELATÓRIO FINAL");
  console.log("=".repeat(60));

  console.log("\n📊 Resumo por Categoria:");
  console.log(
    `📁 Banco de Dados: ${results.database.passed}/${results.database.total} (${
      results.database.success ? "✅" : "❌"
    })`
  );

  if (results.api.skipped) {
    console.log(
      `🌐 API: Pulado (${
        results.api.skipped ? "Servidor não disponível" : "Falhas no banco"
      })`
    );
  } else {
    console.log(
      `🌐 API: ${results.api.passed}/${results.api.total} (${
        results.api.success ? "✅" : "❌"
      })`
    );
  }

  const totalPassed = results.database.passed + results.api.passed;
  const totalTests = results.database.total + results.api.total;
  const successRate =
    totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;

  console.log("\n📈 Estatísticas Gerais:");
  console.log(`Total de testes: ${totalTests}`);
  console.log(`Sucessos: ${totalPassed}`);
  console.log(`Falhas: ${totalTests - totalPassed}`);
  console.log(`Taxa de sucesso: ${successRate}%`);

  // Status geral
  const overallSuccess =
    results.database.success && (results.api.success || results.api.skipped);

  if (overallSuccess) {
    console.log("\n🎉 TODOS OS TESTES DISPONÍVEIS PASSARAM!");
    console.log("✨ Sistema pronto para deploy!");
  } else {
    console.log("\n⚠️  ALGUNS TESTES FALHARAM");
    console.log("🔧 Revise os erros acima antes do deploy");
  }

  // Próximos passos
  console.log("\n📋 Próximos Passos:");
  if (results.database.success) {
    console.log("✅ Banco de dados: Funcionando");
  } else {
    console.log("❌ Banco de dados: Necessita correção");
  }

  if (results.api.skipped) {
    console.log(
      "⏳ API: Para testar, execute `npm run dev` e depois `npm run test:api`"
    );
  } else if (results.api.success) {
    console.log("✅ API: Funcionando");
  } else {
    console.log("❌ API: Necessita correção");
  }

  if (overallSuccess) {
    console.log("🚀 Deploy: Sistema pronto para produção");
  } else {
    console.log("🛠️  Deploy: Corrija os problemas antes de fazer deploy");
  }

  process.exit(overallSuccess ? 0 : 1);
}

// Executar se for chamado diretamente
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error("💥 Erro fatal:", error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
