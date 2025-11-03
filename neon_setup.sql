-- Script SQL para criar tabelas no Neon (PostgreSQL)
-- Execute este script no SQL Editor do Neon

-- Criar tabela principal para histórico de preços
CREATE TABLE IF NOT EXISTS historico_precos (
    id SERIAL PRIMARY KEY,
    data_consulta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    codigo_tabela_referencia VARCHAR(10),
    codigo_tipo_veiculo INTEGER,
    codigo_marca INTEGER,
    codigo_modelo INTEGER,
    ano_modelo VARCHAR(10),
    preco TEXT,
    codigo_tipo_combustivel INTEGER,
    nome_marca VARCHAR(100),
    nome_modelo VARCHAR(100),
    nome_ano VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint para evitar duplicatas
    UNIQUE(codigo_marca, codigo_modelo, ano_modelo, codigo_tipo_veiculo, codigo_tipo_combustivel, codigo_tabela_referencia)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_historico_marca_modelo ON historico_precos(codigo_marca, codigo_modelo);
CREATE INDEX IF NOT EXISTS idx_historico_data ON historico_precos(data_consulta);
CREATE INDEX IF NOT EXISTS idx_historico_marca_modelo_ano ON historico_precos(codigo_marca, codigo_modelo, nome_ano);

-- Criar tabela para cache (opcional, mas recomendado)
CREATE TABLE IF NOT EXISTS cache_entries (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_value JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para cache
CREATE INDEX IF NOT EXISTS idx_cache_key ON cache_entries(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at);

-- Função para limpar cache expirado (executará automaticamente)
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM cache_entries WHERE expires_at < NOW();
END;
$$;

-- Comentários nas tabelas
COMMENT ON TABLE historico_precos IS 'Armazena histórico de preços de veículos da FIPE';
COMMENT ON TABLE cache_entries IS 'Cache de consultas para melhor performance';

-- Otimizações para Neon
-- Habilitar autovacuum nas tabelas
ALTER TABLE historico_precos SET (autovacuum_enabled = true);
ALTER TABLE cache_entries SET (autovacuum_enabled = true);

-- Configurar fillfactor para melhor performance de updates
ALTER TABLE historico_precos SET (fillfactor = 80);
ALTER TABLE cache_entries SET (fillfactor = 80);