// api/webhooks/stripe.ts
// AUTOMATION: Listens for Stripe payments & Upgrades users automatically.
// ENHANCED: Security measures for payment processing

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

// --- SECURITY: WEBHOOK SIGNATURE VERIFICATION ---
// This is already handled by stripe.webhooks.constructEvent below

// --- SECURITY: RATE LIMITING FOR WEBHOOKS ---
const webhookAttempts = new Map<string, { count: number; resetTime: number }>();
const WEBHOOK_RATE_LIMIT = 100; // requests per hour
const WEBHOOK_WINDOW = 60 * 60 * 1000; // 1 hour

function checkWebhookRateLimit(customerId: string): boolean {
  const now = Date.now();
  const record = webhookAttempts.get(customerId);
  
  if (!record || now > record.resetTime) {
    webhookAttempts.set(customerId, { count: 1, resetTime: now + WEBHOOK_WINDOW });
    return true;
  }
  
  if (record.count >= WEBHOOK_RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

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

  // --- SECURITY: VALIDATE WEBHOOK SECRET EXISTS ---
  if (!webhookSecret) {
    console.error('Webhook secret not configured');
    return res.status(500).send('Webhook configuration error');
  }

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
    const customerId = session.customer;
    
    // --- SECURITY: RATE LIMIT CHECK ---
    if (customerId && !checkWebhookRateLimit(customerId)) {
      console.warn(`Rate limit exceeded for customer: ${customerId}`);
      return res.status(429).send('Rate limit exceeded');
    }
    
    // --- SECURITY: VALIDATE USER ID ---
    if (!userId || typeof userId !== 'string' || userId.length < 20) {
      console.error('Invalid user ID in webhook');
      return res.status(400).send('Invalid user ID');
    }
    
    const planName = session.metadata?.planName || 'syndicate';
    
    // Validate plan name
    if (!['clone', 'syndicate'].includes(planName)) {
      console.error('Invalid plan name in webhook');
      return res.status(400).send('Invalid plan');
    }
    
    if (userId) {
        console.log(`💰 Processing signup for ${planName} (User: ${userId})`);

        // A. Determine Credits based on plan and billing frequency
        // Use 'amount_subtotal' to check the price BEFORE coupons/discounts
        const originalPrice = session.amount_subtotal;
        let creditsAmount = 0;
        let billingCycle = 'monthly';

        if (planName === 'clone') {
            // Yearly: $244 (24400 cents), Monthly: $29 (2900 cents)
            if (originalPrice > 10000) {
                creditsAmount = 500 * 12; // Yearly: 6,000 Credits
                billingCycle = 'yearly';
                console.log("📅 Detected Yearly Clone Plan (via Subtotal)");
            } else {
                creditsAmount = 500; // Monthly
                console.log("📅 Detected Monthly Clone Plan");
            }
        } 
        
        if (planName === 'syndicate') {
            // Yearly: $832 (83200 cents), Monthly: $99 (9900 cents)
            if (originalPrice > 30000) {
                creditsAmount = 1000000 * 12; // Yearly: 12,000,000 Credits
                billingCycle = 'yearly';
                console.log("📅 Detected Yearly Syndicate Plan (via Subtotal)");
            } else {
                creditsAmount = 1000000; // Monthly
                console.log("📅 Detected Monthly Syndicate Plan");
            }
        }

        // B. Get User & API Key Logic
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        // --- SECURITY: CHECK USER EXISTS ---
        if (!userSnap.exists) {
            console.error(`User not found: ${userId}`);
            return res.status(404).send('User not found');
        }

        let finalApiKey = userData?.apiKey;
        if (!finalApiKey) {
            // Generate secure API key
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            finalApiKey = `key_${hex}`;
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
