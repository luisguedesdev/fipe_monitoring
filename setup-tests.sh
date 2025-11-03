#!/bin/bash

echo "🧪 FIPE Monitoring - Configuração do Ambiente de Testes"
echo "======================================================"
echo ""

# Verificar se estamos na raiz do projeto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script na raiz do projeto (onde está o package.json)"
    exit 1
fi

echo "📦 Instalando dependências de teste..."
npm install

echo ""
echo "🔧 Configurando ambiente de teste..."

# Criar diretório de dados de teste se não existir
mkdir -p backend/data

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "📄 Arquivo .env criado baseado no .env.example"
    else
        echo "📄 Criando .env básico para testes..."
        cat > .env << EOF
NODE_ENV=development
PORT=3000
DATABASE_URL=
FIPE_BASE_URL=https://parallelum.com.br/fipe/api/v1
REQUEST_TIMEOUT=30000
MAX_RETRIES=3
CACHE_TTL=300000
ENABLE_CACHE=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_FILE=./logs/app.log
EOF
    fi
fi

echo ""
echo "🗄️  Executando migrations..."
npm run migrate

echo ""
echo "🧪 Executando testes do banco de dados..."
npm run test:db

echo ""
echo "📋 COMANDOS DISPONÍVEIS:"
echo ""
echo "🧪 Testes:"
echo "  npm test              - Executar todos os testes"
echo "  npm run test:db       - Testar apenas banco de dados"
echo "  npm run test:api      - Testar apenas API (servidor deve estar rodando)"
echo ""
echo "🗄️  Migrations:"
echo "  npm run migrate              - Executar migrations pendentes"
echo "  npm run migrate:status       - Ver status das migrations"
echo "  npm run migrate:create <nome> - Criar nova migration"
echo "  npm run migrate:rollback <arquivo> - Desfazer migration"
echo ""
echo "🚀 Servidor:"
echo "  npm run dev          - Servidor desenvolvimento"
echo "  npm start            - Servidor produção"
echo ""
echo "✨ Configuração concluída!"
echo ""
echo "Para testar a API completa:"
echo "1. Execute: npm run dev (em outro terminal)"
echo "2. Execute: npm run test:api"
echo "3. Ou execute: npm test (para todos os testes)"