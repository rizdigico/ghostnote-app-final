// api/checkout/session.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-01-28.clover' as any,
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Receive the 'plan' from the frontend
    const { userId, priceId, plan } = req.body; 

    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      
      client_reference_id: userId,

      // 2. ATTACH THE STICKY NOTE (METADATA)
      metadata: {
        planName: plan || 'syndicate' // Store 'clone' or 'syndicate' here
      },

      success_url: `${req.headers.origin}/dashboard?success=true`,
      cancel_url: `${req.headers.origin}/dashboard?canceled=true`,
    });

    return res.status(200).json({ url: session.url });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
