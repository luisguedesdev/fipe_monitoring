import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { parse, serialize } from "cookie";
import crypto from "crypto";
import db from "./db";

// Chave secreta para JWT - usa variável de ambiente ou gera uma hash segura
const JWT_SECRET =
  process.env.JWT_SECRET ||
  crypto
    .createHash("sha256")
    .update("drive-price-x-" + (process.env.VERCEL_URL || "local"))
    .digest("hex");

// Chave para criptografia adicional de dados sensíveis
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ||
  crypto
    .createHash("sha256")
    .update("dpx-encrypt-" + (process.env.VERCEL_URL || "local"))
    .digest("hex")
    .substring(0, 32);

const IV_LENGTH = 16;
const COOKIE_NAME = "dpx_auth";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict", // Mais restritivo contra CSRF
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 dias
};

// Salt rounds para bcrypt (12 é mais seguro)
const BCRYPT_ROUNDS = 12;

/**
 * Criptografar dados sensíveis (AES-256-CBC)
 */
export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

/**
 * Descriptografar dados sensíveis
 */
export function decrypt(text) {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    return null;
  }
}

/**
 * Hash de senha com bcrypt (12 rounds)
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verificar senha
 */
export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Criar token JWT
 */
export function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      nome: user.nome,
      isAdmin: user.is_admin,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * Verificar token JWT
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Obter usuário do request (via cookie)
 */
export function getUserFromRequest(req) {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies[COOKIE_NAME];

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

/**
 * Setar cookie de autenticação
 */
export function setAuthCookie(res, token) {
  res.setHeader("Set-Cookie", serialize(COOKIE_NAME, token, COOKIE_OPTIONS));
}

/**
 * Remover cookie de autenticação
 */
export function clearAuthCookie(res) {
  res.setHeader(
    "Set-Cookie",
    serialize(COOKIE_NAME, "", {
      ...COOKIE_OPTIONS,
      maxAge: 0,
    })
  );
}

/**
 * Registrar novo usuário
 */
export async function registerUser(nome, email, senha) {
  // Verificar se email já existe
  const existing = await db.query("SELECT id FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);

  if (existing.rows.length > 0) {
    throw new Error("Este email já está cadastrado");
  }

  // Hash da senha
  const senhaHash = await hashPassword(senha);

  // Inserir usuário
  const result = await db.query(
    `INSERT INTO users (nome, email, senha_hash) 
     VALUES ($1, $2, $3) 
     RETURNING id, nome, email, is_admin, created_at`,
    [nome, email.toLowerCase(), senhaHash]
  );

  return result.rows[0];
}

/**
 * Login de usuário
 */
export async function loginUser(email, senha) {
  // Buscar usuário
  const result = await db.query(
    "SELECT id, nome, email, senha_hash, is_admin FROM users WHERE email = $1",
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new Error("Email ou senha inválidos");
  }

  const user = result.rows[0];

  // Verificar senha
  const senhaValida = await verifyPassword(senha, user.senha_hash);

  if (!senhaValida) {
    throw new Error("Email ou senha inválidos");
  }

  // Retornar usuário sem a senha
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    is_admin: user.is_admin,
  };
}

/**
 * Middleware para proteger rotas API
 */
export function withAuth(handler) {
  return async (req, res) => {
    const user = getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Não autenticado",
      });
    }

    req.user = user;
    return handler(req, res);
  };
}

/**
 * Middleware para rotas que precisam de admin
 */
export function withAdmin(handler) {
  return async (req, res) => {
    const user = getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Não autenticado",
      });
    }

    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Acesso negado",
      });
    }

    req.user = user;
    return handler(req, res);
  };
}

/**
 * Adicionar veículo à lista do usuário
 */
export async function addUserVeiculo(userId, veiculo) {
  const result = await db.query(
    `INSERT INTO user_veiculos 
     (user_id, codigo_marca, codigo_modelo, ano_modelo, nome_marca, nome_modelo, nome_ano, apelido)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, codigo_marca, codigo_modelo, ano_modelo) DO NOTHING
     RETURNING id`,
    [
      userId,
      veiculo.codigoMarca,
      veiculo.codigoModelo,
      veiculo.anoModelo,
      veiculo.nomeMarca,
      veiculo.nomeModelo,
      veiculo.nomeAno,
      veiculo.apelido || null,
    ]
  );

  return result.rows[0];
}

/**
 * Remover veículo da lista do usuário
 */
export async function removeUserVeiculo(
  userId,
  codigoMarca,
  codigoModelo,
  anoModelo
) {
  await db.query(
    `DELETE FROM user_veiculos 
     WHERE user_id = $1 AND codigo_marca = $2 AND codigo_modelo = $3 AND ano_modelo = $4`,
    [userId, codigoMarca, codigoModelo, anoModelo]
  );
}

/**
 * Obter veículos do usuário
 */
export async function getUserVeiculos(userId) {
  const result = await db.query(
    `SELECT uv.*, 
            hp.preco as ultimo_preco,
            hp.data_consulta as ultima_consulta,
            counts.total_registros
     FROM user_veiculos uv
     LEFT JOIN LATERAL (
       SELECT preco, data_consulta
       FROM historico_precos
       WHERE codigo_marca = uv.codigo_marca::INTEGER 
         AND codigo_modelo = uv.codigo_modelo::INTEGER 
         AND ano_modelo = uv.ano_modelo
       ORDER BY data_consulta DESC
       LIMIT 1
     ) hp ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*) as total_registros
       FROM historico_precos
       WHERE codigo_marca = uv.codigo_marca::INTEGER 
         AND codigo_modelo = uv.codigo_modelo::INTEGER 
         AND ano_modelo = uv.ano_modelo
     ) counts ON true
     WHERE uv.user_id = $1
     ORDER BY uv.created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Verificar se veículo está na lista do usuário
 */
export async function isVeiculoInUserList(
  userId,
  codigoMarca,
  codigoModelo,
  anoModelo
) {
  const result = await db.query(
    `SELECT id FROM user_veiculos 
     WHERE user_id = $1 AND codigo_marca = $2 AND codigo_modelo = $3 AND ano_modelo = $4`,
    [userId, codigoMarca, codigoModelo, anoModelo]
  );

  return result.rows.length > 0;
}
