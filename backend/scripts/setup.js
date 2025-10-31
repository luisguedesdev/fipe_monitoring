const fs = require("fs");
const path = require("path");

console.log("🚀 Configurando ambiente FIPE Monitoring...\n");

// Criar diretórios necessários
const dirs = ["data", "logs", "config"];

dirs.forEach((dir) => {
  const dirPath = path.join(__dirname, "..", dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Diretório criado: ${dir}`);
  } else {
    console.log(`📁 Diretório já existe: ${dir}`);
  }
});

// Copiar .env.example para .env se não existir
const envExample = path.join(__dirname, "..", "..", ".env.example");
const envFile = path.join(__dirname, "..", "..", ".env");

if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
  fs.copyFileSync(envExample, envFile);
  console.log("✅ Arquivo .env criado baseado no .env.example");
} else if (fs.existsSync(envFile)) {
  console.log("📄 Arquivo .env já existe");
} else {
  console.log("⚠️  Arquivo .env.example não encontrado");
}

// Verificar dependências críticas
console.log("\n🔍 Verificando dependências...");

const requiredDeps = [
  "express",
  "sqlite3",
  "axios",
  "winston",
  "helmet",
  "express-rate-limit",
];

const packageJson = require("../package.json");
const installedDeps = Object.keys(packageJson.dependencies || {});

const missingDeps = requiredDeps.filter((dep) => !installedDeps.includes(dep));

if (missingDeps.length > 0) {
  console.log("❌ Dependências faltando:", missingDeps.join(", "));
  console.log("Execute: npm install");
} else {
  console.log("✅ Todas as dependências estão instaladas");
}

console.log("\n🎯 Configuração completa!");
console.log("\nPróximos passos:");
console.log("1. Verifique/edite o arquivo .env conforme necessário");
console.log("2. Execute: npm run dev (para desenvolvimento)");
console.log("3. Execute: npm start (para produção)");
console.log("4. Acesse: http://localhost:3000");

console.log("\nEndpoints disponíveis:");
console.log("- GET  /health - Status da aplicação");
console.log("- GET  /api/cache/stats - Estatísticas do cache");
console.log("- POST /api/cache/clear - Limpar cache (dev only)");
console.log("- GET  /api/marcas - Listar marcas");
console.log("- GET  /api/modelos - Listar modelos");
console.log("- GET  /api/anos - Listar anos");
console.log("- GET  /api/historico - Obter histórico de preços");
console.log("- GET  /api/dashboard/:marca/:modelo - Dashboard de veículo");
console.log("- GET  /api/todos-registros - Todos os registros");
