const express = require("express");
const router = express.Router();
require("dotenv").config();

const cookieParser = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Swagger (mantém se já usa)
const { swaggerUi, swaggerSpec } = require("./config/swaggerConfig");

// === CORS + Cookies ===
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3001";
router.use(
  cors({
    origin: ORIGIN,
    credentials: true,
  })
);
router.use(express.json());
router.use(cookieParser());

// === Swagger Docs ===
router.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// === Health ===
router.get("/health", async (req, res) => {
  console.log("Nava test routing in running!");
  return res.json({ status: 200, message: "Nava test routing in running!" });
});

// ====== USER MODEL (ajuste se seu caminho for diferente) ======
const User = require("./database/Schemas/Users");

// ====== HELPERS ======
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax", // ok pra localhost com portas diferentes
    secure: false,   // mude p/ true em produção HTTPS
    path: "/",       // garante envio em /nava/*
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// ====== MIDDLEWARE PROTEGIDO ======
const requireAuth = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Não autenticado" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, name, role }
    return next();
  } catch (e) {
    return res.status(401).json({ message: "Sessão inválida/expirada" });
  }
};

// ====== LOGIN ======
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(req.body);
    

    if (!email || !password)
      return res.status(400).json({ message: "Email e senha são obrigatórios." });

    const user = await User.findOne({ email }).lean();
    if (!user) return res.status(401).json({ message: "Credenciais inválidas." });

    const stored = user.password || user.passwordHash || "";
    let ok = false;

    // 1) tenta como bcrypt
    if (stored && stored.length > 0) {
      try {
        ok = await bcrypt.compare(password, stored);
      } catch (_) {
        ok = false;
      }
    }

    // 2) fallback: se senha salva em texto simples
    if (!ok && stored === password) ok = true;

    // 3) fallback especial para seu admin/admin (se quiser manter)
    if (!ok && email === "admin@admin.com" && password === "admin") ok = true;

    if (!ok) return res.status(401).json({ message: "Credenciais inválidas." });

    const token = signToken({
      id: String(user._id),
      email: user.email,
      name: user.name || "Admin",
      role: user.role || "admin",
    });

    setAuthCookie(res, token);
    return res.json({
      message: "Autenticado",
      user: { email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Erro no login" });
  }
});

// ====== ME (VALIDA A SESSÃO) ======
router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("email name role").lean();
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    return res.json({ user });
  } catch (e) {
    return res.status(500).json({ message: "Erro ao buscar usuário" });
  }
});

// ====== LOGOUT ======
router.post("/auth/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // true em produção HTTPS
  });
  return res.json({ message: "Deslogado" });
});

module.exports = router;
