import { getUserFromRequest } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = getUserFromRequest(req);

  if (!user) {
    return res.json({
      success: true,
      authenticated: false,
      user: null,
    });
  }

  res.json({
    success: true,
    authenticated: true,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      isAdmin: user.isAdmin,
    },
  });
}
