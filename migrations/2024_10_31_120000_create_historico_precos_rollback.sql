-- Rollback: Criação da tabela historico_precos
-- Remove a tabela e todos os índices

DROP INDEX IF EXISTS idx_historico_unique;
DROP INDEX IF EXISTS idx_historico_tipo_veiculo;
DROP INDEX IF EXISTS idx_historico_data_consulta;
DROP INDEX IF EXISTS idx_historico_marca_modelo;
DROP TABLE IF EXISTS historico_precos;