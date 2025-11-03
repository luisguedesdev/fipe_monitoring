-- Migration: Criação dos índices da tabela api_cache
-- Autor: Sistema
-- Data: 2024-10-31
-- Descrição: Criação dos índices para performance da tabela api_cache

CREATE INDEX IF NOT EXISTS idx_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON api_cache(expires_at);