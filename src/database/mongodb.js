const mongoose = require("mongoose");

async function database_init() {
  const uri = process.env.DBURI
  if (!uri) throw new Error("DB_URI/MONGO_URI não definido no .env");

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, 
      socketTimeoutMS: 20000,
      maxPoolSize: 10,
      retryWrites: true,
      appName: "nava-backend",
    });

    console.log("✅ Mongo conectado:", mongoose.connection.host);
  } catch (err) {
    console.error("❌ Erro ao conectar no Mongo:", err.message);
    throw err;
  }
}

function isDbUp() {
  return mongoose.connection.readyState === 1;
}

module.exports = { database_init, isDbUp };
