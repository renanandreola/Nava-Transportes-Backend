const { google } = require("googleapis");
const fs = require("fs");

function getYearMonth() {
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, "0"),
  };
}

function getAuth() {
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
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const { year, month } = getYearMonth();

  const rootName = process.env.BACKUP_ROOT_FOLDER || "Backups";

  const rootFolderId = await getOrCreateFolder(drive, rootName);
  const yearFolderId = await getOrCreateFolder(drive, year, rootFolderId);
  const monthFolderId = await getOrCreateFolder(drive, month, yearFolderId);

  await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [monthFolderId],
    },
    media: {
      mimeType: "application/json",
      body: fs.createReadStream(filePath),
    },
  });

  console.log("☁️ Upload concluído no Drive");

  fs.unlinkSync(filePath);
  console.log("🧹 Arquivo local removido:", filePath);
}

module.exports = {
  uploadAndCleanup,
};
