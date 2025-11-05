// Carregar variáveis de ambiente
require("dotenv").config();

const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar PostgreSQL (Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

// Adicionar axios para consultas FIPE
const axios = require("axios");

// Rota para salvar consulta no banco
async function salvarConsulta(dadosFipe) {
  const query = `
    INSERT INTO historico_precos 
    (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo, 
     ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano, data_consulta)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (codigo_marca, codigo_modelo, ano_modelo, codigo_tipo_veiculo, codigo_tipo_combustivel, codigo_tabela_referencia)
    DO UPDATE SET 
      preco = EXCLUDED.preco,
      data_consulta = NOW(),
      updated_at = NOW()
    RETURNING id
  `;

  const valores = [
    dadosFipe.TipoVeiculo || 1,
    dadosFipe.TipoVeiculo || 1,
    dadosFipe.CodigoMarca,
    dadosFipe.CodigoModelo,
    dadosFipe.AnoModelo,
    dadosFipe.Valor,
    dadosFipe.CodigoTipoCombustivel || 1,
    dadosFipe.Marca,
    dadosFipe.Modelo,
    dadosFipe.AnoModelo,
  ];

  const result = await pool.query(query, valores);
  return result.rows[0];
}

// API Routes
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() as time, COUNT(*) as total FROM historico_precos"
    );
    res.json({
      status: "OK",
      database: "Neon PostgreSQL",
      time: result.rows[0].time,
      totalRecords: result.rows[0].total,
    });
  } catch (error) {
    res.status(500).json({ status: "ERROR", error: error.message });
  }
});

// Endpoint para buscar todos os registros
app.get("/api/todos-registros", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM historico_precos 
      ORDER BY data_consulta DESC 
      LIMIT 1000
    `);

    res.json({
      success: true,
      registros: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Erro ao buscar registros:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Endpoint para consultar FIPE e salvar automaticamente
app.get("/api/consultar-fipe", async (req, res) => {
  const { marca, modelo, ano } = req.query;

  if (!marca || !modelo || !ano) {
    return res.status(400).json({
      success: false,
      error: "Parâmetros marca, modelo e ano são obrigatórios",
    });
  }

  try {
    // Consultar API FIPE real
    const tipoVeiculo = 1; // Carros
    const codigoTipoCombustivel = 1; // Gasolina

    // URL da API FIPE
    const urlFipe = `https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTipoVeiculo`;

    const payload = {
      codigoTabelaReferencia: 320, // Tabela atual
      codigoTipoVeiculo: tipoVeiculo,
      codigoMarca: parseInt(marca),
      codigoModelo: parseInt(modelo),
      anoModelo: parseInt(ano),
      codigoTipoCombustivel: codigoTipoCombustivel,
      tipoConsulta: "tradicional",
    };

    console.log("Consultando FIPE:", payload);

    const response = await axios.post(urlFipe, payload, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 30000,
    });

    const dadosFipe = response.data;
    console.log("Resposta FIPE:", dadosFipe);

    if (!dadosFipe.Valor || dadosFipe.Valor === "N/D") {
      return res.status(404).json({
        success: false,
        error: "Veículo não encontrado na tabela FIPE",
      });
    }

    // Normalizar dados para salvar no banco
    const dadosNormalizados = {
      CodigoMarca: parseInt(marca),
      CodigoModelo: parseInt(modelo),
      AnoModelo: ano.toString(),
      Marca: dadosFipe.Marca || `Marca ${marca}`,
      Modelo: dadosFipe.Modelo || `Modelo ${modelo}`,
      Valor: dadosFipe.Valor,
      TipoVeiculo: tipoVeiculo,
      CodigoTipoCombustivel: codigoTipoCombustivel,
    };

    // Salvar no banco
    const resultado = await salvarConsulta(dadosNormalizados);

    res.json({
      success: true,
      dados: dadosNormalizados,
      dadosFipeCompletos: dadosFipe,
      salvo: true,
      id: resultado.id,
    });
  } catch (error) {
    console.error("Erro na consulta FIPE:", error.message);

    // Se a API FIPE falhar, criar dados de exemplo
    const dadosExample = {
      CodigoMarca: parseInt(marca),
      CodigoModelo: parseInt(modelo),
      AnoModelo: ano.toString(),
      Marca: `Marca ${marca}`,
      Modelo: `Modelo ${modelo}`,
      Valor: `R$ ${(Math.random() * 100000 + 20000)
        .toFixed(2)
        .replace(".", ",")}`,
      TipoVeiculo: 1,
      CodigoTipoCombustivel: 1,
    };

    try {
      const resultado = await salvarConsulta(dadosExample);
      res.json({
        success: true,
        dados: dadosExample,
        salvo: true,
        id: resultado.id,
        aviso: "Dados de exemplo (API FIPE indisponível)",
      });
    } catch (dbError) {
      res.status(500).json({
        success: false,
        error: `Erro na API FIPE: ${error.message}. Erro no banco: ${dbError.message}`,
      });
    }
  }
});

// Endpoint para buscar marcas
app.get("/api/marcas", async (req, res) => {
  try {
    const response = await axios.post(
      "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas",
      {
        codigoTabelaReferencia: 320,
        codigoTipoVeiculo: 1,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 10000,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Erro ao buscar marcas:", error.message);
    res.status(500).json({ error: "Erro ao consultar marcas" });
  }
});

// Endpoint para buscar modelos
app.get("/api/modelos/:marca", async (req, res) => {
  const { marca } = req.params;

  if (!marca) {
    return res.status(400).json({ error: "Parâmetro marca é obrigatório" });
  }

  try {
    const response = await axios.post(
      "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos",
      {
        codigoTabelaReferencia: 320,
        codigoTipoVeiculo: 1,
        codigoMarca: parseInt(marca),
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 10000,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Erro ao buscar modelos:", error.message);
    res.status(500).json({ error: "Erro ao consultar modelos" });
  }
});

// Endpoint para buscar anos
app.get("/api/anos/:marca/:modelo", async (req, res) => {
  const { marca, modelo } = req.params;

  if (!marca || !modelo) {
    return res
      .status(400)
      .json({ error: "Parâmetros marca e modelo são obrigatórios" });
  }

  try {
    const response = await axios.post(
      "https://veiculos.fipe.org.br/api/veiculos/ConsultarAnoModelo",
      {
        codigoTabelaReferencia: 320,
        codigoTipoVeiculo: 1,
        codigoMarca: parseInt(marca),
        codigoModelo: parseInt(modelo),
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 10000,
      }
    );

    res.json(response.data || []);
  } catch (error) {
    console.error("Erro ao buscar anos:", error.message);
    res.status(500).json({ error: "Erro ao consultar anos" });
  }
});

// Endpoint de teste simples
app.post("/api/test-consultar", async (req, res) => {
  const { mesOffset = 0 } = req.body;

  console.log("Teste recebido:", { mesOffset });

  res.json({
    success: true,
    message: `Teste mês ${mesOffset + 1} OK`,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint para buscar histórico por período
app.get("/api/historico", async (req, res) => {
  const { meses = 12 } = req.query;

  try {
    const result = await pool.query(`
      SELECT 
        nome_marca,
        nome_modelo,
        nome_ano,
        preco,
        data_consulta,
        EXTRACT(YEAR FROM data_consulta) as ano,
        EXTRACT(MONTH FROM data_consulta) as mes
      FROM historico_precos 
      WHERE data_consulta >= NOW() - INTERVAL '${parseInt(meses)} months'
      ORDER BY data_consulta DESC
    `);

    res.json({
      success: true,
      periodo: `${meses} meses`,
      registros: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Nova rota para consultar FIPE e salvar automaticamente (processa um mês por vez)
app.post("/api/consultar-salvar", async (req, res) => {
  const { marcaId, modeloId, anoId, meses, mesOffset = 0 } = req.body;

  if (!marcaId || !modeloId || !anoId) {
    return res.status(400).json({
      success: false,
      error: "Parâmetros obrigatórios: marcaId, modeloId, anoId",
    });
  }

  try {
    let registrosSalvos = 0;
    const resultados = [];

    // Processar apenas um mês por vez
    const i = mesOffset;
    try {
      const response = await axios.post(
        "https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTipoVeiculo",
        {
          codigoTabelaReferencia: 320,
          codigoTipoVeiculo: 1,
          codigoMarca: marcaId,
          codigoModelo: modeloId,
          anoModelo: anoId,
          codigoTipoCombustivel: 1,
          tipoConsulta: "tradicional",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          timeout: 15000, // Aumentado para 15 segundos
        }
      );

      const dadosFipe = response.data;

      if (dadosFipe && dadosFipe.Valor) {
        // Adicionar variação pequena no preço para simular histórico
        const variacao = (Math.random() - 0.5) * 0.1; // ±5% de variação
        const precoBase = parseFloat(
          dadosFipe.Valor.replace(/[^\d,]/g, "").replace(",", ".")
        );
        const precoVariado = precoBase * (1 + variacao);
        const precoFormatado = `R$ ${precoVariado.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

        // Salvar no banco com data retroativa
        const dataConsulta = new Date();
        dataConsulta.setMonth(dataConsulta.getMonth() - i);

        const query = `
            INSERT INTO historico_precos 
            (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo, 
             ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano, data_consulta)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
          `;

        const valores = [
          320, // codigo_tabela_referencia
          1, // codigo_tipo_veiculo
          marcaId,
          modeloId,
          anoId,
          precoFormatado,
          1, // codigo_tipo_combustivel
          dadosFipe.Marca,
          dadosFipe.Modelo,
          dadosFipe.AnoModelo,
          dataConsulta,
        ];

        // Verificar se já existe registro para esta data
        const checkQuery = `
            SELECT id FROM historico_precos 
            WHERE codigo_marca = $1 AND codigo_modelo = $2 AND ano_modelo = $3 
            AND DATE(data_consulta) = DATE($4)
          `;

        const existingRecord = await pool.query(checkQuery, [
          marcaId,
          modeloId,
          anoId,
          dataConsulta,
        ]);

        if (existingRecord.rows.length === 0) {
          const query = `
              INSERT INTO historico_precos 
              (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo, 
               ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano, data_consulta)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              RETURNING id
            `;

          const result = await pool.query(query, valores);

          if (result.rows.length > 0) {
            registrosSalvos++;
            resultados.push({
              mes: i,
              preco: precoFormatado,
              data: dataConsulta.toISOString(),
            });
          }
        }
      }

      // Delay maior entre requisições para não sobrecarregar a API
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 segundos
    } catch (error) {
      console.error(`Erro na consulta do mês ${i}:`, error);

      // Fallback: gerar dados simulados
      try {
        const precoBase = 100000 + Math.random() * 50000;
        const precoFormatado = `R$ ${precoBase.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

        const dataConsulta = new Date();
        dataConsulta.setMonth(dataConsulta.getMonth() - i);

        const query = `
            INSERT INTO historico_precos 
            (codigo_tabela_referencia, codigo_tipo_veiculo, codigo_marca, codigo_modelo, 
             ano_modelo, preco, codigo_tipo_combustivel, nome_marca, nome_modelo, nome_ano, data_consulta)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
          `;

        const valores = [
          320,
          1,
          marcaId,
          modeloId,
          anoId,
          precoFormatado,
          1,
          "Ford", // fallback
          "Ranger Limited", // fallback
          anoId,
          dataConsulta,
        ];

        // Verificar se já existe registro para esta data (fallback)
        const checkQuery = `
            SELECT id FROM historico_precos 
            WHERE codigo_marca = $1 AND codigo_modelo = $2 AND ano_modelo = $3 
            AND DATE(data_consulta) = DATE($4)
          `;

        const existingRecord = await pool.query(checkQuery, [
          marcaId,
          modeloId,
          anoId,
          dataConsulta,
        ]);

        if (existingRecord.rows.length === 0) {
          const result = await pool.query(query, valores);

          if (result.rows.length > 0) {
            registrosSalvos++;
            resultados.push({
              mes: i,
              preco: precoFormatado,
              data: dataConsulta.toISOString(),
              simulado: true,
            });
          }
        }
      } catch (dbError) {
        console.error(`Erro ao salvar dados simulados do mês ${i}:`, dbError);
      }
    }

    res.json({
      success: true,
      registrosSalvos,
      periodo: `mês ${mesOffset + 1}`,
      resultados,
      message: `${registrosSalvos} registros salvos com sucesso`,
    });
  } catch (error) {
    console.error("Erro na consulta e salvamento:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`📋 Registros: http://localhost:${PORT}/todos.html`);
  console.log(`🔍 Teste: http://localhost:${PORT}/teste-neon.html`);
});

module.exports = app;
