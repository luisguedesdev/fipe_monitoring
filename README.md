# 💰 Drive Price X

Sistema de monitoramento de preços da Tabela FIPE com histórico de até 24 meses.

## Tecnologias

- **Next.js 14** - Framework React
- **PostgreSQL (Neon)** - Banco de dados serverless
- **Vercel** - Deploy e hospedagem

## Funcionalidades

- ✅ Consulta de preços FIPE atual
- ✅ Histórico de 24 meses (usuários logados)
- ✅ Gráficos de evolução de preços
- ✅ Previsão de tendências
- ✅ Sistema de contas de usuário
- ✅ Painel administrativo

## Instalação

```bash
# Clone o repositório
git clone https://github.com/luisguedesdev/fipe_monitoring.git

# Instale as dependências
npm install

# Configure o .env
cp .env.example .env

# Execute as migrações
npm run migrate

# Inicie o servidor
npm run dev
```

## Deploy

O projeto está configurado para deploy automático na Vercel.

---

Desenvolvido por [Luis Guedes](https://github.com/luisguedesdev)
