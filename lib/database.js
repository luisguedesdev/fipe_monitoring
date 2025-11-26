import db from "./db";
import { validarPrecoFIPE } from "./fipe";
import { isDataValida, parseMoeda } from "./utils";

/**
 * Salva um registro de preço no banco de dados com validações
 */
export async function salvarRegistroPreco(params) {
  const {
    codigoTabelaReferencia,
    codigoTipoVeiculo,
    codigoMarca,
    codigoModelo,
    anoModelo,
    preco,
    codigoTipoCombustivel,
    nomeMarca,
    nomeModelo,
    nomeAno,
    dataConsulta,
  } = params;

  // Validações
  if (!validarPrecoFIPE(preco)) {
    throw new Error(`Preço inválido: ${preco}`);
  }

  if (!isDataValida(dataConsulta)) {
    throw new Error("Data de consulta inválida");
  }

  // Converter preço para número
  const precoNumerico = parseMoeda(preco);
  if (!precoNumerico) {
    throw new Error("Não foi possível converter o preço");
  }

  try {
    const query = `
      INSERT INTO historico_precos (
        codigo_tabela_referencia,
        codigo_tipo_veiculo,
        codigo_marca,
        codigo_modelo,
        ano_modelo,
        preco,
        codigo_tipo_combustivel,
        nome_marca,
        nome_modelo,
        nome_ano,
        data_consulta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, preco, data_consulta
    `;

    const result = await db.query(query, [
      codigoTabelaReferencia,
      codigoTipoVeiculo,
      codigoMarca,
      codigoModelo,
      anoModelo,
      preco,
      codigoTipoCombustivel,
      nomeMarca,
      nomeModelo,
      nomeAno,
      dataConsulta,
    ]);

    if (!result.rows[0]) {
      throw new Error("Falha ao inserir registro");
    }

    return {
      success: true,
      data: result.rows[0],
    };
  } catch (error) {
    console.error("Erro ao salvar registro:", error);
    throw error;
  }
}

/**
 * Remove registros antigos de um veículo específico
 */
export async function limparRegistrosAntigos(params) {
  const { codigoMarca, codigoModelo, anoModelo } = params;

  try {
    const result = await db.query(
      `DELETE FROM historico_precos 
       WHERE codigo_marca = $1 
         AND codigo_modelo = $2 
         AND ano_modelo = $3
       RETURNING id`,
      [codigoMarca, codigoModelo, anoModelo]
    );

    return {
      success: true,
      registrosRemovidos: result.rowCount,
    };
  } catch (error) {
    console.error("Erro ao limpar registros:", error);
    throw error;
  }
}

/**
 * Verifica se já existe registro para uma data específica
 */
export async function verificarRegistroExistente(params) {
  const { codigoMarca, codigoModelo, anoModelo, dataConsulta } = params;

  try {
    const result = await db.query(
      `SELECT id, preco, data_consulta
       FROM historico_precos
       WHERE codigo_marca = $1
         AND codigo_modelo = $2
         AND ano_modelo = $3
         AND DATE_TRUNC('month', data_consulta) = DATE_TRUNC('month', $4)`,
      [codigoMarca, codigoModelo, anoModelo, dataConsulta]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error("Erro ao verificar registro:", error);
    throw error;
  }
}
