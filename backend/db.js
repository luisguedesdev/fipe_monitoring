const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");


const DB_DIR = "./data";
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR);
}

const DB_PATH = `${DB_DIR}/database.db`;
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Erro ao conectar no SQLite:", err.message);
  } else {
    console.log("Conectado ao banco SQLite.");
  }
});

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
    nomeMarca TEXT,
    nomeModelo TEXT,
    nomeAno TEXT,
    UNIQUE(codigoMarca, codigoModelo, anoModelo, codigoTipoVeiculo, codigoTipoCombustivel, codigoTabelaReferencia)
  );
`;

db.run(createTableQuery, (err) => {
  if (err) {
    console.error("Erro ao criar a tabela historico_precos:", err.message);
  } else {
    console.log("Tabela historico_precos criada com sucesso.");
  }
});

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
    nomeMarca: String(payload.nomeMarca || "").trim(),
    nomeModelo: String(payload.nomeModelo || "").trim(),
    nomeAno: String(payload.nomeAno || "").trim(),
  };
}

function insertHistorico(payload, preco) {
  return new Promise((resolve, reject) => {
    const insertQuery = `
      INSERT INTO historico_precos 
      (codigoTabelaReferencia, codigoTipoVeiculo, codigoMarca, codigoModelo, anoModelo, preco, codigoTipoCombustivel, nomeMarca, nomeModelo, nomeAno)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
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
        normalized.nomeMarca,
        normalized.nomeModelo,
        normalized.nomeAno,
      ],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

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

function saveHistorico(payload, preco) {
  return new Promise(async (resolve, reject) => {
    try {
      const normalized = normalizePayload(payload);
      const exists = await recordExists(normalized);
      if (!exists) {
        const id = await insertHistorico(normalized, preco);
        console.log("Registro inserido para payload:", normalized);
        resolve({ action: "insert", id });
      } else {
        console.log("Registro já existe para payload:", normalized);
        resolve({ action: "duplicate" });
      }
    } catch (err) {
      reject(err);
    }
  });
}

function getHistoricoByMarcaModelo(codigoMarca, codigoModelo) {
  return new Promise((resolve, reject) => {
    const query = `SELECT preco FROM historico_precos WHERE codigoMarca = ? AND codigoModelo = ?`;
    db.all(query, [codigoMarca, codigoModelo], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}


function getHistoricoByMarcaModeloFromDB(marca, modelo) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        data_consulta AS referencia,
        preco,
        nomeMarca,
        nomeModelo,
        nomeAno
      FROM historico_precos
      WHERE codigoMarca = ? AND codigoModelo = ?
      ORDER BY data_consulta ASC
    `;
    db.all(query, [marca, modelo], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getVeiculosRegistrados() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT DISTINCT codigoMarca AS marca, codigoModelo AS modelo, nomeMarca, nomeModelo
      FROM historico_precos
      ORDER BY nomeMarca, nomeModelo
    `;
    db.all(query, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  db,
  insertHistorico,
  recordExists,
  saveHistorico,
  getHistoricoByMarcaModelo,
  getHistoricoByMarcaModeloFromDB,
  getVeiculosRegistrados,
};
