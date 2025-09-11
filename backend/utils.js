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

// Converte uma string de preço no formato "R$ 174.506,00" para número (ex.: 174506.00)
function parsePrice(precoStr) {
  let numStr = precoStr.replace("R$", "").trim();
  numStr = numStr.replace(/\./g, "").replace(/,/g, ".");
  return parseFloat(numStr);
}

module.exports = {
  parseAno,
  parsePrice,
};
