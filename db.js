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

// Criação da tabela historico_precos (adicionada a coluna codigoTipoCombustivel)
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
    UNIQUE(codigoMarca, codigoModelo, anoModelo, codigoTipoVeiculo, codigoTipoCombustivel)
  );
`;

db.run(createTableQuery, (err) => {
  if (err) {
    console.error("Erro ao criar a tabela historico_precos:", err.message);
  } else {
    console.log("Tabela historico_precos pronta.");
  }
});

// Função para inserir um registro, evitando duplicação
function insertHistorico(payload, preco) {
  return new Promise((resolve, reject) => {
    const insertQuery = `
      INSERT INTO historico_precos 
      (codigoTabelaReferencia, codigoTipoVeiculo, codigoMarca, codigoModelo, anoModelo, preco, codigoTipoCombustivel)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    db.run(
      insertQuery,
      [
        payload.codigoTabelaReferencia,
        payload.codigoTipoVeiculo,
        payload.codigoMarca,
        payload.codigoModelo,
        payload.anoModelo,
        preco,
        payload.codigoTipoCombustivel,
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

// Função para verificar se um registro já existe
function recordExists(payload) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id FROM historico_precos 
      WHERE codigoMarca = ? AND codigoModelo = ? AND anoModelo = ? AND codigoTipoVeiculo = ? AND codigoTipoCombustivel = ?
    `;
    db.get(
      query,
      [
        payload.codigoMarca,
        payload.codigoModelo,
        payload.anoModelo,
        payload.codigoTipoVeiculo,
        payload.codigoTipoCombustivel,
      ],
      (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      }
    );
  });
}

// Função para consultar todos os registros (para uso no endpoint de média, por exemplo)
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
  recordExists,
  getHistoricoByMarcaModelo,
};
