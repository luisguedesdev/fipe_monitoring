// app.js - Backend
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public")); // Serve os arquivos do front-end presentes na pasta public

// Importa o módulo de rotas (routes.js)
const routes = require("./routes");

// Monta todas as rotas sob o caminho "/api"
app.use("/api", routes);

// Inicia o servidor na porta definida (3000 ou variável ambiente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
