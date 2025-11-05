const fs = require("fs");
const path = require("path");

// Carregar variáveis de ambiente
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { db, useNeon, executeQuery } = require("../backend/db");
const logger = require("../backend/config/logger");

class MigrationManager {
  constructor() {
    this.migrationsDir = path.join(__dirname);
    this.migrationsTable = "schema_migrations";
  }

  async initMigrationsTable() {
    try {
      const query = useNeon
        ? `CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`
        : `CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL UNIQUE,
            executed_at TEXT DEFAULT (datetime('now','localtime'))
          )`;

      await executeQuery(query);
      logger.info("Tabela de migrations inicializada");
    } catch (error) {
      logger.error("Erro ao inicializar tabela de migrations:", error);
      throw error;
    }
  }

  async getExecutedMigrations() {
    try {
      const query = `SELECT filename FROM ${this.migrationsTable} ORDER BY executed_at ASC`;
      const result = await executeQuery(query);
      return result.map((row) => row.filename);
    } catch (error) {
      logger.error("Erro ao buscar migrations executadas:", error);
      throw error;
    }
  }

  getMigrationFiles() {
    try {
      const files = fs
        .readdirSync(this.migrationsDir)
        .filter(
          (file) =>
            file.endsWith(".sql") &&
            file.match(/^\d{4}_\d{2}_\d{2}_\d{6}_/) &&
            !file.includes("_rollback")
        )
        .sort();

      return files;
    } catch (error) {
      logger.error("Erro ao listar arquivos de migration:", error);
      throw error;
    }
  }

  async executeMigration(filename) {
    try {
      const filePath = path.join(this.migrationsDir, filename);
      const sql = fs.readFileSync(filePath, "utf8");

      // Separar comandos SQL por ponto e vírgula seguido de quebra de linha
      // ou ponto e vírgula no final da linha
      const commands = sql
        .split(/;\s*(\r?\n|$)/)
        .map((cmd) => cmd.trim())
        .filter(
          (cmd) => cmd.length > 0 && !cmd.startsWith("--") && cmd !== ";"
        );

      logger.info(`Executando migration: ${filename}`);

      // Executar cada comando SQL
      for (const command of commands) {
        if (command.trim() && !command.startsWith("--")) {
          try {
            await executeQuery(command);
          } catch (error) {
            // Se for erro de tabela já existe, ignorar
            if (
              error.message.includes("already exists") ||
              error.message.includes("table already exists")
            ) {
              logger.info(`Tabela já existe (ignorando): ${error.message}`);
            } else {
              throw error;
            }
          }
        }
      }

      // Registrar migration como executada
      const paramPlaceholder = useNeon ? "$1" : "?";
      const insertQuery = `INSERT INTO ${this.migrationsTable} (filename) VALUES (${paramPlaceholder})`;
      await executeQuery(insertQuery, [filename]);

      logger.info(`Migration ${filename} executada com sucesso`);
    } catch (error) {
      logger.error(`Erro ao executar migration ${filename}:`, error);
      throw error;
    }
  }

  async runMigrations() {
    try {
      await this.initMigrationsTable();

      const executed = await this.getExecutedMigrations();
      const available = this.getMigrationFiles();

      const pending = available.filter((file) => !executed.includes(file));

      if (pending.length === 0) {
        logger.info("Nenhuma migration pendente");
        return { executed: 0, pending: [] };
      }

      logger.info(`Executando ${pending.length} migrations pendentes...`);

      for (const migration of pending) {
        await this.executeMigration(migration);
      }

      logger.info(`${pending.length} migrations executadas com sucesso`);
      return { executed: pending.length, pending };
    } catch (error) {
      logger.error("Erro ao executar migrations:", error);
      throw error;
    }
  }

  async rollbackMigration(filename) {
    try {
      // Verificar se existe arquivo de rollback
      const rollbackFile = filename.replace(".sql", "_rollback.sql");
      const rollbackPath = path.join(this.migrationsDir, rollbackFile);

      if (!fs.existsSync(rollbackPath)) {
        throw new Error(`Arquivo de rollback não encontrado: ${rollbackFile}`);
      }

      const sql = fs.readFileSync(rollbackPath, "utf8");
      const commands = sql
        .split(/;\s*\n/)
        .map((cmd) => cmd.trim())
        .filter((cmd) => cmd.length > 0 && !cmd.startsWith("--"));

      logger.info(`Executando rollback: ${filename}`);

      for (const command of commands) {
        if (command.trim()) {
          await executeQuery(command);
        }
      }

      // Remover registro da migration
      const paramPlaceholder = useNeon ? "$1" : "?";
      const deleteQuery = `DELETE FROM ${this.migrationsTable} WHERE filename = ${paramPlaceholder}`;
      await executeQuery(deleteQuery, [filename]);

      logger.info(`Rollback ${filename} executado com sucesso`);
    } catch (error) {
      logger.error(`Erro ao executar rollback ${filename}:`, error);
      throw error;
    }
  }

  async getStatus() {
    try {
      await this.initMigrationsTable();

      const executed = await this.getExecutedMigrations();
      const available = this.getMigrationFiles();
      const pending = available.filter((file) => !executed.includes(file));

      return {
        total: available.length,
        executed: executed.length,
        pending: pending.length,
        executedFiles: executed,
        pendingFiles: pending,
      };
    } catch (error) {
      logger.error("Erro ao obter status das migrations:", error);
      throw error;
    }
  }
}

module.exports = MigrationManager;
