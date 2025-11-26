/**
 * Utilitários para manipulação de datas
 */

/**
 * Gera um array de datas mensais retroativas
 * @param {number} meses - Quantidade de meses para gerar
 * @returns {Date[]} Array de datas
 */
export function gerarDatasRetroativas(meses) {
  const datas = [];
  const dataAtual = new Date();

  // Ajusta para o primeiro dia do mês
  dataAtual.setDate(1);
  dataAtual.setHours(0, 0, 0, 0);

  for (let i = 0; i < meses; i++) {
    datas.push(new Date(dataAtual));
    dataAtual.setMonth(dataAtual.getMonth() - 1);
  }

  return datas;
}

/**
 * Formata uma data para o formato brasileiro
 */
export function formatarData(data) {
  return data.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
  });
}

/**
 * Verifica se uma data é válida
 */
export function isDataValida(data) {
  return data instanceof Date && !isNaN(data);
}

/**
 * Formata um valor monetário para o formato brasileiro
 */
export function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/**
 * Converte uma string de moeda (R$ 99.999,99) para número
 */
export function parseMoeda(valor) {
  if (!valor) return null;

  // Remove R$, pontos e espaços, troca vírgula por ponto
  const numero = valor
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  return parseFloat(numero);
}
