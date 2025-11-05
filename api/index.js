// Ponto de entrada principal para Vercel
const path = require("path");

// Carregar variáveis de ambiente PRIMEIRO
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Configurar path para encontrar os módulos do backend
const backendPath = path.join(__dirname, "..", "backend");
process.chdir(backendPath);

// Importar a aplicação Express
const app = require("../backend/app");

// Exportar para Vercel
module.exports = app;

// Para desenvolvimento local
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
}
