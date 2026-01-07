const express = require("express");
const router = express.Router();
require("dotenv").config();

// const cookieParser = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const Trip = require("./database/Schemas/Trip");

const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require("./auth/tokens");

const requireAuth = require("./middlewares/requireAuth");

const { swaggerUi, swaggerSpec } = require("./config/swaggerConfig");

const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3001";
router.use(
  cors({
    origin: ORIGIN,
    credentials: true,
  })
);
router.use(express.json());
// router.use(cookieParser());

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

// const setAuthCookie = (res, token) => {
//   res.cookie("token", token, {
//     httpOnly: true,
//     sameSite: "none", 
//     secure: true,  
//     path: "/",       
//     maxAge: 7 * 24 * 60 * 60 * 1000,
//   });
// };

// const requireAuth = (req, res, next) => {
//   const token = req.cookies?.token;
//   if (!token) return res.status(401).json({ message: "Não autenticado" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded; // { id, email, name, role }
//     return next();
//   } catch (e) {
//     return res.status(401).json({ message: "Sessão inválida/expirada" });
//   }
// };

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios." });
    }

    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    let ok = false;

    if (user.passwordHash) {
      ok = await bcrypt.compare(password, user.passwordHash);
    }

    if (!ok && user.password) {
      ok = user.password === password;
    }

    if (!ok && email === "admin@admin.com" && password === "admin") {
      ok = true;
    }

    if (!ok) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    const payload = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role || "driver",
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ id: payload.id });

    return res.json({
      user: payload,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Erro no login" });
  }
});

// router.post("/auth/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     console.log(req.body);
    

//     if (!email || !password)
//       return res.status(400).json({ message: "Email e senha são obrigatórios." });

//     const user = await User.findOne({ email }).lean();
//     if (!user) return res.status(401).json({ message: "Credenciais inválidas." });

//     const stored = user.password || user.passwordHash || "";
//     let ok = false;

//     if (stored && stored.length > 0) {
//       try {
//         ok = await bcrypt.compare(password, stored);
//       } catch (_) {
//         ok = false;
//       }
//     }

//     if (!ok && stored === password) ok = true;

//     if (!ok && email === "admin@admin.com" && password === "admin") ok = true;

//     if (!ok) return res.status(401).json({ message: "Credenciais inválidas." });

//     const token = signToken({
//       id: String(user._id),
//       email: user.email,
//       name: user.name || "Admin",
//       role: user.role || "admin",
//     });

//     setAuthCookie(res, token);
//     return res.json({
//       message: "Autenticado",
//       user: { email: user.email, name: user.name, role: user.role },
//     });
//   } catch (err) {
//     console.error("Login error:", err);
//     return res.status(500).json({ message: "Erro no login" });
//   }
// });

router.post("/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token ausente" });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).lean();
    if (!user) {
      return res.status(401).json({ message: "Usuário inválido" });
    }

    const payload = {
      id: String(user._id),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const newAccessToken = signAccessToken(payload);

    return res.json({
      accessToken: newAccessToken,
    });
  } catch {
    return res.status(401).json({ message: "Refresh token inválido" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

// router.get("/auth/me", requireAuth, async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select("email name role").lean();
//     if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
//     return res.json({ user });
//   } catch (e) {
//     return res.status(500).json({ message: "Erro ao buscar usuário" });
//   }
// });

// router.post("/auth/logout", (req, res) => {
//   res.clearCookie("token", {
//     httpOnly: true,
//     sameSite: "none",
//     secure: true,
//     path: "/",
//   });
//   return res.json({ message: "Deslogado" });
// });

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
    const id = req.params.id;
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const role = req.body.role;
    const active = req.body.active;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    if (!name || !email) {
      return res.status(400).json({ message: "Nome e e-mail são obrigatórios." });
    }

    // se mudou o e-mail, checa duplicado
    if (email !== user.email) {
      const exists = await User.findOne({ email: email }).lean();
      if (exists) {
        return res.status(409).json({ message: "E-mail já cadastrado." });
      }
      user.email = email;
    }

    user.name = name;

    // se veio uma senha não vazia, troca
    if (password && password.trim() !== "") {
      const passwordHash = await bcrypt.hash(password, 10);
      user.passwordHash = passwordHash;
    }

    // se quiser permitir alterar role/active:
    if (role) {
      user.role = role;
    }
    if (typeof active === "boolean") {
      user.active = active;
    }

    await user.save();

    return res.json({
      message: "Usuário atualizado",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    });
  } catch (e) {
    console.error("PUT /admin/users/:id", e);
    return res.status(500).json({ message: "Erro ao atualizar usuário" });
  }
});

router.delete("/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    const user = await User.findById(id).lean();
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    // se quiser impedir remover admin, descomenta:
    // if (user.role === "admin") {
    //   return res.status(400).json({ message: "Não é permitido excluir usuários admin." });
    // }

    await User.deleteOne({ _id: id });

    return res.json({ message: "Usuário excluído com sucesso." });
  } catch (e) {
    console.error("DELETE /admin/users/:id", e);
    return res.status(500).json({ message: "Erro ao excluir usuário" });
  }
});

router.get("/admin/trips", requireAuth, requireAdmin, async (req, res) => {
  try {
    const driverId = req.query.driverId;
    const plate = req.query.plate;
    const from = req.query.from;
    const to = req.query.to;
    const q = req.query.q;
    let limit = parseInt(req.query.limit, 10);

    if (isNaN(limit) || limit <= 0) {
      limit = 100;
    }
    if (limit > 500) {
      limit = 500;
    }

    const filter = {};

    // filtrar por motorista
    if (driverId) {
      filter.driverId = driverId; // se o schema for ObjectId, o Mongoose faz o cast
    }

    // filtrar por placa (case-insensitive, contém)
    if (plate) {
      const plateTrim = plate.trim();
      if (plateTrim) {
        filter.plate = new RegExp(plateTrim, "i");
      }
    }

    // filtrar por período (usando createdAt)
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        // início do dia
        filter.createdAt.$gte = new Date(from + "T00:00:00.000Z");
      }
      if (to) {
        // fim do dia
        filter.createdAt.$lte = new Date(to + "T23:59:59.999Z");
      }
    }

    // busca geral (origem, destino, posto, assinador, placa, nome motorista)
    if (q) {
      const qTrim = q.trim();
      if (qTrim) {
        const regex = new RegExp(qTrim, "i");
        // se já tiver algum filtro $or, mescla; aqui vamos só setar
        filter.$or = [
          { plate: regex },
          { driverName: regex },
          { "trechos.origem": regex },
          { "trechos.destino": regex },
          { "trechos.posto": regex },
          { "trechos.assinador": regex },
        ];
      }
    }

    const [items, total] = await Promise.all([
      Trip.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Trip.countDocuments(filter),
    ]);

    res.json({
      total: total,
      items: items,
    });
  } catch (e) {
    console.error("GET /admin/trips", e);
    res.status(500).json({ message: "Erro ao carregar controles" });
  }
});

router.put("/admin/trips/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: "Controle não encontrado." });
    }

    const driverId = req.body.driverId;
    const driverName = req.body.driverName;
    const plate = req.body.plate;
    const totalDoFrete = req.body.totalDoFrete;
    const totalPago = req.body.totalPago;
    const premiacao = req.body.premiacao;
    const totalAssinado = req.body.totalAssinado;

    if (!plate || typeof plate !== "string" || plate.trim() === "") {
      return res.status(400).json({ message: "Placa é obrigatória." });
    }

    trip.plate = plate.trim();

    if (driverId) {
      trip.driverId = driverId;
    }
    if (driverName) {
      trip.driverName = driverName;
    }

    if (typeof totalDoFrete !== "undefined") {
      trip.totalDoFrete = Number(totalDoFrete) || 0;
    }
    if (typeof totalPago !== "undefined") {
      trip.totalPago = Number(totalPago) || 0;
    }
    if (typeof premiacao !== "undefined") {
      trip.premiacao = Number(premiacao) || 0;
    }
    if (typeof totalAssinado !== "undefined") {
      trip.totalAssinado = Number(totalAssinado) || 0;
    }

    await trip.save();

    return res.json({
      message: "Controle atualizado",
      trip: trip,
    });
  } catch (e) {
    console.error("PUT /admin/trips/:id", e);
    return res.status(500).json({ message: "Erro ao atualizar controle" });
  }
});

router.delete("/admin/trips/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    const trip = await Trip.findById(id).lean();
    if (!trip) {
      return res.status(404).json({ message: "Controle não encontrado." });
    }

    await Trip.deleteOne({ _id: id });

    return res.json({ message: "Controle excluído com sucesso." });
  } catch (e) {
    console.error("DELETE /admin/trips/:id", e);
    return res.status(500).json({ message: "Erro ao excluir controle" });
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

// Criar viagem (driver/admin)
router.post("/driver/trips", requireAuth, async (req, res) => {
  try {
    const {
      driverId,
      driverName,
      plate,
      kmInicial,
      kmFinal,
      litrosTotal,
      mediaGeral,
      totalAssinado,
      totalPago,
      premiacao,
      totalDoFrete,
      extras,
      trechos,

      // 👇 novos
      latitude,
      longitude,
      locationAccuracy,
    } = req.body;

    const trip = await Trip.create({
      driverId: driverId || req.user._id,
      driverName: driverName || req.user.name,
      plate,
      kmInicial,
      kmFinal,
      litrosTotal,
      mediaGeral,
      totalAssinado,
      totalPago,
      premiacao,
      totalDoFrete,
      extras,
      trechos,

      latitude,
      longitude,
      locationAccuracy,
    });

    res.status(201).json({ message: "Trip criada", trip });
  } catch (e) {
    console.error("POST /driver/trips", e);
    res.status(500).json({ message: "Erro ao salvar controle" });
  }
});

// Listar viagens do próprio motorista (ou todas, se admin)
router.get("/driver/trips", requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const { page = 1, limit = 20, driverId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = isAdmin
      ? (driverId ? { driverId } : {})
      : { driverId: req.user.id };

    const [items, total] = await Promise.all([
      Trip.find(where).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Trip.countDocuments(where),
    ]);

    return res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error("GET /driver/trips", e);
    return res.status(500).json({ message: "Erro ao listar viagens" });
  }
});

router.put("/driver/trips/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user && req.user._id;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: "Viagem não encontrada." });
    }

    // se não for admin, garante que a viagem é dele
    if (trip.driverId && userId && String(trip.driverId) !== String(userId)) {
      return res.status(403).json({ message: "Você não pode editar esta viagem." });
    }

    const plate = req.body.plate;
    const kmInicial = req.body.kmInicial;
    const kmFinal = req.body.kmFinal;
    const totalDoFrete = req.body.totalDoFrete;
    const premiacao = req.body.premiacao;

    if (!plate || typeof plate !== "string" || plate.trim() === "") {
      return res.status(400).json({ message: "Placa é obrigatória." });
    }

    trip.plate = plate.trim();
    if (typeof kmInicial !== "undefined") trip.kmInicial = Number(kmInicial) || 0;
    if (typeof kmFinal !== "undefined") trip.kmFinal = Number(kmFinal) || 0;
    if (typeof totalDoFrete !== "undefined") trip.totalDoFrete = Number(totalDoFrete) || 0;
    if (typeof premiacao !== "undefined") trip.premiacao = Number(premiacao) || 0;

    await trip.save();

    return res.json({ message: "Viagem atualizada", trip: trip });
  } catch (e) {
    console.error("PUT /driver/trips/:id", e);
    return res.status(500).json({ message: "Erro ao atualizar viagem" });
  }
});

// excluir viagem
router.delete("/driver/trips/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user && req.user._id;

    const trip = await Trip.findById(id).lean();
    if (!trip) {
      return res.status(404).json({ message: "Viagem não encontrada." });
    }

    if (trip.driverId && userId && String(trip.driverId) !== String(userId)) {
      return res.status(403).json({ message: "Você não pode excluir esta viagem." });
    }

    await Trip.deleteOne({ _id: id });

    return res.json({ message: "Viagem excluída com sucesso." });
  } catch (e) {
    console.error("DELETE /driver/trips/:id", e);
    return res.status(500).json({ message: "Erro ao excluir viagem" });
  }
});

router.get("/admin/analytics/drivers", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { from, to, driverId } = req.query;

    const match = {};

    if (driverId) {
      match.driverId = new mongoose.Types.ObjectId(driverId);
    }

    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        match.createdAt.$lte = d;
      }
    }

    const data = await Trip.aggregate([
      { $match: match },

      {
        $group: {
          _id: "$driverId",
          driverName: { $first: "$driverName" },

          viagens: { $sum: 1 },
          kmInicialMin: { $min: "$kmInicial" },
          kmFinalMax: { $max: "$kmFinal" },

          totalFrete: { $sum: "$totalDoFrete" },
          totalPago: { $sum: "$totalPago" },
          premiacao: { $sum: "$premiacao" },
          litrosTotal: { $sum: "$litrosTotal" },
        },
      },

      {
        $addFields: {
          kmRodado: { $subtract: ["$kmFinalMax", "$kmInicialMin"] },
          mediaGeral: {
            $cond: [
              { $gt: ["$litrosTotal", 0] },
              { $divide: ["$kmRodado", "$litrosTotal"] },
              0,
            ],
          },
        },
      },

      { $sort: { totalFrete: -1 } },
    ]);

    res.json({ items: data });
  } catch (e) {
    console.error("GET /admin/analytics/drivers", e);
    res.status(500).json({ message: "Erro ao gerar indicadores" });
  }
});

module.exports = router;
