// routes.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

const { parseAno } = require("./utils");
const {
  insertHistorico,
  recordExists,
  getHistoricoByMarcaModelo,
  getHistoricoByMarcaModeloFromDB,
  db,
} = require("./db");

const URL_TABELA_REFERENCIA =
  "https://veiculos.fipe.org.br/api/veiculos/ConsultarTabelaDeReferencia";
const URL_MARCAS = "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas";
const URL_MODELOS =
  "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos";
const URL_ANO = "https://veiculos.fipe.org.br/api/veiculos/ConsultarAnoModelo";
const URL_PRECO =
  "https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros";

const axiosConfig = {
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  },
};

async function fetchTabelaReferenciaPadrao() {
  try {
    const response = await axios.post(URL_TABELA_REFERENCIA, {}, axiosConfig);
    if (Array.isArray(response.data) && response.data.length > 0) {
      return String(response.data[0].Codigo);
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar tabela de referência:", error.message);
    return null;
  }
}

async function fetchUltimas24Tabelas() {
  try {
    const response = await axios.post(URL_TABELA_REFERENCIA, {}, axiosConfig);
    if (Array.isArray(response.data)) {
      return response.data.slice(0, 24);
    }
    return [];
  } catch (error) {
    console.error("Erro ao buscar tabelas de referência:", error.message);
    return [];
  }
}

router.get("/marcas", async (req, res) => {
  const tipoVeiculo = Number(req.query.tipoVeiculo) || 1;
  try {
    const codigoTabelaReferencia = await fetchTabelaReferenciaPadrao();
    if (!codigoTabelaReferencia) {
      return res
        .status(500)
        .json({ error: "Não foi possível obter a tabela de referência." });
    }
    const response = await axios.post(
      URL_MARCAS,
      { codigoTabelaReferencia, codigoTipoVeiculo: tipoVeiculo },
      axiosConfig
    );
    res.json({ marcas: response.data });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar marcas" });
  }
});

router.get("/modelos", async (req, res) => {
  let { marca, tipoVeiculo = 1 } = req.query;
  if (!marca)
    return res.status(400).json({ error: 'Parâmetro "marca" é obrigatório.' });
  marca = Number(marca);
  tipoVeiculo = Number(tipoVeiculo);
  try {
    const codigoTabelaReferencia = await fetchTabelaReferenciaPadrao();
    if (!codigoTabelaReferencia)
      return res
        .status(500)
        .json({ error: "Não foi possível obter a tabela de referência." });
    const response = await axios.post(
      URL_MODELOS,
      {
        codigoTabelaReferencia,
        codigoTipoVeiculo: tipoVeiculo,
        codigoMarca: marca,
      },
      axiosConfig
    );
    res.json({
      modelos: response.data.Modelos || response.data.modelos || response.data,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar modelos" });
  }
});

router.get("/anos", async (req, res) => {
  let { marca, modelo, tipoVeiculo = 1 } = req.query;
  if (!marca || !modelo)
    return res
      .status(400)
      .json({ error: 'Parâmetros "marca" e "modelo" são obrigatórios.' });
  marca = Number(marca);
  modelo = Number(modelo);
  tipoVeiculo = Number(tipoVeiculo);
  try {
    const codigoTabelaReferencia = await fetchTabelaReferenciaPadrao();
    if (!codigoTabelaReferencia)
      return res
        .status(500)
        .json({ error: "Não foi possível obter a tabela de referência." });
    const payload = {
      codigoTabelaReferencia,
      codigoTipoVeiculo: tipoVeiculo,
      codigoMarca: marca,
      codigoModelo: modelo,
    };
    const response = await axios.post(URL_ANO, payload, axiosConfig);
    res.json({ anos: response.data });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar anos" });
  }
});

router.get("/historico", async (req, res) => {
  let {
    marca,
    modelo,
    ano,
    tipoVeiculo = 1,
    codigoTabelaReferencia,
    nomeMarca,
    nomeModelo,
    nomeAno,
  } = req.query;
  if (!marca || !modelo || !ano)
    return res.status(400).json({
      error: 'Parâmetros "marca", "modelo" e "ano" são obrigatórios.',
    });

  marca = Number(marca);
  modelo = Number(modelo);
  tipoVeiculo = Number(tipoVeiculo);
  const { anoModelo, codigoTipoCombustivel } = parseAno(ano);
  const codTRef = codigoTabelaReferencia
    ? String(codigoTabelaReferencia)
    : await fetchTabelaReferenciaPadrao();
  if (!codTRef)
    return res
      .status(500)
      .json({ error: "Não foi possível obter a tabela de referência." });

  const tabelas = await fetchUltimas24Tabelas();
  if (!tabelas.length)
    return res
      .status(500)
      .json({ error: "Não foi possível obter as tabelas de referência." });

  let historico = [];
  for (const tabela of tabelas) {
    const payload = {
      codigoTabelaReferencia: String(tabela.Codigo),
      codigoTipoVeiculo: tipoVeiculo,
      codigoMarca: marca,
      codigoModelo: modelo,
      anoModelo: anoModelo,
      codigoTipoCombustivel: codigoTipoCombustivel,
      tipoVeiculo: "carro",
      modeloCodigoExterno: "",
      tipoConsulta: "tradicional",
      nomeMarca: nomeMarca || "",
      nomeModelo: nomeModelo || "",
      nomeAno: nomeAno || "",
    };
    try {
      const response = await axios.post(URL_PRECO, payload, axiosConfig);
      const preco = response.data.Valor;
      const valor = preco && preco.trim() !== "" ? preco.trim() : "N/D";
      if (valor !== "N/D") {
        try {
          const exists = await recordExists(payload);
          if (!exists) {
            await insertHistorico(payload, valor);
            console.log("Registro inserido para payload:", payload);
          } else {
            console.log("Registro já existe para payload:", payload);
          }
        } catch (e) {
          console.error("Erro na verificação/inserção:", e.message);
        }
      }
      historico.push({
        referencia: (tabela.Mes || tabela.MesReferencia || "N/A").trim(),
        preco: valor,
      });
    } catch (err) {
      console.error(
        `Erro na consulta para tabela ${tabela.Codigo}:`,
        err.message
      );
    }
  }

  if (historico.length === 0) {
    res.json({
      error:
        "Preço não disponível para essa combinação nas tabelas de referência atuais.",
    });
  } else {
    res.json({ historico });
  }
});

router.get("/dashboard/:marca/:modelo", async (req, res) => {
  const { marca, modelo } = req.params;
  const ano = req.query.ano;
  const query = ano
    ? `SELECT data_consulta as referencia, preco FROM historico_precos WHERE codigoMarca = ? AND codigoModelo = ? AND nomeAno = ? ORDER BY data_consulta ASC`
    : `SELECT data_consulta as referencia, preco FROM historico_precos WHERE codigoMarca = ? AND codigoModelo = ? ORDER BY data_consulta ASC`;

  const params = ano ? [marca, modelo, ano] : [marca, modelo];

  db.all(query, params, (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Erro ao consultar dados do dashboard." });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Sem histórico encontrado." });
    }
    const previsao = preverPreco(rows);
    res.json({ historico: rows, previsao });
  });
});

router.get("/todos-registros", (req, res) => {
  const sql = `SELECT * FROM historico_precos ORDER BY data_consulta DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Erro ao consultar registros:", err.message);
      return res
        .status(500)
        .json({ error: "Erro ao acessar o banco de dados." });
    }
    res.json({ registros: rows });
  });
});

function preverPreco(historico) {
  const meses = historico.map((_, i) => i + 1);
  const precos = historico.map((item) =>
    parseFloat(item.preco.replace("R$", "").replace(".", "").replace(",", "."))
  );
  const n = meses.length;
  const somaX = meses.reduce((a, b) => a + b, 0);
  const somaY = precos.reduce((a, b) => a + b, 0);
  const somaXY = meses.reduce((sum, x, i) => sum + x * precos[i], 0);
  const somaX2 = meses.reduce((sum, x) => sum + x * x, 0);

  const m = (n * somaXY - somaX * somaY) / (n * somaX2 - somaX * somaX);
  const b = (somaY - m * somaX) / n;

  const proximoMes = n + 1;
  const precoPrevisto = m * proximoMes + b;
  return precoPrevisto.toFixed(2);
}

module.exports = router;
