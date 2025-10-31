const NodeCache = require("node-cache");
const logger = require("./logger");

class CacheManager {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: parseInt(process.env.CACHE_TTL) || 300, // 5 minutos padrão
      checkperiod: 60, // Verificar expiração a cada 60 segundos
      useClones: false,
    });

    this.enabled = process.env.ENABLE_CACHE === "true";

    // Event listeners para log
    this.cache.on("set", (key, value) => {
      logger.debug(`Cache SET: ${key}`);
    });

    this.cache.on("del", (key, value) => {
      logger.debug(`Cache DEL: ${key}`);
    });

    this.cache.on("expired", (key, value) => {
      logger.debug(`Cache EXPIRED: ${key}`);
    });
  }

  get(key) {
    if (!this.enabled) return undefined;

    const value = this.cache.get(key);
    if (value !== undefined) {
      logger.debug(`Cache HIT: ${key}`);
    } else {
      logger.debug(`Cache MISS: ${key}`);
    }
    return value;
  }

  set(key, value, ttl = null) {
    if (!this.enabled) return false;

    return this.cache.set(key, value, ttl);
  }

  del(key) {
    if (!this.enabled) return false;

    return this.cache.del(key);
  }

  flush() {
    this.cache.flushAll();
    logger.info("Cache cleared");
  }

  getStats() {
    return this.cache.getStats();
  }

  // Gerar chave de cache para consultas FIPE
  generateFipeKey(params) {
    const { marca, modelo, ano, tipoVeiculo, codigoTabelaReferencia } = params;
    return `fipe:${marca}:${modelo}:${ano}:${tipoVeiculo}:${codigoTabelaReferencia}`;
  }

  // Gerar chave para consultas de histórico
  generateHistoricoKey(marca, modelo, ano) {
    return `historico:${marca}:${modelo}:${ano}`;
  }
}

module.exports = new CacheManager();
