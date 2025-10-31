const express = require("express");
const axios = require("axios");
const router = express.Router();

// Imports locais
const logger = require("./config/logger");
const cache = require("./config/cache");
const { parseAno, validateFipeParams } = require("./utils");
const {
  insertHistorico,
  recordExists,
  getHistoricoByMarcaModeloFromDB,
  executeQuery,
  isProduction,
} = require("./db");

// URLs da API FIPE
const FIPE_URLS = {
  TABELA_REFERENCIA: `${
    process.env.FIPE_BASE_URL || "https://veiculos.fipe.org.br/api/veiculos"
  }/ConsultarTabelaDeReferencia`,
  MARCAS: `${
    process.env.FIPE_BASE_URL || "https://veiculos.fipe.org.br/api/veiculos"
  }/ConsultarMarcas`,
  MODELOS: `${
    process.env.FIPE_BASE_URL || "https://veiculos.fipe.org.br/api/veiculos"
  }/ConsultarModelos`,
  ANOS: `${
    process.env.FIPE_BASE_URL || "https://veiculos.fipe.org.br/api/veiculos"
  }/ConsultarAnoModelo`,
  PRECO: `${
    process.env.FIPE_BASE_URL || "https://veiculos.fipe.org.br/api/veiculos"
  }/ConsultarValorComTodosParametros`,
};

// Configuração padrão do axios
const axiosConfig = {
  headers: {
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
  timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
};

// Middleware para validação de parâmetros básicos
const validateBasicParams = (req, res, next) => {
  const { tipoVeiculo } = req.query;

  if (tipoVeiculo && ![1, 2, 3].includes(Number(tipoVeiculo))) {
    return res.status(400).json({
      error:
        "Tipo de veículo inválido. Use: 1 (carros), 2 (motos), 3 (caminhões)",
    });
  }

  next();
};

// Função para fazer requisições com retry
async function makeRequestWithRetry(url, data, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(url, data, axiosConfig);
      return response;
    } catch (error) {
      logger.warn(`Tentativa ${i + 1}/${retries} falhou para ${url}:`, {
        error: error.message,
        data,
      });

      if (i === retries - 1) throw error;

      // Backoff exponencial
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}

async function fetchTabelaReferenciaPadrao() {
  const cacheKey = "tabela_referencia_padrao";
  let cached = cache.get(cacheKey);

  if (cached) {
    logger.debug("Tabela de referência obtida do cache");
    return cached;
  }

  try {
    const response = await makeRequestWithRetry(
      FIPE_URLS.TABELA_REFERENCIA,
      {}
    );

    if (Array.isArray(response.data) && response.data.length > 0) {
      const codigo = String(response.data[0].Codigo);
      cache.set(cacheKey, codigo, 300); // Cache por 5 minutos
      logger.debug("Tabela de referência obtida da API FIPE");
      return codigo;
    }
    return null;
  } catch (error) {
    logger.error("Erro ao buscar tabela de referência:", error);
    return null;
  }
}

async function fetchUltimas24Tabelas() {
  const cacheKey = "ultimas_24_tabelas";
  let cached = cache.get(cacheKey);

  if (cached) {
    logger.debug("Últimas 24 tabelas obtidas do cache");
    return cached;
  }

  try {
    const response = await makeRequestWithRetry(
      FIPE_URLS.TABELA_REFERENCIA,
      {}
    );

    if (Array.isArray(response.data)) {
      const tabelas = response.data.slice(0, 24);
      cache.set(cacheKey, tabelas, 600); // Cache por 10 minutos
      logger.debug(`${tabelas.length} tabelas obtidas da API FIPE`);
      return tabelas;
    }
    return [];
  } catch (error) {
    logger.error("Erro ao buscar tabelas de referência:", error);
    return [];
  }
}

// Rota para buscar marcas
router.get("/marcas", validateBasicParams, async (req, res) => {
  const tipoVeiculo = Number(req.query.tipoVeiculo) || 1;
  const cacheKey = `marcas_${tipoVeiculo}`;

  try {
    // Verificar cache primeiro
    let cached = cache.get(cacheKey);
    if (cached) {
      logger.info(`Marcas para tipo ${tipoVeiculo} obtidas do cache`);
      return res.json(cached);
    }

    const codigoTabelaReferencia = await fetchTabelaReferenciaPadrao();
    if (!codigoTabelaReferencia) {
      return res.status(500).json({
        error: "Não foi possível obter a tabela de referência da FIPE.",
      });
    }

    const response = await makeRequestWithRetry(FIPE_URLS.MARCAS, {
      codigoTabelaReferencia,
      codigoTipoVeiculo: tipoVeiculo,
    });

    const result = { marcas: response.data };
    cache.set(cacheKey, result, 3600); // Cache por 1 hora

    logger.info(
      `${response.data.length} marcas obtidas para tipo ${tipoVeiculo}`
    );
    res.json(result);
  } catch (error) {
    logger.error("Erro ao buscar marcas:", {
      error: error.message,
      tipoVeiculo,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Erro ao buscar marcas. Tente novamente mais tarde.",
    });
  }
});

// Rota para buscar modelos
router.get("/modelos", validateBasicParams, async (req, res) => {
  let { marca, tipoVeiculo = 1 } = req.query;

  if (!marca) {
    return res.status(400).json({
      error: 'Parâmetro "marca" é obrigatório.',
    });
  }

  marca = Number(marca);
  tipoVeiculo = Number(tipoVeiculo);

  if (isNaN(marca) || marca <= 0) {
    return res.status(400).json({
      error: 'Parâmetro "marca" deve ser um número válido.',
    });
  }

  const cacheKey = `modelos_${marca}_${tipoVeiculo}`;

  try {
    // Verificar cache primeiro
    let cached = cache.get(cacheKey);
    if (cached) {
      logger.info(`Modelos para marca ${marca} obtidos do cache`);
      return res.json(cached);
    }

    const codigoTabelaReferencia = await fetchTabelaReferenciaPadrao();
    if (!codigoTabelaReferencia) {
      return res.status(500).json({
        error: "Não foi possível obter a tabela de referência da FIPE.",
      });
    }

    const response = await makeRequestWithRetry(FIPE_URLS.MODELOS, {
      codigoTabelaReferencia,
      codigoTipoVeiculo: tipoVeiculo,
      codigoMarca: marca,
    });

    const result = {
      modelos: response.data.Modelos || response.data.modelos || response.data,
    };

    cache.set(cacheKey, result, 3600); // Cache por 1 hora

    logger.info(`${result.modelos.length} modelos obtidos para marca ${marca}`);
    res.json(result);
  } catch (error) {
    logger.error("Erro ao buscar modelos:", {
      error: error.message,
      marca,
      tipoVeiculo,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Erro ao buscar modelos. Tente novamente mais tarde.",
    });
  }
});

// Rota para buscar anos
router.get("/anos", validateBasicParams, async (req, res) => {
  let { marca, modelo, tipoVeiculo = 1 } = req.query;

  if (!marca || !modelo) {
    return res.status(400).json({
      error: 'Parâmetros "marca" e "modelo" são obrigatórios.',
    });
  }

  marca = Number(marca);
  modelo = Number(modelo);
  tipoVeiculo = Number(tipoVeiculo);

  if (isNaN(marca) || marca <= 0 || isNaN(modelo) || modelo <= 0) {
    return res.status(400).json({
      error: 'Parâmetros "marca" e "modelo" devem ser números válidos.',
    });
  }

  const cacheKey = `anos_${marca}_${modelo}_${tipoVeiculo}`;

  try {
    // Verificar cache primeiro
    let cached = cache.get(cacheKey);
    if (cached) {
      logger.info(`Anos para marca ${marca} modelo ${modelo} obtidos do cache`);
      return res.json(cached);
    }

    const codigoTabelaReferencia = await fetchTabelaReferenciaPadrao();
    if (!codigoTabelaReferencia) {
      return res.status(500).json({
        error: "Não foi possível obter a tabela de referência da FIPE.",
      });
    }

    const payload = {
      codigoTabelaReferencia,
      codigoTipoVeiculo: tipoVeiculo,
      codigoMarca: marca,
      codigoModelo: modelo,
    };

    const response = await makeRequestWithRetry(FIPE_URLS.ANOS, payload);
    const result = { anos: response.data };

    cache.set(cacheKey, result, 3600); // Cache por 1 hora

    logger.info(
      `${response.data.length} anos obtidos para marca ${marca} modelo ${modelo}`
    );
    res.json(result);
  } catch (error) {
    logger.error("Erro ao buscar anos:", {
      error: error.message,
      marca,
      modelo,
      tipoVeiculo,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Erro ao buscar anos. Tente novamente mais tarde.",
    });
  }
});

// Rota para buscar histórico
router.get("/historico", validateBasicParams, async (req, res) => {
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

  if (!marca || !modelo || !ano) {
    return res.status(400).json({
      error: 'Parâmetros "marca", "modelo" e "ano" são obrigatórios.',
    });
  }

  marca = Number(marca);
  modelo = Number(modelo);
  tipoVeiculo = Number(tipoVeiculo);

  if (isNaN(marca) || marca <= 0 || isNaN(modelo) || modelo <= 0) {
    return res.status(400).json({
      error: 'Parâmetros "marca" e "modelo" devem ser números válidos.',
    });
  }

  const { anoModelo, codigoTipoCombustivel } = parseAno(ano);
  const cacheKey = cache.generateHistoricoKey(marca, modelo, ano);

  try {
    // Verificar cache primeiro
    let cached = cache.get(cacheKey);
    if (cached) {
      logger.info(`Histórico para ${marca}-${modelo}-${ano} obtido do cache`);
      return res.json(cached);
    }

    const codTRef = codigoTabelaReferencia
      ? String(codigoTabelaReferencia)
      : await fetchTabelaReferenciaPadrao();

    if (!codTRef) {
      return res.status(500).json({
        error: "Não foi possível obter a tabela de referência.",
      });
    }

    const tabelas = await fetchUltimas24Tabelas();
    if (!tabelas.length) {
      return res.status(500).json({
        error: "Não foi possível obter as tabelas de referência.",
      });
    }

    let historico = [];
    let processedCount = 0;

    logger.info(
      `Processando ${tabelas.length} tabelas para histórico de ${marca}-${modelo}-${ano}`
    );

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
        const response = await makeRequestWithRetry(FIPE_URLS.PRECO, payload);
        const preco = response.data.Valor;
        const valor = preco && preco.trim() !== "" ? preco.trim() : "N/D";

        if (valor !== "N/D") {
          try {
            const exists = await recordExists(payload);
            if (!exists) {
              await insertHistorico(payload, valor);
              logger.debug(`Registro inserido para tabela ${tabela.Codigo}`);
            }
          } catch (e) {
            logger.error("Erro na verificação/inserção:", e);
          }
        }

        historico.push({
          referencia: (tabela.Mes || tabela.MesReferencia || "N/A").trim(),
          preco: valor,
        });

        processedCount++;
      } catch (err) {
        logger.warn(
          `Erro na consulta para tabela ${tabela.Codigo}:`,
          err.message
        );
        // Continuar com as próximas tabelas mesmo se uma falhar
      }
    }

    const result =
      historico.length === 0
        ? {
            error:
              "Preço não disponível para essa combinação nas tabelas de referência atuais.",
          }
        : { historico };

    // Cache apenas se tivemos sucesso
    if (historico.length > 0) {
      cache.set(cacheKey, result, 300); // Cache por 5 minutos
    }

    logger.info(
      `Histórico processado: ${processedCount}/${tabelas.length} tabelas para ${marca}-${modelo}-${ano}`
    );
    res.json(result);
  } catch (error) {
    logger.error("Erro ao buscar histórico:", {
      error: error.message,
      marca,
      modelo,
      ano,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Erro ao buscar histórico. Tente novamente mais tarde.",
    });
  }
});

// Rota para dashboard
router.get("/dashboard/:marca/:modelo", async (req, res) => {
  const { marca, modelo } = req.params;
  const { ano } = req.query;

  if (!marca || !modelo) {
    return res.status(400).json({
      error: 'Parâmetros "marca" e "modelo" são obrigatórios.',
    });
  }

  const cacheKey = `dashboard_${marca}_${modelo}_${ano || "all"}`;

  try {
    // Verificar cache primeiro
    let cached = cache.get(cacheKey);
    if (cached) {
      logger.info(`Dashboard para ${marca}-${modelo} obtido do cache`);
      return res.json(cached);
    }

    const paramPlaceholder = isProduction
      ? "WHERE codigo_marca = $1 AND codigo_modelo = $2 AND nome_ano = $3 ORDER BY data_consulta DESC"
      : "WHERE codigo_marca = ? AND codigo_modelo = ? AND nome_ano = ? ORDER BY data_consulta DESC";

    const paramPlaceholderAll = isProduction
      ? "WHERE codigo_marca = $1 AND codigo_modelo = $2 ORDER BY data_consulta DESC"
      : "WHERE codigo_marca = ? AND codigo_modelo = ? ORDER BY data_consulta DESC";

    const query = ano
      ? `SELECT data_consulta as referencia, preco FROM historico_precos ${paramPlaceholder}`
      : `SELECT data_consulta as referencia, preco FROM historico_precos ${paramPlaceholderAll}`;

    const params = ano ? [marca, modelo, ano] : [marca, modelo];

    const rows = await executeQuery(query, params);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        error: "Sem histórico encontrado para os parâmetros fornecidos.",
      });
    }

    // Calcular previsão simples
    const previsao = preverPreco(rows);
    const result = { historico: rows, previsao };

    cache.set(cacheKey, result, 300); // Cache por 5 minutos

    logger.info(
      `Dashboard gerado para ${marca}-${modelo} com ${rows.length} registros`
    );
    res.json(result);
  } catch (error) {
    logger.error("Erro ao gerar dashboard:", {
      error: error.message,
      marca,
      modelo,
      ano,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Erro ao consultar dados do dashboard.",
    });
  }
});

// Rota para todos os registros
router.get("/todos-registros", async (req, res) => {
  const { limit = 1000, offset = 0 } = req.query;
  const cacheKey = `todos_registros_${limit}_${offset}`;

  try {
    // Verificar cache primeiro
    let cached = cache.get(cacheKey);
    if (cached) {
      logger.info("Todos os registros obtidos do cache");
      return res.json(cached);
    }

    const paramPlaceholder = isProduction
      ? "ORDER BY data_consulta DESC LIMIT $1 OFFSET $2"
      : "ORDER BY data_consulta DESC LIMIT ? OFFSET ?";

    const sql = `SELECT * FROM historico_precos ${paramPlaceholder}`;

    const rows = await executeQuery(sql, [Number(limit), Number(offset)]);
    const result = { registros: rows };
    cache.set(cacheKey, result, 180); // Cache por 3 minutos

    logger.info(
      `${rows.length} registros retornados (limit: ${limit}, offset: ${offset})`
    );
    res.json(result);
  } catch (error) {
    logger.error("Erro ao consultar registros:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: "Erro ao acessar o banco de dados.",
    });
  }
});

// Função para prever preço (regressão linear simples)
function preverPreco(historico) {
  if (!historico || historico.length < 2) return "0.00";

  try {
    const meses = historico.map((_, i) => i + 1);
    const precos = historico
      .map((item) => {
        const precoStr = item.preco
          .replace("R$", "")
          .replace(/\./g, "")
          .replace(",", ".");
        return parseFloat(precoStr) || 0;
      })
      .filter((p) => p > 0);

    if (precos.length < 2) return "0.00";

    const n = Math.min(meses.length, precos.length);
    const somaX = meses.slice(0, n).reduce((a, b) => a + b, 0);
    const somaY = precos.slice(0, n).reduce((a, b) => a + b, 0);
    const somaXY = meses
      .slice(0, n)
      .reduce((sum, x, i) => sum + x * precos[i], 0);
    const somaX2 = meses.slice(0, n).reduce((sum, x) => sum + x * x, 0);

    const denominator = n * somaX2 - somaX * somaX;
    if (denominator === 0) return "0.00";

    const m = (n * somaXY - somaX * somaY) / denominator;
    const b = (somaY - m * somaX) / n;

    const proximoMes = n + 1;
    const precoPrevisto = Math.max(0, m * proximoMes + b); // Não permitir preços negativos

    return precoPrevisto.toFixed(2);
  } catch (error) {
    logger.error("Erro ao calcular previsão:", error);
    return "0.00";
  }
}

module.exports = router;
