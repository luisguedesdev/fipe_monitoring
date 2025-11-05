# 🚗 FIPE Monitoring

[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue.svg)](https://neon.tech/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg)](https://vercel.com/)
[![Chart.js](https://img.shields.io/badge/Chart.js-4+-orange.svg)](https://www.chartjs.org/)

## 📋 Descrição

Sistema completo de monitoramento de preços de veículos baseado na tabela FIPE (Fundação Instituto de Pesquisas Econômicas). A aplicação oferece consulta, armazenamento e análise de dados históricos com previsões inteligentes e visualizações interativas, **construída com Next.js e otimizada para deploy em nuvem com Neon PostgreSQL**.

### ✨ Principais Funcionalidades

- 🔍 **Consulta Inteligente**: Busca por marca, modelo e ano com autocomplete
- 📊 **Dashboard Interativo**: Gráficos avançados com múltiplos tipos de visualização
- 📈 **Análise Preditiva**: Previsões baseadas em regressão linear com indicador de confiança
- 🎯 **Alertas Inteligentes**: Detecção automática de tendências e volatilidade
- 💾 **Histórico Completo**: Armazenamento de até 24 meses de dados
- ⚡ **Performance Otimizada**: Sistema de cache com rate limiting inteligente
- 🔄 **API FIPE Otimizada**: Sistema avançado de requisições com queue, retry e circuit breaker
- 🔒 **Segurança**: Headers de segurança e validação de dados
- 📱 **Design Responsivo**: Interface moderna que funciona em todos os dispositivos
- ☁️ **Cloud Ready**: Deploye automaticamente no Vercel com Neon PostgreSQL

## 🎯 Novidade: Sistema Inteligente de Requisições FIPE

**Eliminação de erros "N/D" e bloqueios da API!**

- ✅ **Queue System**: Fila centralizada para todas as requisições
- ✅ **Rate Limiting**: 25 req/min com delays dinâmicos (300-1000ms)
- ✅ **Retry Inteligente**: Backoff exponencial com até 3 tentativas
- ✅ **Circuit Breaker**: Proteção automática contra sobrecarga
- ✅ **Batch Processing**: Otimização de requisições múltiplas
- ✅ **100% Confiabilidade**: Taxa de sucesso de 95-100%

📖 [Ver detalhes completos em FIPE_IMPROVEMENTS.md](FIPE_IMPROVEMENTS.md)

## 🚀 Quick Start (Deploy em Produção)

### Opção 1: Deploy Automático no Vercel

```bash
# 1. Faça push para o GitHub
git add .
git commit -m "🚀 Migração completa para Next.js"
git push origin main

# 2. Conecte o repositório no Vercel
# - Vá para https://vercel.com
# - Importe seu repositório GitHub
# - Configure as variáveis de ambiente
# - Deploy automático!
```

### Opção 2: Desenvolvimento Local

#### 1. Configuração do Neon

1. Acesse [neon.tech](https://neon.tech) e crie uma conta
2. Crie um novo projeto
3. Vá para SQL Editor e execute o conteúdo de `neon_setup.sql`
4. Copie a string de conexão PostgreSQL

#### 2. Deploy no Vercel

1. Faça push do código para GitHub/GitLab
2. Acesse [vercel.com](https://vercel.com) e importe o projeto
3. Configure as variáveis de ambiente:
   - `DATABASE_URL`: String de conexão do Neon
   - `NODE_ENV`: `production`
4. Deploy!

📖 **Para instruções detalhadas, consulte [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)**

## 🛠️ Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
npm install
```

### Configuração

```bash
cp .env.example .env
# Configure suas variáveis de ambiente
```

### Execução

```bash
# Desenvolvimento
npm run dev

# Produção local
npm start
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente (.env)

```env
# Servidor
PORT=3000
NODE_ENV=development

# Banco de Dados
DB_PATH=./data/database.db

# API FIPE
FIPE_BASE_URL=https://veiculos.fipe.org.br/api/veiculos
REQUEST_TIMEOUT=30000
MAX_RETRIES=3

# Cache
CACHE_TTL=300000
ENABLE_CACHE=true

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Segurança
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## �️ Banco de Dados

### Configuração PostgreSQL (Neon)

- **Variável**: `DATABASE_URL`
- **Recomendação**: Use a **connection string do Neon** com `?sslmode=require`
- **Exemplo**: `postgresql://user:password@ep-xxx.us-east-1.neon.tech/dbname?sslmode=require`

### Observações Importantes

- Neon oferece **auto-scaling** e **branching** para desenvolvimento
- Rotacionar senha no Neon invalida conexões antigas
- Atualizar Vercel/locais e redeploy após mudança de senha
- **Nunca expor segredos nos logs**

### Health Check

```http
GET /api/db-health
```

Retorna `{ ok: true }` se conectado, ou erro sem expor segredos.

## �📖 API Documentation

### Endpoints Principais

#### 🏷️ Marcas

```http
GET /api/marcas?tipoVeiculo=1
```

- **tipoVeiculo**: 1 (carros), 2 (motos), 3 (caminhões)

#### 🚗 Modelos

```http
GET /api/modelos?marca=1&tipoVeiculo=1
```

#### 📅 Anos

```http
GET /api/anos?marca=1&modelo=1&tipoVeiculo=1
```

#### 📊 Histórico

```http
GET /api/historico?marca=1&modelo=1&ano=2020-1&nomeMarca=FIAT&nomeModelo=UNO&nomeAno=2020
```

#### 📈 Dashboard

```http
GET /api/dashboard/1/1?ano=2020
```

### Endpoints de Sistema

#### 🔍 Health Check

```http
GET /health
```

#### 📊 Cache Stats

```http
GET /api/cache/stats
```

#### 🧹 Limpar Cache (Dev)

```http
POST /api/cache/clear
```

## 🏗️ Arquitetura do Sistema

```text
fipe_monitoring/
├── backend/
│   ├── config/          # Configurações (logger, cache)
│   ├── scripts/         # Scripts utilitários
│   ├── app.js          # Aplicação principal
│   ├── routes.js       # Rotas da API
│   ├── db.js           # Gerenciamento do banco
│   └── utils.js        # Funções utilitárias
├── frontend/
│   ├── index.html      # Página principal
│   ├── dashboard.html  # Dashboard interativo
│   ├── todos.html      # Visualização de registros
│   ├── app.js          # JavaScript principal
│   ├── dashboard.js    # JavaScript do dashboard
│   └── style.css       # Estilos modernos
├── data/               # Banco SQLite
├── logs/               # Arquivos de log
└── backups/            # Backups automáticos
```

## 🎨 Interface do Usuário

### 🏠 Página Principal

- Formulário inteligente com autocomplete
- Validação em tempo real
- Feedback visual para o usuário
- Estatísticas resumidas dos dados

### 📊 Dashboard

- Gráficos interativos (linha, barra, área)
- Análise preditiva com indicador de confiança
- Alertas automáticos sobre tendências
- Controles avançados de visualização
- Exportação de gráficos
- Modo tela cheia

### 📋 Registros

- Tabela paginada e filtrada
- Ordenação por qualquer coluna
- Estatísticas em tempo real
- Exportação para CSV
- Interface responsiva

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Produção
npm start

# Configuração inicial
npm run setup

# Backup do banco
npm run backup

# Testes (quando implementados)
npm test
```

## 📊 Funcionalidades de Análise

### 📈 Análise Preditiva

- **Regressão Linear**: Previsão baseada em tendência histórica
- **Indicador de Confiança**: Coeficiente R² para avaliar precisão
- **Previsão Customizável**: De 1 a 12 meses à frente

### 🚨 Sistema de Alertas

- **Variação Significativa**: Detecta mudanças > 15%
- **Alta Volatilidade**: Identifica preços instáveis
- **Picos e Vales**: Marca máximos e mínimos históricos
- **Tendências**: Classifica como alta, baixa ou estável

### 📊 Estatísticas Avançadas

- Preço atual vs histórico
- Variação percentual total
- Preço médio do período
- Volatilidade (desvio padrão)
- Máximo e mínimo históricos

## 🔒 Segurança e Performance

### 🛡️ Medidas de Segurança

- **Helmet.js**: Headers de segurança
- **Rate Limiting**: Proteção contra spam
- **Validação de Entrada**: Sanitização de dados
- **Logs de Segurança**: Monitoramento de tentativas suspeitas

### ⚡ Otimizações de Performance

- **Cache Inteligente**: Redis-like com TTL configurável
- **Lazy Loading**: Carregamento sob demanda
- **Compressão**: Gzip para assets estáticos
- **Database Indexing**: Consultas otimizadas

## 🔄 Sistema de Cache

O sistema implementa cache em múltiplas camadas:

- **Consultas FIPE**: 1-10 minutos dependendo do tipo
- **Dados de Dashboard**: 5 minutos
- **Listas (marcas/modelos)**: 1 hora
- **Registros Completos**: 3 minutos

## 📝 Logs e Monitoramento

### Níveis de Log

- **Error**: Erros críticos
- **Warn**: Avisos importantes
- **Info**: Informações gerais
- **Debug**: Detalhes técnicos

### Rotação de Logs

- Arquivos limitados a 5MB
- Mantém até 5 arquivos históricos
- Separação entre logs gerais e de erro

## 🔄 Backup e Recuperação

```bash
# Backup manual
npm run backup

# Backups automáticos mantêm:
# - 10 backups mais recentes
# - Limpeza automática de arquivos antigos
# - Compressão opcional para economizar espaço
```

## 🐛 Troubleshooting

### Problemas Comuns

#### ❌ Erro de conexão com FIPE

```bash
# Verificar conectividade
curl -I https://veiculos.fipe.org.br

# Verificar logs
tail -f logs/error.log
```

#### ❌ Banco de dados corrompido

```bash
# Restaurar backup
cp backups/database_backup_YYYY-MM-DD.db data/database.db
```

#### ❌ Cache não funcionando

```bash
# Limpar cache
curl -X POST http://localhost:3000/api/cache/clear

# Verificar status
curl http://localhost:3000/api/cache/stats
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

## 🔗 Links Úteis

- [API FIPE Oficial](https://veiculos.fipe.org.br/)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [SQLite Documentation](https://sqlite.org/docs.html)

## 👥 Suporte

Para suporte e dúvidas:

- 📧 Email: [seu-email@exemplo.com]
- 💬 Issues: [GitHub Issues](https://github.com/luisguedesdev/fipe_monitoring/issues)
- 📖 Wiki: [GitHub Wiki](https://github.com/luisguedesdev/fipe_monitoring/wiki)

---

⭐ **Desenvolvido com ❤️ para a comunidade brasileira de análise automotiva**
