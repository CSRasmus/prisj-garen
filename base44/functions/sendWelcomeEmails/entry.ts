import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = "https://prisfall.se";

function buildWelcomeEmailHtml(userName) {
  const firstName = userName ? userName.split(" ")[0] : "där";
  return `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:#ffffff;padding:32px 32px 16px;text-align:center;border-bottom:1px solid #f3f4f6;">
            <img src="https://media.base44.com/images/public/69e0849cd5247ba1a2f9090f/ab8f118b8_generated_image.png" width="80" height="80" alt="Prisfall" style="display:inline-block;border-radius:12px;"/>
            <p style="color:#6b7280;margin:8px 0 0;font-size:13px;">Prisbevakning för Amazon.se</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 24px;">
            <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 12px;">Hej ${firstName}! Välkommen till Prisfall 🎉</h2>
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0;">
              Du är nu en av de smarta shopparna som aldrig behöver betala för mycket på Amazon igen. Prisfall håller koll på priserna åt dig — helt automatiskt och helt gratis.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px;">
            <h3 style="color:#111827;font-size:16px;font-weight:700;margin:0 0 16px;">Kom igång på 3 enkla steg:</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                <span style="display:inline-block;background:#16a34a;color:#fff;font-size:12px;font-weight:700;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;margin-right:10px;">1</span>
                <span style="color:#374151;font-size:14px;">Lägg till din första produkt — klistra in en Amazon-länk</span>
              </td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
                <span style="display:inline-block;background:#16a34a;color:#fff;font-size:12px;font-weight:700;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;margin-right:10px;">2</span>
                <span style="color:#374151;font-size:14px;">Vi bevakar priset åt dig varje dag — automatiskt</span>
              </td></tr>
              <tr><td style="padding:10px 0;">
                <span style="display:inline-block;background:#16a34a;color:#fff;font-size:12px;font-weight:700;border-radius:50%;width:22px;height:22px;text-align:center;line-height:22px;margin-right:10px;">3</span>
                <span style="color:#374151;font-size:14px;">Du får ett mail direkt när priset sjunker!</span>
              </td></tr>
            </table>
            <div style="text-align:center;margin-top:24px;">
              <a href="${APP_URL}/add" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
                Lägg till din första produkt →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;">
              <h3 style="color:#15803d;font-size:14px;font-weight:700;margin:0 0 14px;">💡 Tips för att spara ännu mer</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:8px 0;border-bottom:1px solid #dcfce7;">
                  <p style="margin:0;font-size:13px;color:#374151;">💳 <strong>Norwegian-kortet</strong> ger dig extra cashback på alla köp. <a href="https://www.norwegian.com/se/frequent-flyer/norwegian-mastercard/" style="color:#16a34a;font-weight:600;">Läs mer →</a></p>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #dcfce7;">
                  <p style="margin:0;font-size:13px;color:#374151;">📦 <strong>Amazon Prime</strong> ger gratis frakt. <a href="https://www.amazon.se/amazonprime?tag=priskoll-21" style="color:#16a34a;font-weight:600;">Prova gratis →</a></p>
                </td></tr>
                <tr><td style="padding:8px 0;">
                  <p style="margin:0;font-size:13px;color:#374151;">👥 <strong>Bjud in en vän</strong> och lås upp 2 extra bevakningar. <a href="${APP_URL}/dashboard" style="color:#16a34a;font-weight:600;">Bjud in nu →</a></p>
                </td></tr>
              </table>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0 0 4px;line-height:1.6;">📉 Prisfall — Helt gratis, alltid.</p>
            <p style="color:#d1d5db;font-size:11px;margin:0;">Du får detta från Prisfall (prisfall.se)</p>
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

    const users = await base44.asServiceRole.entities.User.filter(
      { welcome_email_sent: false },
      "-created_date",
      50
    );

    console.log(`sendWelcomeEmails: found ${users?.length ?? 0} users pending welcome email`);

    if (!users || users.length === 0) {
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
        subject: "📉 Välkommen till Prisfall — börja spara idag!",
        body: buildWelcomeEmailHtml(user.full_name),
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