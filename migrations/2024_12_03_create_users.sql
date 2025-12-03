-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de veículos favoritos/monitorados por usuário
-- Cada usuário pode ter sua própria lista de veículos para monitorar
CREATE TABLE IF NOT EXISTS user_veiculos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    codigo_marca VARCHAR(10) NOT NULL,
    codigo_modelo VARCHAR(10) NOT NULL,
    ano_modelo VARCHAR(20) NOT NULL,
    nome_marca VARCHAR(100),
    nome_modelo VARCHAR(255),
    nome_ano VARCHAR(50),
    apelido VARCHAR(100), -- Nome personalizado opcional
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, codigo_marca, codigo_modelo, ano_modelo)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_veiculos_user ON user_veiculos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_veiculos_veiculo ON user_veiculos(codigo_marca, codigo_modelo, ano_modelo);
