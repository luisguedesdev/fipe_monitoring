-- Migration: Criação dos índices da tabela system_logs
-- Autor: Sistema
-- Data: 2024-10-31
-- Descrição: Criação dos índices para performance da tabela system_logs

CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_source ON system_logs(source);