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

function renderList(data) {
  if (!data || typeof data !== "object") return "";

  const items = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(
      ([key, value]) => `
        <li style="margin-bottom:6px">
          <b>${escapeHtml(key)}:</b> ${escapeHtml(String(value))}
        </li>
      `
    )
    .join("");

  return `
    <ul style="
      padding-left:18px;
      margin:8px 0;
      font-size:14px;
    ">
      ${items}
    </ul>
  `;
}

function buildTransporter() {
  requiredEnv("SMTP_HOST");
  requiredEnv("SMTP_PORT");
  requiredEnv("SMTP_USER");
  requiredEnv("SMTP_PASS");

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

async function sendEventEmail({ title, event, data, meta }) {
  try {
    requiredEnv("MAIL_TO");
    requiredEnv("MAIL_CC");

    const app = process.env.APP_NAME || "Nava";
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;

    const subject = `[${app}] ${title} - ${event}`;

    const mainData = {
      "ID": data?.tripId || data?.id,
      "Motorista": data?.trip?.driverName || data?.driverName,
      "Placa": data?.trip?.plate || data?.placa,
      "Total do Frete": data?.trip?.totalDoFrete || data?.totalDoFrete,
      "Premiação (%)": data?.trip?.premiacaoPercentual,
      "Premiação (R$)": data?.trip?.premiacaoValor,
      "Data": meta?.when,
    };

    const listHtml = renderList(mainData);

    const text = [
      `${app} - ${title}`,
      "",
      `Evento: ${event}`,
      "",
      "Dados principais:",
      Object.entries(mainData)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n"),
    ].join("\n");

    const html = `
      <div style="
        font-family: Arial, sans-serif;
        color:#222;
        line-height:1.4;
      ">
        <h2 style="margin-bottom:8px">
          ${escapeHtml(app)} - ${escapeHtml(title)}
        </h2>

        <p style="margin:0 0 10px 0">
          <b>Evento:</b> ${escapeHtml(event)}
        </p>

        ${meta?.actor ? `<p><b>Usuário:</b> ${escapeHtml(meta.actor)}</p>` : ""}

        <h3 style="margin:16px 0 6px 0">Dados principais</h3>
        ${listHtml}

        <p style="margin-top:20px; font-size:11px; color:#777">
          E-mail automático • ${escapeHtml(app)}
        </p>

                <h3 style="margin: 14px 0 8px 0">Dados</h3>
        <pre style="background:#f6f6f6; padding:12px; border-radius:8px; overflow:auto">
${escapeHtml(safeJson(data))}
        </pre>
      </div>
    `;

    const transporter = buildTransporter();
    await transporter.verify();

    await transporter.sendMail({
      from,
      to: process.env.MAIL_TO,
      cc: process.env.MAIL_CC,
      subject,
      text,
      html,
    });

    return { ok: true };
  } catch (err) {
    console.error("sendEventEmail error:", err?.message || err);
    return { ok: false };
  }
}

module.exports = { sendEventEmail };

