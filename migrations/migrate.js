#!/usr/bin/env node

const MigrationManager = require("./migration_manager");
const logger = require("../backend/config/logger");

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const migrationManager = new MigrationManager();

  try {
    switch (command) {
      case "run":
        const result = await migrationManager.runMigrations();
        console.log(`✅ ${result.executed} migrations executadas`);
        if (result.pending.length > 0) {
          console.log("Migrations executadas:");
          result.pending.forEach((file) => console.log(`  - ${file}`));
        }
        break;

      case "status":
        const status = await migrationManager.getStatus();
        console.log("\n📊 Status das Migrations:");
        console.log(`Total: ${status.total}`);
        console.log(`Executadas: ${status.executed}`);
        console.log(`Pendentes: ${status.pending}`);

        if (status.executedFiles.length > 0) {
          console.log("\n✅ Migrations executadas:");
          status.executedFiles.forEach((file) => console.log(`  - ${file}`));
        }

        if (status.pendingFiles.length > 0) {
          console.log("\n⏳ Migrations pendentes:");
          status.pendingFiles.forEach((file) => console.log(`  - ${file}`));
        }
        break;

      case "rollback":
        const filename = args[1];
        if (!filename) {
          console.error("❌ Especifique o nome da migration para rollback");
          process.exit(1);
        }
        await migrationManager.rollbackMigration(filename);
        console.log(`✅ Rollback da migration ${filename} executado`);
        break;

      case "create":
        const name = args[1];
        if (!name) {
          console.error("❌ Especifique o nome da migration");
          console.log("Exemplo: npm run migration create add_new_column");
          process.exit(1);
        }
        createMigrationFile(name);
        break;

      default:
        console.log("🔧 Comandos disponíveis:");
        console.log(
          "  npm run migration run     - Executar migrations pendentes"
        );
        console.log("  npm run migration status  - Ver status das migrations");
        console.log("  npm run migration rollback <filename> - Fazer rollback");
        console.log("  npm run migration create <name> - Criar nova migration");
    }
  } catch (error) {
    console.error("❌ Erro:", error.message);
    logger.error("Migration error:", error);
    process.exit(1);
  }
}

function createMigrationFile(name) {
  const fs = require("fs");
  const path = require("path");

  const now = new Date();
  const timestamp = now
    .toISOString()
    .slice(0, 19)
    .replace(/[-:]/g, "")
    .replace("T", "_");

  const filename = `${timestamp}_${name}.sql`;
  const rollbackFilename = `${timestamp}_${name}_rollback.sql`;

  const migrationContent = `-- Migration: ${name}
-- Autor: Sistema
-- Data: ${now.toISOString().slice(0, 10)}
-- Descrição: Descreva aqui o que esta migration faz

-- Adicione aqui os comandos SQL da migration
-- Exemplo:
-- CREATE TABLE nova_tabela (
--     id SERIAL PRIMARY KEY,
--     nome VARCHAR(100) NOT NULL
-- );
`;

  const rollbackContent = `-- Rollback: ${name}
-- Remove as alterações da migration ${name}

-- Adicione aqui os comandos SQL para desfazer a migration
-- Exemplo:
-- DROP TABLE IF EXISTS nova_tabela;
`;

  const migrationsDir = __dirname;

  fs.writeFileSync(path.join(migrationsDir, filename), migrationContent);
  fs.writeFileSync(path.join(migrationsDir, rollbackFilename), rollbackContent);

  console.log(`✅ Migration criada: ${filename}`);
  console.log(`✅ Rollback criado: ${rollbackFilename}`);
  console.log("\nEdite os arquivos e execute: npm run migration run");
}

if (require.main === module) {
  main();
}

module.exports = { MigrationManager };
