// api/checkout/session.ts
// This creates the secure Stripe Payment Link

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-01-28.clover' as any, // Matches your version
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, priceId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // CREATE THE CHECKOUT SESSION
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', // Change to 'payment' if it is a one-time fee
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1StVDAJeTnM8efjPRUpn1xOV', // The ID you copied from Stripe (price_...)
          quantity: 1,
        },
      ],
      // CRITICAL: This is how the Webhook knows who to upgrade!
      client_reference_id: userId, 
      
      // Where to send them after payment
      success_url: `${req.headers.origin}/dashboard?success=true`,
      cancel_url: `${req.headers.origin}/dashboard?canceled=true`,
    });

    // Send the URL back to the frontend so we can redirect the user
    return res.status(200).json({ url: session.url });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
