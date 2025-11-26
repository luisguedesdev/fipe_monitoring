/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  reactStrictMode: true,
  // Configuração otimizada para Vercel
  poweredByHeader: false,
  compress: true,
};

module.exports = nextConfig;
