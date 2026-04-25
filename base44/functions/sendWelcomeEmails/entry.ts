import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = "https://prisfall.se";
const LOGO_URL = "https://media.base44.com/images/public/69e0849cd5247ba1a2f9090f/ab8f118b8_generated_image.png";
const PRIME_URL = "https://www.amazon.se/amazonprime?tag=priskoll-21";

function buildWelcomeEmailHtml(userName, referralCode) {
  const firstName = userName ? userName.split(" ")[0] : "där";
  const refCode = referralCode || "";
  const referralUrl = refCode ? `${APP_URL}/?ref=${refCode}` : APP_URL;

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Välkommen till Prisfall</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

        <!-- HEADER -->
        <tr>
          <td align="center" style="padding:32px 24px 20px;background:#ffffff;border-bottom:1px solid #f3f4f6;">
            <img src="${LOGO_URL}" width="72" height="72" alt="Prisfall" style="display:block;border-radius:14px;margin:0 auto 12px;"/>
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#16a34a;letter-spacing:-0.3px;">🔥 Prisfall</h1>
            <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Sveriges enklaste prisbevakning</p>
          </td>
        </tr>

        <!-- GREETING -->
        <tr>
          <td style="padding:28px 28px 8px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">Hej ${firstName},</h2>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#4b5563;">
              Tack för att du gick med i Prisfall — Sveriges enklaste sätt att aldrig betala för mycket på Amazon.se igen.
            </p>
          </td>
        </tr>

        <!-- STEPS -->
        <tr>
          <td style="padding:24px 28px 8px;">
            <h3 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111827;">🔥 Så kommer du igång</h3>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="36" valign="top" style="padding:10px 0;">
                  <div style="background:#16a34a;color:#ffffff;font-size:13px;font-weight:700;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;">1</div>
                </td>
                <td valign="top" style="padding:10px 0 10px 8px;">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827;">Lägg till din första produkt</p>
                  <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">Klistra bara in en Amazon.se-länk → vi visar prishistorik från senaste året direkt</p>
                </td>
              </tr>
              <tr>
                <td width="36" valign="top" style="padding:10px 0;">
                  <div style="background:#16a34a;color:#ffffff;font-size:13px;font-weight:700;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;">2</div>
                </td>
                <td valign="top" style="padding:10px 0 10px 8px;">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827;">Få notis när priset sjunker</p>
                  <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">Vi kollar priset varje natt och mailar dig bara när det verkligen är dags att slå till</p>
                </td>
              </tr>
              <tr>
                <td width="36" valign="top" style="padding:10px 0;">
                  <div style="background:#16a34a;color:#ffffff;font-size:13px;font-weight:700;border-radius:50%;width:28px;height:28px;text-align:center;line-height:28px;">3</div>
                </td>
                <td valign="top" style="padding:10px 0 10px 8px;">
                  <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827;">Installera appen på hemskärmen</p>
                  <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">Snabbare access och push-notiser direkt i mobilen</p>
                </td>
              </tr>
            </table>

            <!-- CTA primary -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
              <tr><td align="center">
                <a href="${APP_URL}/dashboard" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:800;padding:16px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;min-height:44px;line-height:20px;">
                  KOM IGÅNG NU →
                </a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- SEPARATOR -->
        <tr><td style="padding:28px 28px 0;"><div style="height:1px;background:#e5e7eb;line-height:1px;font-size:0;">&nbsp;</div></td></tr>

        <!-- PRIME TIP -->
        <tr>
          <td style="padding:24px 28px 8px;">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111827;">💡 Proffstips — Testa Amazon Prime gratis</h3>
            <p style="margin:0 0 12px;font-size:14px;color:#4b5563;">Visste du att Amazon Prime ger dig:</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:6px 0;font-size:14px;color:#374151;">
                <span style="color:#16a34a;font-weight:700;">✓</span>&nbsp; Gratis snabb leverans på tusentals produkter
              </td></tr>
              <tr><td style="padding:6px 0;font-size:14px;color:#374151;">
                <span style="color:#16a34a;font-weight:700;">✓</span>&nbsp; Prime Video (filmer & serier)
              </td></tr>
              <tr><td style="padding:6px 0;font-size:14px;color:#374151;">
                <span style="color:#16a34a;font-weight:700;">✓</span>&nbsp; Tidiga deals på Prime Day & Black Friday
              </td></tr>
            </table>

            <p style="margin:18px 0 12px;font-size:14px;color:#374151;font-weight:600;">🎁 Testa gratis i 30 dagar:</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center">
                <a href="${PRIME_URL}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:800;padding:16px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;min-height:44px;line-height:20px;">
                  STARTA GRATIS PRIME-PROVPERIOD →
                </a>
              </td></tr>
            </table>
            <p style="margin:10px 0 0;text-align:center;font-size:11px;color:#9ca3af;">(Avsluta när som helst, kostar 0 kr första månaden)</p>
          </td>
        </tr>

        <!-- SEPARATOR -->
        <tr><td style="padding:28px 28px 0;"><div style="height:1px;background:#e5e7eb;line-height:1px;font-size:0;">&nbsp;</div></td></tr>

        <!-- REFERRAL -->
        <tr>
          <td style="padding:24px 28px 8px;">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111827;">📲 Bjud in vänner och få fler bevakningar</h3>
            ${refCode ? `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin:0 0 14px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;color:#15803d;">Din inbjudningskod:</p>
              <p style="margin:0;font-size:20px;font-weight:800;color:#16a34a;letter-spacing:1px;">${refCode}</p>
            </div>` : ''}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:5px 0;font-size:14px;color:#374151;">🎯 <strong>1 vän</strong> = +2 produkter att bevaka</td></tr>
              <tr><td style="padding:5px 0;font-size:14px;color:#374151;">🎯 <strong>3 vänner</strong> = +5 produkter</td></tr>
              <tr><td style="padding:5px 0;font-size:14px;color:#374151;">🎯 <strong>5 vänner</strong> = +10 produkter</td></tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
              <tr><td align="center">
                <a href="${referralUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:14px;font-weight:800;padding:14px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;min-height:44px;line-height:20px;">
                  DELA MED EN VÄN →
                </a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:32px 28px 28px;border-top:1px solid #f3f4f6;background:#f9fafb;">
            <p style="margin:0 0 12px;font-size:13px;color:#4b5563;">Har du frågor? Svara bara på detta mail!</p>
            <p style="margin:0 0 4px;font-size:13px;color:#4b5563;">Glada prisfall,</p>
            <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827;">Prisfall</p>
            <p style="margin:0 0 16px;font-size:12px;">
              <a href="${APP_URL}" style="color:#16a34a;text-decoration:none;font-weight:600;">prisfall.se</a>
            </p>
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">
              Du får detta från Prisfall för att du registrerade dig på prisfall.se.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Cron job: sends welcome email to new users who haven't received one yet
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch recent users and filter client-side because `welcome_email_sent`
    // is undefined (not false) for users who never had the field set.
    const recentUsers = await base44.asServiceRole.entities.User.list("-created_date", 100);
    const users = (recentUsers || []).filter(u => u.welcome_email_sent !== true);

    console.log(`sendWelcomeEmails: found ${users.length} users pending welcome email (out of ${recentUsers?.length ?? 0} recent)`);

    if (users.length === 0) {
      return Response.json({ sent: 0, message: "No pending users" });
    }

    let sent = 0;
    let skipped = 0;

    for (const user of users) {
      if (!user.email) {
        skipped++;
        continue;
      }

      // Skip users older than 7 days (mark as done without emailing)
      const daysSinceCreation = (Date.now() - new Date(user.created_date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) {
        await base44.asServiceRole.entities.User.update(user.id, { welcome_email_sent: true });
        skipped++;
        continue;
      }

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        from_name: "Prisfall",
        subject: "🎉 Välkommen till Prisfall! Här är ditt första pristips",
        body: buildWelcomeEmailHtml(user.full_name, user.referral_code),
      });
      await base44.asServiceRole.entities.User.update(user.id, { welcome_email_sent: true });
      sent++;
      console.log(`Welcome email sent to ${user.email}`);
    }

    const msg = `Done: ${sent} welcome emails sent, ${skipped} skipped`;
    console.log(msg);
    return Response.json({ sent, skipped, message: msg });
  } catch (error) {
    console.error("sendWelcomeEmails error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});