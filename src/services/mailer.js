// services/mailer.js
const nodemailer = require("nodemailer");

function requiredEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing env var: ${name}`);
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function buildTransporter() {
  requiredEnv("SMTP_HOST");
  requiredEnv("SMTP_PORT");
  requiredEnv("SMTP_USER");
  requiredEnv("SMTP_PASS");

  const port = Number(process.env.SMTP_PORT);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // smtp.gmail.com
    port,                        // 587
    secure: false,               // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // SENHA DE APP
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporter;
}

/**
 * Envia e-mail de evento com TO + CC (fixos via env).
 * Nunca quebra a rota (falha só loga).
 */
async function sendEventEmail({ title, event, data, meta }) {
  try {
    requiredEnv("MAIL_TO");
    requiredEnv("MAIL_CC");

    const app = process.env.APP_NAME || "Nava";
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    const to = process.env.MAIL_TO;
    const cc = process.env.MAIL_CC;

    const subject = `[${app}] ${title} - ${event}`;

    const text = [
      `${app} - ${title}`,
      "",
      `Evento: ${event}`,
      meta?.when ? `Data/Hora: ${meta.when}` : null,
      meta?.actor ? `Usuário: ${meta.actor}` : null,
      meta?.route ? `Rota: ${meta.route}` : null,
      "",
      "Dados:",
      safeJson(data),
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.4">
        <h2 style="margin: 0 0 12px 0">${escapeHtml(app)} - ${escapeHtml(title)}</h2>
        <div style="margin-bottom: 10px">
          <b>Evento:</b> ${escapeHtml(event)}<br/>
          ${meta?.when ? `<b>Data/Hora:</b> ${escapeHtml(meta.when)}<br/>` : ""}
          ${meta?.actor ? `<b>Usuário:</b> ${escapeHtml(meta.actor)}<br/>` : ""}
          ${meta?.route ? `<b>Rota:</b> ${escapeHtml(meta.route)}<br/>` : ""}
        </div>
        <h3 style="margin: 14px 0 8px 0">Dados</h3>
        <pre style="background:#f6f6f6; padding:12px; border-radius:8px; overflow:auto">
${escapeHtml(safeJson(data))}
        </pre>
      </div>
    `;

    const transporter = buildTransporter();

    // valida conexão SMTP (opcional, mas recomendado)
    await transporter.verify();

    await transporter.sendMail({
      from,
      to,
      cc,
      subject,
      text,
      html,
    });

    return { ok: true };
  } catch (err) {
    console.error("sendEventEmail error:", err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

module.exports = { sendEventEmail };
