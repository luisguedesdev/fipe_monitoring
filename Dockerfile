# Utiliza uma imagem Node.js leve
FROM node:14-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia o package.json e instala as dependências
COPY package.json .
RUN npm install

# Copia o restante dos arquivos do projeto
COPY . .

# Comando para iniciar o aplicativo
CMD ["npm", "start"]
