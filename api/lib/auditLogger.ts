/**
 * Audit Logger Middleware
 * 
 * Provides audit logging for team actions (Intern Insurance feature).
 * Only available on Syndicate plan.
 * 
 * Features:
 * - logAction: Log a team action
 * - getAuditLogs: Retrieve team audit logs
 * - requiresAuditLogs: Middleware to check plan eligibility
 */

import { db } from '../../src/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  getDocs 
} from 'firebase/firestore';
import { hasAuditLogs } from '../../config/subscriptionLimits';
import { UserPlan } from '../../types';

export interface AuditLogEntry {
  id?: string;
  teamId: string;
  userId: string;
  action: 'created' | 'updated' | 'deleted' | 'shared' | 'locked' | 'unlocked' | 'invited' | 'removed' | 'role_changed';
  targetType: 'voice_preset' | 'content' | 'team_member' | 'team_settings' | 'share_link';
  targetId?: string;
  details?: Record<string, any>;
  timestamp?: string;
}

/**
 * Log an action to the team's audit log
 * Only creates logs for Syndicate plans
 */
export async function logAction(
  teamId: string,
  userId: string,
  action: AuditLogEntry['action'],
  targetType: AuditLogEntry['targetType'],
  targetId?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const auditLogsRef = collection(db, 'audit_logs');
    
    await addDoc(auditLogsRef, {
      teamId,
      userId,
      action,
      targetType,
      targetId,
      details: details || {},
      timestamp: new Date().toISOString()
    });
    
    console.log(`[AuditLog] ${action} on ${targetType} by ${userId} in team ${teamId}`);
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.warn('[AuditLog] Failed to log action:', error);
  }
}

/**
 * Get audit logs for a team
 * Only returns logs if user is on Syndicate plan
 */
export async function getAuditLogs(
  teamId: string,
  options: {
    limit?: number;
    action?: string;
    targetType?: string;
    userId?: string;
  } = {}
): Promise<AuditLogEntry[]> {
  const { limit = 50, action, targetType, userId } = options;
  
  try {
    const auditLogsRef = collection(db, 'audit_logs');
    const conditions = [where('teamId', '==', teamId)];
    
    if (action) {
      conditions.push(where('action', '==', action));
    }
    if (targetType) {
      conditions.push(where('targetType', '==', targetType));
    }
    if (userId) {
      conditions.push(where('userId', '==', userId));
    }
    
    const q = query(
      auditLogsRef,
      ...conditions,
      orderBy('timestamp', 'desc'),
      firestoreLimit(limit)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AuditLogEntry[];
  } catch (error) {
    console.error('[AuditLog] Failed to get logs:', error);
    return [];
  }
}

/**
 * Middleware to check if user can access audit logs
 */
export async function canViewAuditLogs(userId: string, teamId: string): Promise<{
  allowed: boolean;
  message?: string;
}> {
  try {
    // Get user's plan
    const { getUserPlan } = await import('./teamMiddleware');
    const plan = await getUserPlan(userId);
    
    if (!hasAuditLogs(plan)) {
      return {
        allowed: false,
        message: 'Audit logs are available on Syndicate plan only. Upgrade to track team activity.'
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('[AuditLog] Permission check failed:', error);
    return { allowed: false, message: 'Unable to verify permissions' };
  }
}

/**
 * Helper to format audit log entry for display
 */
export function formatAuditLogEntry(entry: AuditLogEntry): string {
  const timestamp = entry.timestamp 
    ? new Date(entry.timestamp).toLocaleString() 
    : 'Unknown time';
  
  const actionVerb: Record<string, string> = {
    created: 'created',
    updated: 'updated',
    deleted: 'deleted',
    shared: 'shared',
    locked: 'locked',
    unlocked: 'unlocked',
    invited: 'invited',
    removed: 'removed',
    role_changed: 'changed role of'
  };
  
  const targetLabel: Record<string, string> = {
    voice_preset: 'Voice Preset',
    content: 'Content',
    team_member: 'Team Member',
    team_settings: 'Team Settings',
    share_link: 'Share Link'
  };
  
  const action = actionVerb[entry.action] || entry.action;
  const target = targetLabel[entry.targetType] || entry.targetType;
  
  return `${entry.userId} ${action} ${target} at ${timestamp}`;
}
