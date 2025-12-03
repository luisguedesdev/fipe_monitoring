import { registerUser, createToken, setAuthCookie } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { nome, email, senha } = req.body;

  // Validações
  if (!nome || nome.length < 2) {
    return res.status(400).json({
      success: false,
      error: "Nome deve ter pelo menos 2 caracteres",
    });
  }

  if (!email || !email.includes("@")) {
    return res.status(400).json({
      success: false,
      error: "Email inválido",
    });
  }

  if (!senha || senha.length < 6) {
    return res.status(400).json({
      success: false,
      error: "Senha deve ter pelo menos 6 caracteres",
    });
  }

  try {
    const user = await registerUser(nome, email, senha);
    const token = createToken(user);

    setAuthCookie(res, token);

    res.json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}
