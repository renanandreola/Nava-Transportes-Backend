const { google } = require("googleapis");
const fs = require("fs");

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

async function uploadFile({ filePath, fileName, mimeType }) {
  console.log("☁️ [Drive] Iniciando upload:", fileName);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    },
    media: {
      mimeType,
      body: fs.createReadStream(filePath),
    },
  });

  console.log("☁️ [Drive] Upload finalizado:", res.data.id);
  return res.data;
}

module.exports = { uploadFile };
