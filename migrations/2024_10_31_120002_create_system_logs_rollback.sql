-- Rollback: Criação da tabela de logs do sistema

-- DROP INDEX IF EXISTS idx_logs_timestamp_brin;
DROP INDEX IF EXISTS idx_logs_source;
DROP INDEX IF EXISTS idx_logs_timestamp;
DROP INDEX IF EXISTS idx_logs_level;
DROP TABLE IF EXISTS system_logs;