-- Migration: Criação da tabela historico_precos
-- Autor: Sistema
-- Data: 2024-10-31
-- Descrição: Criação da tabela principal para armazenar histórico de preços FIPE

CREATE TABLE IF NOT EXISTS historico_precos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_consulta TEXT DEFAULT (datetime('now','localtime')),
    codigo_tabela_referencia VARCHAR(20),
    codigo_tipo_veiculo INTEGER NOT NULL,
    codigo_marca INTEGER NOT NULL,
    codigo_modelo INTEGER NOT NULL,
    ano_modelo VARCHAR(20) NOT NULL,
    preco VARCHAR(50),
    codigo_tipo_combustivel INTEGER,
    nome_marca VARCHAR(100),
    nome_modelo VARCHAR(200),
    nome_ano VARCHAR(50),
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
);