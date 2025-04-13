// db.js
const sqlite3 = require("sqlite3").verbose();
const DB_PATH = "./data/database.db";

// Cria (ou abre) o banco de dados SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Erro ao conectar no SQLite:", err.message);
  } else {
    console.log("Conectado ao banco SQLite.");
  }
});

// Criação da tabela historico_precos com a coluna códigoTipoCombustivel
// A UNIQUE inclui: codigoMarca, codigoModelo, anoModelo, codigoTipoVeiculo, codigoTipoCombustivel e codigoTabelaReferencia
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS historico_precos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_consulta TEXT DEFAULT (datetime('now','localtime')),
    codigoTabelaReferencia TEXT,
    codigoTipoVeiculo INTEGER,
    codigoMarca INTEGER,
    codigoModelo INTEGER,
    anoModelo TEXT,
    preco TEXT,
    codigoTipoCombustivel INTEGER,
    UNIQUE(codigoMarca, codigoModelo, anoModelo, codigoTipoVeiculo, codigoTipoCombustivel, codigoTabelaReferencia)
  );
`;

db.run(createTableQuery, (err) => {
  if (err) {
    console.error("Erro ao criar a tabela historico_precos:", err.message);
  } else {
    console.log("Tabela historico_precos pronta.");
  }
});

// Função para normalizar o payload, garantindo tipos e remoção de espaços extras
function normalizePayload(payload) {
  return {
    codigoTabelaReferencia: String(payload.codigoTabelaReferencia).trim(),
    codigoTipoVeiculo: Number(payload.codigoTipoVeiculo),
    codigoMarca: Number(payload.codigoMarca),
    codigoModelo: Number(payload.codigoModelo),
    anoModelo: String(payload.anoModelo).trim(),
    codigoTipoCombustivel: Number(payload.codigoTipoCombustivel),
    tipoVeiculo: String(payload.tipoVeiculo).trim().toLowerCase(),
    modeloCodigoExterno: String(payload.modeloCodigoExterno || "").trim(),
    tipoConsulta: String(payload.tipoConsulta).trim().toLowerCase(),
  };
}

// Função para inserir um registro, evitando duplicação, utilizando o payload normalizado
function insertHistorico(payload, preco) {
  return new Promise((resolve, reject) => {
    const insertQuery = `
      INSERT INTO historico_precos 
      (codigoTabelaReferencia, codigoTipoVeiculo, codigoMarca, codigoModelo, anoModelo, preco, codigoTipoCombustivel)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    const normalized = normalizePayload(payload);
    db.run(
      insertQuery,
      [
        normalized.codigoTabelaReferencia,
        normalized.codigoTipoVeiculo,
        normalized.codigoMarca,
        normalized.codigoModelo,
        normalized.anoModelo,
        preco,
        normalized.codigoTipoCombustivel,
      ],
      function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.lastID);
      }
    );
  });
}

// Função para atualizar um registro existente
function updateHistorico(payload, preco) {
  return new Promise((resolve, reject) => {
    const updateQuery = `
      UPDATE historico_precos 
      SET data_consulta = datetime('now','localtime'), preco = ?
      WHERE codigoMarca = ? AND codigoModelo = ? AND anoModelo = ? AND codigoTipoVeiculo = ? AND codigoTipoCombustivel = ? AND codigoTabelaReferencia = ?;
    `;
    const normalized = normalizePayload(payload);
    db.run(
      updateQuery,
      [
        preco,
        normalized.codigoMarca,
        normalized.codigoModelo,
        normalized.anoModelo,
        normalized.codigoTipoVeiculo,
        normalized.codigoTipoCombustivel,
        normalized.codigoTabelaReferencia,
      ],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
}

// Função para verificar se um registro já existe, usando o payload normalizado
function recordExists(payload) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id FROM historico_precos 
      WHERE codigoMarca = ? AND codigoModelo = ? AND anoModelo = ? AND codigoTipoVeiculo = ? AND codigoTipoCombustivel = ? AND codigoTabelaReferencia = ?
    `;
    const normalized = normalizePayload(payload);
    db.get(
      query,
      [
        normalized.codigoMarca,
        normalized.codigoModelo,
        normalized.anoModelo,
        normalized.codigoTipoVeiculo,
        normalized.codigoTipoCombustivel,
        normalized.codigoTabelaReferencia,
      ],
      (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      }
    );
  });
}

// Função que salva o registro: se o registro já existir, retorna "duplicate" (ou pode ser atualizado)
function saveHistorico(payload, preco) {
  return new Promise(async (resolve, reject) => {
    try {
      const normalized = normalizePayload(payload);
      const exists = await recordExists(normalized);
      if (!exists) {
        const id = await insertHistorico(normalized, preco);
        console.log("Registro inserido para payload:", normalized);
        resolve({ action: "insert", id: id });
      } else {
        console.log("Registro já existe para payload:", normalized);
        resolve({ action: "duplicate" });
        // Se preferir atualizar, descomente o código abaixo:
        // const changes = await updateHistorico(normalized, preco);
        // console.log("Registro atualizado para payload:", normalized);
        // resolve({ action: "update", changes: changes });
      }
    } catch (err) {
      reject(err);
    }
  });
}

// Função para consultar todos os registros (por exemplo, para calcular a média)
// Retorna os preços registrados para uma determinada marca e modelo
function getHistoricoByMarcaModelo(codigoMarca, codigoModelo) {
  return new Promise((resolve, reject) => {
    const query = `SELECT preco FROM historico_precos WHERE codigoMarca = ? AND codigoModelo = ?`;
    db.all(query, [codigoMarca, codigoModelo], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  db,
  insertHistorico,
  updateHistorico,
  recordExists,
  saveHistorico,
  getHistoricoByMarcaModelo,
};
