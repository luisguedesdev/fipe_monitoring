// Carregar variáveis de ambiente primeiro
require("dotenv").config({ path: "../.env" });

const logger = require("./config/logger");

// Detectar se deve usar Neon (se DATABASE_URL está configurada)
const useNeon =
  process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_NEON");

let db;

if (useNeon) {
  const { Pool } = require("pg");

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required in production");
  }

  const url = new URL(connectionString);
  const isSSL =
    url.searchParams.get("sslmode") === "require" ||
    connectionString.includes("sslmode=require");

  logger.info("Database config (Neon):", {
    host: url.hostname,
    port: url.port,
    database: url.pathname.slice(1),
    username: url.username,
    ssl: isSSL,
  });

  db = new Pool({
    connectionString,
    ssl: isSSL ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  const connectWithRetry = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await db.query("SELECT 1 as ok");
        logger.info("Connected to PostgreSQL (Neon)");
        return result;
      } catch (error) {
        const isPausedError =
          error.message.includes("paused") ||
          error.message.includes("hibernation") ||
          error.code === "ENETUNREACH";

        if (isPausedError && i < retries - 1) {
          const delay = Math.pow(2, i) * 250;
          logger.warn(
            `Database connection failed (attempt ${
              i + 1
            }/${retries}), retrying in ${delay}ms:`,
            error.message
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.error("Failed to connect to PostgreSQL:", error.message);
          throw error;
        }
      }
    }
  };

  connectWithRetry();
} else {
  // SQLite para desenvolvimento
  const sqlite3 = require("sqlite3").verbose();
  const fs = require("fs");

  const DB_DIR = "./data";
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR);
  }

  const DB_PATH = `${DB_DIR}/database.db`;
  const sqliteDb = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      logger.error("Erro ao conectar no SQLite:", err);
    } else {
      logger.info("Conectado ao banco SQLite");
    }
  });

  // Wrapper para compatibilidade com PostgreSQL
  db = {
    query: (text, params = []) => {
      return new Promise((resolve, reject) => {
        if (text.includes("RETURNING")) {
          // Para INSERT com RETURNING, usar run e retornar lastID
          sqliteDb.run(
            text.replace(/RETURNING id/, ""),
            params,
            function (err) {
              if (err) reject(err);
              else
                resolve({
                  rows: [{ id: this.lastID }],
                  rowCount: this.changes,
                });
            }
          );
        } else if (
          text.toUpperCase().startsWith("SELECT") ||
          text.toUpperCase().startsWith("PRAGMA")
        ) {
          sqliteDb.all(text, params, (err, rows) => {
            if (err) reject(err);
            else
              resolve({ rows: rows || [], rowCount: rows ? rows.length : 0 });
          });
        } else {
          sqliteDb.run(text, params, function (err) {
            if (err) reject(err);
            else resolve({ rowCount: this.changes });
          });
        }
      });
    },
    end: () => {
      return new Promise((resolve) => {
        sqliteDb.close(resolve);
      });
    },
  };

  // Criar tabela SQLite
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS historico_precos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_consulta TEXT DEFAULT (datetime('now','localtime')),
      codigo_tabela_referencia TEXT,
      codigo_tipo_veiculo INTEGER,
      codigo_marca INTEGER,
      codigo_modelo INTEGER,
      ano_modelo TEXT,
      preco TEXT,
      codigo_tipo_combustivel INTEGER,
      nome_marca TEXT,
      nome_modelo TEXT,
      nome_ano TEXT,
      UNIQUE(codigo_marca, codigo_modelo, ano_modelo, codigo_tipo_veiculo, codigo_tipo_combustivel, codigo_tabela_referencia)
    );
  `;

  db.query(createTableQuery)
    .then(() => {
      logger.info("Tabela historico_precos criada/verificada com sucesso");
    })
    .catch((err) => {
      logger.error("Erro ao criar tabela:", err);
    });
}

function normalizePayload(payload) {
  return {
    codigo_tabela_referencia: String(
      payload.codigoTabelaReferencia || payload.codigo_tabela_referencia || ""
    ).trim(),
    codigo_tipo_veiculo: Number(
      payload.codigoTipoVeiculo || payload.codigo_tipo_veiculo || 0
    ),
    codigo_marca: Number(payload.codigoMarca || payload.codigo_marca || 0),
    codigo_modelo: Number(payload.codigoModelo || payload.codigo_modelo || 0),
    ano_modelo: String(payload.anoModelo || payload.ano_modelo || "").trim(),
    codigo_tipo_combustivel: Number(
      payload.codigoTipoCombustivel || payload.codigo_tipo_combustivel || 0
    ),
    nome_marca: String(payload.nomeMarca || payload.nome_marca || "").trim(),
    nome_modelo: String(payload.nomeModelo || payload.nome_modelo || "").trim(),
    nome_ano: String(payload.nomeAno || payload.nome_ano || "").trim(),
  };
}

async function insertHistorico(payload, preco) {
  try {
    const normalized = normalizePayload(payload);

    if (useNeon) {
      // PostgreSQL query
      const query = `
        INSERT INTO historico_precos 
        (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo, 
         ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;

      const values = [
        normalized.codigo_tabela_referencia,
        normalized.codigo_tipo_veiculo,
        normalized.codigo_marca,
        normalized.codigo_modelo,
        normalized.ano_modelo,
        preco,
        normalized.codigo_tipo_combustivel,
        normalized.nome_marca,
        normalized.nome_modelo,
        normalized.nome_ano,
      ];

      const result = await db.query(query, values);
      return result.rows[0].id;
    } else {
      // SQLite query
      const query = `
        INSERT INTO historico_precos 
        (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo, 
         ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        normalized.codigo_tabela_referencia,
        normalized.codigo_tipo_veiculo,
        normalized.codigo_marca,
        normalized.codigo_modelo,
        normalized.ano_modelo,
        preco,
        normalized.codigo_tipo_combustivel,
        normalized.nome_marca,
        normalized.nome_modelo,
        normalized.nome_ano,
      ];

      const result = await db.query(query, values);
      return result.rows[0].id;
    }
  } catch (error) {
    logger.error("Erro ao inserir histórico:", error);
    throw error;
  }
}

async function recordExists(payload) {
  try {
    const normalized = normalizePayload(payload);

    const paramPlaceholder = useNeon
      ? "WHERE codigo_marca = $1 AND codigo_modelo = $2 AND ano_modelo = $3 AND codigo_tipo_veiculo = $4 AND codigo_tipo_combustivel = $5 AND codigo_tabela_referencia = $6"
      : "WHERE codigo_marca = ? AND codigo_modelo = ? AND ano_modelo = ? AND codigo_tipo_veiculo = ? AND codigo_tipo_combustivel = ? AND codigo_tabela_referencia = ?";

    const query = `
      SELECT id FROM historico_precos 
      ${paramPlaceholder}
    `;

    const values = [
      normalized.codigo_marca,
      normalized.codigo_modelo,
      normalized.ano_modelo,
      normalized.codigo_tipo_veiculo,
      normalized.codigo_tipo_combustivel,
      normalized.codigo_tabela_referencia,
    ];

    const result = await executeQuery(query, values);
    return result && result.length > 0;
  } catch (error) {
    logger.error("Erro ao verificar se registro existe:", error);
    throw error;
  }
}

async function saveHistorico(payload, preco) {
  try {
    const normalized = normalizePayload(payload);
    const exists = await recordExists(normalized);

    if (!exists) {
      const id = await insertHistorico(normalized, preco);
      logger.debug("Registro inserido:", { id, payload: normalized });
      return { action: "insert", id };
    } else {
      logger.debug("Registro já existe:", normalized);
      return { action: "duplicate" };
    }
  } catch (error) {
    logger.error("Erro ao salvar histórico:", error);
    throw error;
  }
}

async function getHistoricoByMarcaModelo(codigoMarca, codigoModelo) {
  try {
    const paramPlaceholder = useNeon
      ? "WHERE codigo_marca = $1 AND codigo_modelo = $2"
      : "WHERE codigo_marca = ? AND codigo_modelo = ?";

    const query = `SELECT preco FROM historico_precos ${paramPlaceholder}`;
    const result = await db.query(query, [codigoMarca, codigoModelo]);
    return result.rows;
  } catch (error) {
    logger.error("Erro ao buscar histórico por marca/modelo:", error);
    throw error;
  }
}

async function getHistoricoByMarcaModeloFromDB(marca, modelo) {
  try {
    const paramPlaceholder = useNeon
      ? "WHERE codigo_marca = $1 AND codigo_modelo = $2"
      : "WHERE codigo_marca = ? AND codigo_modelo = ?";

    const query = `
      SELECT 
        data_consulta AS referencia,
        preco,
        nome_marca,
        nome_modelo,
        nome_ano
      FROM historico_precos
      ${paramPlaceholder}
      ORDER BY data_consulta ASC
    `;

    const result = await db.query(query, [marca, modelo]);
    return result.rows;
  } catch (error) {
    logger.error("Erro ao buscar histórico do DB:", error);
    throw error;
  }
}

async function getVeiculosRegistrados() {
  try {
    const query = `
      SELECT DISTINCT codigo_marca AS marca, codigo_modelo AS modelo, nome_marca, nome_modelo
      FROM historico_precos
      ORDER BY nome_marca, nome_modelo
    `;

    const result = await db.query(query);
    return result.rows;
  } catch (error) {
    logger.error("Erro ao buscar veículos registrados:", error);
    throw error;
  }
}

// Função para executar queries personalizadas
async function executeQuery(query, params = []) {
  try {
    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    logger.error("Erro ao executar query:", { query, params, error });
    throw error;
  }
}

async function healthCheck() {
  try {
    const result = await db.query("SELECT 1 as ok");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
    };
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  if (db && db.end) {
    await db.end();
    logger.info("Conexão com banco encerrada");
  }
});

module.exports = {
  db,
  insertHistorico,
  recordExists,
  saveHistorico,
  getHistoricoByMarcaModelo,
  getHistoricoByMarcaModeloFromDB,
  getVeiculosRegistrados,
  executeQuery,
  healthCheck,
  useNeon,
};
