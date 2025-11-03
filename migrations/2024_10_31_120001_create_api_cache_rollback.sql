-- Rollback: Criação da tabela de cache de API

DROP FUNCTION IF EXISTS clean_expired_cache();
DROP INDEX IF EXISTS idx_cache_expires;
DROP INDEX IF EXISTS idx_cache_key;
DROP TABLE IF EXISTS api_cache;