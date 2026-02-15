// api/billing/subscription-status.ts
// Get current subscription status for a user
// SECURED: Requires Firebase ID token authentication

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import { requireAuth, validateUserAccess } from '../lib/verifyAuthToken';
import { SubscriptionStatus } from '../../types';

// Setup Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
  );
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// Setup Stripe (optional - for fetching live status)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2026-01-28.clover' as any,
  });
}

export default async function handler(req: any, res: any) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET allowed' } });
  }

  // SECURITY: Verify Firebase ID token
  const tokenUserId = await requireAuth(req);
  if (!tokenUserId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please log in.' } });
  }

  const userId = req.query.userId as string;

  // SECURITY: Validate that the authenticated user is requesting their own status
  if (!validateUserAccess(tokenUserId, userId)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only view your own subscription status.' } });
  }

  try {
    // Fetch user from Firestore
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }
    
    const userData = userSnap.data();
    
    // Determine subscription status
    let subscriptionStatus: SubscriptionStatus = 'none';
    
    if (userData?.subscriptionId) {
      if (userData?.cancelAtPeriodEnd === true) {
        subscriptionStatus = 'canceled';
      } else if (stripe && userData?.customerId) {
        // Try to get live status from Stripe
        try {
          const subscriptions = await stripe.subscriptions.list({
            customer: userData.customerId,
            status: 'all',
            limit: 1
          });
          
          if (subscriptions.data.length > 0) {
            const sub = subscriptions.data[0];
            if (sub.status === 'active') {
              subscriptionStatus = 'active';
            } else if (sub.status === 'past_due') {
              subscriptionStatus = 'past_due';
            } else if (sub.status === 'trialing') {
              subscriptionStatus = 'trialing';
            } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
              subscriptionStatus = 'canceled';
            }
          }
        } catch (stripeError) {
          console.warn('Could not fetch Stripe subscription status, using local data:', stripeError);
          // Fall back to local data
          subscriptionStatus = 'active';
        }
      } else {
        // No Stripe access, use local data
        subscriptionStatus = 'active';
      }
    }
    
    // Build response
    const response = {
      subscription: {
        id: userData?.subscriptionId || null,
        status: subscriptionStatus,
        plan: userData?.plan || 'echo',
        cancelAtPeriodEnd: userData?.cancelAtPeriodEnd || false,
        currentPeriodEnd: userData?.currentPeriodEnd || null,
        billingCycle: userData?.billingCycle || null,
        customerId: userData?.customerId || null
      },
      paymentWarning: userData?.paymentWarning || false
    };
    
    return res.status(200).json(response);
    
  } catch (error: any) {
    console.error('❌ Get subscription status error:', error);
    
    return res.status(500).json({ 
      error: { 
        code: 'SERVER_ERROR', 
        message: 'Failed to get subscription status. Please try again.' 
      } 
    });
  }
}
