const { verifyAccessToken } = require("../auth/tokens");

module.exports = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  const [, token] = auth.split(" ");
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
};
