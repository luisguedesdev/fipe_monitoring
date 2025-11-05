# 🚀 Deploy FIPE Monitoring na Vercel

## ✅ Verificações Pré-Deploy

### 1. Variáveis de Ambiente na Vercel

Acesse [Vercel Dashboard](https://vercel.com/dashboard) → Seu Projeto → Settings → Environment Variables

Adicione estas variáveis:

```
DATABASE_URL=postgresql://[YOUR_NEON_CONNECTION_STRING]
NODE_ENV=production
VERCEL=1
LOG_LEVEL=info
CACHE_TTL=300
ENABLE_CACHE=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
FIPE_BASE_URL=https://veiculos.fipe.org.br/api/veiculos
REQUEST_TIMEOUT=30000
MAX_RETRIES=3
```

### 2. Banco de Dados Neon

- Certifique-se que o Neon está configurado e acessível
- Execute as migrações se necessário:
  ```bash
  npm run migrate
  ```

### 3. Deploy

```bash
# Conectar com Vercel CLI
vercel login

# Deploy
vercel --prod

# Ou conectar o repositório GitHub para deploy automático
```

## 🔧 Arquivos Ajustados para Vercel

- ✅ `vercel.json` - Configurado para serverless functions
- ✅ `api/index.js` - Ponto de entrada otimizado
- ✅ `backend/app.js` - Ajustado para serverless
- ✅ `package.json` - Scripts e configurações atualizadas
- ✅ `.vercelignore` - Otimizado para deploy rápido
- ✅ Logger e cache ajustados para serverless

## 🎯 URLs Após Deploy

- **Frontend**: `https://your-project.vercel.app`
- **API Health**: `https://your-project.vercel.app/api/health`
- **Dashboard**: `https://your-project.vercel.app/dashboard.html`

## 🐛 Troubleshooting

### Erro: "Cannot find module"

- Verifique se todas as dependências estão no `package.json`
- Execute `npm install` localmente

### Erro: "Database connection failed"

- Verifique a `DATABASE_URL` na Vercel
- Certifique-se que o Neon permite conexões externas

### Erro: "Function timeout"

- Aumente `maxDuration` no `vercel.json` se necessário
- Otimize queries do banco de dados

## 📊 Monitoramento

Após o deploy, monitore:

- Logs da Vercel no dashboard
- Health check endpoint
- Performance das functions

🎉 **Deploy concluído com sucesso!**
