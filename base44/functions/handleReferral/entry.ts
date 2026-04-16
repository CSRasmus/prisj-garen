import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { referral_code } = body;

    // Ensure this user has their own referral code set
    const myCode = user.id.substring(0, 8);
    const updates = {};

    if (!user.referral_code) {
      updates.referral_code = myCode;
    }

    // If a referral code was provided and we haven't recorded it yet
    if (referral_code && !user.referred_by && referral_code !== myCode) {
      updates.referred_by = referral_code;

      // Find the referrer and increment their count
      const allUsers = await base44.asServiceRole.entities.User.filter({ referral_code });
      const referrer = allUsers[0];
      if (referrer) {
        const newCount = (referrer.referred_count || 0) + 1;
        await base44.asServiceRole.entities.User.update(referrer.id, { referred_count: newCount });
        console.log(`Credited referral to ${referrer.id}, new count: ${newCount}`);
      }
    }

    if (Object.keys(updates).length > 0) {
      await base44.auth.updateMe(updates);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});