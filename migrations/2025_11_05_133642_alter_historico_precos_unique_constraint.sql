-- Migration: Alteração da constraint única da tabela historico_precos
-- Autor: Sistema
-- Data: 2025-11-05
-- Descrição: Remove a constraint única existente para permitir múltiplos registros por veículo

-- Remover a constraint única existente
DROP INDEX IF EXISTS idx_historico_unique;