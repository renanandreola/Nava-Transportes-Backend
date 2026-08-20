const { verifyAccessToken } = require("../auth/tokens");

module.exports = (req, res, next) => {
  const auth = req.headers.authorization;
  if (typeof auth !== "string") {
    return res.status(401).json({ message: "Não autenticado" });
  }

  const match = auth.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) {
    return res.status(401).json({ message: "Token de acesso inválido" });
  }

  const token = match[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
};
