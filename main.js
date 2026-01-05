const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const { database_init, isDbUp } = require("./src/database/mongodb");

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const allowedOrigins = ["http://localhost:3001", process.env.FRONTEND_URL];
app.set("trust proxy", 1);
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// (opcional) bloqueia requests enquanto DB não estiver conectado
app.use((req, res, next) => {
  if (!isDbUp()) return res.status(503).json({ message: "Banco indisponível" });
  next();
});

const port = process.env.PORT || 3000;

(async () => {
  try {
    await database_init(); // <<<<<< aguarda de verdade

    app.use("/nava", require("./src/server")); // só monta rotas depois

    app.listen(port, () => console.log("Listen on port:", port));
  } catch (err) {
    console.error("🔥 Falha ao iniciar servidor (DB não conectou):", err.message);
    process.exit(1);
  }
})();
