# Tiered Team Management Implementation Plan

## Executive Summary
Implement subscription tier-based team management with plan-gated features:
- **Echo (Free):** No team access (0% power)
- **Clone (Mid-Tier):** Limited to 3 seats, basic roles (65% power)
- **Syndicate (High-Tier):** Unlimited seats, full roles, exclusive features (100% power)

---

## PHASE 1: Configuration & Middleware (Backend)

### 1.1 Create `config/subscriptionLimits.ts`
New configuration file defining plan limits:

```typescript
import { UserPlan, TeamRole } from '../types';

export interface PlanLimits {
  can_create_team: boolean;
  max_seats: number;
  allowed_roles: TeamRole[];
  features: string[];
}

export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  echo: {
    can_create_team: false,
    max_seats: 1, // Self only
    allowed_roles: [TeamRole.ADMIN],
    features: []
  },
  clone: {
    can_create_team: true,
    max_seats: 3,
    allowed_roles: [TeamRole.ADMIN, TeamRole.EDITOR],
    features: ['basic_team']
  },
  syndicate: {
    can_create_team: true,
    max_seats: 9999,
    allowed_roles: [TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER, 'client' as TeamRole],
    features: ['basic_team', 'advanced_analytics', 'lock_voices']
  }
};

// Helper functions
export function getSeatLimit(plan: UserPlan): number
export function canInviteRole(plan: UserPlan, targetRole: TeamRole): boolean
export function canCreateTeam(plan: UserPlan): boolean
export function hasFeature(plan: UserPlan, feature: string): boolean
```

### 1.2 Update `api/lib/teamMiddleware.ts`
Add new functions for plan enforcement:

```typescript
import { PLAN_LIMITS } from '../../config/subscriptionLimits';
import { UserPlan, TeamRole } from '../../types';

// NEW: Check seat limit
export async function checkSeatLimit(teamId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  message?: string;
}>

// NEW: Check role permission based on plan
export function checkRolePermission(plan: UserPlan, targetRole: TeamRole): {
  allowed: boolean;
  message?: string;
}

// NEW: Get user's plan from team
export async function getUserPlan(userId: string): Promise<UserPlan>

// NEW: Enforce plan limits middleware
export function requirePlanAccess(requiredPlan: UserPlan, feature?: string)
```

### 1.3 Update Types (`types.ts`)
Add new roles and interfaces:

```typescript
// Add CLIENT role for Syndicate
export enum TeamRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  CLIENT = 'client'  // NEW: For external stakeholders
}

// Add voice locking interface
export interface VoicePreset {
  // ... existing fields
  isLocked?: boolean;  // NEW: For Syndicate asset locking
}
```

### 1.4 Database Migration (`plans/migrations/005_add_voice_locking.sql`)
```sql
ALTER TABLE voice_presets ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE team_members ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deactivated'));
```

---

## PHASE 2: API Endpoints (Backend Security)

### 2.1 Create `api/teams/invite.ts`
New endpoint for team invitations with plan checks:

```typescript
// POST /api/teams/invite
// - Check seat limit first
// - Validate role against plan
// - Create invitation record
```

### 2.2 Update `api/teams/members.ts` (create if not exists)
- Add PATCH endpoint for role changes
- Block Syndicate-exclusive roles for Clone plan

### 2.3 Add Voice Locking API
- PATCH `/api/voice-presets/:id/lock` - Toggle lock status
- Only allow for syndicate plans

---

## PHASE 3: Frontend UI Updates

### 3.1 Update `components/TeamSettingsModal.tsx`

**Echo Users:**
- Show upgrade prompt instead of team features
- Disable "Invite Member" button
- Display: "Upgrade to Clone to unlock team collaboration"

**Clone Users:**
- Show seat counter: "Seats: X / 3"
- Disable "Viewer" and "Client" role options with lock icon
- If at limit (3/3), change "Add Member" to upsell CTA

**Syndicate Users:**
- Show "Unlimited" badge
- Enable all role options
- Show analytics link

### 3.2 Update `components/TeamSwitcher.tsx`
- Add plan badge indicators
- Show plan limits inline

### 3.3 Create `components/TeamAnalytics.tsx` (Syndicate Only)
- Usage stats per team member
- Only render for syndicate plans

### 3.4 Update Voice Preset Cards
- Add lock toggle for Syndicate users
- Show lock indicator for locked presets

---

## PHASE 4: Syndicate-Exclusive Features

### 4.1 Voice Asset Locking
- Database field: `is_locked` on voice_presets
- UI: Lock icon on preset cards
- Logic: Editors cannot modify locked presets

### 4.2 Team Analytics Dashboard
- Track words generated per member
- Show usage charts (Syndicate only)

---

## Implementation Order

1. **Week 1: Backend Foundation**
   - Create subscription limits config
   - Add middleware functions
   - Database migration

2. **Week 2: API Security**
   - Create team invitation endpoint
   - Add role validation
   - Voice locking API

3. **Week 3: Frontend UI**
   - Update TeamSettingsModal with plan gating
   - Add seat counters
   - Role dropdown restrictions

4. **Week 4: Syndicate Features**
   - Voice locking UI
   - Team analytics
   - Final testing

---

## Risk Mitigation

1. **Grandfathering:** If user downgrades, deactivate excess members rather than delete
2. **Server-side validation:** Never trust frontend - always validate on backend
3. **Rollback plan:** Keep migration reversible
4. **Feature flags:** Use config for easy toggling
