import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = "https://prisfall.se";

function buildVerificationEmailHtml(token) {
  const verifyUrl = `${APP_URL}/verify?token=${token}`;
  return `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Bekräfta din e-post på Prisfall</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:36px 32px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">✉️</div>
              <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Prisfall</h1>
              <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Bekräfta din e-postadress</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 12px;">
              <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 12px;">Hej! Välkommen till Prisfall 🎉</h2>
              <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Klicka på knappen nedan för att bekräfta din e-postadress och börja ta emot prisnotiser.
              </p>
              <div style="text-align:center;margin-bottom:24px;">
                <a href="${verifyUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:16px;font-weight:700;padding:16px 36px;border-radius:12px;text-decoration:none;letter-spacing:0.2px;">
                  Bekräfta e-post →
                </a>
              </div>
              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 8px;">
                🕐 Länken är giltig i 24 timmar.
              </p>
              <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:0;">
                Om du inte har registrerat dig på Prisfall kan du ignorera detta mail.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6;">
                📉 Prisfall — Helt gratis, alltid.<br/>
                <a href="${verifyUrl}" style="color:#16a34a;word-break:break-all;">${verifyUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Generate unique token
    const token = crypto.randomUUID();
    const now = new Date().toISOString();

    // Save token on user
    await base44.asServiceRole.entities.User.update(user.id, {
      verification_token: token,
      verification_sent_at: now,
    });

    // Send email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      from_name: "Prisfall",
      subject: "Bekräfta din e-post på Prisfall",
      body: buildVerificationEmailHtml(token),
    });

    console.log(`Verification email sent to ${user.email}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error("sendVerificationEmail error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});