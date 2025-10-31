const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

console.log("💾 Iniciando backup do banco de dados...\n");

const dataDir = path.join(__dirname, "..", "..", "data");
const backupDir = path.join(__dirname, "..", "..", "backups");
const dbPath = path.join(dataDir, "database.db");

// Criar diretório de backup se não existir
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log("✅ Diretório de backup criado");
}

// Verificar se o banco existe
if (!fs.existsSync(dbPath)) {
  console.log("❌ Banco de dados não encontrado em:", dbPath);
  process.exit(1);
}

// Gerar nome do backup com timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupName = `database_backup_${timestamp}.db`;
const backupPath = path.join(backupDir, backupName);

// Copiar arquivo do banco
try {
  fs.copyFileSync(dbPath, backupPath);
  console.log("✅ Backup criado:", backupName);

  // Mostrar estatísticas do backup
  const stats = fs.statSync(backupPath);
  console.log(
    `📊 Tamanho do backup: ${(stats.size / 1024 / 1024).toFixed(2)} MB`
  );

  // Listar backups existentes
  const backups = fs
    .readdirSync(backupDir)
    .filter(
      (file) => file.startsWith("database_backup_") && file.endsWith(".db")
    )
    .sort()
    .reverse();

  console.log(`\n📁 Backups existentes (${backups.length}):`);
  backups.slice(0, 5).forEach((backup, index) => {
    const backupStats = fs.statSync(path.join(backupDir, backup));
    const date = new Date(backupStats.mtime).toLocaleString("pt-BR");
    const size = (backupStats.size / 1024 / 1024).toFixed(2);
    console.log(`  ${index + 1}. ${backup} (${date}, ${size} MB)`);
  });

  if (backups.length > 5) {
    console.log(`  ... e mais ${backups.length - 5} backup(s)`);
  }

  // Limpar backups antigos (manter apenas os 10 mais recentes)
  if (backups.length > 10) {
    const toDelete = backups.slice(10);
    console.log(`\n🧹 Removendo ${toDelete.length} backup(s) antigo(s):`);
    toDelete.forEach((backup) => {
      fs.unlinkSync(path.join(backupDir, backup));
      console.log(`  ❌ ${backup}`);
    });
  }

  console.log("\n✅ Backup concluído com sucesso!");
} catch (error) {
  console.error("❌ Erro ao criar backup:", error.message);
  process.exit(1);
}
