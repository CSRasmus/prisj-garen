import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) return Response.json({ error: 'Token required' }, { status: 400 });

    // Find user with this token
    const users = await base44.asServiceRole.entities.User.filter({ verification_token: token }, "-created_date", 1);
    if (!users || users.length === 0) {
      return Response.json({ error: 'Ogiltig eller redan använd länk' }, { status: 404 });
    }

    const user = users[0];

    // Check token age (24h)
    if (user.verification_sent_at) {
      const sentAt = new Date(user.verification_sent_at);
      const hoursSince = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince > 24) {
        return Response.json({ error: 'Länken har gått ut. Begär en ny verifieringslänk.' }, { status: 410 });
      }
    }

    // Mark verified and clear token
    await base44.asServiceRole.entities.User.update(user.id, {
      email_verified: true,
      verification_token: null,
      verification_sent_at: null,
    });

    console.log(`Email verified for user: ${user.email}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error("verifyEmail error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});