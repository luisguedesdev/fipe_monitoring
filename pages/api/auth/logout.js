import { clearAuthCookie } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  clearAuthCookie(res);

  res.json({
    success: true,
    message: "Logout realizado com sucesso",
  });
}
