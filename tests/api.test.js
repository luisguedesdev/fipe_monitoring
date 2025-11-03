const assert = require("assert");
const axios = require("axios");

class ApiTestSuite {
  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
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

  async request(method, path, data = null) {
    const url = `${this.baseUrl}${path}`;
    const config = {
      method,
      url,
      timeout: 10000,
      validateStatus: () => true, // Não lançar erro para status HTTP
    };

    if (data) {
      config.data = data;
      config.headers = { "Content-Type": "application/json" };
    }

    return await axios(config);
  }

  async runTests() {
    console.log("🚀 Iniciando testes da API...\n");

    // Teste 1: Health Check
    await this.test("Health Check", async () => {
      const response = await this.request("GET", "/health");
      assert(
        response.status === 200,
        `Status deve ser 200, recebido: ${response.status}`
      );
      assert(response.data.status === "OK", "Status deve ser OK");
      assert(response.data.timestamp, "Deve ter timestamp");
    });

    // Teste 2: API Marcas
    await this.test("Endpoint GET /api/marcas", async () => {
      const response = await this.request("GET", "/api/marcas?tipoVeiculo=1");
      assert(
        response.status === 200,
        `Status deve ser 200, recebido: ${response.status}`
      );
      assert(Array.isArray(response.data), "Deve retornar array");

      if (response.data.length > 0) {
        const marca = response.data[0];
        assert(marca.codigo, "Marca deve ter código");
        assert(marca.nome, "Marca deve ter nome");
      }
    });

    // Teste 3: API Modelos
    await this.test("Endpoint GET /api/modelos", async () => {
      // Primeiro pegar uma marca
      const marcasResponse = await this.request(
        "GET",
        "/api/marcas?tipoVeiculo=1"
      );
      if (marcasResponse.data.length === 0) {
        console.log("   ⏭️  Pulando teste - nenhuma marca disponível");
        return;
      }

      const marca = marcasResponse.data[0];
      const response = await this.request(
        "GET",
        `/api/modelos?marca=${marca.codigo}&tipoVeiculo=1`
      );

      assert(
        response.status === 200,
        `Status deve ser 200, recebido: ${response.status}`
      );
      assert(Array.isArray(response.data), "Deve retornar array");
    });

    // Teste 4: Rate Limiting
    await this.test("Rate Limiting", async () => {
      const requests = [];

      // Fazer muitas requisições rapidamente
      for (let i = 0; i < 10; i++) {
        requests.push(this.request("GET", "/api/marcas?tipoVeiculo=1"));
      }

      const responses = await Promise.all(requests);

      // Todas devem passar ou algumas serem limitadas
      const successful = responses.filter((r) => r.status === 200).length;
      const rateLimited = responses.filter((r) => r.status === 429).length;

      console.log(
        `   📊 Sucessos: ${successful}, Rate Limited: ${rateLimited}`
      );
      assert(successful > 0, "Pelo menos algumas requests devem passar");
    });

    // Teste 5: Segurança Headers
    await this.test("Headers de segurança", async () => {
      const response = await this.request("GET", "/health");
      const headers = response.headers;

      // Verificar headers do Helmet
      assert(
        headers["x-content-type-options"],
        "Deve ter X-Content-Type-Options"
      );
      assert(headers["x-frame-options"], "Deve ter X-Frame-Options");
      assert(headers["x-xss-protection"], "Deve ter X-XSS-Protection");
    });

    // Teste 6: Validação de parâmetros
    await this.test("Validação de parâmetros inválidos", async () => {
      // Teste com parâmetros inválidos
      const response = await this.request(
        "GET",
        "/api/modelos?marca=invalid&tipoVeiculo=abc"
      );

      // Deve retornar erro 400 ou tratar graciosamente
      assert(
        response.status === 400 ||
          response.status === 500 ||
          (response.status === 200 && response.data.erro),
        "Deve tratar parâmetros inválidos"
      );
    });

    // Teste 7: Endpoint inexistente
    await this.test("Endpoint inexistente", async () => {
      const response = await this.request("GET", "/api/inexistente");
      assert(
        response.status === 404,
        `Status deve ser 404, recebido: ${response.status}`
      );
    });

    // Teste 8: CORS
    await this.test("CORS Headers", async () => {
      const response = await this.request("OPTIONS", "/api/marcas");

      // Verificar se permite CORS
      console.log(`   📋 CORS Status: ${response.status}`);
      // CORS pode estar configurado ou não, apenas log
    });

    // Teste 9: Cache Headers
    await this.test("Cache Headers", async () => {
      const response = await this.request("GET", "/api/marcas?tipoVeiculo=1");

      if (response.status === 200) {
        // Verificar se tem headers de cache
        console.log(
          `   📋 Cache-Control: ${
            response.headers["cache-control"] || "Não definido"
          }`
        );
        console.log(
          `   📋 ETag: ${response.headers["etag"] || "Não definido"}`
        );
      }
    });

    // Teste 10: Performance
    await this.test("Performance da API", async () => {
      const startTime = Date.now();
      const response = await this.request("GET", "/api/marcas?tipoVeiculo=1");
      const endTime = Date.now();

      const duration = endTime - startTime;
      console.log(`   ⏱️  Tempo de resposta: ${duration}ms`);

      assert(response.status === 200, "Request deve ser bem sucedida");
      assert(duration < 5000, "Deve responder em menos de 5 segundos");
    });

    // Relatório final
    console.log("\n📊 RELATÓRIO DE TESTES DA API");
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
  const baseUrl = process.argv[2] || "http://localhost:3000";
  const testSuite = new ApiTestSuite(baseUrl);

  console.log(`🎯 Testando API em: ${baseUrl}`);

  testSuite
    .runTests()
    .then((result) => {
      if (result.success) {
        console.log("\n🎉 Todos os testes da API passaram!");
        process.exit(0);
      } else {
        console.log("\n💥 Alguns testes da API falharam!");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("\n💥 Erro ao executar testes da API:", error.message);
      process.exit(1);
    });
}

module.exports = ApiTestSuite;
