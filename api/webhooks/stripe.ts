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
    const userId = session.client_reference_id;
    
    // READ THE STICKY NOTE
    const planName = session.metadata?.planName || 'syndicate'; 

    if (userId) {
        console.log(`💰 Payment for ${planName} by User: ${userId}`);

        // DEFINE CREDITS BASED ON PLAN
        let creditsAmount = 0;
        if (planName === 'syndicate') creditsAmount = 1000000; // 1 Million
        if (planName === 'clone') creditsAmount = 10000;       // <--- SET CLONE LIMIT HERE

        // UPDATE FIREBASE
        await db.collection('users').doc(userId).update({
            plan: planName, // 'clone' or 'syndicate'
            credits: creditsAmount,
            apiKey: `key_${Math.random().toString(36).substring(2, 15)}`
        });
        
        console.log(`✅ User upgraded to ${planName} with ${creditsAmount} credits.`);
    }
  }

  res.status(200).json({ received: true });
}
