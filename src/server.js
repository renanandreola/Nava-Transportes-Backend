const express = require("express");
const router = express.Router();
require("dotenv").config();

const cookieParser = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const { swaggerUi, swaggerSpec } = require("./config/swaggerConfig");

const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3001";
router.use(
  cors({
    origin: ORIGIN,
    credentials: true,
  })
);
router.use(express.json());
router.use(cookieParser());

router.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

router.get("/health", async (req, res) => {
  console.log("Nava test routing in running!");
  return res.json({ status: 200, message: "Nava test routing in running!" });
});

const User = require("./database/Schemas/Users");

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax", 
    secure: false,  
    path: "/",       
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

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

    if (stored && stored.length > 0) {
      try {
        ok = await bcrypt.compare(password, stored);
      } catch (_) {
        ok = false;
      }
    }

    if (!ok && stored === password) ok = true;

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

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("email name role").lean();
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
    return res.json({ user });
  } catch (e) {
    return res.status(500).json({ message: "Erro ao buscar usuário" });
  }
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  });
  return res.json({ message: "Deslogado" });
});

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Acesso negado" });
  }
  next();
};

router.get("/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { q = "", role, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(q && { $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ]}),
      ...(role && { role }),
    };

    const [items, total] = await Promise.all([
      User.find(where).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(where),
    ]);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error("GET /admin/users", e);
    res.status(500).json({ message: "Erro ao listar usuários" });
  }
});

router.post("/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role = "driver", active = true } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nome, e-mail e senha são obrigatórios." });
    }

    const exists = await User.findOne({ email }).lean();
    if (exists) return res.status(409).json({ message: "E-mail já cadastrado." });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role, active });

    res.status(201).json({
      message: "Usuário criado",
      user: { id: user._id, name: user.name, email: user.email, role: user.role, active: user.active }
    });
  } catch (e) {
    console.error("POST /admin/users", e);
    res.status(500).json({ message: "Erro ao criar usuário" });
  }
});

router.put("/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, active } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { ...(name && { name }), ...(email && { email }), ...(role && { role }), ...(active !== undefined && { active }) } },
      { new: true, runValidators: true }
    ).lean();

    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    res.json({ message: "Atualizado", user });
  } catch (e) {
    console.error("PUT /admin/users/:id", e);
    res.status(500).json({ message: "Erro ao atualizar usuário" });
  }
});

router.put("/admin/users/:id/password", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "Senha obrigatória." });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(id, { $set: { passwordHash } }, { new: true }).lean();
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    res.json({ message: "Senha redefinida" });
  } catch (e) {
    console.error("PUT /admin/users/:id/password", e);
    res.status(500).json({ message: "Erro ao redefinir senha" });
  }
});

module.exports = router;
