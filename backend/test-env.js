require("dotenv").config({ path: "../.env" });
const useNeon =
  process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR_NEON");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "NOT SET");
console.log("useNeon:", useNeon);
console.log(
  "DATABASE_URL preview:",
  process.env.DATABASE_URL
    ? process.env.DATABASE_URL.substring(0, 30) + "..."
    : "NOT SET"
);
