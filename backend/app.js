// app.js
const express = require("express");
const app = express();

app.use(express.json());
const path = require("path");
app.use(express.static(path.join(__dirname, "..", "frontend")));

const routes = require("./routes");


app.use("/api", routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
