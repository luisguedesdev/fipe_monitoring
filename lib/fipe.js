import axios from "axios";

/**
 * API FIPE OFICIAL
 * Consulta diretamente a API oficial da Fundação FIPE
 * https://veiculos.fipe.org.br/
 */

const FIPE_API = {
  BASE_URL: "https://veiculos.fipe.org.br/api/veiculos",
  TIPOS: {
    1: "carro",
    2: "moto",
    3: "caminhao",
  },
};

// Cache de tabelas de referência
let tabelasCache = null;
let tabelasCacheTime = 0;
const CACHE_DURATION = 3600000; // 1 hora

// Delay padrão entre requisições (ms)
const REQUEST_DELAY = 1000;

/**
 * Faz uma requisição POST para a API oficial da FIPE
 */
async function fipeRequest(endpoint, data = {}, retries = 3) {
  const url = `${FIPE_API.BASE_URL}/${endpoint}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        const delayTime = 2000 * attempt;
        console.log(
          `⏳ Aguardando ${delayTime / 1000}s antes da tentativa ${attempt}...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayTime));
      }

      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        params.append(key, String(value));
      });

      const response = await axios.post(url, params.toString(), {
        timeout: 30000,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: "https://veiculos.fipe.org.br/",
          Origin: "https://veiculos.fipe.org.br",
        },
      });

      if (response.status === 200 && response.data) {
        // Verificar se retornou erro
        if (response.data.erro) {
          throw new Error(response.data.erro);
        }
        return response.data;
      }

      throw new Error(`Status inválido: ${response.status}`);
    } catch (error) {
      console.error(
        `❌ Tentativa ${attempt}/${retries} falhou:`,
        error.message
      );

      if (attempt === retries) {
        throw new Error(`Falha após ${retries} tentativas: ${error.message}`);
      }
    }
  }
}

/**
 * Delay entre requisições para evitar bloqueio
 */
async function delay(ms = REQUEST_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Obtém as tabelas de referência da FIPE (meses disponíveis)
 */
export async function getTabelasReferencia() {
  // Usar cache se disponível
  if (tabelasCache && Date.now() - tabelasCacheTime < CACHE_DURATION) {
    return tabelasCache;
  }

  console.log("📋 Buscando tabelas de referência da FIPE oficial...");

  const tabelas = await fipeRequest("ConsultarTabelaDeReferencia");

  // Ordenar por código (mais recente primeiro)
  tabelas.sort((a, b) => b.Codigo - a.Codigo);

  tabelasCache = tabelas;
  tabelasCacheTime = Date.now();

  console.log(
    `✅ ${tabelas.length} tabelas encontradas. Mais recente: ${tabelas[0].Mes}`
  );
  return tabelas;
}

/**
 * Obtém a tabela de referência mais recente
 */
export async function getTabelaReferencia() {
  const tabelas = await getTabelasReferencia();
  return tabelas[0];
}

/**
 * Obtém tabela por índice (0 = mais recente, 1 = mês anterior, etc)
 */
export async function getTabelaPorMes(mesesAtras = 0) {
  const tabelas = await getTabelasReferencia();
  if (mesesAtras >= tabelas.length) {
    return tabelas[tabelas.length - 1];
  }
  return tabelas[mesesAtras];
}

/**
 * Consulta as marcas disponíveis
 */
export async function getMarcas(codigoTabelaReferencia, tipoVeiculo = 1) {
  console.log(`🚗 Buscando marcas...`);

  const tabela = codigoTabelaReferencia || (await getTabelaReferencia()).Codigo;

  const marcas = await fipeRequest("ConsultarMarcas", {
    codigoTabelaReferencia: tabela,
    codigoTipoVeiculo: tipoVeiculo,
  });

  return marcas.map((m) => ({
    Label: m.Label,
    Value: m.Value,
  }));
}

/**
 * Consulta os modelos de uma marca
 */
export async function getModelos(
  codigoTabelaReferencia,
  codigoMarca,
  tipoVeiculo = 1
) {
  console.log(`📋 Buscando modelos da marca ${codigoMarca}...`);

  const tabela = codigoTabelaReferencia || (await getTabelaReferencia()).Codigo;

  const resultado = await fipeRequest("ConsultarModelos", {
    codigoTabelaReferencia: tabela,
    codigoTipoVeiculo: tipoVeiculo,
    codigoMarca,
  });

  return (resultado.Modelos || []).map((m) => ({
    Label: m.Label,
    Value: m.Value,
  }));
}

/**
 * Consulta os anos de um modelo
 */
export async function getAnos(
  codigoTabelaReferencia,
  codigoMarca,
  codigoModelo,
  tipoVeiculo = 1
) {
  console.log(`📅 Buscando anos do modelo ${codigoModelo}...`);

  const tabela = codigoTabelaReferencia || (await getTabelaReferencia()).Codigo;

  const anos = await fipeRequest("ConsultarAnoModelo", {
    codigoTabelaReferencia: tabela,
    codigoTipoVeiculo: tipoVeiculo,
    codigoMarca,
    codigoModelo,
  });

  return anos.map((a) => ({
    Label: a.Label,
    Value: a.Value,
  }));
}

/**
 * Extrai ano e código de combustível do formato "2014-3"
 */
function parseAnoModelo(anoModelo) {
  if (typeof anoModelo === "string" && anoModelo.includes("-")) {
    const [ano, combustivel] = anoModelo.split("-");
    return {
      ano: ano,
      codigoTipoCombustivel: combustivel,
    };
  }
  return {
    ano: String(anoModelo),
    codigoTipoCombustivel: "1", // Gasolina como padrão
  };
}

/**
 * Consulta o preço de um veículo específico na API oficial da FIPE
 * Esta é a função principal que retorna o preço REAL da FIPE
 */
export async function consultarPreco(
  codigoTabelaReferencia,
  codigoMarca,
  codigoModelo,
  anoModelo,
  tipoVeiculo = 1
) {
  const { ano, codigoTipoCombustivel } = parseAnoModelo(anoModelo);

  console.log(
    `💰 Consultando FIPE oficial: Tabela ${codigoTabelaReferencia}, Marca ${codigoMarca}, Modelo ${codigoModelo}, Ano ${ano}, Combustível ${codigoTipoCombustivel}`
  );

  try {
    const resultado = await fipeRequest("ConsultarValorComTodosParametros", {
      codigoTabelaReferencia,
      codigoTipoVeiculo: tipoVeiculo,
      codigoMarca,
      codigoModelo,
      ano,
      anoModelo: ano,
      codigoTipoCombustivel,
      tipoVeiculo: FIPE_API.TIPOS[tipoVeiculo] || "carro",
      modeloCodigoExterno: "",
      tipoConsulta: "tradicional",
    });

    console.log(
      `✅ Preço FIPE: ${resultado.Valor} (${resultado.MesReferencia})`
    );

    return {
      success: true,
      preco: resultado.Valor,
      marca: resultado.Marca,
      modelo: resultado.Modelo,
      anoModelo: resultado.AnoModelo,
      combustivel: resultado.Combustivel,
      mesReferencia: resultado.MesReferencia,
      codigoFipe: resultado.CodigoFipe,
      siglaCombustivel: resultado.SiglaCombustivel,
      tipoVeiculo: resultado.TipoVeiculo,
      autenticacao: resultado.Autenticacao,
      dataConsulta: resultado.DataConsulta,
      fonte: "fipe_oficial",
    };
  } catch (error) {
    console.error(`❌ Erro ao consultar FIPE: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Consulta preço atual (tabela mais recente)
 */
export async function consultarPrecoAtual(
  codigoMarca,
  codigoModelo,
  anoModelo,
  tipoVeiculo = 1
) {
  const tabelaAtual = await getTabelaReferencia();

  console.log(
    `🔍 Consultando preço atual (${tabelaAtual.Mes}) para marca ${codigoMarca}, modelo ${codigoModelo}, ano ${anoModelo}`
  );

  return consultarPreco(
    tabelaAtual.Codigo,
    codigoMarca,
    codigoModelo,
    anoModelo,
    tipoVeiculo
  );
}

/**
 * Consulta preço com tabela de referência específica
 */
export async function consultarPrecoComFallback(params, mesIndex = 0) {
  const {
    codigoTabelaReferencia,
    codigoTipoVeiculo = 1,
    codigoMarca,
    codigoModelo,
    anoModelo,
  } = params;

  // Se não foi fornecida tabela de referência, usar a do mês especificado
  let tabela = codigoTabelaReferencia;
  if (!tabela) {
    const tabelaMes = await getTabelaPorMes(mesIndex);
    tabela = tabelaMes.Codigo;
  }

  return consultarPreco(
    tabela,
    codigoMarca,
    codigoModelo,
    anoModelo,
    codigoTipoVeiculo
  );
}

/**
 * Converte preço em string para número
 */
export function parsePreco(precoStr) {
  if (!precoStr) return 0;
  const limpo = precoStr.replace(/[R$\s.]/g, "").replace(",", ".");
  return parseFloat(limpo) || 0;
}

/**
 * Formata número para preço FIPE
 */
export function formatarPreco(valor) {
  return `R$ ${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Valida se um preço FIPE está em formato válido
 */
export function validarPrecoFIPE(preco) {
  if (!preco) return false;
  const regex = /^R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}$/;
  return regex.test(preco.trim());
}

// Exporta constantes e delay
export const FIPE = {
  TIPOS: FIPE_API.TIPOS,
  delay,
};
