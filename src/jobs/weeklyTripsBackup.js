const fs = require("fs");
const path = require("path");
const { getTripsBetween } = require("../services/mongo");
const { uploadAndCleanup } = require("../services/googleDrive");
const { sendBackupStatusEmail } = require("../services/mailer");

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
  console.log("🟢 [CRON] START backup de viagens");

  let filePath = null;
  const startTime = Date.now();

  try {
    // Validar variáveis de ambiente críticas
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
      throw new Error(
        "Configuração do Google Drive incompleta. Verifique variáveis de ambiente."
      );
    }

    const { start, end } = getDateRange();
    console.log(`📅 Range: ${start.toISOString()} → ${end.toISOString()}`);

    // Buscar viagens do banco
    let trips;
    try {
      trips = await getTripsBetween(start, end);
    } catch (dbError) {
      throw new Error(
        `Erro ao conectar ao MongoDB: ${dbError.message || String(dbError)}`
      );
    }

    console.log(`📊 Viagens encontradas: ${trips.length}`);

    if (!trips.length) {
      console.log("⚠️ Nenhum dado para backup neste período");
      return {
        success: true,
        message: "Nenhuma viagem para fazer backup",
        tripsCount: 0,
      };
    }

    // Criar diretório de backups se não existir
    const backupsDir = path.join(process.cwd(), "backups");
    try {
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }
    } catch (dirError) {
      throw new Error(`Erro ao criar diretório de backup: ${dirError.message}`);
    }

    // Criar nome do arquivo
    const fileName = `trips_${start.toISOString().slice(0, 10)}_${end
      .toISOString()
      .slice(0, 10)}.json`;

    filePath = path.join(backupsDir, fileName);

    // Escrever arquivo JSON
    let jsonContent;
    try {
      jsonContent = JSON.stringify(
        {
          backupDate: new Date().toISOString(),
          range: { start: start.toISOString(), end: end.toISOString() },
          total: trips.length,
          trips,
        },
        null,
        2
      );

      fs.writeFileSync(filePath, jsonContent, "utf8");
    } catch (writeError) {
      throw new Error(`Erro ao escrever arquivo local: ${writeError.message}`);
    }

    const fileStats = fs.statSync(filePath);
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    console.log(`📄 Arquivo criado: ${fileName} (${fileSizeMB} MB)`);

    // Upload para Google Drive
    const uploadResult = await uploadAndCleanup(filePath, fileName);
    filePath = null; // Arquivo foi deletado pelo uploadAndCleanup

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [CRON] Backup finalizado em ${duration}s`);

    return {
      success: true,
      message: `Backup enviado com sucesso`,
      tripsCount: trips.length,
      fileName,
      fileSizeMB,
      duration: `${duration}s`,
    };
  } catch (error) {
    const errorMsg = error.message || String(error);
    console.error(`❌ [CRON] ERRO no backup:`, errorMsg);

    // Tentar deletar arquivo local em caso de erro
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log("🧹 Arquivo de backup removido após erro");
      } catch (unlinkErr) {
        console.error("⚠️ Erro ao limpar arquivo:", unlinkErr.message);
      }
    }

    // Enviar email de notificação de erro
    try {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      await sendBackupStatusEmail({
        success: false,
        errorMessage: errorMsg,
        duration: `${duration}s`,
      });
      console.log("📧 Email de erro enviado");
    } catch (emailErr) {
      console.error("⚠️ Erro ao enviar email de notificação:", emailErr.message);
    }

    throw error;
  }
}

module.exports = {
  runTripsBackup,
};
