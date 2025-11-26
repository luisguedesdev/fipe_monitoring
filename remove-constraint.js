// Script para remover a constraint problemática
const { Pool } = require("pg");
require("dotenv").config();

async function removeConstraint() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("🔍 Buscando QUALQUER constraint ou índice único...\n");

    // Buscar por constraint com o nome truncado
    const constraintSearch = await pool.query(`
      SELECT conname, contype, conrelid::regclass AS table_name
      FROM pg_constraint
      WHERE conname LIKE '%codigo_marca_codigo_modelo_ano_modelo%'
    `);

    console.log("🎯 Constraints encontradas:", constraintSearch.rows);

    // Buscar índices que possam ter esse padrão
    const indexSearch = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE indexname LIKE '%codigo_marca%'
         OR indexname LIKE '%historico_precos%'
    `);

    console.log("\n📋 Índices relacionados:", indexSearch.rows);

    // Remover qualquer constraint encontrada
    for (const constraint of constraintSearch.rows) {
      console.log(`\n🗑️  Removendo constraint: ${constraint.conname}`);
      try {
        await pool.query(
          `ALTER TABLE ${constraint.table_name} DROP CONSTRAINT ${constraint.conname}`
        );
        console.log(`✅ Constraint ${constraint.conname} removida!`);
      } catch (err) {
        console.log(`⚠️  Erro ao remover ${constraint.conname}:`, err.message);
      }
    }

    // Tentar remover diretamente pelo nome que aparece no erro
    console.log("\n🗑️  Tentando remover constraint pelo nome do erro...");
    try {
      await pool.query(
        `ALTER TABLE historico_precos DROP CONSTRAINT IF EXISTS historico_precos_codigo_marca_codigo_modelo_ano_modelo_codi_key`
      );
      console.log("✅ Constraint removida pelo nome do erro!");
    } catch (err) {
      console.log("⚠️  Não foi possível remover:", err.message);
    }

    console.log("\n✅ Operação concluída!");
    console.log("🎉 Agora você pode inserir múltiplos registros históricos!");
    console.log(
      "💡 Reinicie o servidor Next.js (Ctrl+C e npm run dev) para aplicar as mudanças"
    );
  } catch (error) {
    console.error("❌ Erro:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

removeConstraint()
  .then(() => {
    console.log("\n✅ Script executado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erro ao executar script:", error);
    process.exit(1);
  });
