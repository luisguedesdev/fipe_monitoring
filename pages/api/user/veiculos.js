import {
  getUserFromRequest,
  getUserVeiculos,
  addUserVeiculo,
  removeUserVeiculo,
} from "../../../lib/auth";

export default async function handler(req, res) {
  const user = getUserFromRequest(req);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Não autenticado",
    });
  }

  // GET - Listar veículos do usuário
  if (req.method === "GET") {
    try {
      const veiculos = await getUserVeiculos(user.id);

      // Processar os dados para incluir variação
      const veiculosProcessados = veiculos.map((v) => {
        const ultimoPrecoNum = v.ultimo_preco
          ? parseFloat(
              v.ultimo_preco
                .replace("R$", "")
                .replace(/\./g, "")
                .replace(",", ".")
                .trim()
            )
          : 0;

        return {
          id: v.id,
          codigoMarca: v.codigo_marca,
          codigoModelo: v.codigo_modelo,
          anoModelo: v.ano_modelo,
          nomeMarca: v.nome_marca,
          nomeModelo: v.nome_modelo,
          nomeAno: v.nome_ano,
          apelido: v.apelido,
          ultimoPreco: v.ultimo_preco,
          ultimoPrecoNum,
          ultimaConsulta: v.ultima_consulta,
          totalRegistros: parseInt(v.total_registros) || 0,
          adicionadoEm: v.created_at,
        };
      });

      return res.json({
        success: true,
        veiculos: veiculosProcessados,
      });
    } catch (error) {
      console.error("Erro ao buscar veículos:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // POST - Adicionar veículo à lista do usuário
  if (req.method === "POST") {
    // Aceitar tanto camelCase quanto snake_case
    const codigoMarca = req.body.codigoMarca || req.body.codigo_marca;
    const codigoModelo = req.body.codigoModelo || req.body.codigo_modelo;
    const anoModelo = req.body.anoModelo || req.body.ano_modelo;
    const nomeMarca = req.body.nomeMarca || req.body.nome_marca;
    const nomeModelo = req.body.nomeModelo || req.body.nome_modelo;
    const nomeAno = req.body.nomeAno || req.body.nome_ano;
    const apelido = req.body.apelido;

    if (!codigoMarca || !codigoModelo || !anoModelo) {
      return res.status(400).json({
        success: false,
        error: "Dados do veículo incompletos",
      });
    }

    try {
      const result = await addUserVeiculo(user.id, {
        codigoMarca,
        codigoModelo,
        anoModelo,
        nomeMarca,
        nomeModelo,
        nomeAno,
        apelido,
      });

      return res.json({
        success: true,
        message: result
          ? "Veículo adicionado à sua lista"
          : "Veículo já está na sua lista",
      });
    } catch (error) {
      console.error("Erro ao adicionar veículo:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // DELETE - Remover veículo da lista do usuário
  if (req.method === "DELETE") {
    // Aceitar tanto camelCase quanto snake_case
    const codigoMarca = req.body.codigoMarca || req.body.codigo_marca;
    const codigoModelo = req.body.codigoModelo || req.body.codigo_modelo;
    const anoModelo = req.body.anoModelo || req.body.ano_modelo;

    if (!codigoMarca || !codigoModelo || !anoModelo) {
      return res.status(400).json({
        success: false,
        error: "Dados do veículo incompletos",
      });
    }

    try {
      await removeUserVeiculo(user.id, codigoMarca, codigoModelo, anoModelo);

      return res.json({
        success: true,
        message: "Veículo removido da sua lista",
      });
    } catch (error) {
      console.error("Erro ao remover veículo:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
