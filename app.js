const express = require("express");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
const { format } = require("date-fns");

const app = express();
app.use(express.json());

// Serve arquivos estáticos do front (pasta public)
app.use(express.static("public"));

// Caminho do banco de dados (pasta data deve existir ou ser criada)
const DB_PATH = "./data/database.db";

// Abre ou cria o banco SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Erro ao conectar no SQLite:", err.message);
  } else {
    console.log("Conectado ao banco SQLite.");
  }
});

// Cria a tabela para histórico se ainda não existir
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS historico_precos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_consulta TEXT DEFAULT (datetime('now','localtime')),
    codigoTabelaReferencia INTEGER,
    codigoTipoVeiculo INTEGER,
    codigoMarca INTEGER,
    codigoModelo INTEGER,
    anoModelo TEXT,
    preco TEXT
  );
`;
db.run(createTableQuery, (err) => {
  if (err) {
    console.error("Erro ao criar a tabela historico_precos:", err.message);
  } else {
    console.log("Tabela historico_precos pronta.");
  }
});

/*
  Endpoints utilizados (URLs atualizadas conforme as opções encontradas):
    - Tabela de Referência: ConsultarTabelaDeReferencia
    - Marcas: ConsultarMarcas
    - Modelos: ConsultarModelos
    - Anos: ConsultarModelosAtravesDoAno
    - Preço: ConsultarValorComTodosParametros
*/
const URL_TABELA_REFERENCIA =
  "https://veiculos.fipe.org.br/api/veiculos/ConsultarTabelaDeReferencia";
const URL_MARCAS = "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas";
const URL_MODELOS =
  "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos";
const URL_ANOS =
  "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelosAtravesDoAno";
const URL_PRECO =
  "https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros";

// Configuração de cabeçalhos para simular requisição de navegador
const axiosConfig = {
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  },
};

// Função para buscar as 12 tabelas de referência mais recentes
async function fetchUltimas12Tabelas() {
  try {
    const response = await axios.post(URL_TABELA_REFERENCIA, {}, axiosConfig);
    if (Array.isArray(response.data)) {
      console.log("Tabelas de referência recebidas:", response.data);
      return response.data.slice(0, 12);
    }
    return [];
  } catch (error) {
    console.error("Erro ao buscar tabelas de referência:", error.message);
    return [];
  }
}

app.get("/api/marcas", async (req, res) => {
  const tipoVeiculo = req.query.tipoVeiculo || 1;
  try {
    const tabelaResponse = await axios.post(
      URL_TABELA_REFERENCIA,
      {},
      axiosConfig
    );
    const codigoTabelaReferencia = tabelaResponse.data[0].Codigo;
    const response = await axios.post(
      URL_MARCAS,
      { codigoTabelaReferencia, codigoTipoVeiculo: tipoVeiculo },
      axiosConfig
    );
    console.log("Resposta marcas:", response.data);
    res.json({ marcas: response.data });
  } catch (error) {
    console.error("Erro ao buscar marcas:", error.message);
    res.status(500).json({ error: "Erro ao buscar marcas" });
  }
});

app.get("/api/modelos", async (req, res) => {
  const { marca, tipoVeiculo = 1 } = req.query;
  if (!marca) {
    return res.status(400).json({ error: 'Parâmetro "marca" é obrigatório.' });
  }
  try {
    const tabelaResponse = await axios.post(
      URL_TABELA_REFERENCIA,
      {},
      axiosConfig
    );
    const codigoTabelaReferencia = tabelaResponse.data[0].Codigo;
    const response = await axios.post(
      URL_MODELOS,
      {
        codigoTabelaReferencia,
        codigoTipoVeiculo: tipoVeiculo,
        codigoMarca: marca,
      },
      axiosConfig
    );
    console.log("Resposta modelos:", response.data);
    res.json({ modelos: response.data.modelos || response.data });
  } catch (error) {
    console.error("Erro ao buscar modelos:", error.message);
    res.status(500).json({ error: "Erro ao buscar modelos" });
  }
});

app.get("/api/anos", async (req, res) => {
  const { marca, modelo, tipoVeiculo = 1 } = req.query;
  if (!marca || !modelo) {
    return res
      .status(400)
      .json({ error: 'Parâmetros "marca" e "modelo" são obrigatórios.' });
  }
  try {
    const tabelaResponse = await axios.post(
      URL_TABELA_REFERENCIA,
      {},
      axiosConfig
    );
    const codigoTabelaReferencia = tabelaResponse.data[0].Codigo;
    const response = await axios.post(
      URL_ANOS,
      {
        codigoTabelaReferencia,
        codigoTipoVeiculo: tipoVeiculo,
        codigoMarca: marca,
        codigoModelo: modelo,
      },
      axiosConfig
    );
    console.log("Resposta anos:", response.data);
    res.json({ anos: response.data });
  } catch (error) {
    console.error("Erro ao buscar anos:", error.message);
    res.status(500).json({ error: "Erro ao buscar anos" });
  }
});

app.get("/api/historico", async (req, res) => {
  const { marca, modelo, ano, tipoVeiculo = 1 } = req.query;
  if (!marca || !modelo || !ano) {
    return res
      .status(400)
      .json({
        error: 'Parâmetros "marca", "modelo" e "ano" são obrigatórios.',
      });
  }
  try {
    const tabelas = await fetchUltimas12Tabelas();
    if (!tabelas.length) {
      return res
        .status(500)
        .json({ error: "Não foi possível obter as tabelas de referência." });
    }
    const historico = [];
    for (const tabela of tabelas) {
      const payload = {
        codigoTabelaReferencia: tabela.Codigo,
        codigoTipoVeiculo: tipoVeiculo,
        codigoMarca: marca,
        codigoModelo: modelo,
        anoModelo: ano,
        tipoConsulta: "tradicional",
      };
      try {
        const response = await axios.post(URL_PRECO, payload, axiosConfig);
        const preco = response.data.Valor;
        historico.push({
          referencia: tabela.Mes || tabela.MesReferencia || "N/A",
          preco: preco || "N/D",
        });
      } catch (err) {
        console.error(
          `Erro na consulta para tabela ${tabela.Codigo}:`,
          err.message
        );
      }
    }
    res.json({ historico });
  } catch (error) {
    console.error("Erro ao montar o histórico:", error.message);
    res.status(500).json({ error: "Erro ao montar o histórico de preços." });
  }
});

app.get("/api/preco", async (req, res) => {
  const { marca, modelo, ano, tipoVeiculo = 1 } = req.query;
  if (!marca || !modelo || !ano) {
    return res
      .status(400)
      .json({
        error: 'Parâmetros "marca", "modelo" e "ano" são obrigatórios.',
      });
  }
  try {
    const tabelaResponse = await axios.post(
      URL_TABELA_REFERENCIA,
      {},
      axiosConfig
    );
    const codigoTabelaReferencia = tabelaResponse.data[0].Codigo;
    const payload = {
      codigoTabelaReferencia,
      codigoTipoVeiculo: tipoVeiculo,
      codigoMarca: marca,
      codigoModelo: modelo,
      anoModelo: ano,
      tipoConsulta: "tradicional",
    };
    const response = await axios.post(URL_PRECO, payload, axiosConfig);
    console.log("Resposta preço atual:", response.data);
    res.json({ preco: response.data });
  } catch (error) {
    console.error("Erro ao buscar preço:", error.message);
    res.status(500).json({ error: "Erro ao buscar preço." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
