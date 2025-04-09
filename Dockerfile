# Imagem base do Node.js (versão 18-slim)
FROM node:18-slim

WORKDIR /usr/src/app

# Copia os arquivos de dependências e instala as dependências
COPY package*.json ./
RUN npm install

# Copia o restante dos arquivos do projeto (incluindo front end e back end)
COPY . .

# Cria a pasta para persistência do SQLite
RUN mkdir -p data

EXPOSE 3000

CMD ["npm", "start"]
