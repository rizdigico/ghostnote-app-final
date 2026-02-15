// api/user/delete-account.ts
// SAFE ACCOUNT DELETION - Prevents zombie charges by cancelling Stripe subscription first
// SECURED: Requires Firebase ID token authentication

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import Stripe from 'stripe';
import { requireAuth, validateUserAccess } from '../lib/verifyAuthToken';

// Setup Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
  );
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();
const adminAuth = getAuth();

// Setup Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-01-28.clover' as any,
});

// Rate limiting for delete endpoint
const deleteAttempts = new Map<string, { count: number; resetTime: number }>();
const DELETE_RATE_LIMIT = 5;
const DELETE_WINDOW = 60 * 1000; // 1 minute

function checkDeleteRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = deleteAttempts.get(userId);
  
  if (!record || now > record.resetTime) {
    deleteAttempts.set(userId, { count: 1, resetTime: now + DELETE_WINDOW });
    return true;
  }
  
  if (record.count >= DELETE_RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

export default async function handler(req: any, res: any) {
  // Only allow DELETE
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only DELETE or POST allowed' } });
  }

  // SECURITY: Verify Firebase ID token
  const tokenUserId = await requireAuth(req);
  if (!tokenUserId) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please log in.' } });
  }

  const { userId } = req.body || req.query;

  // SECURITY: Validate that the authenticated user is deleting their own account
  if (!validateUserAccess(tokenUserId, userId)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only delete your own account.' } });
  }

  // Check rate limit
  if (!checkDeleteRateLimit(tokenUserId)) {
    return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many delete attempts. Please try again later.' } });
  }

  // Validate environment
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set');
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server configuration error' } });
  }

  try {
    // Step 1: Fetch user from Firestore
    console.log(`🔍 Checking user ${tokenUserId} for active subscription before deletion...`);
    const userRef = db.collection('users').doc(tokenUserId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      // User document doesn't exist - might already be deleted
      // Still try to delete from Auth
      console.log(`User document not found, proceeding with Auth deletion only`);
    }
    
    const userData = userSnap.exists ? userSnap.data() : null;
    
    // Step 2: Check if user has an active subscription
    const subscriptionId = userData?.subscriptionId;
    
    if (subscriptionId) {
      console.log(`⚠️ User has active subscription ${subscriptionId}. Cancelling first...`);
      
      try {
        // Cancel the Stripe subscription IMMEDIATELY
        await stripe.subscriptions.cancel(subscriptionId);
        console.log(`✅ Stripe subscription ${subscriptionId} cancelled successfully`);
      } catch (stripeError: any) {
        console.error(`❌ Failed to cancel Stripe subscription:`, stripeError);
        
        // CRITICAL: Do NOT delete user if Stripe cancellation fails
        // This prevents zombie charges
        return res.status(403).json({ 
          error: { 
            code: 'SUBSCRIPTION_CANCEL_FAILED', 
            message: 'Could not cancel your subscription. Your account has NOT been deleted. Please contact support if this issue persists.' 
          }
        });
      }
    } else {
      console.log(`ℹ️ No active subscription found for user ${tokenUserId}`);
    }

    // Step 3: Delete Firestore user document
    if (userSnap.exists) {
      console.log(`🗑️ Deleting Firestore user document for ${tokenUserId}...`);
      await userRef.delete();
      console.log(`✅ Firestore document deleted`);
    }

    // Step 4: Delete Firebase Auth user
    console.log(`🔐 Deleting Firebase Auth user ${tokenUserId}...`);
    await adminAuth.deleteUser(tokenUserId);
    console.log(`✅ Firebase Auth user deleted`);

    // Step 5: Return success
    console.log(`✅ Account deletion completed for user ${tokenUserId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully. Any active subscription has been cancelled.'
    });

  } catch (error: any) {
    console.error('❌ Account deletion error:', error);
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/user-not-found') {
      // User already deleted from Auth, but we should still try to clean up Firestore
      console.log('User not found in Auth, attempting Firestore cleanup...');
      try {
        await db.collection('users').doc(tokenUserId).delete();
      } catch (cleanupError) {
        console.error('Firestore cleanup failed:', cleanupError);
      }
      return res.status(200).json({
        success: true,
        message: 'Account already deleted.'
      });
    }
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeError') {
      return res.status(400).json({ 
        error: { 
          code: 'STRIPE_ERROR', 
          message: error.message || 'Payment provider error. Your account has NOT been deleted.' 
        } 
      });
    }
    
    return res.status(500).json({ 
      error: { 
        code: 'SERVER_ERROR', 
        message: 'Failed to delete account. Please try again.' 
      } 
    });
  }
}
