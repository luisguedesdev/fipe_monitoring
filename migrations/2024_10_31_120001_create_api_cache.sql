-- Migration: Criação da tabela de cache de API
-- Autor: Sistema
-- Data: 2024-10-31
-- Descrição: Tabela para cachear respostas da API FIPE e melhorar performance

CREATE TABLE IF NOT EXISTS api_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_value TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);