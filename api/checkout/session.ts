// api/checkout/session.ts
import Stripe from 'stripe';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-01-28.clover' as any,
});

// Setup Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
  );
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { priceId, userId, userEmail, plan } = req.body;

  console.log('Checkout request received:', { priceId, userId, userEmail, plan });

  // Validate environment variables early
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error: Missing Stripe key' });
  }
  
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error: Missing Firebase config' });
  }

  try {
    // 1. FETCH USER DATA (To check trial eligibility)
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data();

    // Default to false if the field doesn't exist yet
    const hasUsedTrial = userData?.hasUsedTrial || false;

    // 2. CONFIGURE SESSION
    // Determine which plan based on priceId or plan param
    const isClonePlan = priceId?.includes('clone') || plan === 'clone';
    
    // Validate required fields
    if (!priceId) {
      console.error('Missing priceId for checkout');
      return res.status(400).json({ error: 'Missing priceId' });
    }
    
    const sessionConfig: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail || undefined,
      client_reference_id: userId,
      
      // Enable promotion codes
      allow_promotion_codes: true,
      
      // Keep your existing success/cancel URLs
      success_url: `${req.headers.origin}/payment-success?success=true&plan=${isClonePlan ? 'clone' : 'syndicate'}`,
      cancel_url: `${req.headers.origin}/dashboard`,
      
      metadata: {
        userId: userId,
        planName: isClonePlan ? 'clone' : 'syndicate'
      },
      
      subscription_data: {
        metadata: { userId: userId }
      }
    };

    // 3. THE MAGIC SWITCH: Apply Trial ONLY for Clone Plan if Eligible
    // Syndicate plan does NOT get a free trial
    if (isClonePlan && !hasUsedTrial) {
      console.log(`🎁 User ${userId} is eligible for a 14-day trial (Clone Plan).`);
      sessionConfig.subscription_data.trial_period_days = 14;
    } else if (isClonePlan && hasUsedTrial) {
      console.log(`User ${userId} has already used their trial. Standard billing.`);
    } else {
      console.log(`User ${userId} is subscribing to Syndicate plan - No trial available.`);
    }

    // 4. CREATE SESSION
    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('Checkout session created successfully:', session.id);
    
    // Return the session ID so client can redirect
    res.status(200).json({ 
      sessionId: session.id,
      url: session.url,
      customerId: session.customer
    });
  } catch (error: any) {
    console.error('Checkout Error:', error);
    
    // Extract detailed error information
    let errorMessage = 'Unknown error';
    
    if (error) {
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.type) {
        // Stripe errors often have 'type' and 'raw' properties
        errorMessage = error.type;
        if (error.raw?.message) {
          errorMessage = `${error.type}: ${error.raw.message}`;
        }
      }
    }
    
    res.status(500).json({ error: 'Error creating checkout session: ' + errorMessage });
  }
}
