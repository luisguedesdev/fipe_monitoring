require("dotenv").config({ path: "../.env" });
console.log("Loading DB module...");
const db = require("./db");
console.log("DB module loaded successfully!");
