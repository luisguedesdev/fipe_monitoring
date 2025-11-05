#!/usr/bin/env node

require("dotenv").config();
const { Pool } = require("pg");

async function testNeonConnection() {
  console.log("🔍 Testando conexão com Neon...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL não encontrada no arquivo .env");
    process.exit(1);
  }

  console.log("📋 Configuração:");
  const url = new URL(process.env.DATABASE_URL);
  console.log(`Host: ${url.hostname}`);
  console.log(`Database: ${url.pathname.slice(1)}`);
  console.log(`Username: ${url.username}`);
  console.log("");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log("🧪 Teste 1: Conexão básica...");
    const result = await pool.query("SELECT NOW() as now, version()");
    console.log(`✅ Conectado! Hora atual: ${result.rows[0].now}`);
    console.log(
      `📊 Versão: ${result.rows[0].version.split(" ").slice(0, 2).join(" ")}`
    );

    console.log("\n🧪 Teste 2: Verificando tabelas...");
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log("✅ Tabelas encontradas:");
    tables.rows.forEach((row) => console.log(`   - ${row.tablename}`));

    console.log("\n🧪 Teste 3: Contando registros...");
    const count = await pool.query(
      "SELECT COUNT(*) as total FROM historico_precos"
    );
    console.log(`✅ Total de registros: ${count.rows[0].total}`);

    if (parseInt(count.rows[0].total) > 0) {
      console.log("\n🧪 Teste 4: Amostra de dados...");
      const sample = await pool.query(`
        SELECT nome_marca, nome_modelo, preco, data_consulta 
        FROM historico_precos 
        ORDER BY data_consulta DESC 
        LIMIT 3
      `);
      console.log("✅ Últimos registros:");
      sample.rows.forEach((row, i) => {
        console.log(
          `   ${i + 1}. ${row.nome_marca} ${row.nome_modelo} - ${
            row.preco
          } (${new Date(row.data_consulta).toLocaleDateString("pt-BR")})`
        );
      });
    }

    console.log("\n🎉 TODOS OS TESTES PASSARAM!");
    console.log("✅ Neon configurado corretamente");
    console.log("🚀 Pronto para usar!");
  } catch (error) {
    console.error("❌ Erro na conexão:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testNeonConnection();
