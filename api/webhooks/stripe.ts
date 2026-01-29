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
    
    // Read the Plan Name from the sticky note (or default to syndicate)
    const planName = session.metadata?.planName || 'syndicate'; 

    if (userId) {
        console.log(`💰 Payment for ${planName} by User: ${userId}`);

        // 1. Determine Credits
        let creditsAmount = 0;
        if (planName === 'syndicate') creditsAmount = 1000000; 
        if (planName === 'clone') creditsAmount = 500; 

        // 2. CHECK EXISTING USER DATA
        // We fetch the user first to see if they already have an API key.
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        // 3. DECIDE API KEY
        // If they have a key, KEEP IT. If not, generate a new one.
        let finalApiKey = userData?.apiKey;
        
        if (!finalApiKey) {
            console.log("Generating new key for user...");
            finalApiKey = `key_${Math.random().toString(36).substring(2, 15)}`;
        }

        // 4. UPDATE DATABASE (Safe Update)
        await userRef.update({
            plan: planName,
            credits: creditsAmount,
            apiKey: finalApiKey // This now keeps the old key if it existed
        });
        
        console.log(`✅ User updated: ${planName}. Key Preserved: ${!!userData?.apiKey}`);
    }
  }

  res.status(200).json({ received: true });
}
