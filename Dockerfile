# Dockerfile
FROM node:18-slim

WORKDIR /usr/src/app

# Copia os arquivos de dependências e instala as dependências
COPY package*.json ./
RUN npm install

# Copia o restante dos arquivos do projeto
COPY . .

# Cria a pasta para persistência do SQLite
RUN mkdir -p data

EXPOSE 3000

# Usa nodemon para reinicializar automaticamente a aplicação
CMD ["npx", "nodemon", "app.js"]
