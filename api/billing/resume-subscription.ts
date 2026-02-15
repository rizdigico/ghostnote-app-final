// api/billing/resume-subscription.ts
// PHASE 2: Retention Feature - Undo cancellation before period end
// SECURED: Requires Firebase ID token authentication

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { sendResumptionEmail } from '../lib/emailService';
import { requireAuth, validateUserAccess } from '../lib/verifyAuthToken';

// Setup Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
  );
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// Setup Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-01-28.clover' as any,
});

// Rate limiting for resume endpoint
const resumeAttempts = new Map<string, { count: number; resetTime: number }>();
const RESUME_RATE_LIMIT = 10;
const RESUME_WINDOW = 60 * 1000; // 1 minute

function checkResumeRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = resumeAttempts.get(userId);
  
  if (!record || now > record.resetTime) {
    resumeAttempts.set(userId, { count: 1, resetTime: now + RESUME_WINDOW });
    return true;
  }
  
  if (record.count >= RESUME_RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' } });
  }

  // SECURITY: Verify Firebase ID token
  const tokenUserId = await requireAuth(req);
  if (!tokenUserId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please log in.' } });
  }

  const { userId } = req.body;

  // SECURITY: Validate that the authenticated user is modifying their own subscription
  if (!validateUserAccess(tokenUserId, userId)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only modify your own subscription.' } });
  }

  // Validate input
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing or invalid userId' } });
  }

  // Check rate limit
  if (!checkResumeRateLimit(userId)) {
    return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } });
  }

  // Validate environment
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set');
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server configuration error' } });
  }

  try {
    // 1. Fetch user from Firestore (use tokenUserId as source of truth)
    const userRef = db.collection('users').doc(tokenUserId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }
    
    const userData = userSnap.data();
    
    // 2. Check if user has a subscription
    const subscriptionId = userData?.subscriptionId;
    
    if (!subscriptionId) {
      return res.status(400).json({ 
        error: { 
          code: 'NO_SUBSCRIPTION', 
          message: 'No active subscription found' 
        } 
      });
    }
    
    // 3. Check if user has a scheduled cancellation to resume
    if (userData?.cancelAtPeriodEnd !== true) {
      return res.status(400).json({ 
        error: { 
          code: 'NOT_CANCELING', 
          message: 'No cancellation scheduled to resume. Your subscription is active.' 
        } 
      });
    }

    // 4. Call Stripe to update subscription (cancel the cancellation!)
    console.log(`🔄 Resuming subscription ${subscriptionId} for user ${userId}`);
    
    const updatedSubscription: any = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    // 5. Calculate new period end
    const currentPeriodEnd = new Date(updatedSubscription.current_period_end * 1000).toISOString();

    // 6. Update Firestore user record
    await userRef.update({
      cancelAtPeriodEnd: false,
      currentPeriodEnd: currentPeriodEnd,
    });

    console.log(`✅ Subscription ${subscriptionId} resumed. Access until ${currentPeriodEnd}`);

    // 7. Send resumption confirmation email (async, don't await)
    sendResumptionEmail(
      userData.email,
      userData.name,
      userData.plan,
      currentPeriodEnd
    ).catch(err => console.error('Failed to send resumption email:', err));

    // 8. Return success response
    return res.status(200).json({
      success: true,
      message: `Welcome back! Your subscription is now active. You have full access until ${new Date(currentPeriodEnd).toLocaleDateString()}.`,
      subscription: {
        id: updatedSubscription.id,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: currentPeriodEnd,
      },
    });

  } catch (error: any) {
    console.error('❌ Resume subscription error:', error);
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeError') {
      return res.status(400).json({ 
        error: { 
          code: 'STRIPE_ERROR', 
          message: error.message || 'Payment provider error' 
        } 
      });
    }
    
    return res.status(500).json({ 
      error: { 
        code: 'SERVER_ERROR', 
        message: 'Failed to resume subscription. Please try again.' 
      } 
    });
  }
}
