import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function formatPrice(p) {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(p);
}

function buildEmailHtml(userName, deals, dateStr) {
  const dealsHtml = deals.map(d => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <tr>
        <td width="96" style="padding: 16px; vertical-align: top;">
          ${d.image_url ? `<img src="${d.image_url}" alt="" width="80" height="80" style="display:block; border-radius: 8px; object-fit: contain; background: #f3f4f6;" />` : ""}
        </td>
        <td style="padding: 16px 16px 16px 0; vertical-align: top;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">${d.category_emoji || ""} ${d.category}</div>
          <div style="font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 8px; line-height: 1.4;">${d.title}</div>
          <div style="display: inline-block; background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; margin-bottom: 10px;">${d.badge}</div>
          <div style="margin-bottom: 12px;">
            <span style="font-size: 22px; font-weight: 800; color: #16a34a;">${formatPrice(d.current_price)}</span>
            <span style="font-size: 13px; color: #9ca3af; text-decoration: line-through; margin-left: 8px;">${formatPrice(d.median_price)}</span>
          </div>
          <a href="${d.amazon_url}" style="display: inline-block; background: #16a34a; color: #ffffff; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px; text-decoration: none;">Köp på Amazon →</a>
        </td>
      </tr>
    </table>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; padding: 32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden;">
        <tr><td style="padding: 32px 24px; text-align: center; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);">
          <div style="display: inline-block; background: #ffffff; width: 48px; height: 48px; border-radius: 12px; line-height: 48px; font-size: 24px; margin-bottom: 12px;">📉</div>
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0;">🔥 Veckans bästa deals</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 6px 0 0 0;">${dateStr}</p>
        </td></tr>
        <tr><td style="padding: 24px;">
          <p style="font-size: 16px; margin: 0 0 8px 0;">Hej ${userName || "där"}!</p>
          <p style="font-size: 14px; color: #4b5563; margin: 0 0 24px 0; line-height: 1.6;">
            Här är de 5 bästa prisfallen på Amazon.se denna vecka — handplockade åt dig.
          </p>
          ${dealsHtml}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
            <tr><td style="padding: 20px; text-align: center;">
              <p style="font-size: 15px; font-weight: 600; margin: 0 0 8px 0; color: #111827;">💡 Vill du få notiser på dina EGNA favoriter?</p>
              <p style="font-size: 13px; color: #4b5563; margin: 0 0 16px 0; line-height: 1.5;">
                Lägg till produkter du funderar på att köpa, så hör vi av oss när priset sjunker.
              </p>
              <a href="https://prisfall.se/add" style="display: inline-block; background: #16a34a; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Kom igång →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding: 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; line-height: 1.6;">
          Du får detta mail för att du är medlem på Prisfall.<br/>
          <a href="https://prisfall.se" style="color: #16a34a; text-decoration: none;">prisfall.se</a> · 
          <a href="https://prisfall.se/dashboard" style="color: #6b7280; text-decoration: underline;">Hantera prenumeration</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow either an authenticated admin (manual test) OR scheduled invocation (no user)
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const testEmail = body?.test_email || null;

    if (testEmail && (!user || user.role !== 'admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Fetch deals via the weeklyDeals function
    const dealsRes = await base44.functions.invoke("weeklyDeals", {});
    const deals = dealsRes?.data?.deals || dealsRes?.deals || [];

    if (deals.length === 0) {
      console.log("sendWeeklyDealsEmail: no deals qualified, skipping send");
      return Response.json({ sent: 0, errors: 0, reason: "no deals" });
    }

    const dateStr = new Date().toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
    const subject = `🔥 Veckans bästa Amazon-deals — ${dateStr}`;

    // 2. Determine recipients
    let recipients = [];
    if (testEmail) {
      recipients = [{ email: testEmail, full_name: user?.full_name || "test" }];
    } else {
      recipients = await base44.asServiceRole.entities.User.list("-created_date", 5000);
    }

    let sent = 0;
    let errors = 0;
    const errorList = [];

    for (const recipient of recipients) {
      if (!recipient.email) continue;
      try {
        const html = buildEmailHtml(recipient.full_name || recipient.email, deals, dateStr);
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: "Prisfall",
          to: recipient.email,
          subject,
          body: html,
        });
        sent++;
      } catch (err) {
        errors++;
        errorList.push({ email: recipient.email, error: err.message });
        console.error(`Failed to email ${recipient.email}:`, err.message);
      }
    }

    console.log(`sendWeeklyDealsEmail: sent=${sent} errors=${errors} deals=${deals.length}`);
    return Response.json({ sent, errors, deals: deals.length, errorList: errorList.slice(0, 10) });
  } catch (error) {
    console.error("sendWeeklyDealsEmail error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});