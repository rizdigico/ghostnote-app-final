// api/webhooks/stripe.ts
// AUTOMATION: Listens for Stripe payments & Upgrades users automatically.

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { buffer } from 'micro';

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

  // 4. HANDLE THE EVENT
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const userId = session.client_reference_id;
    const planName = session.metadata?.planName || 'syndicate';
    
    if (userId) {
        console.log(`💰 Processing signup for ${planName} (User: ${userId})`);

        // A. Determine Credits based on plan and billing frequency
        // Detect yearly vs monthly by amount paid (in cents)
        const amountPaid = session.amount_total;
        let creditsAmount = 0;
        let billingCycle = 'monthly';

        if (planName === 'clone') {
            // Yearly: $244 (24400 cents), Monthly: $29 (2900 cents)
            if (amountPaid > 10000) {
                creditsAmount = 500 * 12; // Yearly: 6,000 Credits
                billingCycle = 'yearly';
                console.log("📅 Detected Yearly Clone Plan");
            } else {
                creditsAmount = 500; // Monthly
                console.log("📅 Detected Monthly Clone Plan");
            }
        } 
        
        if (planName === 'syndicate') {
            // Yearly: $832 (83200 cents), Monthly: $99 (9900 cents)
            if (amountPaid > 30000) {
                creditsAmount = 1000000 * 12; // Yearly: 12,000,000 Credits
                billingCycle = 'yearly';
                console.log("📅 Detected Yearly Syndicate Plan");
            } else {
                creditsAmount = 1000000; // Monthly
                console.log("📅 Detected Monthly Syndicate Plan");
            }
        }

        // B. Get User & API Key Logic
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        let finalApiKey = userData?.apiKey;
        if (!finalApiKey) {
            finalApiKey = `key_${Math.random().toString(36).substring(2, 15)}`;
        }

        // C. UPDATE DATABASE
        await userRef.update({
            plan: planName,
            billingCycle: billingCycle, // Track monthly/yearly
            status: 'active',
            credits: creditsAmount,
            apiKey: finalApiKey,
            
            // MARK TRIAL AS USED (only for Clone plan first purchase)
            ...(planName === 'clone' && !userData?.hasUsedTrial ? { hasUsedTrial: true } : {})
        });
        
        console.log(`✅ User ${userId} unlocked ${planName} plan (${billingCycle}) with ${creditsAmount} credits.`);
    }
  }

  // 5. HANDLE TRIAL END (when subscription becomes active after trial)
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as any;
    const userId = subscription.metadata?.userId;
    
    if (userId && subscription.status === 'active' && subscription.trial_end) {
        // Check if trial just ended (within last 24 hours)
        const trialEndedRecently = (Date.now() / 1000) - subscription.trial_end < 86400;
        
        if (trialEndedRecently) {
            console.log(`Trial ended for user ${userId}, subscription is now active`);
            // Could send email notification here
        }
    }
  }

  res.status(200).json({ received: true });
}
