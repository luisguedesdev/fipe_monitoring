// Carregar variáveis de ambiente
require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

// Imports locais
const logger = require("./config/logger");
const cache = require("./config/cache");
const routes = require("./routes");

const app = express();

// Configurações de segurança
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        scriptSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
        ],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo 100 requests por janela
  message: {
    error: "Muitas requisições de sua origem. Tente novamente mais tarde.",
    retryAfter: "15 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", limiter);

// Logging de requisições
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Middleware para parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Servir arquivos estáticos
app.use(
  express.static(path.join(__dirname, "..", "frontend"), {
    maxAge: process.env.NODE_ENV === "production" ? "1d" : "0",
    etag: true,
  })
);

// Health check endpoint
app.get("/health", (req, res) => {
  const stats = cache.getStats();
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: {
      enabled: cache.enabled,
      stats: stats,
    },
    environment: process.env.NODE_ENV || "development",
  });
});

// Cache status endpoint
app.get("/api/cache/stats", (req, res) => {
  if (!cache.enabled) {
    return res.json({ enabled: false, message: "Cache está desabilitado" });
  }

  const stats = cache.getStats();
  res.json({
    enabled: true,
    stats: {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0,
      vsize: stats.vsize,
      ksize: stats.ksize,
    },
  });
});

// Clear cache endpoint (útil para desenvolvimento)
app.post("/api/cache/clear", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res
      .status(403)
      .json({ error: "Operação não permitida em produção" });
  }

  cache.flush();
  logger.info("Cache limpo manualmente");
  res.json({ message: "Cache limpo com sucesso" });
});

// Rotas da API
app.use("/api", routes);

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  logger.error("Erro não tratado:", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Não vazar detalhes do erro em produção
  const message =
    process.env.NODE_ENV === "production"
      ? "Erro interno do servidor"
      : err.message;

  res.status(err.status || 500).json({
    error: message,
    timestamp: new Date().toISOString(),
    path: req.path,
  });
});

// Middleware para rotas não encontradas
app.use("*", (req, res) => {
  // Se for uma rota de API, retornar JSON
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({
      error: "Endpoint não encontrado",
      path: req.path,
      method: req.method,
    });
  }

  // Para outras rotas, servir o index.html (SPA fallback)
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Servidor FIPE rodando na porta ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    cacheEnabled: cache.enabled,
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM recebido, iniciando shutdown graceful");
  server.close(() => {
    logger.info("Servidor fechado");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT recebido, iniciando shutdown graceful");
  server.close(() => {
    logger.info("Servidor fechado");
    process.exit(0);
  });
});

// Log de erros não capturados
process.on("uncaughtException", (err) => {
  logger.error("Exceção não capturada:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Promise rejection não tratada:", { reason, promise });
});

module.exports = app;
