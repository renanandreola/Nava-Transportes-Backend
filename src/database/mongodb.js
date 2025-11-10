// src/database/mongodb.js
const mongoose = require("mongoose");

async function database_init() {
  const uri = process.env.DBURI
  if (!uri) throw new Error("DB_URI/MONGO_URI não definido no .env");

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(uri, {
      // Ajuste conforme seu provedor/local
      serverSelectionTimeoutMS: 10000, // 10s pra achar servidor
      socketTimeoutMS: 20000,
      maxPoolSize: 10,
      retryWrites: true,
      appName: "nava-backend",
    });

    console.log("✅ Mongo conectado:", mongoose.connection.host);
  } catch (err) {
    console.error("❌ Erro ao conectar no Mongo:", err.message);
    throw err; // deixa o caller decidir (vamos abortar o start)
  }
}

function isDbUp() {
  // 1 = connected, 2 = connecting
  return mongoose.connection.readyState === 1;
}

module.exports = { database_init, isDbUp };
