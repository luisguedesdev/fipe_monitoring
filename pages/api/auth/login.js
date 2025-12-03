import { loginUser, createToken, setAuthCookie } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({
      success: false,
      error: "Email e senha são obrigatórios",
    });
  }

  try {
    const user = await loginUser(email, senha);
    const token = createToken(user);

    setAuthCookie(res, token);

    res.json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        isAdmin: user.is_admin,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
}
