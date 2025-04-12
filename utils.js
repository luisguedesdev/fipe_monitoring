// utils.js

/**
 * Extrai o ano e o código do combustível de uma string.
 *
 * Aceita os formatos:
 *  - "2016-3": retorna { anoModelo: "2016", codigoTipoCombustivel: 3 }
 *  - "2016 Diesel": retorna { anoModelo: "2016", codigoTipoCombustivel: 3 }
 *  - "2016 Gasolina": retorna { anoModelo: "2016", codigoTipoCombustivel: 1 }
 *  - Caso contrário, extrai o primeiro ano encontrado e define o código do combustível como 0.
 *
 * @param {string} anoStr - A string que contém o ano e possivelmente o combustível.
 * @returns {object} Objeto contendo as propriedades anoModelo e codigoTipoCombustivel.
 */
function parseAno(anoStr) {
  anoStr = anoStr.trim();
  if (anoStr.includes("-")) {
    // Exemplo: "2016-3"
    const parts = anoStr.split("-");
    return {
      anoModelo: parts[0].trim(),
      codigoTipoCombustivel: Number(parts[1]),
    };
  } else if (/^\d{4}\s+diesel$/i.test(anoStr)) {
    // Exemplo: "2016 Diesel"
    const year = anoStr.match(/^\d{4}/)[0];
    return { anoModelo: year, codigoTipoCombustivel: 3 };
  } else if (/^\d{4}\s+gasolina$/i.test(anoStr)) {
    // Exemplo: "2016 Gasolina"
    const year = anoStr.match(/^\d{4}/)[0];
    return { anoModelo: year, codigoTipoCombustivel: 1 };
  } else {
    // Caso padrão: tenta extrair 4 dígitos
    const match = anoStr.match(/\d{4}/);
    return { anoModelo: match ? match[0] : anoStr, codigoTipoCombustivel: 0 };
  }
}

/**
 * Converte uma string de preço no formato "R$ 174.506,00" para um número.
 *
 * Exemplo:
 *   Input: "R$ 174.506,00"
 *   Output: 174506.00
 *
 * @param {string} precoStr - A string do preço.
 * @returns {number} O preço convertido para número.
 */
function parsePrice(precoStr) {
  let numStr = precoStr.replace("R$", "").trim();
  // Remove os separadores de milhar e substitui a vírgula pelo ponto decimal
  numStr = numStr.replace(/\./g, "").replace(/,/g, ".");
  return parseFloat(numStr);
}

module.exports = {
  parseAno,
  parsePrice,
};
