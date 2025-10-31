// Ponto de entrada principal para as APIs na Vercel
const path = require("path");

// Configurar path para encontrar os módulos do backend
const backendPath = path.join(__dirname, "..", "backend");
process.chdir(backendPath);

// Carregar variáveis de ambiente
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Importar a aplicação Express
const app = require("../backend/app");

module.exports = app;
