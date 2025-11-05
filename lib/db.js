import { Pool } from "pg";

// Configuração do banco de dados
let db;

if (process.env.DATABASE_URL) {
  const connectionString = process.env.DATABASE_URL;

  const url = new URL(connectionString);
  const isSSL =
    url.searchParams.get("sslmode") === "require" ||
    connectionString.includes("sslmode=require");

  db = new Pool({
    connectionString,
    ssl: isSSL ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
} else {
  // Fallback para SQLite em desenvolvimento
  const sqlite3 = require("sqlite3").verbose();
  const path = require("path");
  const fs = require("fs");

  const DB_DIR = path.join(process.cwd(), "data");
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const DB_PATH = path.join(DB_DIR, "database.db");
  const sqliteDb = new sqlite3.Database(DB_PATH);

  // Wrapper para compatibilidade
  db = {
    query: (text, params = []) => {
      return new Promise((resolve, reject) => {
        sqliteDb.all(text, params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      });
    },
  };
}

export default db;

// Função para salvar consulta
export async function salvarConsulta(dadosFipe) {
  const query = `
    INSERT INTO historico_precos
    (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo,
     ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano, data_consulta)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (codigo_marca, codigo_modelo, ano_modelo, codigo_tipo_veiculo, codigo_tipo_combustivel, codigo_tabela_referencia)
    DO UPDATE SET
      preco = EXCLUDED.preco,
      data_consulta = NOW(),
      updated_at = NOW()
    RETURNING id
  `;

  const valores = [
    dadosFipe.TipoVeiculo || 1,
    dadosFipe.TipoVeiculo || 1,
    dadosFipe.CodigoMarca,
    dadosFipe.CodigoModelo,
    dadosFipe.AnoModelo,
    dadosFipe.Valor,
    dadosFipe.CodigoTipoCombustivel || 1,
    dadosFipe.Marca,
    dadosFipe.Modelo,
    dadosFipe.AnoModelo,
  ];

  const result = await db.query(query, valores);
  return result.rows[0];
}
