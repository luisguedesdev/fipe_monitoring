#!/bin/bash

echo "🚀 Setup FIPE Monitoring com Neon"
echo "=================================="

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "   Copie .env.example para .env e configure as variáveis"
    exit 1
fi

# Verificar se DATABASE_URL está configurada
if grep -q "\[YOUR_NEON" .env; then
    echo "⚠️  DATABASE_URL ainda não configurada!"
    echo ""
    echo "📋 Para configurar o Neon:"
    echo "1. Acesse https://neon.tech"
    echo "2. Crie um novo projeto"
    echo "3. Vá para 'Connection Details'"
    echo "4. Copie a connection string"
    echo "5. Atualize DATABASE_URL no .env"
    echo ""
    echo "Exemplo:"
    echo "DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require"
    exit 1
fi

echo "✅ DATABASE_URL configurada"

# Verificar dependências
echo ""
echo "📦 Verificando dependências..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado!"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado!"
    exit 1
fi

echo "✅ Node.js e npm encontrados"

# Instalar dependências se node_modules não existir
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📥 Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Falha ao instalar dependências"
        exit 1
    fi
    echo "✅ Dependências instaladas"
else
    echo "✅ Dependências já instaladas"
fi

# Testar conexão com Neon
echo ""
echo "🧪 Testando conexão com Neon..."
node test-neon.js
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Setup concluído com sucesso!"
    echo ""
    echo "🚀 Para iniciar o servidor:"
    echo "   npm run dev"
    echo ""
    echo "🌐 A aplicação estará disponível em:"
    echo "   http://localhost:3000"
    echo ""
    echo "📊 Para testar a API:"
    echo "   curl http://localhost:3000/api/db-health"
else
    echo ""
    echo "❌ Falha na conexão com Neon"
    echo "   Verifique se:"
    echo "   - O projeto Neon está ativo"
    echo "   - A DATABASE_URL está correta"
    echo "   - Você executou o script neon_setup.sql no Neon"
    exit 1
fi