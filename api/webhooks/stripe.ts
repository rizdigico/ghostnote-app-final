// api/webhooks/stripe.ts
// AUTOMATION: Listens for Stripe payments & Upgrades users automatically.

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { buffer } from 'micro'; // You might need to install: npm install micro

// 1. Setup Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
  );
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// 2. Setup Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-01-28.clover', // Use your latest version
});

// This prevents Next.js from messing up the "Signature" check
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // 3. SECURITY: Verify the signal is actually from Stripe
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret as string);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 4. HANDLE THE PAYMENT
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    
    // We expect the User ID to be stored in the "client_reference_id" field
    // or inside "metadata". Check how your checkout button sends it!
    const userId = session.client_reference_id || session.metadata?.userId;

    if (userId) {
        console.log(`💰 Payment received for User: ${userId}`);
        
        // 5. UPDATE FIREBASE (The Magic)
        await db.collection('users').doc(userId).update({
            plan: 'syndicate',
            credits: 1000000, // <--- THE ONE MILLION CREDITS
            apiKey: `key_${Math.random().toString(36).substring(2, 15)}` // Generate a fresh key
        });
        
        console.log(`✅ User ${userId} upgraded to Syndicate (1M Credits).`);
    }
  }

  res.status(200).json({ received: true });
}
