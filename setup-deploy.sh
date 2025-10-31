#!/bin/bash

echo "🚀 FIPE Monitoring - Setup para Deploy na Vercel"
echo "================================================"
echo ""

# Verificar se estamos na raiz do projeto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script na raiz do projeto (onde está o package.json)"
    exit 1
fi

echo "📦 Instalando dependências..."
npm install

echo ""
echo "📁 Verificando estrutura do projeto..."

# Verificar arquivos essenciais
files=("vercel.json" "api/index.js" "backend/app.js" "frontend/index.html")
missing_files=()

for file in "${files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo "✅ Estrutura do projeto OK"
else
    echo "❌ Arquivos faltando:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

echo ""
echo "🔧 Configurando ambiente..."

# Copiar .env se não existir
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "📄 Arquivo .env criado - CONFIGURE SUAS VARIÁVEIS!"
    echo ""
    echo "Variáveis importantes para configurar:"
    echo "- DATABASE_URL (string de conexão do Supabase)"
    echo "- NODE_ENV=production (para deploy)"
    echo ""
else
    echo "📄 Arquivo .env já existe"
fi

echo ""
echo "🔍 Verificando dependências..."

# Verificar se todas as dependências estão instaladas
if npm list --depth=0 >/dev/null 2>&1; then
    echo "✅ Dependências OK"
else
    echo "⚠️  Algumas dependências podem estar faltando"
    echo "Execute: npm install"
fi

echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. 🗄️  Configurar Supabase:"
echo "   - Acesse https://supabase.com"
echo "   - Crie um novo projeto"
echo "   - Execute o script supabase_setup.sql no SQL Editor"
echo "   - Copie a connection string"
echo ""
echo "2. ⚙️  Configurar .env:"
echo "   - Edite o arquivo .env"
echo "   - Adicione sua DATABASE_URL do Supabase"
echo "   - Configure outras variáveis se necessário"
echo ""
echo "3. 🧪 Testar localmente (opcional):"
echo "   - npm run dev"
echo "   - Acesse http://localhost:3000"
echo ""
echo "4. 🚀 Deploy na Vercel:"
echo "   - Faça push para GitHub/GitLab"
echo "   - Conecte repositório na Vercel"
echo "   - Configure as mesmas variáveis de ambiente"
echo ""
echo "📖 Para instruções detalhadas, consulte DEPLOY_GUIDE.md"
echo ""
echo "✨ Setup concluído! Boa sorte com seu deploy!"