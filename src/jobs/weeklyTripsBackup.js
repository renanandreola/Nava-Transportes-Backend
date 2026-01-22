const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const Trip = require("../database/Schemas/Trip");
const { uploadFile } = require("../services/googleDrive");

const BACKUP_DIR = path.resolve(__dirname, "../../backups");

function iso(d = new Date()) {
  return d.toISOString();
}

async function runWeeklyTripsBackup() {
  console.log("🟢 [CRON] START backup");

  try {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);

    console.log("📅 Range:", from.toISOString(), "→", to.toISOString());

    const trips = await Trip.find({
      createdAt: { $gte: from, $lte: to },
    }).lean();

    console.log("📊 Trips encontradas:", trips.length);

    if (!trips.length) {
      console.log("ℹ️ Nenhuma trip, abortando.");
      return;
    }

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR);
      console.log("📁 Pasta backups criada");
    }

    const payload = {
      generatedAt: iso(),
      total: trips.length,
      trips,
    };

    const fileName = `trips_backup_${iso()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.json`;

    const filePath = path.join(BACKUP_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
    console.log("📄 Arquivo criado:", filePath);

    console.log("☁️ Tentando upload no Drive...");
    const uploaded = await uploadFile({
      filePath,
      fileName,
      mimeType: "application/json",
    });

    console.log("✅ Upload OK. File ID:", uploaded.id);

    fs.unlinkSync(filePath);
    console.log("🧹 Arquivo removido");

    fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
    console.log("🧹 Pasta backups removida");
  } catch (err) {
    console.error("❌ ERRO NO CRON:", err);
  }
}

/**
 * TESTE: a cada 2 minutos
 */
cron.schedule("*/2 * * * *", runWeeklyTripsBackup);

module.exports = { runWeeklyTripsBackup };
