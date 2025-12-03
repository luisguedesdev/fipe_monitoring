-- ============================================
-- DRIVE PRICE X - Schema Completo do Banco
-- ============================================
-- Este arquivo é apenas para REFERÊNCIA.
-- Para manutenção, use as migrations em /migrations
-- Execute: npm run migrate
-- ============================================

-- ============================================
-- TABELA: historico_precos
-- Armazena o histórico de preços FIPE
-- ============================================
CREATE TABLE IF NOT EXISTS historico_precos (
    id SERIAL PRIMARY KEY,
    codigo_tabela_referencia INTEGER NOT NULL,
    codigo_tipo_veiculo INTEGER NOT NULL DEFAULT 1,
    codigo_marca INTEGER NOT NULL,
    codigo_modelo INTEGER NOT NULL,
    ano_modelo VARCHAR(20) NOT NULL,
    preco VARCHAR(50) NOT NULL,
    codigo_tipo_combustivel INTEGER,
    nome_marca VARCHAR(100),
    nome_modelo VARCHAR(500),
    nome_ano VARCHAR(50),
    data_consulta TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(codigo_marca, codigo_modelo, ano_modelo, data_consulta)
);

-- Índices para historico_precos
CREATE INDEX IF NOT EXISTS idx_historico_marca ON historico_precos(codigo_marca);
CREATE INDEX IF NOT EXISTS idx_historico_modelo ON historico_precos(codigo_modelo);
CREATE INDEX IF NOT EXISTS idx_historico_ano ON historico_precos(ano_modelo);
CREATE INDEX IF NOT EXISTS idx_historico_data ON historico_precos(data_consulta);
CREATE INDEX IF NOT EXISTS idx_historico_veiculo ON historico_precos(codigo_marca, codigo_modelo, ano_modelo);

-- ============================================
-- TABELA: users
-- Usuários do sistema
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- TABELA: user_veiculos
-- Veículos salvos por cada usuário
-- ============================================
CREATE TABLE IF NOT EXISTS user_veiculos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    codigo_marca VARCHAR(10) NOT NULL,
    codigo_modelo VARCHAR(10) NOT NULL,
    ano_modelo VARCHAR(20) NOT NULL,
    nome_marca VARCHAR(100),
    nome_modelo VARCHAR(255),
    nome_ano VARCHAR(50),
    apelido VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, codigo_marca, codigo_modelo, ano_modelo)
);

CREATE INDEX IF NOT EXISTS idx_user_veiculos_user ON user_veiculos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_veiculos_veiculo ON user_veiculos(codigo_marca, codigo_modelo, ano_modelo);

-- ============================================
-- TABELA: api_cache (opcional)
-- Cache de requisições à API FIPE
-- ============================================
CREATE TABLE IF NOT EXISTS api_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(500) UNIQUE NOT NULL,
    cache_value TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);

-- ============================================
-- TABELA: system_logs (opcional)
-- Logs do sistema
-- ============================================
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);
