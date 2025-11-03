#!/usr/bin/env node

const { Pool } = require("pg");
require("dotenv").config();

async function testNeonConnection() {
  console.log("🔍 Testando conexão com Neon...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL não encontrada no arquivo .env");
    process.exit(1);
  }

  console.log("📋 Configuração:");
  const url = new URL(process.env.DATABASE_URL);
  console.log(`Host: ${url.hostname}`);
  console.log(`Port: ${url.port}`);
  console.log(`Database: ${url.pathname.slice(1)}`);
  console.log(`Username: ${url.username}`);
  console.log(`SSL: ${url.searchParams.get("sslmode") === "require"}`);
  console.log("");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      url.searchParams.get("sslmode") === "require"
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    // Teste 1: Conexão básica
    console.log("🧪 Teste 1: Conexão básica...");
    const result1 = await pool.query(
      "SELECT NOW() as current_time, version() as neon_version"
    );
    console.log(`✅ Conectado! Hora atual: ${result1.rows[0].current_time}`);
    console.log(
      `📊 Versão: ${result1.rows[0].neon_version.split(" ")[0]} ${
        result1.rows[0].neon_version.split(" ")[1]
      }`
    );

    // Teste 2: Verificar se tabelas existem
    console.log("\n🧪 Teste 2: Verificando tabelas...");
    const result2 = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('historico_precos', 'cache_entries')
      ORDER BY table_name
    `);

    if (result2.rows.length === 0) {
      console.log("❌ Nenhuma tabela encontrada!");
      console.log("📋 Execute o script SQL no Neon:");
      console.log("   1. Vá para SQL Editor no Neon");
      console.log("   2. Cole o conteúdo do arquivo neon_setup.sql");
      console.log("   3. Clique em Run");
    } else {
      console.log("✅ Tabelas encontradas:");
      result2.rows.forEach((row) => {
        console.log(`   - ${row.table_name}`);
      });
    }

    // Teste 3: Verificar estrutura da tabela principal
    if (result2.rows.some((row) => row.table_name === "historico_precos")) {
      console.log("\n🧪 Teste 3: Estrutura da tabela historico_precos...");
      const result3 = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'historico_precos'
        ORDER BY ordinal_position
      `);

      console.log("✅ Colunas da tabela:");
      result3.rows.forEach((row) => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    }

    // Teste 4: Inserir dados de teste
    console.log("\n🧪 Teste 4: Inserção de dados de teste...");
    try {
      await pool.query(`
        INSERT INTO historico_precos
        (codigo_marca, codigo_modelo, ano_modelo, preco, nome_marca, nome_modelo, nome_ano)
        VALUES (999, 999, '2024-1', 'R$ 50.000,00', 'TESTE', 'MODELO_TESTE', '2024 Teste')
        ON CONFLICT DO NOTHING
      `);

      const countResult = await pool.query(
        "SELECT COUNT(*) as count FROM historico_precos"
      );
      console.log(
        `✅ Dados inseridos! Total de registros: ${countResult.rows[0].count}`
      );
    } catch (error) {
      console.log(`❌ Erro na inserção: ${error.message}`);
    }

    // Teste 5: Consulta de dados
    console.log("\n🧪 Teste 5: Consulta de dados...");
    const result5 = await pool.query("SELECT * FROM historico_precos LIMIT 3");
    console.log(
      `✅ Consulta realizada! Registros encontrados: ${result5.rows.length}`
    );

    if (result5.rows.length > 0) {
      console.log("📋 Exemplo de registro:");
      const sample = result5.rows[0];
      console.log(`   ID: ${sample.id}`);
      console.log(`   Marca: ${sample.nome_marca}`);
      console.log(`   Modelo: ${sample.nome_modelo}`);
      console.log(`   Preço: ${sample.preco}`);
    }

    console.log("\n🎉 TODOS OS TESTES PASSARAM!");
    console.log("✅ Neon configurado corretamente");
    console.log("🚀 Pronto para deploy no Vercel!");
  } catch (error) {
    console.error("\n💥 Erro na conexão com Neon:");
    console.error(`❌ ${error.message}`);
    console.log("\n🔧 Verifique:");
    console.log("1. Se a DATABASE_URL está correta");
    console.log("2. Se o projeto Neon está ativo");
    console.log("3. Se executou o script SQL");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  testNeonConnection();
}

module.exports = { testNeonConnection };
