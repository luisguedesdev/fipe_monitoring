const axios = require("axios");
const logger = require("./logger");

/**
 * Gerenciador inteligente de requisições para API FIPE
 * Implementa rate limiting, queue, circuit breaker e retry strategies
 */
class FipeRequestManager {
  constructor(config = {}) {
    // Configurações de rate limiting
    this.maxRequestsPerMinute = config.maxRequestsPerMinute || 25; // Reduzido para segurança
    this.minDelayBetweenRequests = config.minDelayBetweenRequests || 300; // 300ms mínimo
    this.maxDelayBetweenRequests = config.maxDelayBetweenRequests || 1000; // 1s máximo

    // Configurações de retry
    this.maxRetries = config.maxRetries || 3;
    this.baseRetryDelay = config.baseRetryDelay || 2000; // 2s base
    this.maxRetryDelay = config.maxRetryDelay || 30000; // 30s máximo

    // Circuit breaker
    this.circuitBreakerThreshold = config.circuitBreakerThreshold || 5;
    this.circuitBreakerTimeout = config.circuitBreakerTimeout || 60000; // 1 min
    this.consecutiveFailures = 0;
    this.circuitOpen = false;
    this.circuitOpenTime = null;

    // Fila de requisições
    this.queue = [];
    this.processing = false;
    this.lastRequestTime = 0;

    // Estatísticas
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      circuitBreakerTrips: 0,
      averageDelay: 0,
    };

    // Rate limiting por minuto
    this.requestTimestamps = [];
    this.resetTimestampsInterval();

    // Axios config
    this.axiosConfig = {
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Referer: "https://veiculos.fipe.org.br/",
      },
      timeout: config.timeout || 30000,
    };

    logger.info("FipeRequestManager inicializado", {
      maxRequestsPerMinute: this.maxRequestsPerMinute,
      minDelay: this.minDelayBetweenRequests,
      maxRetries: this.maxRetries,
    });
  }

  /**
   * Reseta o contador de timestamps a cada minuto
   */
  resetTimestampsInterval() {
    setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      this.requestTimestamps = this.requestTimestamps.filter(
        (ts) => ts > oneMinuteAgo
      );
    }, 5000); // Limpa a cada 5 segundos
  }

  /**
   * Verifica se o circuit breaker está aberto
   */
  checkCircuitBreaker() {
    if (!this.circuitOpen) return true;

    const now = Date.now();
    if (now - this.circuitOpenTime >= this.circuitBreakerTimeout) {
      logger.info("Circuit breaker: tentando fechar circuito");
      this.circuitOpen = false;
      this.consecutiveFailures = 0;
      return true;
    }

    const remainingTime = Math.ceil(
      (this.circuitBreakerTimeout - (now - this.circuitOpenTime)) / 1000
    );
    logger.warn(`Circuit breaker ABERTO. Aguarde ${remainingTime}s`);
    return false;
  }

  /**
   * Registra falha e verifica se deve abrir circuit breaker
   */
  recordFailure() {
    this.consecutiveFailures++;
    this.stats.failedRequests++;

    if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
      if (!this.circuitOpen) {
        this.circuitOpen = true;
        this.circuitOpenTime = Date.now();
        this.stats.circuitBreakerTrips++;
        logger.error(
          `Circuit breaker ABERTO após ${this.consecutiveFailures} falhas consecutivas`
        );
      }
    }
  }

  /**
   * Registra sucesso e reseta contador de falhas
   */
  recordSuccess() {
    this.consecutiveFailures = 0;
    this.stats.successfulRequests++;
  }

  /**
   * Verifica se pode fazer uma requisição agora (rate limiting)
   */
  canMakeRequest() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Limpar timestamps antigos
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => ts > oneMinuteAgo
    );

    // Verificar limite por minuto
    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      this.stats.rateLimitHits++;
      return false;
    }

    // Verificar delay mínimo entre requisições
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (
      this.lastRequestTime > 0 &&
      timeSinceLastRequest < this.minDelayBetweenRequests
    ) {
      return false;
    }

    return true;
  }

  /**
   * Calcula delay dinâmico baseado na carga atual
   */
  calculateDynamicDelay() {
    const loadFactor =
      this.requestTimestamps.length / this.maxRequestsPerMinute;

    // Quanto maior a carga, maior o delay
    const delay = Math.floor(
      this.minDelayBetweenRequests +
        (this.maxDelayBetweenRequests - this.minDelayBetweenRequests) *
          loadFactor
    );

    // Adicionar jitter aleatório (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
  }

  /**
   * Calcula delay para retry com backoff exponencial
   */
  calculateRetryDelay(attemptNumber, error) {
    let baseDelay = this.baseRetryDelay * Math.pow(2, attemptNumber);

    // Se for rate limit (429), usar delay maior
    if (error?.response?.status === 429) {
      const retryAfter = error.response.headers["retry-after"];
      if (retryAfter) {
        const retryAfterMs = parseInt(retryAfter) * 1000;
        baseDelay = Math.max(baseDelay, retryAfterMs);
      } else {
        baseDelay *= 2; // Dobrar delay para rate limits
      }
    }

    // Adicionar jitter (±25%)
    const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
    const delay = Math.floor(baseDelay + jitter);

    // Limitar ao máximo configurado
    return Math.min(delay, this.maxRetryDelay);
  }

  /**
   * Aguarda até poder fazer próxima requisição
   */
  async waitForNextSlot() {
    while (!this.canMakeRequest()) {
      const delay = this.calculateDynamicDelay();
      logger.debug(
        `Rate limit: aguardando ${delay}ms antes de próxima requisição`
      );
      await this.sleep(delay);
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Executa uma requisição com retry e backoff
   */
  async executeRequest(url, data, retryCount = 0) {
    try {
      this.stats.totalRequests++;
      const now = Date.now();

      // Registrar timestamp da requisição
      this.requestTimestamps.push(now);
      this.lastRequestTime = now;

      // Fazer requisição
      const startTime = Date.now();
      const response = await axios.post(url, data, this.axiosConfig);
      const duration = Date.now() - startTime;

      // Atualizar estatísticas
      this.recordSuccess();
      this.stats.averageDelay =
        (this.stats.averageDelay * (this.stats.successfulRequests - 1) +
          duration) /
        this.stats.successfulRequests;

      logger.debug(`Requisição bem-sucedida em ${duration}ms`, {
        url: url.split("/").pop(),
        attempt: retryCount + 1,
      });

      return response;
    } catch (error) {
      const isLastRetry = retryCount >= this.maxRetries - 1;
      const status = error.response?.status;
      const isRateLimit = status === 429;
      const isServerError = status >= 500;
      const isTimeout =
        error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
      const shouldRetry = isRateLimit || isServerError || isTimeout;

      logger.warn(
        `Requisição falhou (tentativa ${retryCount + 1}/${this.maxRetries})`,
        {
          url: url.split("/").pop(),
          status,
          error: error.message,
          shouldRetry: !isLastRetry && shouldRetry,
        }
      );

      // Registrar falha
      this.recordFailure();

      // Se não deve fazer retry, lançar erro
      if (isLastRetry || !shouldRetry) {
        throw error;
      }

      // Calcular delay para retry
      const retryDelay = this.calculateRetryDelay(retryCount, error);
      logger.info(
        `Aguardando ${retryDelay}ms antes de retry ${retryCount + 2}/${
          this.maxRetries
        }`
      );
      await this.sleep(retryDelay);

      // Tentar novamente
      return this.executeRequest(url, data, retryCount + 1);
    }
  }

  /**
   * Adiciona requisição à fila
   */
  async request(url, data) {
    // Verificar circuit breaker
    if (!this.checkCircuitBreaker()) {
      const error = new Error(
        "Circuit breaker aberto. Serviço temporariamente indisponível."
      );
      error.code = "CIRCUIT_BREAKER_OPEN";
      error.status = 503;
      throw error;
    }

    // Criar promise para a requisição
    return new Promise((resolve, reject) => {
      this.queue.push({
        url,
        data,
        resolve,
        reject,
      });

      // Iniciar processamento se não estiver rodando
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Processa a fila de requisições
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    logger.debug(
      `Iniciando processamento de fila com ${this.queue.length} requisições`
    );

    while (this.queue.length > 0) {
      const item = this.queue.shift();

      try {
        // Aguardar até poder fazer requisição (rate limiting)
        await this.waitForNextSlot();

        // Executar requisição
        const response = await this.executeRequest(item.url, item.data);
        item.resolve(response);
      } catch (error) {
        item.reject(error);
      }
    }

    this.processing = false;
    logger.debug("Fila de requisições processada completamente");
  }

  /**
   * Faz múltiplas requisições em batch (com controle de rate)
   */
  async requestBatch(requests) {
    logger.info(`Processando batch de ${requests.length} requisições`);
    const results = [];

    for (let i = 0; i < requests.length; i++) {
      const { url, data } = requests[i];

      try {
        const response = await this.request(url, data);
        results.push({ success: true, data: response.data, index: i });
      } catch (error) {
        logger.error(
          `Erro no batch request ${i + 1}/${requests.length}:`,
          error.message
        );
        results.push({
          success: false,
          error: error.message,
          status: error.response?.status,
          index: i,
        });
      }

      // Progresso
      if ((i + 1) % 5 === 0 || i === requests.length - 1) {
        logger.info(
          `Batch progress: ${i + 1}/${requests.length} requisições processadas`
        );
      }
    }

    return results;
  }

  /**
   * Retorna estatísticas do gerenciador
   */
  getStats() {
    const now = Date.now();
    const recentTimestamps = this.requestTimestamps.filter(
      (ts) => ts > now - 60000
    );

    return {
      ...this.stats,
      queueSize: this.queue.length,
      processing: this.processing,
      circuitOpen: this.circuitOpen,
      requestsLastMinute: recentTimestamps.length,
      circuitOpenTime: this.circuitOpen
        ? Math.ceil((now - this.circuitOpenTime) / 1000)
        : null,
    };
  }

  /**
   * Reseta estatísticas
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitHits: 0,
      circuitBreakerTrips: 0,
      averageDelay: 0,
    };
    logger.info("Estatísticas resetadas");
  }
}

// Exportar instância singleton
const fipeRequestManager = new FipeRequestManager({
  maxRequestsPerMinute: 25, // Limite conservador
  minDelayBetweenRequests: 300, // 300ms mínimo
  maxDelayBetweenRequests: 1000, // 1s máximo
  maxRetries: 3,
  baseRetryDelay: 2000,
  maxRetryDelay: 30000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000,
  timeout: 30000,
});

module.exports = {
  FipeRequestManager,
  fipeRequestManager,
};
