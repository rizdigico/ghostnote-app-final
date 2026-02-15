# Trial Abuse Prevention System - Implementation Plan
# GhostNote SaaS - Card Fingerprinting for Free Trial Protection

## Executive Summary

This document outlines the implementation plan for preventing free trial abuse through card fingerprinting. Currently, users exploit the system by creating multiple accounts with different emails but using the same credit card to receive infinite free trials.

## Problem Statement

**Current Behavior:**
- Users can create multiple accounts with different email addresses
- Each account gets a 14-day free trial on the "Clone" plan
- The same credit card can be used across different accounts
- No mechanism exists to detect card reuse

**Desired Behavior:**
- Each credit card can only receive ONE free trial across ALL accounts
- If a card has been used for a trial before, subsequent attempts should either:
  - Be blocked entirely (hard block), OR
  - Have the trial removed and be charged immediately (smart conversion)

---

## Architecture Overview

### Current System Flow

```
User selects Clone plan
        ↓
PricingModal → calls /api/checkout/session
        ↓
Checkout Session API:
  - Checks hasUsedTrial flag on user
  - If false, adds trial_period_days: 14
  - Creates Stripe Checkout Session
        ↓
User completes payment on Stripe
        ↓
Stripe Webhook (checkout.session.completed):
  - Updates user with plan, credits, subscription
  - Sets hasUsedTrial: true (only for Clone plan)
```

### New System Flow (With Card Fingerprinting)

```
User selects Clone plan
        ↓
PricingModal → calls /api/checkout/session
        ↓
Checkout Session API:
  - Creates checkout session with trial (tentative)
  - NOTE: Actual fingerprint check happens in WEBHOOK after payment
        ↓
User completes payment on Stripe
        ↓
Stripe Webhook (checkout.session.completed):
  1. Retrieve PaymentMethod from Stripe using session.payment_method
  2. Extract card.fingerprint from PaymentMethod
  3. Query Firestore: check if ANY user has this payment_fingerprint
  4. IF found (card was used before):
     - Create subscription WITHOUT trial period
     - Send notification to user about trial removal
     - Save fingerprint to user record (for future reference)
  5. IF not found (new card):
     - Create subscription WITH trial period (14 days)
     - Save fingerprint to user record
```

---

## Phase 1: Database Schema Update

### Firestore User Collection Changes

Add the following field to the `users` collection:

| Field | Type | Description |
|-------|------|-------------|
| `payment_fingerprint` | string | Stripe card fingerprint (e.g., `card_123abc_fingerprint`) - Indexed |

### Implementation

Since we're using Firestore (not SQL), we don't need a migration script. The field will be added when the first user subscribes with a trial.

**Index Creation:**
```javascript
// In Firestore console, create a single-field index:
// Collection: users
// Field: payment_fingerprint
// Query scope: Collection
```

---

## Phase 2: Backend Implementation

### 2.1 Update Checkout Session API

**File:** `api/checkout/session.ts`

**Changes:**
- No major changes needed at this stage
- The fingerprint check happens in the webhook AFTER payment
- Add metadata to pass through to webhook for tracking

**Modified Section (lines 70-78):**
```typescript
// Add to subscription_data.metadata
subscription_data: {
  metadata: { 
    userId: userId,
    planName: isClonePlan ? 'clone' : 'syndicate',
    // NEW: Track that this is a trial-eligible checkout
    trialRequested: isClonePlan && !hasUsedTrial
  }
}
```

### 2.2 Update Stripe Webhook Handler

**File:** `api/webhooks/stripe.ts`

**Key Changes:**

#### 2.2.1 Add Fingerprint Retrieval Function

```typescript
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
    
    console.log(`Card fingerprint retrieved: ${fingerprint}`);
    return fingerprint;
  } catch (error) {
    console.error('Error retrieving payment method:', error);
    return null;
  }
}
```

#### 2.2.2 Add Fingerprint Query Function

```typescript
/**
 * Checks if a card fingerprint has been used for a trial before
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
    
    // Consider it a "used trial" if the user had a trial period
    return userData.hasUsedTrial === true;
  } catch (error) {
    console.error('Error checking fingerprint:', error);
    // Default to "used" for security (fail closed)
    return true;
  }
}
```

#### 2.2.3 Update checkout.session.completed Handler

**Location:** Around line 82 in `api/webhooks/stripe.ts`

```typescript
if (event.type === 'checkout.session.completed') {
  const session = event.data.object as any;
  const userId = session.client_reference_id;
  const customerId = session.customer;
  
  // ... existing validation code ...
  
  const planName = session.metadata?.planName || 'syndicate';
  const trialWasRequested = session.metadata?.trialRequested === true;
  
  // NEW: Get card fingerprint for Clone plan trials
  let paymentFingerprint: string | null = null;
  let trialEligibility = 'eligible'; // 'eligible', 'ineligible', 'error'
  
  if (planName === 'clone' && trialWasRequested) {
    paymentFingerprint = await getCardFingerprint(session);
    
    if (paymentFingerprint) {
      const hasUsed = await hasCardUsedTrial(paymentFingerprint);
      if (hasUsed) {
        trialEligibility = 'ineligible';
        console.log(`⚠️ Card fingerprint ${paymentFingerprint} has been used for trial before. Removing trial.`);
      } else {
        trialEligibility = 'eligible';
        console.log(`✅ Card fingerprint ${paymentFingerprint} is new. Trial allowed.`);
      }
    } else {
      // Could not retrieve fingerprint - fail closed (no trial)
      trialEligibility = 'error';
      console.error('Could not retrieve card fingerprint, failing closed');
    }
  }
  
  // NEW: Update subscription to remove trial if ineligible
  let subscription = session.subscription;
  
  if (planName === 'clone' && trialEligibility === 'ineligible' && subscription) {
    try {
      // Retrieve the subscription and remove trial period
      const sub = await stripe.subscriptions.retrieve(subscription);
      
      // Remove the trial period (charges immediately)
      await stripe.subscriptions.update(subscription, {
        trial_period_days: 0, // Setting to 0 removes trial
        proration_behavior: 'create_prorations'
      });
      
      console.log(`Trial removed from subscription ${subscription} due to card reuse`);
    } catch (error) {
      console.error('Error removing trial:', error);
    }
  }
  
  // ... rest of user update logic ...
  
  // Update user with fingerprint AND trial status
  await userRef.update({
    // ... existing fields ...
    
    // NEW: Save payment fingerprint
    payment_fingerprint: paymentFingerprint,
    
    // NEW: Mark trial as used (only for Clone plan with eligible trial)
    ...(planName === 'clone' && trialEligibility === 'eligible' 
      ? { hasUsedTrial: true } 
      : {})
  });
  
  // NEW: Send notification if trial was removed
  if (trialEligibility === 'ineligible') {
    // TODO: Send email notification about trial removal
    console.log(`📧 Notification: Trial removed for user ${userId} - card was used previously`);
  }
}
```

---

## Phase 3: Frontend Updates

### 3.1 Update Payment Success Page

**File:** `components/PaymentSuccessPage.tsx`

**Changes Needed:**
- After successful payment, check if trial was removed
- Display appropriate notification

The webhook can communicate trial removal via:
1. Email notification (recommended)
2. Or by setting a flag that the frontend can check

Since Stripe Checkout is hosted, the user returns to the success page with URL params. We should add email notification for the trial removal case.

### 3.2 Add Trial Removal Email Notification

**File:** `api/lib/emailService.ts`

**New Function:**

```typescript
/**
 * Sends notification when trial is removed due to card reuse
 */
export async function sendTrialRemovalNotification(
  userEmail: string,
  userName: string
): Promise<SendEmailResult> {
  const subject = 'Important: Your Free Trial was Adjusted';
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Free Trial Adjustment Notice</h2>
      <p>Hi ${userName},</p>
      <p>Thank you for subscribing to GhostNote!</p>
      <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <strong>⚠️ Notice:</strong> We detected that your payment method has been used 
        for a free trial on a previous account. As a result, your subscription has been 
        activated immediately without the free trial period.
      </div>
      <p>You're now ready to enjoy all Clone plan features!</p>
      <p>If you believe this is an error, please contact our support team.</p>
      <p>Best regards,<br>The GhostNote Team</p>
    </div>
  `;
  
  return sendEmail({ to: userEmail, subject, html });
}
```

---

## Phase 4: Security Considerations

### 4.1 Data Privacy

- **NEVER store raw credit card numbers** - Only store the Stripe fingerprint
- The fingerprint is a hash that cannot be reversed to reveal card details
- Fingerprint is scoped to the Stripe account, so it's safe to store

### 4.2 Fail-Safe Behavior

If the fingerprint cannot be retrieved or the database check fails:
- Default to "trial ineligible" (fail closed)
- Log the error for investigation
- Remove the trial period to prevent abuse

### 4.3 Rate Limiting

The existing webhook already has rate limiting. Ensure:
- Fingerprint queries are cached briefly to prevent abuse
- Database queries are optimized with indexes

---

## Phase 5: Edge Cases

### 5.1 User Upgrades from Echo to Clone

- User on free plan with no payment method
- Subscribes to Clone plan
- This is their first payment, so trial should be allowed
- Fingerprint will be captured after first payment

### 5.2 User Returns After Trial Ends

- User had a trial, it ended, they didn't subscribe
- They come back with the same card
- Since `hasUsedTrial` is true, they won't get a trial anyway
- Fingerprint check is redundant but harmless

### 5.3 User Downgrades and Resubscribes

- User was on Clone, downgraded to Echo
- Returns with same or different card
- If same card and hasUsedTrial=true → no trial
- If new card → trial allowed (new fingerprint)

### 5.4 Shared Cards (Family/Business)

**Policy Decision Needed:**
- If a family shares a card, only ONE gets a trial
- This might frustrate legitimate users
- Consider: Add a "business" flag or allow one trial per card per year
- **Recommendation:** Start strict (one trial per card), relax if needed

### 5.5 Card Updates

- User updates their card in Stripe portal
- New payment method = new fingerprint
- They could potentially get another trial
- **Mitigation:** Track customerId (not just fingerprint) and check both

---

## Implementation Checklist

### Backend (Priority 1)

- [ ] 1.1 Create fingerprint retrieval function in webhook
- [ ] 1.2 Create fingerprint query function for Firestore
- [ ] 1.3 Update checkout.session.completed handler with trial check logic
- [ ] 1.4 Update user record with payment_fingerprint field
- [ ] 1.5 Add trial removal notification logic
- [ ] 1.6 Test fingerprint detection end-to-end

### Frontend (Priority 2)

- [ ] 2.1 Update PaymentSuccessPage with trial removal message
- [ ] 2.2 Add email notification for trial removal

### Database (Priority 1)

- [ ] 3.1 Create Firestore index on payment_fingerprint field
- [ ] 3.2 Verify existing users don't have the field (handle undefined)

### Testing (Priority 3)

- [ ] 4.1 Test with same card on different accounts
- [ ] 4.2 Test with new card on new account
- [ ] 4.3 Test upgrade flow from Echo → Clone
- [ ] 4.4 Verify existing functionality not broken

---

## File Modifications Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `api/webhooks/stripe.ts` | Modify | Add fingerprint retrieval and check logic |
| `api/lib/emailService.ts` | Add | Add trial removal notification function |
| `components/PaymentSuccessPage.tsx` | Modify | Handle trial removal display |
| `types.ts` | Modify | Add payment_fingerprint to User interface |

---

## Environment Variables

No new environment variables required. Uses existing:
- `STRIPE_SECRET_KEY` (already in use)
- `STRIPE_WEBHOOK_SECRET` (already in use)
- `RESEND_API_KEY` (already in use for emails)

---

## Rollout Strategy

### Phase 1: Deploy Backend (No User Impact)
1. Deploy updated webhook code
2. Monitor logs for fingerprint retrieval
3. Verify fingerprint is being saved to user records

### Phase 2: Enable Protection
1. Activate the trial check logic in webhook
2. Monitor for false positives (legitimate users blocked)
3. Adjust logic if needed

### Phase 3: Frontend Updates
1. Deploy email notifications
2. Update success page messaging
3. Monitor support tickets

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Trial Removal Rate**: % of trials removed due to card reuse
2. **False Positive Rate**: Users complaining about trial removal who should have been eligible
3. **Fingerprint Retrieval Success**: % of checkouts where fingerprint is successfully retrieved

### Log Patterns to Monitor

```
# Trial removed (expected after implementation)
⚠️ Card fingerprint xxx has been used for trial before. Removing trial.

# New card (expected)
✅ Card fingerprint xxx is new. Trial allowed.

# Errors (need investigation)
Error retrieving card fingerprint
Error checking fingerprint
```

---

## Success Criteria

1. Same card used for multiple accounts only gets ONE trial
2. Legitimate new users can still get trials
3. Existing billing flow remains uninterrupted
4. No user data is compromised
5. Support tickets for "missing trial" remain low (< 1% of signups)


---

## Validation Notes

### TypeScript Types Update Required

The User interface in `types.ts` needs to be updated to include:

```typescript
// Add to User interface (types.ts, around line 96)
payment_fingerprint?: string; // Stripe card fingerprint for trial tracking
hasUsedTrial?: boolean;        // Whether user has used a free trial (already in Firestore)
```

### Integration Verification

✅ **Checkout Session API** (`api/checkout/session.ts`):
   - Already checks `hasUsedTrial` on user (line 44)
   - Adds `trial_period_days: 14` for eligible users (line 84)
   - Need to add `trialRequested` metadata for webhook to know if trial was intended

✅ **Stripe Webhook** (`api/webhooks/stripe.ts`):
   - Handles `checkout.session.completed` (line 82)
   - Updates user with plan, credits, subscription (line 161)
   - Sets `hasUsedTrial: true` for Clone plan (line 176)
   - **NEW**: Need to add fingerprint retrieval and check logic

✅ **Existing User Flow**:
   - Current: hasUsedTrial flag is per-user
   - New: payment_fingerprint is per-card, checked across ALL users
   - The two checks work together: user hasn't used trial AND card hasn't been used for trial

### Edge Case Coverage

| Edge Case | Covered | Solution |
|-----------|---------|----------|
| Same card, different email | ✅ | Fingerprint check across all users |
| New user, new card | ✅ | No fingerprint match = trial allowed |
| Upgrade from Echo | ✅ | No previous fingerprint = trial allowed |
| Return after trial ended | ✅ | hasUsedTrial=true blocks trial anyway |
| Shared family card | ⚠️ | Policy: One trial per card (strict) |
| Card updated in portal | ⚠️ | New fingerprint = potentially new trial |
| Fingerprint retrieval fails | ✅ | Fail closed (remove trial) |

