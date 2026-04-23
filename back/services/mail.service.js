const nodemailer = require("nodemailer");

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPasswordResetHtml(resetUrl) {
  const safeUrl = escapeHtml(resetUrl);
  const href = resetUrl.replace(/&/g, "&amp;");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar contraseña</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f0f4;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f0f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;border:1px solid #e8e6ed;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 20px 28px;background-color:#5b21b6;background-image:linear-gradient(135deg,#5b21b6 0%,#7c3aed 55%,#6d28d9 100%);">
              <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:-0.02em;">TalkApp</p>
              <p style="margin:6px 0 0 0;font-size:12px;color:rgba(255,255,255,0.85);">Conecta. Habla. Colabora.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.55;color:#374151;">
                Recibimos una solicitud para restablecer tu contraseña. El enlace caduca en <strong>1 hora</strong>.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding:8px 0 20px 0;">
                    <a href="${href}" target="_blank" rel="noopener noreferrer"
                      style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;background-color:#7c3aed;border-radius:8px;border:1px solid #6d28d9;">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#6b7280;">
                Si el botón no funciona, copia y pega este enlace en el navegador:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:12px 14px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-family:Consolas,'Courier New',monospace;font-size:11px;line-height:1.45;color:#4b5563;word-break:break-all;">
                    ${safeUrl}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">
                Si no solicitaste este correo, puedes ignorarlo. Tu contraseña no cambiará.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0 0;font-size:11px;color:#9ca3af;text-align:center;">
          © TalkApp
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

async function sendPasswordResetEmail(to, resetUrl) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const transport = createTransport();
  const subject = "Recuperación de cuenta — TalkApp";
  const text = [
    "TalkApp — Recuperación de contraseña",
    "",
    "Restablece tu contraseña con este enlace (válido 1 hora):",
    resetUrl,
    "",
    "Si no fuiste tú, ignora este mensaje.",
  ].join("\n");

  const html = buildPasswordResetHtml(resetUrl);

  if (!transport) {
    console.warn("[mail] SMTP incompleto; enlace de recuperación (solo consola):", resetUrl);
    return;
  }

  await transport.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendPasswordResetEmail };
