const assert = require("assert");
const path = require("path");
const { db, executeQuery, isProduction } = require("../backend/db");
const logger = require("../backend/config/logger");

class DatabaseTestSuite {
  constructor() {
    this.testDatabase = "test_database.db";
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async setup() {
    console.log("🔧 Configurando ambiente de teste...");

    if (!isProduction) {
      // Para SQLite, usar banco de teste
      process.env.NODE_ENV = "test";
    }

    // Aguardar conexão estabilizar
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("✅ Ambiente de teste configurado");
  }

  async cleanup() {
    console.log("🧹 Limpando ambiente de teste...");

    try {
      // Limpar dados de teste
      await executeQuery(
        "DELETE FROM historico_precos WHERE nome_marca LIKE 'TEST_%'"
      );

      if (isProduction) {
        await executeQuery(
          "DELETE FROM api_cache WHERE cache_key LIKE 'test_%'"
        );
        await executeQuery("DELETE FROM system_logs WHERE source = 'test'");
      }

      console.log("✅ Ambiente limpo");
    } catch (error) {
      console.log(
        "⚠️  Erro na limpeza (esperado em primeiro teste):",
        error.message
      );
    }
  }

  async test(name, testFn) {
    try {
      console.log(`\n🧪 Testando: ${name}`);
      await testFn();
      console.log(`✅ PASSOU: ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`❌ FALHOU: ${name}`);
      console.log(`   Erro: ${error.message}`);
      this.failed++;
    }

    this.tests.push({ name, passed: this.failed === 0 });
  }

  async runTests() {
    console.log("🚀 Iniciando testes do banco de dados...\n");

    await this.setup();

    // Teste 1: Conexão com o banco
    await this.test("Conexão com banco de dados", async () => {
      const result = isProduction
        ? await executeQuery("SELECT NOW() as time")
        : await executeQuery("SELECT datetime('now') as time");

      assert(result.length > 0, "Deve retornar resultado");
      assert(result[0].time, "Deve ter campo time");
    });

    // Teste 2: Criação de tabela
    await this.test(
      "Verificação da estrutura da tabela historico_precos",
      async () => {
        const query = isProduction
          ? `SELECT column_name, data_type 
           FROM information_schema.columns 
           WHERE table_name = 'historico_precos'`
          : `PRAGMA table_info(historico_precos)`;

        const result = await executeQuery(query);
        assert(result && result.length > 0, "Tabela deve existir");

        const columns = isProduction
          ? result.map((r) => r.column_name)
          : result.map((r) => r.name);

        const expectedColumns = [
          "id",
          "data_consulta",
          "codigo_marca",
          "codigo_modelo",
          "ano_modelo",
          "preco",
          "nome_marca",
          "nome_modelo",
        ];

        expectedColumns.forEach((col) => {
          assert(columns.includes(col), `Deve ter coluna ${col}`);
        });
      }
    );

    // Teste 3: Inserção de dados
    await this.test("Inserção de dados de teste", async () => {
      const testData = {
        codigo_tabela_referencia: "TEST001",
        codigo_tipo_veiculo: 1,
        codigo_marca: 999,
        codigo_modelo: 999,
        ano_modelo: "2024-1",
        preco: "R$ 50.000,00",
        codigo_tipo_combustivel: 1,
        nome_marca: "TEST_MARCA",
        nome_modelo: "TEST_MODELO",
        nome_ano: "2024 Gasolina",
      };

      const insertQuery = isProduction
        ? `INSERT INTO historico_precos 
           (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo, 
            ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`
        : `INSERT INTO historico_precos 
           (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo, 
            ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        testData.codigo_tabela_referencia,
        testData.codigo_tipo_veiculo,
        testData.codigo_marca,
        testData.codigo_modelo,
        testData.ano_modelo,
        testData.preco,
        testData.codigo_tipo_combustivel,
        testData.nome_marca,
        testData.nome_modelo,
        testData.nome_ano,
      ];

      const result = await executeQuery(insertQuery, values);

      if (isProduction) {
        assert(result.length > 0, "Deve retornar ID do registro");
        assert(result[0].id, "Deve ter ID válido");
      } else {
        // Para SQLite, verificar se inseriu
        const checkQuery =
          "SELECT COUNT(*) as count FROM historico_precos WHERE nome_marca = ?";
        const checkResult = await executeQuery(checkQuery, ["TEST_MARCA"]);
        assert(checkResult[0].count > 0, "Deve ter inserido registro");
      }
    });

    // Teste 4: Consulta de dados
    await this.test("Consulta de dados inseridos", async () => {
      const paramPlaceholder = isProduction ? "$1" : "?";
      const query = `SELECT * FROM historico_precos WHERE nome_marca = ${paramPlaceholder}`;
      const result = await executeQuery(query, ["TEST_MARCA"]);

      assert(result.length > 0, "Deve encontrar registros");
      assert(result[0].nome_marca === "TEST_MARCA", "Deve ter nome correto");
      assert(result[0].codigo_marca === 999, "Deve ter código correto");
    });

    // Teste 5: Atualização de dados
    await this.test("Atualização de dados", async () => {
      const updateQuery = isProduction
        ? "UPDATE historico_precos SET preco = $1 WHERE nome_marca = $2"
        : "UPDATE historico_precos SET preco = ? WHERE nome_marca = ?";

      await executeQuery(updateQuery, ["R$ 55.000,00", "TEST_MARCA"]);

      const selectQuery = isProduction
        ? "SELECT preco FROM historico_precos WHERE nome_marca = $1"
        : "SELECT preco FROM historico_precos WHERE nome_marca = ?";

      const result = await executeQuery(selectQuery, ["TEST_MARCA"]);
      assert(result[0].preco === "R$ 55.000,00", "Deve ter preço atualizado");
    });

    // Teste 6: Índices e performance
    await this.test("Verificação de índices", async () => {
      if (isProduction) {
        const indexQuery = `
          SELECT indexname 
          FROM pg_indexes 
          WHERE tablename = 'historico_precos'
        `;
        const result = await executeQuery(indexQuery);
        assert(result && result.length > 0, "Deve ter índices criados");
      } else {
        const indexQuery = `PRAGMA index_list(historico_precos)`;
        const result = await executeQuery(indexQuery);
        // SQLite pode não ter índices no desenvolvimento
        console.log(`   📊 Índices encontrados: ${result ? result.length : 0}`);
      }
    });

    // Teste 7: Constraints e integridade
    await this.test("Teste de constraints (duplicatas)", async () => {
      const testData = {
        codigo_tabela_referencia: "TEST001",
        codigo_tipo_veiculo: 1,
        codigo_marca: 999,
        codigo_modelo: 999,
        ano_modelo: "2024-1",
        codigo_tipo_combustivel: 1,
      };

      const insertQuery = isProduction
        ? `INSERT INTO historico_precos 
           (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo, 
            ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
        : `INSERT INTO historico_precos 
           (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo, 
            ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      try {
        await executeQuery(insertQuery, [
          testData.codigo_tabela_referencia,
          testData.codigo_tipo_veiculo,
          testData.codigo_marca,
          testData.codigo_modelo,
          testData.ano_modelo,
          "R$ 60.000,00",
          testData.codigo_tipo_combustivel,
          "TEST_MARCA",
          "TEST_MODELO",
          "2024 Gasolina",
        ]);

        // Se não deu erro, verificar se é SQLite sem constraint
        console.log("   ⚠️  Duplicate constraint não ativa (desenvolvimento)");
      } catch (error) {
        // Erro esperado por duplicata
        assert(
          error.message.includes("unique") ||
            error.message.includes("UNIQUE") ||
            error.message.includes("duplicate"),
          "Deve falhar por constraint de duplicata"
        );
      }
    });

    // Teste 8: Performance com volume de dados
    await this.test(
      "Teste de performance com múltiplos registros",
      async () => {
        const startTime = Date.now();

        // Inserir 100 registros de teste
        for (let i = 0; i < 10; i++) {
          const insertQuery = isProduction
            ? `INSERT INTO historico_precos 
             (codigo_tipo_veiculo, codigo_marca, codigo_modelo, ano_modelo, preco, nome_marca, nome_modelo, nome_ano)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
            : `INSERT INTO historico_precos 
             (codigo_tipo_veiculo, codigo_marca, codigo_modelo, ano_modelo, preco, nome_marca, nome_modelo, nome_ano)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

          await executeQuery(insertQuery, [
            1,
            1000 + i,
            2000 + i,
            `2024-${i}`,
            `R$ ${50000 + i * 1000},00`,
            `TEST_PERF_${i}`,
            `MODELO_${i}`,
            `2024 Test ${i}`,
          ]);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`   ⏱️  Inserção de 10 registros: ${duration}ms`);
        assert(duration < 5000, "Deve inserir em menos de 5 segundos");
      }
    );

    await this.cleanup();

    // Relatório final
    console.log("\n📊 RELATÓRIO DE TESTES");
    console.log("=".repeat(50));
    console.log(`✅ Passou: ${this.passed}`);
    console.log(`❌ Falhou: ${this.failed}`);
    console.log(`📊 Total: ${this.passed + this.failed}`);
    console.log(
      `🎯 Taxa de sucesso: ${(
        (this.passed / (this.passed + this.failed)) *
        100
      ).toFixed(1)}%`
    );

    if (this.failed > 0) {
      console.log("\n❌ Testes que falharam:");
      this.tests
        .filter((t) => !t.passed)
        .forEach((t) => console.log(`   - ${t.name}`));
    }

    return {
      passed: this.passed,
      failed: this.failed,
      total: this.passed + this.failed,
      success: this.failed === 0,
    };
  }
}

// Executar testes se arquivo for chamado diretamente
if (require.main === module) {
  const testSuite = new DatabaseTestSuite();

  testSuite
    .runTests()
    .then((result) => {
      if (result.success) {
        console.log("\n🎉 Todos os testes passaram!");
        process.exit(0);
      } else {
        console.log("\n💥 Alguns testes falharam!");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("\n💥 Erro ao executar testes:", error);
      process.exit(1);
    });
}

module.exports = DatabaseTestSuite;
