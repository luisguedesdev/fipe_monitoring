# 🚗 FIPE Monitor

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=for-the-badge&logo=postgresql)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-black?style=for-the-badge&logo=vercel)

**Sistema completo de monitoramento de preços da Tabela FIPE com histórico de até 24 meses**

[Demo](https://fipe-monitoring.vercel.app) • [Reportar Bug](https://github.com/luisguedesdev/fipe_monitoring/issues) • [Solicitar Feature](https://github.com/luisguedesdev/fipe_monitoring/issues)

</div>

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Screenshots](#-screenshots)
- [Tecnologias](#-tecnologias)
- [Arquitetura](#-arquitetura)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Deploy](#-deploy)
- [API Reference](#-api-reference)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## 🎯 Sobre o Projeto

O **FIPE Monitor** é uma aplicação web que permite consultar e acompanhar a evolução dos preços de veículos na Tabela FIPE ao longo do tempo. Com ele, você pode:

- Consultar o preço atual de qualquer veículo
- Visualizar o histórico de preços dos últimos 24 meses
- Analisar tendências de valorização ou desvalorização
- Comparar diferentes períodos (6, 12 ou 24 meses)
- Receber previsões baseadas em tendências históricas

### Por que usar?

🔍 **Compra inteligente**: Saiba se o veículo está valorizado ou desvalorizado antes de comprar

📉 **Análise de mercado**: Acompanhe as tendências do mercado automotivo

💰 **Negociação**: Tenha dados concretos para negociar o preço do seu veículo

📊 **Histórico completo**: Visualize a evolução de preços em gráficos interativos

---

## ✨ Funcionalidades

### 🔎 Consulta de Veículos

- Seleção em 4 etapas: **Marca → Modelo → Versão → Ano**
- Suporte a todas as marcas e modelos da Tabela FIPE
- Busca automática de histórico de 24 meses

### 📊 Dashboard de Resultados

- Preço atual com variação percentual
- Gráfico interativo de evolução de preços
- Estatísticas: preço mínimo, máximo e médio
- Previsão de preços para 3 e 6 meses
- Tabela detalhada com histórico mensal

### 📋 Gerenciamento de Veículos

- Lista de todos os veículos monitorados
- Filtro e ordenação por diversos critérios
- Exclusão de veículos da base
- Resumo com totais e estatísticas

### 🎨 Interface Moderna

- Design responsivo (mobile-first)
- Tema escuro elegante
- Animações suaves
- Indicadores visuais de tendência

---

## 📸 Screenshots

### Página Inicial - Seleção de Veículo

```text
┌─────────────────────────────────────────┐
│  🚗 FIPE Monitor                        │
│  ────────────────────────────────────   │
│  ① Marca:    [Ford           ▼]         │
│  ② Modelo:   [Ranger         ▼]         │
│  ③ Versão:   [Limited 3.2... ▼]         │
│  ④ Ano:      [2014 Diesel    ▼]         │
│                                         │
│  [🔍 Consultar e Armazenar]             │
└─────────────────────────────────────────┘
```

### Página de Resultado

```text
┌─────────────────────────────────────────┐
│  Ford Ranger Limited 3.2                │
│  2014 Diesel                            │
│  ────────────────────────────────────   │
│  Preço FIPE: R$ 107.120,00  (+7.12%)    │
│                                         │
│  📈 [Gráfico de Evolução]               │
│                                         │
│  📊 Estatísticas:                       │
│  • Mínimo: R$ 100.000   • Máximo: R$110k│
│  • Média:  R$ 105.000   • Var: +0.30%/m │
└─────────────────────────────────────────┘
```

---

## 🛠 Tecnologias

### Frontend

| Tecnologia  | Versão | Descrição               |
| ----------- | ------ | ----------------------- |
| Next.js     | 14.x   | Framework React com SSR |
| React       | 18.x   | Biblioteca de UI        |
| Chart.js    | 4.x    | Gráficos interativos    |
| CSS Modules | -      | Estilos com escopo      |

### Backend

| Tecnologia         | Versão | Descrição         |
| ------------------ | ------ | ----------------- |
| Next.js API Routes | 14.x   | API serverless    |
| Axios              | 1.x    | Cliente HTTP      |
| pg                 | 8.x    | Driver PostgreSQL |

### Infraestrutura

| Serviço        | Descrição                            |
| -------------- | ------------------------------------ |
| Vercel         | Hospedagem e deploy                  |
| Neon           | Banco de dados PostgreSQL serverless |
| Parallelum API | API de dados FIPE                    |

---

## 🏗 Arquitetura

```text
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  index  │  │resultado│  │  todos  │  │dashboard│        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
└───────┼────────────┼────────────┼────────────┼──────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API ROUTES (Next.js)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ /marcas  │ │/modelos  │ │/consultar│ │/veiculos │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
└───────┼────────────┼────────────┼────────────┼──────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────┐    ┌─────────────────────┐
│   Parallelum API    │    │   PostgreSQL (Neon) │
│   (Dados FIPE)      │    │   (Histórico)       │
└─────────────────────┘    └─────────────────────┘
```

---

## 🚀 Instalação

### Pré-requisitos

- Node.js 18.x ou superior
- npm ou yarn
- Conta no [Neon](https://neon.tech) (banco de dados)

### Passo a passo

1. **Clone o repositório**

```bash
git clone https://github.com/luisguedesdev/fipe_monitoring.git
cd fipe_monitoring
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**

```bash
cp .env.example .env
```

4. **Execute as migrações**

```bash
npm run migrate
```

5. **Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

6. **Acesse a aplicação**

```text
http://localhost:3000
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de dados PostgreSQL (Neon)
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require
```

### Obtendo a DATABASE_URL

1. Acesse [neon.tech](https://neon.tech) e crie uma conta
2. Crie um novo projeto
3. Copie a connection string em **Dashboard → Connection Details**
4. Cole no seu arquivo `.env`

---

## 🌐 Deploy

### Deploy na Vercel (Recomendado)

1. **Conecte o repositório**

   - Acesse [vercel.com](https://vercel.com)
   - Importe o projeto do GitHub

2. **Configure as variáveis de ambiente**

   - Vá em **Settings → Environment Variables**
   - Adicione `DATABASE_URL` com sua connection string

3. **Deploy automático**
   - Cada push na branch `main` dispara um novo deploy

### Deploy manual

```bash
# Instale a CLI da Vercel
npm i -g vercel

# Faça login
vercel login

# Deploy
vercel --prod
```

---

## 📚 API Reference

### Marcas

```http
GET /api/marcas
```

**Resposta:**

```json
[
  { "Label": "Ford", "Value": "22" },
  { "Label": "Chevrolet", "Value": "23" }
]
```

### Modelos Agrupados

```http
GET /api/modelos-agrupados/{marcaId}
```

**Parâmetros:**

| Parâmetro | Tipo   | Descrição   |
| --------- | ------ | ----------- |
| marcaId   | string | ID da marca |

**Resposta:**

```json
{
  "modelosBase": [
    {
      "Label": "Ranger",
      "Value": "Ranger",
      "totalVersoes": 88,
      "versoes": [
        {
          "codigo": 10741,
          "nome": "Ranger Limited 3.2...",
          "versao": "Limited 3.2..."
        }
      ]
    }
  ]
}
```

### Anos do Modelo

```http
GET /api/anos/{marcaId}/{modeloId}
```

**Resposta:**

```json
[
  { "Label": "2024 Diesel", "Value": "2024-3" },
  { "Label": "2023 Diesel", "Value": "2023-3" }
]
```

### Consultar e Salvar

```http
POST /api/consultar-salvar
```

**Body:**

```json
{
  "marcaId": "22",
  "modeloId": "10741",
  "anoId": "2014-3",
  "meses": 24
}
```

**Resposta:**

```json
{
  "success": true,
  "registrosSalvos": 24,
  "registrosSimulados": 23,
  "taxaSucesso": "100.00%"
}
```

### Histórico do Veículo

```http
GET /api/historico-veiculo?marca={marca}&modelo={modelo}&ano={ano}&meses={meses}
```

**Resposta:**

```json
{
  "success": true,
  "veiculo": {
    "marca": "Ford",
    "modelo": "Ranger Limited 3.2...",
    "ano": "2014 Diesel"
  },
  "historico": [
    {
      "preco": "R$ 107.120,00",
      "preco_numerico": 107120,
      "data_consulta": "2025-11-01"
    }
  ]
}
```

### Listar Veículos

```http
GET /api/veiculos
```

**Resposta:**

```json
{
  "success": true,
  "veiculos": [...],
  "totalVeiculos": 3
}
```

### Deletar Veículo

```http
DELETE /api/veiculos/deletar
```

**Body:**

```json
{
  "codigoMarca": "22",
  "codigoModelo": "10741",
  "anoModelo": "2014-3"
}
```

---

## 📁 Estrutura do Projeto

```text
fipe_monitoring/
├── 📂 pages/
│   ├── 📂 api/
│   │   ├── 📂 anos/
│   │   │   └── [marca]/
│   │   │       └── [modelo].js    # GET anos disponíveis
│   │   ├── 📂 modelos/
│   │   │   └── [marca].js         # GET modelos da marca
│   │   ├── 📂 modelos-agrupados/
│   │   │   └── [marca].js         # GET modelos agrupados
│   │   ├── 📂 veiculos/
│   │   │   └── deletar.js         # DELETE veículo
│   │   ├── consultar-salvar.js    # POST consulta FIPE
│   │   ├── historico-veiculo.js   # GET histórico
│   │   ├── marcas.js              # GET marcas
│   │   └── veiculos.js            # GET veículos salvos
│   ├── _app.js                    # App wrapper
│   ├── index.js                   # Página inicial
│   ├── resultado.js               # Resultado da consulta
│   ├── todos.js                   # Lista de veículos
│   └── dashboard.js               # Dashboard
│
├── 📂 lib/
│   ├── db.js                      # Conexão PostgreSQL
│   ├── fipe.js                    # Integração FIPE API
│   └── utils.js                   # Funções utilitárias
│
├── 📂 styles/
│   ├── globals.css                # Estilos globais
│   ├── Home.module.css            # Estilos página inicial
│   ├── Resultado.module.css       # Estilos resultado
│   ├── Todos.module.css           # Estilos lista
│   └── Dashboard.module.css       # Estilos dashboard
│
├── 📂 migrations/
│   ├── migrate.js                 # Script de migração
│   └── *.sql                      # Arquivos SQL
│
├── 📄 .env.example                # Exemplo de variáveis
├── 📄 next.config.js              # Configuração Next.js
├── 📄 vercel.json                 # Configuração Vercel
├── 📄 package.json                # Dependências
└── 📄 README.md                   # Documentação
```

---

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Commit

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação
- `refactor:` Refatoração
- `test:` Testes
- `chore:` Manutenção

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

**Luis Guedes**

[![GitHub](https://img.shields.io/badge/GitHub-luisguedesdev-181717?style=flat-square&logo=github)](https://github.com/luisguedesdev)

---

<div align="center">

⭐ **Se este projeto te ajudou, considere dar uma estrela!** ⭐

</div>
