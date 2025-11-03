-- Migration: Criação dos índices da tabela historico_precos
-- Autor: Sistema
-- Data: 2024-10-31
-- Descrição: Criação dos índices para performance da tabela historico_precos

CREATE INDEX IF NOT EXISTS idx_historico_marca_modelo ON historico_precos(codigo_marca, codigo_modelo);
CREATE INDEX IF NOT EXISTS idx_historico_data_consulta ON historico_precos(data_consulta);
CREATE INDEX IF NOT EXISTS idx_historico_tipo_veiculo ON historico_precos(codigo_tipo_veiculo);
CREATE UNIQUE INDEX IF NOT EXISTS idx_historico_unique ON historico_precos(
    codigo_marca, 
    codigo_modelo, 
    ano_modelo, 
    codigo_tipo_veiculo, 
    codigo_tipo_combustivel, 
    codigo_tabela_referencia
);