import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = "https://prisfall.se";

function buildVerificationEmailHtml(token) {
  const verifyUrl = `${APP_URL}/verify?token=${token}`;
  return `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:36px 32px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">✉️</div>
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;">Prisfall</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Bekräfta din e-postadress</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Hej! Klicka på knappen nedan för att bekräfta din e-postadress och börja ta emot prisnotiser.
            </p>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${verifyUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:16px;font-weight:700;padding:16px 36px;border-radius:12px;text-decoration:none;">
                Bekräfta e-post →
              </a>
            </div>
            <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">🕐 Länken är giltig i 24 timmar.</p>
            <p style="color:#9ca3af;font-size:12px;margin:0;">Om du inte registrerat dig kan du ignorera detta mail.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Cron job: ONLY sends verification emails to new unverified users
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Find users who haven't received a welcome email yet (i.e. new, unverified users)
    const users = await base44.asServiceRole.entities.User.filter(
      { welcome_email_sent: false },
      "-created_date",
      50
    );

    console.log(`sendWelcomeEmails (cron): found ${users?.length ?? 0} users with welcome_email_sent=false`);

    if (!users || users.length === 0) {
      return Response.json({ verificationSent: 0, message: "No pending users" });
    }

    let verificationCount = 0;
    let skipped = 0;

    for (const user of users) {
      if (!user.email) {
        console.log(`Skipping user ${user.id} — no email`);
        skipped++;
        continue;
      }

      // Skip users older than 7 days (mark as done without emailing)
      const createdAt = new Date(user.created_date);
      const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) {
        console.log(`Marking stale user ${user.email} as done (no email sent)`);
        await base44.asServiceRole.entities.User.update(user.id, { welcome_email_sent: true });
        skipped++;
        continue;
      }

      // If already verified but welcome not sent — mark done (verifyEmail.js handles this case directly)
      if (user.email_verified === true) {
        console.log(`User ${user.email} is verified but welcome_email_sent=false — marking done`);
        await base44.asServiceRole.entities.User.update(user.id, { welcome_email_sent: true });
        skipped++;
        continue;
      }

      // Avoid spamming: skip if verification was sent less than 1h ago
      if (user.verification_sent_at) {
        const sentAt = new Date(user.verification_sent_at);
        const hoursSince = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 1) {
          console.log(`Skipping ${user.email} — verification sent less than 1h ago`);
          skipped++;
          continue;
        }
      }

      // Send verification email
      const token = crypto.randomUUID();
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.User.update(user.id, {
        verification_token: token,
        verification_sent_at: now,
      });
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        from_name: "Prisfall",
        subject: "Bekräfta din e-post på Prisfall",
        body: buildVerificationEmailHtml(token),
      });
      verificationCount++;
      console.log(`Verification email sent to ${user.email}`);
    }

    const msg = `Done: ${verificationCount} verification emails sent, ${skipped} skipped`;
    console.log(msg);
    return Response.json({ verificationSent: verificationCount, skipped, message: msg });
  } catch (error) {
    console.error("sendWelcomeEmails error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});