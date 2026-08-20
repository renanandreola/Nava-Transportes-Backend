const jwt = require("jsonwebtoken");

const requiredSecret = (name) => {
  const secret = process.env[name];

  if (!secret || secret.length < 24) {
    throw new Error(`${name} deve possuir pelo menos 24 caracteres.`);
  }

  return secret;
};

const jwtOptions = {
  algorithm: "HS256",
  issuer: "nava-transportes-backend",
  audience: "nava-transportes-frontend",
};

const signAccessToken = (payload) =>
  jwt.sign(payload, requiredSecret("JWT_SECRET"), {
    ...jwtOptions,
    expiresIn: "15m",
  });

const signRefreshToken = (payload) =>
  jwt.sign(payload, requiredSecret("JWT_REFRESH_SECRET"), {
    ...jwtOptions,
    expiresIn: "7d",
  });

const verifyAccessToken = (token) =>
  jwt.verify(token, requiredSecret("JWT_SECRET"), {
    algorithms: [jwtOptions.algorithm],
    issuer: jwtOptions.issuer,
    audience: jwtOptions.audience,
  });

const verifyRefreshToken = (token) =>
  jwt.verify(token, requiredSecret("JWT_REFRESH_SECRET"), {
    algorithms: [jwtOptions.algorithm],
    issuer: jwtOptions.issuer,
    audience: jwtOptions.audience,
  });

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};