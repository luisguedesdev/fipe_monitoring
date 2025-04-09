const express = require("express");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
const { format } = require("date-fns");

const app = express();
app.use(express.json());
app.use(express.static("public")); // Serve os arquivos do front-end

// Configuração do banco SQLite (garanta que a pasta "data" existe)
const DB_PATH = "./data/database.db";
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Erro ao conectar no SQLite:", err.message);
  } else {
    console.log("Conectado ao banco SQLite.");
  }
});

// Cria a tabela de histórico, se ainda não existir
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS historico_precos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_consulta TEXT DEFAULT (datetime('now','localtime')),
    codigoTabelaReferencia TEXT,
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
  URLs utilizadas:
    - Tabela de Referência: ConsultarTabelaDeReferencia
    - Marcas: ConsultarMarcas
    - Modelos: ConsultarModelos
    - Anos: ConsultarAnoModelo
    - Preço: ConsultarValorComTodosParametros
*/
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

// Função para obter a tabela de referência padrão (primeiro item)
async function fetchTabelaReferenciaPadrao() {
  try {
    const response = await axios.post(URL_TABELA_REFERENCIA, {}, axiosConfig);
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log("Tabela de referência padrão:", response.data[0]);
      return String(response.data[0].Codigo);
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar tabela de referência:", error.message);
    return null;
  }
}

// Função para obter as 12 tabelas de referência (para histórico)
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

// Endpoint /api/marcas: retorna as marcas disponíveis usando a tabela padrão
app.get("/api/marcas", async (req, res) => {
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
    console.log("Resposta marcas:", response.data);
    res.json({ marcas: response.data });
  } catch (error) {
    console.error("Erro ao buscar marcas:", error.message);
    res.status(500).json({ error: "Erro ao buscar marcas" });
  }
});

// Endpoint /api/modelos: retorna os modelos para uma marca
app.get("/api/modelos", async (req, res) => {
  let { marca, tipoVeiculo = 1 } = req.query;
  if (!marca) {
    return res.status(400).json({ error: 'Parâmetro "marca" é obrigatório.' });
  }
  marca = Number(marca);
  tipoVeiculo = Number(tipoVeiculo);
  try {
    const codigoTabelaReferencia = await fetchTabelaReferenciaPadrao();
    if (!codigoTabelaReferencia) {
      return res
        .status(500)
        .json({ error: "Não foi possível obter a tabela de referência." });
    }
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
    res.json({
      modelos: response.data.Modelos || response.data.modelos || response.data,
    });
  } catch (error) {
    console.error("Erro ao buscar modelos:", error.message);
    res.status(500).json({ error: "Erro ao buscar modelos" });
  }
});

// Endpoint /api/anos: retorna os anos disponíveis para um modelo (usando ConsultarAnoModelo)
app.get("/api/anos", async (req, res) => {
  let { marca, modelo, tipoVeiculo = 1 } = req.query;
  if (!marca || !modelo) {
    return res
      .status(400)
      .json({ error: 'Parâmetros "marca" e "modelo" são obrigatórios.' });
  }
  marca = Number(marca);
  modelo = Number(modelo);
  tipoVeiculo = Number(tipoVeiculo);
  try {
    const codigoTabelaReferencia = await fetchTabelaReferenciaPadrao();
    if (!codigoTabelaReferencia) {
      return res
        .status(500)
        .json({ error: "Não foi possível obter a tabela de referência." });
    }
    const payload = {
      codigoTabelaReferencia,
      codigoTipoVeiculo: tipoVeiculo,
      codigoMarca: marca,
      codigoModelo: modelo,
    };
    const response = await axios.post(URL_ANO, payload, axiosConfig);
    console.log("Resposta anos:", response.data);
    res.json({ anos: response.data });
  } catch (error) {
    console.error("Erro ao buscar anos:", error.message);
    res.status(500).json({ error: "Erro ao buscar anos" });
  }
});

// Função parseAno: Processa o valor recebido do front
// Aceita formatos como "2016-3" ou "2016 Diesel"
function parseAno(anoStr) {
  anoStr = anoStr.trim();
  if (anoStr.includes("-")) {
    const parts = anoStr.split("-");
    return {
      anoModelo: parts[0].trim(),
      codigoTipoCombustivel: Number(parts[1]),
    };
  } else if (/^\d{4}\s+diesel$/i.test(anoStr)) {
    const year = anoStr.match(/^\d{4}/)[0];
    return { anoModelo: year, codigoTipoCombustivel: 3 };
  } else if (/^\d{4}\s+gasolina$/i.test(anoStr)) {
    const year = anoStr.match(/^\d{4}/)[0];
    return { anoModelo: year, codigoTipoCombustivel: 1 };
  } else {
    const match = anoStr.match(/\d{4}/);
    return { anoModelo: match ? match[0] : anoStr, codigoTipoCombustivel: 0 };
  }
}

// Função para obter o código da tabela de referência a utilizar
// Se o parâmetro "codigoTabelaReferencia" for fornecido, utiliza-o; caso contrário, usa o valor padrão
async function obterCodigoTabela(queryCodigo) {
  if (queryCodigo) {
    return String(queryCodigo);
  } else {
    const codigo = await fetchTabelaReferenciaPadrao();
    return codigo;
  }
}

// Endpoint /api/historico: itera pelas 12 tabelas de referência distintas
// e monta um histórico com cada consulta retornando seu valor (se disponível)
app.get("/api/historico", async (req, res) => {
  let {
    marca,
    modelo,
    ano,
    tipoVeiculo = 1,
    codigoTabelaReferencia,
  } = req.query;
  if (!marca || !modelo || !ano) {
    return res
      .status(400)
      .json({
        error: 'Parâmetros "marca", "modelo" e "ano" são obrigatórios.',
      });
  }
  marca = Number(marca);
  modelo = Number(modelo);
  tipoVeiculo = Number(tipoVeiculo);
  // Parse o ano; espera, por exemplo, "2016-3"
  const { anoModelo, codigoTipoCombustivel } = parseAno(ano);

  try {
    // Obtém um array das 12 tabelas de referência (tabelas distintas)
    const tabelas = await fetchUltimas12Tabelas();
    if (!tabelas.length) {
      return res
        .status(500)
        .json({ error: "Não foi possível obter as tabelas de referência." });
    }
    let historico = [];
    // Para cada tabela de referência, monta o payload com o código daquela tabela
    for (const tabela of tabelas) {
      const payload = {
        codigoTabelaReferencia: Number(tabela.Codigo),
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
        historico.push({
          referencia: (tabela.Mes || tabela.MesReferencia || "N/A").trim(),
          preco: preco && preco.trim() !== "" ? preco.trim() : "N/D",
        });
      } catch (err) {
        console.error(
          `Erro na consulta para tabela ${tabela.Codigo}:`,
          err.message
        );
      }
    }
    // Se nenhum registro válido foi encontrado, retorne uma mensagem informativa
    if (historico.length === 0) {
      res.json({
        error:
          "Preço não disponível para essa combinação nas tabelas de referência atuais.",
      });
    } else {
      res.json({ historico });
    }
  } catch (error) {
    console.error("Erro ao montar o histórico:", error.message);
    res.status(500).json({ error: "Erro ao montar o histórico de preços." });
  }
});

// Endpoint /api/preco: retorna o preço atual usando a tabela mais recente
app.get("/api/preco", async (req, res) => {
  let {
    marca,
    modelo,
    ano,
    tipoVeiculo = 1,
    codigoTabelaReferencia,
  } = req.query;
  if (!marca || !modelo || !ano) {
    return res
      .status(400)
      .json({
        error: 'Parâmetros "marca", "modelo" e "ano" são obrigatórios.',
      });
  }
  marca = Number(marca);
  modelo = Number(modelo);
  tipoVeiculo = Number(tipoVeiculo);
  const { anoModelo, codigoTipoCombustivel } = parseAno(ano);
  const codTRef = await obterCodigoTabela(codigoTabelaReferencia);
  if (!codTRef) {
    return res
      .status(500)
      .json({ error: "Não foi possível obter a tabela de referência." });
  }
  const payload = {
    codigoTabelaReferencia: Number(codTRef),
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
    console.log(
      "Resposta preço atual (via back) com payload:",
      payload,
      "->",
      response.data
    );
    res.json({ preco: response.data });
  } catch (error) {
    console.error("Erro ao buscar preço (tabela fixa):", error.message);
    res.status(500).json({ error: "Erro ao buscar preço." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
