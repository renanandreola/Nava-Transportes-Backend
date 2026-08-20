const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const { database_init, isDbUp } = require("./src/database/mongodb");
const {
  apiRateLimiter,
  rejectSuspiciousInput,
  securityHeaders,
} = require("./src/middlewares/security");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(securityHeaders);

const allowedOrigins = new Set(
  [
    "http://localhost:3001",
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGIN || "").split(","),
  ]
    .map((origin) => origin && origin.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origem não permitida");
      error.code = "CORS_NOT_ALLOWED";
      return callback(error);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

app.use(apiRateLimiter);
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || "1mb" }));
app.use(rejectSuspiciousInput);

app.use((req, res, next) => {
  if (!isDbUp()) return res.status(503).json({ message: "Banco indisponível" });
  next();
});

const port = process.env.PORT || 3000;

(async () => {
  try {
    await database_init();

    app.use("/nava", require("./src/server"));

    app.use((req, res) => {
      return res.status(404).json({ message: "Rota não encontrada" });
    });

    app.use((err, req, res, next) => {
      if (err?.code === "CORS_NOT_ALLOWED") {
        return res.status(403).json({ message: "Origem não permitida" });
      }

      if (err?.type === "entity.too.large") {
        return res.status(413).json({ message: "Requisição muito grande" });
      }

      console.error("Erro não tratado:", err?.message || err);
      return res.status(500).json({ message: "Erro interno do servidor" });
    });

    app.listen(port, () => console.log("Listen on port:", port));
  } catch (err) {
    console.error("🔥 Falha ao iniciar servidor (DB não conectou):", err.message);
    process.exit(1);
  }
})();
