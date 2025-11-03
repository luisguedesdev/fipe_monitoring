-- Migration: Criação da tabela de logs do sistema
-- Autor: Sistema
-- Data: 2024-10-31
-- Descrição: Tabela para armazenar logs da aplicação

CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    meta TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(100),
    user_ip TEXT,
    user_agent TEXT
);