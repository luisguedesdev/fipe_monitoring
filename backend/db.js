const sqlite3 = require("sqlite3").verbose();

const DB_PATH = "./data/database.db";
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Erro ao conectar no SQLite:", err.message);
  } else {
    console.log("Conectado ao banco SQLite.");
  }
});

// Criação da tabela com campos de nomes legíveis
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS historico_precos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_consulta TEXT DEFAULT (datetime('now','localtime')),
    codigoTabelaReferencia TEXT,
    codigoTipoVeiculo INTEGER,
    codigoMarca INTEGER,
    nomeMarca TEXT,
    codigoModelo INTEGER,
    nomeModelo TEXT,
    anoModelo TEXT,
    nomeAno TEXT,
    preco TEXT,
    codigoTipoCombustivel INTEGER,
    UNIQUE(codigoMarca, codigoModelo, anoModelo, codigoTipoVeiculo, codigoTipoCombustivel, codigoTabelaReferencia)
  );
`;

db.run(createTableQuery, (err) => {
  if (err) {
    console.error("Erro ao criar tabela:", err.message);
  } else {
    console.log("Tabela historico_precos pronta.");
  }
});

function normalizePayload(payload) {
  return {
    codigoTabelaReferencia: String(payload.codigoTabelaReferencia).trim(),
    codigoTipoVeiculo: Number(payload.codigoTipoVeiculo),
    codigoMarca: Number(payload.codigoMarca),
    nomeMarca: String(payload.nomeMarca || "").trim(),
    codigoModelo: Number(payload.codigoModelo),
    nomeModelo: String(payload.nomeModelo || "").trim(),
    anoModelo: String(payload.anoModelo).trim(),
    nomeAno: String(payload.nomeAno || "").trim(),
    codigoTipoCombustivel: Number(payload.codigoTipoCombustivel),
  };
}

function insertHistorico(payload, preco) {
  return new Promise((resolve, reject) => {
    const insertQuery = `
      INSERT INTO historico_precos 
      (codigoTabelaReferencia, codigoTipoVeiculo, codigoMarca, nomeMarca, codigoModelo, nomeModelo, anoModelo, nomeAno, preco, codigoTipoCombustivel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const n = normalizePayload(payload);
    db.run(
      insertQuery,
      [
        n.codigoTabelaReferencia,
        n.codigoTipoVeiculo,
        n.codigoMarca,
        n.nomeMarca,
        n.codigoModelo,
        n.nomeModelo,
        n.anoModelo,
        n.nomeAno,
        preco,
        n.codigoTipoCombustivel,
      ],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}

function updateHistorico(payload, preco) {
  return new Promise((resolve, reject) => {
    const updateQuery = `
      UPDATE historico_precos 
      SET data_consulta = datetime('now','localtime'), preco = ?
      WHERE codigoMarca = ? AND codigoModelo = ? AND anoModelo = ? AND codigoTipoVeiculo = ? AND codigoTipoCombustivel = ? AND codigoTabelaReferencia = ?;
    `;
    const n = normalizePayload(payload);
    db.run(
      updateQuery,
      [
        preco,
        n.codigoMarca,
        n.codigoModelo,
        n.anoModelo,
        n.codigoTipoVeiculo,
        n.codigoTipoCombustivel,
        n.codigoTabelaReferencia,
      ],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
}

function recordExists(payload) {
  return new Promise((resolve, reject) => {
    const n = normalizePayload(payload);
    const query = `
      SELECT id FROM historico_precos 
      WHERE codigoMarca = ? AND codigoModelo = ? AND anoModelo = ? AND codigoTipoVeiculo = ? AND codigoTipoCombustivel = ? AND codigoTabelaReferencia = ?
    `;
    db.get(
      query,
      [
        n.codigoMarca,
        n.codigoModelo,
        n.anoModelo,
        n.codigoTipoVeiculo,
        n.codigoTipoCombustivel,
        n.codigoTabelaReferencia,
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
      const n = normalizePayload(payload);
      const exists = await recordExists(n);
      if (!exists) {
        const id = await insertHistorico(n, preco);
        console.log("Registro inserido para payload:", n);
        resolve({ action: "insert", id });
      } else {
        console.log("Registro já existe para payload:", n);
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
      SELECT data_consulta as referencia, preco
      FROM historico_precos
      WHERE nomeMarca = ? AND nomeModelo = ?
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
      SELECT DISTINCT nomeMarca AS marca, nomeModelo AS modelo, nomeAno AS ano
      FROM historico_precos
      ORDER BY marca, modelo, ano
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
  updateHistorico,
  recordExists,
  saveHistorico,
  getHistoricoByMarcaModelo,
  getHistoricoByMarcaModeloFromDB,
  getVeiculosRegistrados,
};
