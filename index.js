const axios = require("axios");
const cheerio = require("cheerio");
const sqlite3 = require("sqlite3").verbose();
const { format } = require("date-fns");

/**
 * Função para obter o valor atual do veículo.
 * Neste exemplo, o valor é simulado.
 * Em um cenário real, você pode usar axios e cheerio para fazer scraping ou chamar uma API.
 */
async function getFipeValue(codigoFipe) {
  // Valor fixo para simulação.
  return 210000.0;
}

/**
 * Armazena o código FIPE, a data atual e o valor em um banco de dados SQLite.
 */
function storeValue(codigoFipe, valor) {
  const db = new sqlite3.Database("fipe_history.db");
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS historico (
      codigo_fipe TEXT,
      data TEXT,
      valor REAL
    )`);
    const dataAtual = format(new Date(), "yyyy-MM-dd");
    const stmt = db.prepare(
      "INSERT INTO historico (codigo_fipe, data, valor) VALUES (?, ?, ?)"
    );
    stmt.run(codigoFipe, dataAtual, valor, function (err) {
      if (err) {
        console.error("Erro ao inserir dados:", err.message);
      }
    });
    stmt.finalize();
  });
  db.close();
}

/**
 * Consulta e retorna o histórico de valores para o código FIPE informado.
 */
function getHistory(codigoFipe) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database("fipe_history.db");
    db.all(
      "SELECT data, valor FROM historico WHERE codigo_fipe = ? ORDER BY data",
      [codigoFipe],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
        db.close();
      }
    );
  });
}

/**
 * Calcula a média de desvalorização mensal com base no histórico.
 * Retorna um objeto com:
 *  - depreciation: valor da desvalorização média mensal em reais.
 *  - depreciationPercentage: porcentagem de desvalorização mensal.
 *  - meses: número de meses considerados.
 */
async function calculateAverageDepreciation(codigoFipe) {
  try {
    const history = await getHistory(codigoFipe);
    if (history.length < 2) {
      console.log(
        "Dados insuficientes para calcular a desvalorização (necessário pelo menos 2 registros)."
      );
      return null;
    }
    const firstRecord = history[0];
    const lastRecord = history[history.length - 1];
    const dataInicial = new Date(firstRecord.data);
    const dataFinal = new Date(lastRecord.data);
    const meses =
      (dataFinal.getFullYear() - dataInicial.getFullYear()) * 12 +
      (dataFinal.getMonth() - dataInicial.getMonth());
    if (meses === 0) {
      console.log(
        "Intervalo de tempo insuficiente para calcular a desvalorização."
      );
      return null;
    }
    const depreciation = (firstRecord.valor - lastRecord.valor) / meses;
    const depreciationPercentage = (depreciation / firstRecord.valor) * 100;
    return { depreciation, depreciationPercentage, meses };
  } catch (error) {
    console.error("Erro no cálculo da desvalorização:", error);
    return null;
  }
}

/**
 * Função principal que executa as operações:
 * - Consulta o valor atual.
 * - Armazena o valor.
 * - Exibe o histórico.
 * - Calcula a média de desvalorização.
 */
async function main() {
  const codigoFipe = "003364-2";
  const valorAtual = await getFipeValue(codigoFipe);
  console.log(
    `Valor atual para o código ${codigoFipe}: R$${valorAtual.toFixed(2)}`
  );

  storeValue(codigoFipe, valorAtual);
  console.log("Valor armazenado com sucesso!");

  const historico = await getHistory(codigoFipe);
  console.log("\nHistórico de valores:");
  historico.forEach((record) => {
    console.log(`${record.data}: R$${record.valor.toFixed(2)}`);
  });

  const result = await calculateAverageDepreciation(codigoFipe);
  if (result) {
    const { depreciation, depreciationPercentage, meses } = result;
    console.log(
      `\nMédia de desvalorização mensal: R$${depreciation.toFixed(
        2
      )} ou ${depreciationPercentage.toFixed(2)}% em ${meses} meses`
    );
  } else {
    console.log("\nDados insuficientes para calcular a desvalorização.");
  }
}

main().catch(console.error);
