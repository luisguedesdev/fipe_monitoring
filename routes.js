// routes.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

// Importa funções auxiliares do utils
const { parseAno, parsePrice } = require("./utils");
// Importa funções de acesso ao banco, além do objeto db para consultas diretas
const {
  insertHistorico,
  recordExists,
  getHistoricoByMarcaModelo,
  db,
} = require("./db");

// URLs dos endpoints da FIPE
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

// ---------------------------------------------------------------------------
// Funções Auxiliares para chamadas à FIPE
// ---------------------------------------------------------------------------

// Busca a tabela de referência padrão
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

// Busca as 12 tabelas de referência (usado para registro do histórico)
async function fetchUltimas12Tabelas() {
  try {
    const response = await axios.post(URL_TABELA_REFERENCIA, {}, axiosConfig);
    if (Array.isArray(response.data)) {
      return response.data.slice(0, 12);
    }
    return [];
  } catch (error) {
    console.error("Erro ao buscar tabelas de referência:", error.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Endpoints básicos (FIPE)
// ---------------------------------------------------------------------------

// GET /api/marcas - Consulta as marcas pela tabela padrão e tipo de veículo
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

// GET /api/modelos - Consulta os modelos para uma marca
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

// GET /api/anos - Consulta os anos disponíveis (da FIPE) para uma marca e modelo
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

// GET /api/preco - Consulta o preço atual (via FIPE)
router.get("/preco", async (req, res) => {
  let {
    marca,
    modelo,
    ano,
    tipoVeiculo = 1,
    codigoTabelaReferencia,
  } = req.query;
  if (!marca || !modelo || !ano)
    return res
      .status(400)
      .json({
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
  const payload = {
    codigoTabelaReferencia: codTRef,
    codigoTipoVeiculo: tipoVeiculo,
    codigoMarca: marca,
    codigoModelo: modelo,
    anoModelo: anoModelo,
    codigoTipoCombustivel: codigoTipoCombustivel,
    tipoVeiculo: "carro",
    modeloCodigoExterno: "",
    tipoConsulta: "tradicional",
  };
  try {
    const response = await axios.post(URL_PRECO, payload, axiosConfig);
    res.json({ preco: response.data });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar preço." });
  }
});

// GET /api/historico - Consulta e registra o histórico
router.get("/historico", async (req, res) => {
  let {
    marca,
    modelo,
    ano,
    tipoVeiculo = 1,
    codigoTabelaReferencia,
  } = req.query;
  if (!marca || !modelo || !ano)
    return res
      .status(400)
      .json({
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

  // Obtemos 12 tabelas de referência para registrar o histórico
  const tabelas = await fetchUltimas12Tabelas();
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
    };
    try {
      const response = await axios.post(URL_PRECO, payload, axiosConfig);
      const preco = response.data.Valor;
      const valor = preco && preco.trim() !== "" ? preco.trim() : "N/D";
      // Se o preço for válido, tenta salvar o registro no banco (sem duplicação)
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

// GET /api/anosHistoricos - Retorna os anos distintos registrados para uma marca e modelo
router.get("/anosHistoricos", async (req, res) => {
  let { marca, modelo } = req.query;
  if (!marca || !modelo)
    return res
      .status(400)
      .json({ error: 'Parâmetros "marca" e "modelo" são obrigatórios.' });
  marca = Number(marca);
  modelo = Number(modelo);
  const query = `
    SELECT DISTINCT anoModelo 
    FROM historico_precos 
    WHERE codigoMarca = ? AND codigoModelo = ?
    ORDER BY anoModelo DESC
  `;
  db.all(query, [marca, modelo], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar anos históricos:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ anos: rows });
  });
});

// GET /api/veiculos - Retorna os veículos distintos registrados no histórico
router.get("/veiculos", async (req, res) => {
  const query = `
    SELECT DISTINCT codigoMarca, codigoModelo, anoModelo, codigoTipoCombustivel, codigoTipoVeiculo
    FROM historico_precos
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ veiculos: rows });
  });
});

// GET /api/depreciacao - Calcula a depreciação até a data atual para um veículo
router.get("/depreciacao", async (req, res) => {
  let { marca, modelo } = req.query;
  if (!marca || !modelo)
    return res
      .status(400)
      .json({ error: 'Parâmetros "marca" e "modelo" são obrigatórios.' });
  marca = Number(marca);
  modelo = Number(modelo);
  // Seleciona os registros ordenados por data de consulta (ascendente)
  const query = `
    SELECT preco, data_consulta 
    FROM historico_precos 
    WHERE codigoMarca = ? AND codigoModelo = ?
    ORDER BY datetime(data_consulta) ASC
  `;
  db.all(query, [marca, modelo], (err, rows) => {
    if (err) {
      console.error(
        "Erro ao consultar histórico para depreciação:",
        err.message
      );
      return res.status(500).json({ error: err.message });
    }
    if (!rows || rows.length === 0) {
      return res
        .status(404)
        .json({
          error: "Nenhum registro encontrado para cálculo de depreciação.",
        });
    }
    const precoInicial = parsePrice(rows[0].preco);
    const precoAtual = parsePrice(rows[rows.length - 1].preco);
    const depreciacaoPercent =
      ((precoInicial - precoAtual) / precoInicial) * 100;
    res.json({
      precoInicial: rows[0].preco,
      precoAtual: rows[rows.length - 1].preco,
      depreciacao: depreciacaoPercent.toFixed(2) + "%",
    });
  });
});

module.exports = router;
