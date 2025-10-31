const logger = require("./config/logger");

/**
 * Parse do ano e combustível da string retornada pela API FIPE
 * @param {string} anoStr - String no formato "2020-1" ou "2020 Gasolina"
 * @returns {object} - {anoModelo, codigoTipoCombustivel}
 */
function parseAno(anoStr) {
  if (!anoStr || typeof anoStr !== "string") {
    logger.warn("parseAno: string inválida recebida:", anoStr);
    return { anoModelo: "", codigoTipoCombustivel: 0 };
  }

  anoStr = anoStr.trim();

  // Formato: "2020-1"
  if (anoStr.includes("-")) {
    const parts = anoStr.split("-");
    return {
      anoModelo: parts[0].trim(),
      codigoTipoCombustivel: Number(parts[1]) || 0,
    };
  }
  // Formato: "2020 Diesel"
  else if (/^\d{4}\s+diesel$/i.test(anoStr)) {
    const year = anoStr.match(/^\d{4}/)[0];
    return { anoModelo: year, codigoTipoCombustivel: 3 };
  }
  // Formato: "2020 Gasolina"
  else if (/^\d{4}\s+gasolina$/i.test(anoStr)) {
    const year = anoStr.match(/^\d{4}/)[0];
    return { anoModelo: year, codigoTipoCombustivel: 1 };
  }
  // Formato: "2020 Etanol"
  else if (/^\d{4}\s+etanol$/i.test(anoStr)) {
    const year = anoStr.match(/^\d{4}/)[0];
    return { anoModelo: year, codigoTipoCombustivel: 2 };
  }
  // Formato: "2020 Flex"
  else if (/^\d{4}\s+flex$/i.test(anoStr)) {
    const year = anoStr.match(/^\d{4}/)[0];
    return { anoModelo: year, codigoTipoCombustivel: 1 }; // Flex é tratado como gasolina
  }
  // Apenas o ano
  else {
    const match = anoStr.match(/\d{4}/);
    return {
      anoModelo: match ? match[0] : anoStr,
      codigoTipoCombustivel: 0,
    };
  }
}

/**
 * Converte uma string de preço no formato "R$ 174.506,00" para número
 * @param {string} precoStr - String do preço
 * @returns {number} - Valor numérico
 */
function parsePrice(precoStr) {
  if (!precoStr || typeof precoStr !== "string") {
    return 0;
  }

  // Remove R$, espaços e converte pontos/vírgulas
  let numStr = precoStr.replace(/R\$\s*/g, "").trim();

  // Se tem vírgula, é o separador decimal brasileiro
  if (numStr.includes(",")) {
    // Remove pontos (separadores de milhar) e troca vírgula por ponto
    numStr = numStr.replace(/\./g, "").replace(/,/g, ".");
  }

  const result = parseFloat(numStr) || 0;

  if (isNaN(result)) {
    logger.warn("parsePrice: não foi possível converter preço:", precoStr);
    return 0;
  }

  return result;
}

/**
 * Formata um número como preço brasileiro
 * @param {number} value - Valor numérico
 * @returns {string} - Preço formatado
 */
function formatPrice(value) {
  if (typeof value !== "number" || isNaN(value)) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Valida parâmetros básicos para consultas FIPE
 * @param {object} params - Parâmetros a validar
 * @returns {object} - {valid: boolean, errors: string[]}
 */
function validateFipeParams(params) {
  const errors = [];
  const { marca, modelo, tipoVeiculo } = params;

  if (marca !== undefined) {
    const marcaNum = Number(marca);
    if (isNaN(marcaNum) || marcaNum <= 0) {
      errors.push("Marca deve ser um número positivo");
    }
  }

  if (modelo !== undefined) {
    const modeloNum = Number(modelo);
    if (isNaN(modeloNum) || modeloNum <= 0) {
      errors.push("Modelo deve ser um número positivo");
    }
  }

  if (tipoVeiculo !== undefined) {
    const tipoNum = Number(tipoVeiculo);
    if (![1, 2, 3].includes(tipoNum)) {
      errors.push(
        "Tipo de veículo deve ser 1 (carros), 2 (motos) ou 3 (caminhões)"
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitiza string para log (remove caracteres especiais)
 * @param {string} str - String a sanitizar
 * @returns {string} - String sanitizada
 */
function sanitizeForLog(str) {
  if (typeof str !== "string") return String(str);

  return str.replace(/[\x00-\x1f\x7f-\x9f]/g, "").trim();
}

/**
 * Calcula estatísticas básicas de um array de números
 * @param {number[]} numbers - Array de números
 * @returns {object} - Estatísticas calculadas
 */
function calculateStats(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return {
      count: 0,
      sum: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
    };
  }

  const validNumbers = numbers.filter(
    (n) => typeof n === "number" && !isNaN(n)
  );

  if (validNumbers.length === 0) {
    return {
      count: 0,
      sum: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
    };
  }

  const count = validNumbers.length;
  const sum = validNumbers.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const min = Math.min(...validNumbers);
  const max = Math.max(...validNumbers);

  // Mediana
  const sorted = validNumbers.slice().sort((a, b) => a - b);
  const median =
    count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];

  // Desvio padrão
  const variance =
    validNumbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  return {
    count,
    sum,
    min,
    max,
    mean,
    median,
    stdDev,
  };
}

/**
 * Debounce function para limitar chamadas de função
 * @param {Function} func - Função a ser executada
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} - Função com debounce
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Sleep/delay function
 * @param {number} ms - Milissegundos para aguardar
 * @returns {Promise} - Promise que resolve após o tempo especificado
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function para tentar executar uma função várias vezes
 * @param {Function} fn - Função a executar
 * @param {number} retries - Número de tentativas
 * @param {number} delay - Delay entre tentativas em ms
 * @returns {Promise} - Promise com o resultado
 */
async function retry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      logger.warn(`Tentativa ${i + 1}/${retries} falhou:`, error.message);

      if (i === retries - 1) {
        throw error;
      }

      if (delay > 0) {
        await sleep(delay * Math.pow(2, i)); // Backoff exponencial
      }
    }
  }
}

module.exports = {
  parseAno,
  parsePrice,
  formatPrice,
  validateFipeParams,
  sanitizeForLog,
  calculateStats,
  debounce,
  sleep,
  retry,
};
