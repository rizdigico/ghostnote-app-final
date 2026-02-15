# Subscription Lifecycle API Contracts

## Overview

This document specifies the exact API contracts for all subscription lifecycle endpoints.

---

## 1. Cancel Subscription

### POST `/api/billing/cancel-subscription`

**Purpose:** Schedule subscription cancellation at end of billing period (graceful exit).

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <firebase_id_token>
```

**Request Body:**
```typescript
{
  userId: string  // Firestore document ID
}
```

**Success Response (200):**
```typescript
{
  success: true,
  cancelDate: string,      // ISO 8601 format - when access ends
  message: string,         // Human-readable message
  subscription: {
    id: string,
    cancelAtPeriodEnd: true,
    currentPeriodEnd: string
  }
}
```

**Error Responses:**
- `400` - Invalid request (missing userId)
- `401` - Unauthorized
- `404` - User or subscription not found
- `500` - Stripe API error

**Example:**
```bash
curl -X POST https://ghostnote.app/api/billing/cancel-subscription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"userId": "abc123xyz"}'
```

---

## 2. Resume Subscription

### POST `/api/billing/resume-subscription`

**Purpose:** Cancel a scheduled cancellation (retention/undo).

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <firebase_id_token>
```

**Request Body:**
```typescript
{
  userId: string
}
```

**Success Response (200):**
```typescript
{
  success: true,
  message: "Subscription resumed. You have full access until [date].",
  subscription: {
    id: string,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: string
  }
}
```

**Error Responses:**
- `400` - No active cancellation to resume
- `401` - Unauthorized
- `404` - User not found
- `500` - Stripe API error

---

## 3. Safe Account Deletion

### DELETE `/api/user/delete-account`

**Purpose:** Permanently delete user account with proper subscription cancellation.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <firebase_id_token>
```

**Request Body:**
```typescript
{
  userId: string
}
```

**Success Response (200):**
```typescript
{
  success: true,
  message: "Account deleted successfully"
}
```

**Error Responses:**
- `400` - Invalid request
- `401` - Unauthorized
- `403` - Cannot delete account (subscription cancellation failed)
- `500` - Server error

**CRITICAL BEHAVIOR:**
```
1. Check if user.subscriptionId exists
2. IF exists:
   a. Call Stripe: subscriptions.cancel(subscriptionId) 
   b. IF Stripe fails → Return 403, DO NOT delete user
   c. IF Stripe succeeds → Continue to step 3
3. Delete Firestore user document
4. Delete Firebase Auth user
5. Return success
```

---

## 4. Get Subscription Status

### GET `/api/billing/subscription-status?userId=xxx`

**Purpose:** Get current subscription state for UI display.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Query Parameters:**
- `userId` (required)

**Success Response (200):**
```typescript
{
  subscription: {
    id: string | null,           // Stripe subscription ID
    status: 'active' | 'canceled' | 'past_due' | 'trialing',
    plan: 'echo' | 'clone' | 'syndicate',
    cancelAtPeriodEnd: boolean,
    currentPeriodEnd: string | null,
    billingCycle: 'monthly' | 'yearly',
    customerId: string | null
  },
  paymentWarning: boolean
}
```

---

## 5. Webhook Endpoint

### POST `/api/webhooks/stripe`

**Purpose:** Receive Stripe events for automated subscription management.

**Headers:**
```
Content-Type: application/json
stripe-signature: <signature>
```

**Events Handled:**

#### `checkout.session.completed`
```typescript
{
  type: 'checkout.session.completed',
  data: {
    object: {
      id: string,                      // session ID
      customer: string,                // cus_xxx
      subscription: string,           // sub_xxx
      client_reference_id: string,     // userId
      metadata: { planName: string }
    }
  }
}
```
**Action:** Update user with subscriptionId, customerId, set plan

#### `customer.subscription.deleted`
```typescript
{
  type: 'customer.subscription.deleted',
  data: {
    object: {
      id: string,                      // subscription ID
      metadata: { userId: string }
    }
  }
}
```
**Action:** Downgrade user to 'echo', clear subscription fields

#### `customer.subscription.updated`
```typescript
{
  type: 'customer.subscription.updated',
  data: {
    object: {
      id: string,
      cancel_at_period_end: boolean,
      current_period_end: number,      // Unix timestamp
      status: string,
      metadata: { userId: string }
    }
  }
}
```
**Action:** Update cancelAtPeriodEnd, currentPeriodEnd

#### `invoice.payment_failed`
```typescript
{
  type: 'invoice.payment_failed',
  data: {
    object: {
      customer: string,                // cus_xxx
      id: string                       // invoice ID
    }
  }
}
```
**Action:** Set paymentWarning = true, send email

---

## 6. Frontend Context API

### AuthContext Extensions

```typescript
interface AuthContextType {
  // Existing methods
  user: User | null;
  
  // New subscription methods
  cancelSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
  checkSubscriptionStatus: () => Promise<SubscriptionStatus>;
}
```

**Usage Example:**
```typescript
const { cancelSubscription, resumeSubscription, user } = useAuth();

// Cancel with optimistic UI
const handleCancel = async () => {
  setOptimisticState('cancelling');
  try {
    await cancelSubscription();
  } catch (error) {
    // Revert optimistic state
    showError(error.message);
  }
};

// Resume subscription
const handleResume = async () => {
  await resumeSubscription();
};
```

---

## Data Models

### User (Extended)

```typescript
interface User {
  // Core identity
  id: string;
  email: string;
  name: string;
  
  // Plan & billing
  plan: 'echo' | 'clone' | 'syndicate';
  billingCycle?: 'monthly' | 'yearly';
  
  // NEW: Subscription lifecycle
  subscriptionId?: string;        // Stripe sub_xxx
  customerId?: string;           // Stripe cus_xxx
  cancelAtPeriodEnd?: boolean;   // Scheduled for cancellation
  currentPeriodEnd?: string;     // ISO date when access ends
  paymentWarning?: boolean;      // Payment failed notification
  
  // Credits (for echo plan)
  credits: number;
  
  // Existing fields
  apiKey?: string;
  teamId?: string;
  // ...
}
```

---

## Error Handling Standard

All endpoints follow this error format:

```typescript
// Error Response (4xx, 5xx)
{
  error: {
    code: 'SUBSCRIPTION_NOT_FOUND' | 'STRIPE_ERROR' | 'UNAUTHORIZED' | etc,
    message: 'Human-readable error message',
    details?: any  // Optional debug info
  }
}
```

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| cancel-subscription | 10/minute/IP |
| resume-subscription | 10/minute/IP |
| delete-account | 5/minute/IP |
| Webhook | 100/hour/customer |

---

## Idempotency

All mutation endpoints support idempotency via the `Idempotency-Key` header:

```bash
POST /api/billing/cancel-subscription
Idempotency-Key: <unique-key>
```

