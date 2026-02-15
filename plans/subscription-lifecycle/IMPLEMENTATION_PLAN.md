# GhostNote Subscription Lifecycle System - Implementation Plan

## Executive Summary

This document outlines the implementation plan for a comprehensive subscription lifecycle management system that enables:
- **Graceful Subscription Cancellation** - Cancel at end of billing period
- **Subscription Resumption** - Undo cancellation before period ends
- **Safe Account Deletion** - Prevent zombie charges when deleting accounts
- **Automated Downgrade Handling** - Webhook-driven plan downgrades

---

## Current Architecture Analysis

### Existing Components

| Component | Location | Current State |
|-----------|----------|---------------|
| Stripe Checkout | `api/checkout/session.ts` | ✅ Creates subscription sessions |
| Stripe Webhooks | `api/webhooks/stripe.ts` | ⚠️ Partial - only handles `checkout.session.completed` |
| User Auth | `AuthContext.tsx` | ⚠️ `deleteAccount()` doesn't cancel Stripe subscription |
| User Types | `types.ts` | ❌ Missing subscription tracking fields |
| Account UI | `components/AccountModal.tsx` | ❌ No subscription management UI |

### Missing Fields in User Model

```typescript
// Required additions to types.ts
interface User {
  // ... existing fields
  subscriptionId?: string;      // Stripe subscription ID
  customerId?: string;           // Stripe customer ID
  cancelAtPeriodEnd?: boolean;   // Scheduled cancellation flag
  currentPeriodEnd?: string;    // ISO timestamp of period end
  paymentWarning?: boolean;      // Payment failure flag
}
```

---

## PHASE 1: Database & Type Extensions

### 1.1 Update User Types

**File:** `types.ts`

```typescript
// Add to existing User interface
export interface User {
  // ... existing fields
  subscriptionId?: string;        // Stripe subscription ID (sub_xxx)
  customerId?: string;            // Stripe customer ID (cus_xxx)
  cancelAtPeriodEnd?: boolean;    // True if user scheduled cancellation
  currentPeriodEnd?: string;      // ISO timestamp when access ends
  paymentWarning?: boolean;       // Payment failure notification flag
}
```

### 1.2 Firestore Migration

**New Fields Required:**
```javascript
// users collection
{
  subscriptionId: "sub_xxx",           // Set on checkout completion
  customerId: "cus_xxx",               // Set on checkout completion  
  cancelAtPeriodEnd: false,            // Default false
  currentPeriodEnd: "2024-02-15T...",  // Set from Stripe
  paymentWarning: false                // For failed payment alerts
}
```

---

## PHASE 2: Backend API Endpoints

### 2.1 Subscription Cancellation Endpoint

**File:** `api/billing/cancel-subscription.ts`

```typescript
// POST /api/billing/cancel-subscription
// Body: { userId: string }
// Response: { success: boolean, cancelDate: string, message: string }

// Logic Flow:
// 1. Fetch user from Firestore
// 2. Verify user has subscriptionId
// 3. Call Stripe: subscriptions.update(subscriptionId, { cancel_at_period_end: true })
// 4. Update Firestore: user.cancelAtPeriodEnd = true
// 5. Trigger cancellation confirmation email
// 6. Return success with cancel date
```

### 2.2 Subscription Resumption Endpoint

**File:** `api/billing/resume-subscription.ts`

```typescript
// POST /api/billing/resume-subscription
// Body: { userId: string }
// Response: { success: boolean, message: string }

// Logic Flow:
// 1. Fetch user from Firestore
// 2. Verify user.cancelAtPeriodEnd === true
// 3. Call Stripe: subscriptions.update(subscriptionId, { cancel_at_period_end: false })
// 4. Update Firestore: user.cancelAtPeriodEnd = false
// 5. Return success
```

### 2.3 Safe Account Deletion (Interceptor)

**File:** `api/user/delete-account.ts`

```typescript
// DELETE /api/user/delete-account
// Headers: Authorization: Bearer <token>
// Body: { userId: string }
// Response: { success: boolean, error?: string }

// SAFE DELETION LOGIC:
// 1. Fetch user from Firestore
// 2. IF user.subscriptionId exists:
//    a. Call Stripe: subscriptions.cancel(subscriptionId) - IMMEDIATE
//    b. Await confirmation
//    c. IF Stripe fails: throw error, DO NOT delete user
// 3. Delete Firestore user document
// 4. Delete Firebase Auth user
// 5. Return success
```

### 2.4 Update Checkout Session (Capture Customer ID)

**File:** `api/checkout/session.ts` (Modification)

```typescript
// Add to sessionConfig:
subscription_data: {
  metadata: { userId: userId },
  // Capture customer ID for future API calls
  billing_cycle_count: 1
}

// After session creation, store customer ID:
// const customerId = session.customer;
// await userRef.update({ customerId });
```

---

## PHASE 3: Webhook Enhancements

### 3.1 Enhanced Webhook Handler

**File:** `api/webhooks/stripe.ts` (Modification)

```typescript
// Add new event handlers:

// 1. customer.subscription.deleted (Immediate cancellation or expired)
if (event.type === 'customer.subscription.deleted') {
  const subscription = event.data.object;
  const userId = subscription.metadata?.userId;
  
  if (userId) {
    // Downgrade to Echo plan immediately
    await userRef.update({
      plan: 'echo',
      subscriptionId: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      credits: 10  // Reset to free tier
    });
  }
}

// 2. invoice.payment_failed
if (event.type === 'invoice.payment_failed') {
  const invoice = event.data.object;
  const customerId = invoice.customer;
  
  // Find user by customerId and set warning
  const userQuery = await db.collection('users')
    .where('customerId', '==', customerId)
    .limit(1)
    .get();
    
  if (!userQuery.empty) {
    const userId = userQuery.docs[0].id;
    await db.collection('users').doc(userId).update({
      paymentWarning: true
    });
    // Trigger payment failed email
  }
}

// 3. customer.subscription.updated (Handle cancel_at_period_end changes)
if (event.type === 'customer.subscription.updated') {
  const subscription = event.data.object;
  const userId = subscription.metadata?.userId;
  
  if (userId) {
    await userRef.update({
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
    });
  }
}
```

---

## PHASE 4: Frontend Implementation

### 4.1 AuthContext Updates

**File:** `AuthContext.tsx` (Add new functions)

```typescript
interface AuthContextType {
  // ... existing
  cancelSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
}

// Implementation:
const cancelSubscription = async () => {
  if (!user) return;
  const response = await fetch('/api/billing/cancel-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.id })
  });
  if (!response.ok) throw new Error('Failed to cancel subscription');
  // Refresh user data
};

const resumeSubscription = async () => {
  if (!user) return;
  const response = await fetch('/api/billing/resume-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.id })
  });
  if (!response.ok) throw new Error('Failed to resume subscription');
  // Refresh user data
};
```

### 4.2 Enhanced AccountModal UI

**File:** `components/AccountModal.tsx` (Add subscription management tab)

```tsx
// New tab: 'subscription'

const SubscriptionTab = () => {
  const { user, cancelSubscription, resumeSubscription } = useAuth();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  
  // Optimistic UI state
  const [pendingCancel, setPendingCancel] = useState(user?.cancelAtPeriodEnd);
  
  const handleCancel = async () => {
    setIsCancelling(true);
    setPendingCancel(true); // Optimistic update
    try {
      await cancelSubscription();
    } catch (e) {
      setPendingCancel(false); // Revert on error
    } finally {
      setIsCancelling(false);
      setShowConfirmCancel(false);
    }
  };
  
  const handleResume = async () => {
    setIsCancelling(true);
    try {
      await resumeSubscription();
    } finally {
      setIsCancelling(false);
    }
  };
  
  // Render states:
  // 1. Active (cancelAtPeriodEnd === false): Show "Cancel Subscription" red button
  // 2. Scheduled (cancelAtPeriodEnd === true): Show "Resume" button + warning badge
};
```

### 4.3 Subscription Card Component (Optional)

**File:** `components/SubscriptionCard.tsx` (New component)

```tsx
// Standalone component for Dashboard
// Shows: Current plan, period end date, cancel/resume button
// Used in Dashboard or AccountModal
```

---

## PHASE 5: Email Notifications (Future)

### 5.1 Email Triggers

| Event | Email Type | Trigger |
|-------|------------|---------|
| Cancellation Confirmed | "Your subscription will end on [DATE]" | `cancel-subscription` endpoint |
| Subscription Resumed | "Welcome back! Your subscription is active." | `resume-subscription` endpoint |
| Payment Failed | "Payment failed - update your card" | Webhook `invoice.payment_failed` |
| Subscription Expired | "Your subscription has ended" | Webhook `customer.subscription.deleted` |

---

## Implementation Order

```
┌─────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION ORDER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1: Types & Migration                                       │
│  ├── Update types.ts with new fields                            │
│  └── Firestore migration script (add fields to existing users) │
│                                                                  │
│  STEP 2: Backend APIs                                           │
│  ├── api/billing/cancel-subscription.ts                         │
│  ├── api/billing/resume-subscription.ts                          │
│  └── api/user/delete-account.ts (update existing)               │
│                                                                  │
│  STEP 3: Webhooks                                               │
│  └── api/webhooks/stripe.ts (add new event handlers)            │
│                                                                  │
│  STEP 4: Frontend                                               │
│  ├── AuthContext.tsx (add new functions)                        │
│  └── AccountModal.tsx (add subscription tab)                    │
│                                                                  │
│  STEP 5: Checkout Enhancement                                   │
│  └── api/checkout/session.ts (capture customerId)              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

1. **Webhook Signature Verification** - Already implemented ✓
2. **Rate Limiting** - Add rate limiting to cancel/resume endpoints
3. **Idempotency** - Handle duplicate webhook events gracefully
4. **Error Handling** - Never delete user if Stripe cancellation fails

---

## Testing Checklist

- [ ] Cancel subscription - verify cancel_at_period_end in Stripe
- [ ] Cancel subscription - verify user sees confirmation
- [ ] Resume subscription - verify cancel_at_period_end removed in Stripe
- [ ] Delete account with active subscription - verify subscription cancelled
- [ ] Delete account - verify user data deleted
- [ ] Webhook: subscription.deleted - verify user downgraded
- [ ] Webhook: invoice.payment_failed - verify warning flag set
- [ ] Frontend: Optimistic UI - verify instant feedback
- [ ] Edge case: Cancel, then delete before period end
- [ ] Edge case: Multiple cancellations (should be idempotent)

---

## Rollback Plan

If issues arise:
1. Disable new API endpoints via environment variable
2. Revert webhook handlers to previous state
3. Frontend can show static "Contact Support" message

---

## Files to Create/Modify

### New Files
- `api/billing/cancel-subscription.ts`
- `api/billing/resume-subscription.ts`
- `components/SubscriptionCard.tsx` (optional)

### Modified Files
- `types.ts` - Add subscription fields
- `api/webhooks/stripe.ts` - Add event handlers
- `api/checkout/session.ts` - Capture customerId
- `AuthContext.tsx` - Add new context functions
- `components/AccountModal.tsx` - Add subscription management UI
- `api/user/delete-account.ts` - Safe deletion (create or update existing)

