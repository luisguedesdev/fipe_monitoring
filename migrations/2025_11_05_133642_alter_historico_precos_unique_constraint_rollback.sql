-- Rollback: Alteração da constraint única da tabela historico_precos
-- Autor: Sistema
-- Data: 2025-11-05
-- Descrição: Recria a constraint única original

-- Criar a constraint única original
CREATE UNIQUE INDEX idx_historico_unique ON historico_precos(
    codigo_marca,
    codigo_modelo,
    ano_modelo,
    codigo_tipo_veiculo,
    codigo_tipo_combustivel,
    codigo_tabela_referencia
);