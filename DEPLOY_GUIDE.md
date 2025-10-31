# 🚀 GUIA COMPLETO DE DEPLOY - Vercel + Supabase

## 📋 PASSO 1: Configurar Supabase

### 1.1 Criar Conta e Projeto

1. Acesse <https://supabase.com>
2. Faça login/cadastro
3. Clique em "New Project"
4. Escolha organização e nome do projeto
5. Defina senha do banco (ANOTE ESTA SENHA!)
6. Escolha região (preferencialmente próxima ao Brasil)
7. Aguarde criação (2-3 minutos)

### 1.2 Configurar Banco de Dados

1. No dashboard do Supabase, vá em "SQL Editor"
2. Cole e execute o script `supabase_setup.sql` deste projeto
3. Verifique se as tabelas foram criadas em "Table Editor"

### 1.3 Obter Credenciais

1. Vá em "Settings" → "Database"
2. Copie a "Connection string" (URI)
3. Substitua `[YOUR-PASSWORD]` pela senha definida na criação

Exemplo da URI:

```
postgresql://postgres:[SUA-SENHA]@db.exemplo.supabase.co:5432/postgres
```

## 📋 PASSO 2: Preparar Projeto para Deploy

### 2.1 Verificar Estrutura

Certifique-se que seu projeto tem esta estrutura:

```
fipe_monitoring/
├── api/
│   └── index.js
├── backend/
│   ├── app.js
│   ├── routes.js
│   ├── db.js
│   └── ... outros arquivos
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   └── ... outros arquivos
├── package.json (raiz)
├── vercel.json
└── .env.example
```

### 2.2 Testar Localmente (Opcional)

```bash
# Instalar dependências
npm install

# Copiar .env
cp .env.example .env

# Editar .env com suas credenciais do Supabase
nano .env

# Testar
npm run dev
```

## 📋 PASSO 3: Deploy na Vercel

### 3.1 Preparar Repositório Git

```bash
# Se ainda não é um repositório git
git init
git add .
git commit -m "Preparar para deploy na Vercel"

# Push para GitHub/GitLab/Bitbucket
# (crie um repositório remoto primeiro)
git remote add origin https://github.com/SEU-USUARIO/fipe-monitoring.git
git push -u origin main
```

### 3.2 Deploy na Vercel

#### Opção A: Via Dashboard Web

1. Acesse <https://vercel.com>
2. Faça login com GitHub/GitLab/Bitbucket
3. Clique "New Project"
4. Importe o repositório `fipe-monitoring`
5. Configure conforme abaixo

#### Opção B: Via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Seguir instruções interativas
```

### 3.3 Configurar Variáveis de Ambiente na Vercel

No dashboard da Vercel, vá em:
`Settings` → `Environment Variables`

Adicione estas variáveis:

```
NODE_ENV=production
DATABASE_URL=postgresql://postgres:[SUA-SENHA]@db.exemplo.supabase.co:5432/postgres
FIPE_BASE_URL=https://veiculos.fipe.org.br/api/veiculos
REQUEST_TIMEOUT=30000
MAX_RETRIES=3
CACHE_TTL=300000
ENABLE_CACHE=true
LOG_LEVEL=info
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
VERCEL=true
```

### 3.4 Configurações Avançadas da Vercel

Em `Settings` → `Functions`:

- Maximum Duration: 30 seconds
- Memory: 1024 MB (recomendado)

## 📋 PASSO 4: Verificar Deploy

### 4.1 Endpoints para Testar

Após o deploy, teste estes endpoints:

```bash
# Health check
curl https://seu-projeto.vercel.app/health

# API básica
curl https://seu-projeto.vercel.app/api/marcas

# Interface
# Acesse https://seu-projeto.vercel.app no navegador
```

### 4.2 Monitorar Logs

- Vercel Dashboard → Functions → View Function Logs
- Supabase Dashboard → Logs

## 🔧 PASSO 5: Troubleshooting

### Problema: Erro de Conexão com Banco

```bash
# Verificar se DATABASE_URL está correta
# Verificar se IP da Vercel está liberado no Supabase (geralmente já está)
```

### Problema: Timeout nas Funções

```bash
# Aumentar timeout no vercel.json:
"functions": {
  "api/index.js": {
    "maxDuration": 60
  }
}
```

### Problema: Erro 404 nas Rotas

```bash
# Verificar vercel.json
# Verificar se api/index.js está exportando app corretamente
```

## 📊 PASSO 6: Otimizações Pós-Deploy

### 6.1 Configurar Domínio Customizado

1. Vercel Dashboard → Settings → Domains
2. Adicionar seu domínio
3. Configurar DNS conforme instruções

### 6.2 Configurar Backup Automático

No Supabase:

1. Dashboard → Settings → Backup
2. Ativar backups automáticos

### 6.3 Monitoramento

Configurar alertas em:

- Vercel (uso de banda, erros)
- Supabase (uso do banco, conexões)

## ✅ CHECKLIST FINAL

- [ ] Supabase configurado e tabelas criadas
- [ ] Código adaptado para PostgreSQL
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado na Vercel
- [ ] Endpoints testados e funcionando
- [ ] Interface web acessível
- [ ] Logs verificados
- [ ] Backup configurado

## 🔗 Links Úteis

- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [PostgreSQL Node.js](https://node-postgres.com/)

## 🆘 Suporte

Se encontrar problemas:

1. Verifique logs na Vercel e Supabase
2. Teste endpoints individualmente
3. Verifique variáveis de ambiente
4. Consulte documentação oficial

---

**🎉 Parabéns! Seu projeto FIPE Monitoring está agora rodando na nuvem!**
