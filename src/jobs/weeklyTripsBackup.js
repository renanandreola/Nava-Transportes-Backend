const fs = require("fs");
const path = require("path");
const { getTripsBetween } = require("../services/mongo");
const { uploadAndCleanup } = require("../services/googleDrive");

function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7); // últimos 7 dias
  return { start, end };
}

function formatDate(d) {
  return d.toISOString().replace(/[:.]/g, "-");
}

async function runTripsBackup() {
  console.log("🟢 [CRON] START backup");

  const { start, end } = getDateRange();

  console.log(`📅 Range: ${start.toISOString()} → ${end.toISOString()}`);

  const trips = await getTripsBetween(start, end);
  console.log(`📊 Trips encontradas: ${trips.length}`);

  if (!trips.length) {
    console.log("⚠️ Nenhum dado para backup");
    return;
  }

  const backupsDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir);
  }

  const fileName = `trips_${start.toISOString().slice(0, 10)}_${end
    .toISOString()
    .slice(0, 10)}.json`;

  const filePath = path.join(backupsDir, fileName);

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        range: { start, end },
        total: trips.length,
        trips,
      },
      null,
      2
    )
  );

  console.log("📄 Arquivo criado:", filePath);

  await uploadAndCleanup(filePath, fileName);

  console.log("✅ [CRON] Backup finalizado\n");
}

module.exports = {
  runTripsBackup,
};
