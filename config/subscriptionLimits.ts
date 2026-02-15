/**
 * Subscription Plan Limits Configuration
 * 
 * Defines the limits and features for each subscription tier.
 * Used for plan gating across the application.
 * 
 * Plan Tiers:
 * - Echo (Free): No team access, 1 seat (self only)
 * - Clone (Mid-Tier): Limited team access, max 3 seats
 * - Syndicate (High-Tier): Full access, unlimited seats
 */

import { UserPlan, TeamRole } from '../types';

// Extended role type including CLIENT for Syndicate
export type ExtendedTeamRole = TeamRole | 'client';

export interface PlanLimits {
  can_create_team: boolean;
  max_seats: number;
  allowed_roles: ExtendedTeamRole[];
  features: string[];
  description: string;
  // Concurrency limits
  max_concurrent_jobs: number;
  job_queue_priority: 'low' | 'high';
  // Feature flags
  has_audit_logs: boolean;
  has_client_approval: boolean;
  has_history: boolean;
}

/**
 * Subscription limits by plan
 */
export const PLAN_LIMITS: Record<UserPlan, PlanLimits> = {
  echo: {
    can_create_team: false,
    max_seats: 1, // Self only - no team members allowed
    allowed_roles: [TeamRole.ADMIN],
    features: [],
    description: 'Free plan - Individual use only',
    // Concurrency - Echo gets minimal
    max_concurrent_jobs: 1,
    job_queue_priority: 'low',
    // Features
    has_audit_logs: false,
    has_client_approval: false,
    has_history: false
  },
  clone: {
    can_create_team: true,
    max_seats: 3, // Max 3 members including owner
    allowed_roles: [TeamRole.ADMIN, TeamRole.EDITOR],
    features: ['basic_team'],
    description: 'Team collaboration with limited seats',
    // Concurrency - Clone gets 1 concurrent job (no parallel)
    max_concurrent_jobs: 1,
    job_queue_priority: 'low',
    // Features
    has_audit_logs: false,
    has_client_approval: false,
    has_history: false
  },
  syndicate: {
    can_create_team: true,
    max_seats: 9999, // Unlimited
    allowed_roles: [TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER, 'client'],
    features: ['basic_team', 'advanced_analytics', 'lock_voices'],
    description: 'Full agency features with unlimited team',
    // Concurrency - Syndicate gets 5 concurrent jobs + priority
    max_concurrent_jobs: 5,
    job_queue_priority: 'high',
    // Features
    has_audit_logs: true,
    has_client_approval: true,
    has_history: true
  }
};

/**
 * Get the seat limit for a given plan
 */
export function getSeatLimit(plan: UserPlan): number {
  return PLAN_LIMITS[plan]?.max_seats ?? 1;
}

/**
 * Check if a role is allowed for a given plan
 */
export function canInviteRole(plan: UserPlan, targetRole: ExtendedTeamRole): boolean {
  const allowedRoles = PLAN_LIMITS[plan]?.allowed_roles ?? [];
  return allowedRoles.includes(targetRole);
}

/**
 * Check if a plan can create/manage teams
 */
export function canCreateTeam(plan: UserPlan): boolean {
  return PLAN_LIMITS[plan]?.can_create_team ?? false;
}

/**
 * Check if a plan has a specific feature
 */
export function hasFeature(plan: UserPlan, feature: string): boolean {
  const features = PLAN_LIMITS[plan]?.features ?? [];
  return features.includes(feature);
}

/**
 * Get available roles for a plan (for UI dropdowns)
 */
export function getAvailableRoles(plan: UserPlan): { value: ExtendedTeamRole; label: string; locked?: boolean }[] {
  const allRoles: { value: ExtendedTeamRole; label: string; syndicateOnly?: boolean }[] = [
    { value: TeamRole.ADMIN, label: 'Admin - Full access, manage settings' },
    { value: TeamRole.EDITOR, label: 'Editor - Can create/edit content' },
    { value: TeamRole.VIEWER, label: 'Viewer - Read only access', syndicateOnly: true },
    { value: 'client' as ExtendedTeamRole, label: 'Client - External stakeholder access', syndicateOnly: true }
  ];

  return allRoles.map(role => ({
    ...role,
    locked: role.syndicateOnly && plan !== 'syndicate'
  }));
}

/**
 * Check if seat limit is reached
 */
export function isSeatLimitReached(plan: UserPlan, currentSeatCount: number): boolean {
  const limit = getSeatLimit(plan);
  return currentSeatCount >= limit;
}

/**
 * Get upgrade message for seat limit
 */
export function getSeatLimitMessage(plan: UserPlan, currentCount: number): string {
  const limit = getSeatLimit(plan);
  
  if (plan === 'echo') {
    return 'Upgrade to Clone to unlock team collaboration.';
  }
  
  if (plan === 'clone' && currentCount >= limit) {
    return `You've reached your ${limit} seat limit. Upgrade to Syndicate for unlimited seats.`;
  }
  
  return `${currentCount} / ${limit} seats used`;
}

/**
 * Plan power percentage (for UI badges)
 */
export const PLAN_POWER: Record<UserPlan, number> = {
  echo: 0,
  clone: 65,
  syndicate: 100
};

/**
 * Feature flag - can be toggled for testing
 */
export const FEATURE_FLAGS = {
  enableVoiceLocking: true,
  enableTeamAnalytics: true,
  enableClientRole: true
};

// ============================================================================
// CONCURRENCY & ADVANCED FEATURES
// ============================================================================

/**
 * Get maximum concurrent jobs allowed for a plan
 */
export function getMaxConcurrentJobs(plan: UserPlan): number {
  return PLAN_LIMITS[plan]?.max_concurrent_jobs ?? 1;
}

/**
 * Get job queue priority for a plan
 */
export function getJobQueuePriority(plan: UserPlan): 'low' | 'high' {
  return PLAN_LIMITS[plan]?.job_queue_priority ?? 'low';
}

/**
 * Check if plan has audit logs feature
 */
export function hasAuditLogs(plan: UserPlan): boolean {
  return PLAN_LIMITS[plan]?.has_audit_logs ?? false;
}

/**
 * Check if plan has client approval feature
 */
export function hasClientApproval(plan: UserPlan): boolean {
  return PLAN_LIMITS[plan]?.has_client_approval ?? false;
}

/**
 * Check if plan has history feature
 */
export function hasHistory(plan: UserPlan): boolean {
  return PLAN_LIMITS[plan]?.has_history ?? false;
}

/**
 * Check if user can process job (concurrency check)
 */
export function canProcessJob(plan: UserPlan, currentJobs: number): {
  allowed: boolean;
  message?: string;
} {
  const maxJobs = getMaxConcurrentJobs(plan);
  
  if (currentJobs >= maxJobs) {
    if (plan === 'clone') {
      return {
        allowed: false,
        message: 'Job in progress. Upgrade to Syndicate for parallel generation.'
      };
    }
    return {
      allowed: false,
      message: `Maximum concurrent jobs (${maxJobs}) reached. Please wait.`
    };
  }
  
  return { allowed: true };
}
