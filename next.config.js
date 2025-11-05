/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  // Configurações para produção
  ...(process.env.NODE_ENV === "production" && {
    output: "standalone",
  }),
};

module.exports = nextConfig;
