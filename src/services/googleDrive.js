const { google } = require("googleapis");
const fs = require("fs");

function validateEnvVars() {
  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "GOOGLE_REFRESH_TOKEN",
  ];

  const missing = required.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    throw new Error(
      `❌ Variáveis de ambiente obrigatórias faltando para Google Drive: ${missing.join(", ")}`
    );
  }
}

function getYearMonth() {
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, "0"),
  };
}

function getAuth() {
  validateEnvVars();

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

async function getOrCreateFolder(drive, name, parentId = null) {
  const q = [
    "mimeType='application/vnd.google-apps.folder'",
    `name='${name}'`,
    parentId ? `'${parentId}' in parents` : null,
    "trashed=false",
  ]
    .filter(Boolean)
    .join(" and ");

  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
  });

  if (res.data.files.length) {
    return res.data.files[0].id;
  }

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : [],
    },
    fields: "id",
  });

  return folder.data.id;
}

async function uploadAndCleanup(filePath, fileName) {
  let fileDeleted = false;

  try {
    validateEnvVars();

    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    const auth = getAuth();
    const drive = google.drive({ version: "v3", auth });

    const { year, month } = getYearMonth();
    const rootName = process.env.BACKUP_ROOT_FOLDER || "Backups";

    console.log("📂 Obtendo/criando pastas no Google Drive...");
    const rootFolderId = await getOrCreateFolder(drive, rootName);
    const yearFolderId = await getOrCreateFolder(drive, year, rootFolderId);
    const monthFolderId = await getOrCreateFolder(
      drive,
      month,
      yearFolderId
    );

    console.log(`📤 Fazendo upload de ${fileName}...`);

    const fileStats = fs.statSync(filePath);
    const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
    console.log(`   Tamanho do arquivo: ${fileSizeMB} MB`);

    await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [monthFolderId],
        description: `Backup de viagens - ${new Date().toISOString()}`,
      },
      media: {
        mimeType: "application/json",
        body: fs.createReadStream(filePath),
      },
      fields: "id, webViewLink",
    });

    console.log("☁️ Upload concluído no Drive com sucesso");

    // Deletar arquivo local apenas após sucesso do upload
    fs.unlinkSync(filePath);
    fileDeleted = true;
    console.log("🧹 Arquivo local removido:", filePath);

    return {
      success: true,
      message: `Backup enviado com sucesso: ${fileName}`,
      fileSizeMB,
    };
  } catch (error) {
    // Tentar deletar arquivo em caso de erro
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        fileDeleted = true;
        console.log("🧹 Arquivo local removido após erro:", filePath);
      } catch (unlinkErr) {
        console.error(
          "❌ Erro ao deletar arquivo local:",
          unlinkErr.message
        );
      }
    }

    const errorMsg = error.message || String(error);
    console.error("❌ Erro no upload para Google Drive:", errorMsg);

    throw new Error(`Falha no backup: ${errorMsg}`);
  }
}

module.exports = {
  uploadAndCleanup,
};
