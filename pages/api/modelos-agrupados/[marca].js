import { getTabelaReferencia, getModelos } from "../../../lib/fipe";

// Função para extrair o nome base do modelo (ex: "Ranger" de "Ranger Limited 3.2 4x4 CD Diesel Aut.")
function extrairNomeBase(nomeCompleto) {
  const palavras = nomeCompleto.split(" ");

  // Lista de palavras que indicam o início da versão
  const palavrasVersao = [
    "GL",
    "GLX",
    "GLS",
    "SE",
    "SEL",
    "XL",
    "XLS",
    "XLT",
    "LX",
    "EX",
    "EXL",
    "DX",
    "Limited",
    "Titanium",
    "Platinum",
    "Freestyle",
    "Storm",
    "Raptor",
    "Black",
    "Sport",
    "Style",
    "Plus",
    "Premium",
    "Advance",
    "Advanced",
    "1.0",
    "1.2",
    "1.3",
    "1.4",
    "1.5",
    "1.6",
    "1.8",
    "2.0",
    "2.2",
    "2.3",
    "2.4",
    "2.5",
    "2.7",
    "2.8",
    "3.0",
    "3.2",
    "3.5",
    "3.6",
    "3.8",
    "3.9",
    "4.0",
    "4.2",
    "4.9",
    "5.0",
    "V6",
    "V8",
    "16V",
    "8V",
    "12V",
    "20V",
    "24V",
    "4x2",
    "4x4",
    "AWD",
    "FWD",
    "CD",
    "CS",
    "CE",
    "Flex",
    "Diesel",
    "Gasolina",
    "TB",
    "TDCI",
    "Turbo",
    "TDI",
    "Aut",
    "Aut.",
    "Mec",
    "Mec.",
    "8v",
    "16v",
    "i",
    "MPI",
    "EcoBoost",
    "TiVCT",
    "GTDI",
    "LTZ",
    "LT",
    "LS",
    "Premier",
    "High",
    "Country",
    "Midnight",
  ];

  let nomeBase = [];
  for (const palavra of palavras) {
    if (
      palavrasVersao.some((v) =>
        palavra.toUpperCase().startsWith(v.toUpperCase())
      ) ||
      /^\d/.test(palavra)
    ) {
      break;
    }
    nomeBase.push(palavra);
  }

  if (nomeBase.length === 0) {
    nomeBase = [palavras[0]];
  }

  return nomeBase.join(" ");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { marca } = req.query;

  if (!marca) {
    return res.status(400).json({ error: "Parâmetro marca é obrigatório" });
  }

  try {
    // Obter tabela de referência mais recente
    const tabela = await getTabelaReferencia();

    // Buscar modelos da API oficial FIPE
    const todosModelos = await getModelos(tabela.Codigo, marca, 1);

    // Agrupar modelos por nome base
    const modelosAgrupados = {};

    for (const modelo of todosModelos) {
      const nomeBase = extrairNomeBase(modelo.Label);

      if (!modelosAgrupados[nomeBase]) {
        modelosAgrupados[nomeBase] = {
          nomeBase,
          versoes: [],
        };
      }

      modelosAgrupados[nomeBase].versoes.push({
        codigo: modelo.Value,
        nome: modelo.Label,
        versao: modelo.Label.replace(nomeBase, "").trim() || modelo.Label,
      });
    }

    // Converter para array e ordenar
    const modelosBase = Object.values(modelosAgrupados)
      .map((grupo) => ({
        Label: grupo.nomeBase,
        Value: grupo.nomeBase,
        totalVersoes: grupo.versoes.length,
        versoes: grupo.versoes.sort((a, b) => a.nome.localeCompare(b.nome)),
      }))
      .sort((a, b) => a.Label.localeCompare(b.Label));

    res.status(200).json({
      modelosBase,
      totalModelos: todosModelos.length,
      totalModelosBase: modelosBase.length,
    });
  } catch (error) {
    console.error("Erro ao buscar modelos agrupados:", error);
    res.status(500).json({ error: "Erro ao consultar modelos da FIPE" });
  }
}
