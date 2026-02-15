// api/billing/cancel-subscription.ts
// PHASE 1: Graceful Exit - Cancel at end of billing period
// SECURED: Requires Firebase ID token authentication

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { sendCancellationEmail, formatDate } from '../lib/emailService';
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

// Rate limiting for cancel endpoint
const cancelAttempts = new Map<string, { count: number; resetTime: number }>();
const CANCEL_RATE_LIMIT = 10;
const CANCEL_WINDOW = 60 * 1000; // 1 minute

function checkCancelRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = cancelAttempts.get(userId);
  
  if (!record || now > record.resetTime) {
    cancelAttempts.set(userId, { count: 1, resetTime: now + CANCEL_WINDOW });
    return true;
  }
  
  if (record.count >= CANCEL_RATE_LIMIT) {
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
  if (!checkCancelRateLimit(userId)) {
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
    
    // 2. Check if user has an active subscription
    const subscriptionId = userData?.subscriptionId;
    
    if (!subscriptionId) {
      // User doesn't have an active subscription - nothing to cancel
      return res.status(400).json({ 
        error: { 
          code: 'NO_SUBSCRIPTION', 
          message: 'No active subscription found to cancel' 
        } 
      });
    }
    
    // 3. Check if already scheduled for cancellation
    if (userData?.cancelAtPeriodEnd === true) {
      return res.status(400).json({ 
        error: { 
          code: 'ALREADY_CANCELING', 
          message: 'Subscription is already scheduled for cancellation',
          cancelDate: userData.currentPeriodEnd
        } 
      });
    }

    // 4. Call Stripe to update subscription (cancel at period end)
    console.log(`📝 Cancelling subscription ${subscriptionId} at period end for user ${userId}`);
    
    const updatedSubscription: any = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // 5. Calculate when access will end
    const cancelDate = new Date(updatedSubscription.current_period_end * 1000).toISOString();

    // 6. Update Firestore user record
    await userRef.update({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: cancelDate,
    });

    console.log(`✅ Subscription ${subscriptionId} will cancel on ${cancelDate}`);

    // 7. Send cancellation confirmation email (async, don't await)
    sendCancellationEmail(
      userData.email,
      userData.name,
      userData.plan,
      cancelDate
    ).catch(err => console.error('Failed to send cancellation email:', err));

    // 8. Return success response
    return res.status(200).json({
      success: true,
      cancelDate: cancelDate,
      message: `Your subscription will end on ${new Date(cancelDate).toLocaleDateString()}. You have full access until then.`,
      subscription: {
        id: updatedSubscription.id,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: cancelDate,
      },
    });

  } catch (error: any) {
    console.error('❌ Cancel subscription error:', error);
    
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
        message: 'Failed to cancel subscription. Please try again.' 
      } 
    });
  }
}
