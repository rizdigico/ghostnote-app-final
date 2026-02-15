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

// --- TRIAL ABUSE PREVENTION: Card Fingerprinting ---

/**
 * Retrieves the card fingerprint from Stripe after checkout completion
 * @param session - The Stripe checkout session
 * @returns The card fingerprint or null
 */
async function getCardFingerprint(session: any): Promise<string | null> {
  try {
    // Get the payment method used in the checkout
    const paymentMethodId = session.payment_method;
    
    if (!paymentMethodId) {
      console.log('No payment method found in session');
      return null;
    }
    
    // Retrieve the payment method from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    // Extract the card fingerprint
    const fingerprint = paymentMethod.card?.fingerprint;
    
    if (fingerprint) {
      console.log(`Card fingerprint retrieved: ${fingerprint}`);
    }
    return fingerprint || null;
  } catch (error: any) {
    console.error('Error retrieving payment method:', error.message);
    return null;
  }
}

/**
 * Checks if a card fingerprint has been used for a trial before
 * Queries all users to see if any have used this card for a trial
 * @param fingerprint - The card fingerprint to check
 * @returns true if the card has been used for a trial before
 */
async function hasCardUsedTrial(fingerprint: string): Promise<boolean> {
  try {
    // Query users collection for any user with this fingerprint
    const snapshot = await db.collection('users')
      .where('payment_fingerprint', '==', fingerprint)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return false; // New card, no previous trial
    }
    
    // Check if the user with this fingerprint had a trial
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    
    // Consider it a "used trial" if the user has used a trial before
    // We check hasUsedTrial flag which is set when trial is successfully used
    const hasUsedTrial = userData.hasUsedTrial === true;
    
    console.log(`Card ${fingerprint} found in user ${userDoc.id}, hasUsedTrial: ${hasUsedTrial}`);
    return hasUsedTrial;
  } catch (error: any) {
    console.error('Error checking fingerprint:', error.message);
    // Default to "used" for security (fail closed)
    return true;
  }
}

/**
 * Removes the trial period from a subscription so user is charged immediately
 * @param subscriptionId - The Stripe subscription ID
 */
async function removeTrialFromSubscription(subscriptionId: string): Promise<boolean> {
  try {
    // Update the subscription to remove trial period
    // Use any type to bypass TypeScript strict checking for this Stripe feature
    await stripe.subscriptions.update(subscriptionId, {
      trial_period_days: 0,
      proration_behavior: 'create_prorations'
    } as any);
    
    console.log(`Trial removed from subscription ${subscriptionId}`);
    return true;
  } catch (error: any) {
    console.error('Error removing trial from subscription:', error.message);
    return false;
  }
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

        // --- TRIAL ABUSE PREVENTION: Card Fingerprint Check ---
        let paymentFingerprint: string | null = null;
        let trialEligibility = 'eligible'; // 'eligible', 'ineligible', 'error'
        let trialWasRemoved = false;

        // Only check fingerprint for Clone plan with trial requested
        const trialRequested = session.subscription_data?.metadata?.trialRequested === 'true' || 
                              session.metadata?.trialRequested === 'true';
        
        if (planName === 'clone' && trialRequested) {
            console.log(`🔍 Checking card fingerprint for trial eligibility (User: ${userId})`);
            
            // Get the card fingerprint from Stripe
            paymentFingerprint = await getCardFingerprint(session);
            
            if (paymentFingerprint) {
                // Check if this card has been used for a trial before
                const hasUsed = await hasCardUsedTrial(paymentFingerprint);
                
                if (hasUsed) {
                    trialEligibility = 'ineligible';
                    console.log(`⚠️ Card fingerprint ${paymentFingerprint.substring(0, 10)}... has been used for a trial before. Removing trial.`);
                    
                    // Remove the trial from the subscription
                    const subscriptionId = session.subscription;
                    if (subscriptionId) {
                        trialWasRemoved = await removeTrialFromSubscription(subscriptionId);
                    }
                } else {
                    trialEligibility = 'eligible';
                    console.log(`✅ Card fingerprint ${paymentFingerprint.substring(0, 10)}... is new. Trial allowed.`);
                }
            } else {
                // Could not retrieve fingerprint - fail closed (no trial)
                trialEligibility = 'error';
                console.error('Could not retrieve card fingerprint, failing closed - removing trial');
                
                // Remove trial as safety measure
                const subscriptionId = session.subscription;
                if (subscriptionId) {
                    trialWasRemoved = await removeTrialFromSubscription(subscriptionId);
                }
            }
        } else {
            console.log(`ℹ️ Trial check skipped - Plan: ${planName}, Trial requested: ${trialRequested}`);
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
            
            // Store subscription and customer IDs for lifecycle management
            subscriptionId: session.subscription,
            customerId: customerId,
            currentPeriodEnd: null, // Will be set on first subscription update
            cancelAtPeriodEnd: false,
            paymentWarning: false,
            
            // TRIAL ABUSE PREVENTION: Save payment fingerprint
            payment_fingerprint: paymentFingerprint,
            
            // MARK TRIAL AS USED (only for Clone plan with eligible trial)
            // If trial was removed due to card reuse, still mark as used to prevent future abuse
            ...(planName === 'clone' && (trialEligibility === 'eligible' || trialEligibility === 'ineligible') 
                ? { hasUsedTrial: true } 
                : {})
        });
        
        // Log trial removal for monitoring
        if (trialWasRemoved) {
            console.log(`📧 Trial removed for user ${userId} - card was used for previous trial`);
        }
        
        console.log(`✅ User ${userId} unlocked ${planName} plan (${billingCycle}) with ${creditsAmount} credits. Trial eligibility: ${trialEligibility}`);
    }
  }

  // 5. HANDLE TRIAL END (when subscription becomes active after trial)
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as any;
    const userId = subscription.metadata?.userId;
    
    if (!userId) {
      console.log('No userId in subscription update, skipping');
      res.status(200).json({ received: true });
      return;
    }
    
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      console.error(`User not found for subscription update: ${userId}`);
      res.status(200).json({ received: true });
      return;
    }
    
    // Handle trial end notification
    if (subscription.status === 'active' && subscription.trial_end) {
        // Check if trial just ended (within last 24 hours)
        const trialEndedRecently = (Date.now() / 1000) - subscription.trial_end < 86400;
        
        if (trialEndedRecently) {
            console.log(`Trial ended for user ${userId}, subscription is now active`);
            // Could send email notification here
        }
    }
    
    // Update subscription lifecycle fields
    const currentPeriodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;
    
    await userRef.update({
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      currentPeriodEnd: currentPeriodEnd,
    });
    
    console.log(`📝 Subscription updated for user ${userId}: cancel_at_period_end=${subscription.cancel_at_period_end}, period_end=${currentPeriodEnd}`);
  }

  // 6. HANDLE SUBSCRIPTION DELETION (immediate cancellation or expiration)
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any;
    const userId = subscription.metadata?.userId;
    
    if (!userId) {
      console.log('No userId in subscription deletion, skipping');
      res.status(200).json({ received: true });
      return;
    }
    
    console.log(`🗑️ Subscription deleted for user ${userId}, downgrading to Echo plan`);
    
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      console.error(`User not found for subscription deletion: ${userId}`);
      res.status(200).json({ received: true });
      return;
    }
    
    // Downgrade user to Echo plan
    await userRef.update({
      plan: 'echo',
      subscriptionId: null, // Clear subscription ID
      customerId: null, // Clear customer ID
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      credits: 10, // Reset to free tier credits
      billingCycle: null,
    });
    
    console.log(`✅ User ${userId} downgraded to Echo plan after subscription deletion`);
    
    // TODO: Send subscription ended email
  }

  // 7. HANDLE PAYMENT FAILURE
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as any;
    const customerId = invoice.customer;
    
    if (!customerId) {
      console.log('No customerId in payment failure, skipping');
      res.status(200).json({ received: true });
      return;
    }
    
    console.log(`⚠️ Payment failed for customer ${customerId}`);
    
    // Find user by customerId
    const userQuery = await db.collection('users')
      .where('customerId', '==', customerId)
      .limit(1)
      .get();
    
    if (userQuery.empty) {
      console.log(`No user found for customer ${customerId}`);
      res.status(200).json({ received: true });
      return;
    }
    
    const userId = userQuery.docs[0].id;
    const userRef = db.collection('users').doc(userId);
    
    // Set payment warning flag
    await userRef.update({
      paymentWarning: true,
    });
    
    console.log(`⚠️ Payment warning set for user ${userId}`);
    
    // TODO: Send payment failed email
  }

  res.status(200).json({ received: true });
}
