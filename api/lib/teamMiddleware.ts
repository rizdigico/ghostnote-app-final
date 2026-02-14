/**
 * Team Permission Middleware
 * 
 * Provides team-based access control for API endpoints.
 * Ensures users can only access resources owned by their team.
 * 
 * Features:
 * - requireTeamPermission: Check if user has required role for a resource
 * - getUserTeam: Get user's current team (with fallback for legacy users)
 * - canAccessResource: Check if user can access a specific resource
 * - getUserRole: Get user's role in a team
 */

import { db } from '../../src/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { TeamRole, Team, TeamMember } from '../../types';

// Storage keys for localStorage fallback
const STORAGE_KEY_TEAMS = 'ghostnote_teams';
const STORAGE_KEY_TEAM_MEMBERS = 'ghostnote_team_members';

/**
 * Get user's team (with fallback for legacy users)
 * If user is not in a team, creates a default personal team
 */
export async function getUserTeam(userId: string): Promise<{ team: Team; isNew: boolean }> {
  // Try to get team from Firestore first
  try {
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const teamDoc = snapshot.docs[0];
      return {
        team: { id: teamDoc.id, ...teamDoc.data() } as Team,
        isNew: false
      };
    }
  } catch (error) {
    console.warn('[TeamMiddleware] Firestore query failed, using localStorage:', error);
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TEAMS);
    if (stored) {
      const teams: Team[] = JSON.parse(stored);
      const userTeam = teams.find(t => t.ownerId === userId);
      
      if (userTeam) {
        return { team: userTeam, isNew: false };
      }
    }
  } catch (error) {
    console.warn('[TeamMiddleware] LocalStorage read failed:', error);
  }

  // Create default personal team for legacy users
  const defaultTeam: Team = {
    id: 'team_' + Math.random().toString(36).substr(2, 9),
    name: "User's Team",
    ownerId: userId,
    subscriptionStatus: 'active',
    subscriptionPlan: 'echo',
    settings: {
      allowMemberInvites: true,
      defaultRole: TeamRole.EDITOR,
      sharingEnabled: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Save to localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TEAMS);
    const teams: Team[] = stored ? JSON.parse(stored) : [];
    teams.push(defaultTeam);
    localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams));
  } catch (error) {
    console.warn('[TeamMiddleware] Failed to save team to localStorage:', error);
  }

  return { team: defaultTeam, isNew: true };
}

/**
 * Get user's role in a team
 */
export async function getUserRole(userId: string, teamId: string): Promise<TeamRole | null> {
  // Try Firestore first
  try {
    const membersRef = collection(db, 'team_members');
    const q = query(membersRef, where('teamId', '==', teamId), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const memberData = snapshot.docs[0].data();
      return memberData.role as TeamRole;
    }
  } catch (error) {
    console.warn('[TeamMiddleware] Firestore query failed, using localStorage:', error);
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TEAM_MEMBERS);
    if (stored) {
      const members: TeamMember[] = JSON.parse(stored);
      const member = members.find(m => m.teamId === teamId && m.userId === userId);
      return member?.role || null;
    }
  } catch (error) {
    console.warn('[TeamMiddleware] LocalStorage read failed:', error);
  }

  // If user is owner, they have admin role
  try {
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (teamDoc.exists() && teamDoc.data().ownerId === userId) {
      return TeamRole.ADMIN;
    }
  } catch (error) {
    // Ignore - might not have access
  }

  return null;
}

/**
 * Check if user has required permission for a resource
 */
export async function hasTeamPermission(
  userId: string,
  teamId: string,
  requiredRole: TeamRole
): Promise<boolean> {
  const userRole = await getUserRole(userId, teamId);
  
  if (!userRole) {
    return false;
  }

  // Role hierarchy: ADMIN > EDITOR > VIEWER
  const roleHierarchy: Record<TeamRole, number> = {
    [TeamRole.ADMIN]: 3,
    [TeamRole.EDITOR]: 2,
    [TeamRole.VIEWER]: 1
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Middleware factory for team permission checking
 * 
 * @param requiredRole - Minimum role required to access the resource
 * @param options - Additional options
 * 
 * Usage:
 *   export default requireTeamPermission(TeamRole.EDITOR)(handler);
 *   export default requireTeamPermission(TeamRole.VIEWER, { resourceOwnerField: 'teamId' })(handler);
 */
export function requireTeamPermission(
  requiredRole: TeamRole,
  options: {
    resourceOwnerField?: string; // Field name that contains the team/user ID
    allowOwner?: boolean; // Allow resource owner even if not in team
  } = {}
) {
  return async function middleware(req: any, res: any) {
    try {
      // Get user from request (set by auth middleware)
      const userId = req.user?.id || req.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get the resource's team ID
      const teamId = req.body?.teamId || req.query?.teamId || req.params?.teamId;
      
      if (teamId) {
        // Check if user has required role in the team
        const hasPermission = await hasTeamPermission(userId, teamId, requiredRole);
        
        if (!hasPermission) {
          return res.status(403).json({ 
            error: `Insufficient permissions. Required role: ${requiredRole}` 
          });
        }
      } else {
        // No team specified - get user's default team
        const { team } = await getUserTeam(userId);
        
        // Attach team to request for downstream handlers
        req.team = team;
        
        const hasPermission = await hasTeamPermission(userId, team.id, requiredRole);
        
        if (!hasPermission) {
          return res.status(403).json({ 
            error: `Insufficient permissions. Required role: ${requiredRole}` 
          });
        }
      }

      // Continue to handler
      return true;
    } catch (error: any) {
      console.error('[TeamMiddleware] Permission check failed:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Check if user can access a voice preset
 * Considers both legacy (ownerId) and new (teamId) ownership
 */
export async function canAccessVoicePreset(
  userId: string,
  presetOwnerId: string,
  presetTeamId?: string
): Promise<boolean> {
  // Direct owner - always allowed
  if (presetOwnerId === userId) {
    return true;
  }

  // If no team ID, check legacy ownership
  if (!presetTeamId) {
    return false;
  }

  // Check team membership
  const userRole = await getUserRole(userId, presetTeamId);
  return userRole !== null;
}

/**
 * Check if user can perform action on voice preset based on role
 */
export async function canModifyVoicePreset(
  userId: string,
  presetOwnerId: string,
  presetTeamId?: string
): Promise<boolean> {
  // Owner can always modify their presets
  if (presetOwnerId === userId) {
    return true;
  }

  // If part of a team, check if they have editor or admin role
  if (presetTeamId) {
    const userRole = await getUserRole(userId, presetTeamId);
    return userRole === TeamRole.ADMIN || userRole === TeamRole.EDITOR;
  }

  return false;
}

/**
 * Get voice presets accessible to user
 * Returns presets owned by user OR owned by their team
 */
export async function getAccessibleVoicePresets(userId: string): Promise<{
  ownerIds: string[];
  teamIds: string[];
}> {
  const { team } = await getUserTeam(userId);
  
  return {
    ownerIds: [userId], // Own presets
    teamIds: [team.id]  // Team's presets
  };
}

/**
 * Middleware to attach team info to request
 * Use this for endpoints that need team context
 */
export async function attachTeamContext(req: any, res: any) {
  try {
    const userId = req.user?.id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's team
    const { team, isNew } = await getUserTeam(userId);
    
    // Attach to request
    req.team = team;
    req.userTeam = team;
    req.isNewTeam = isNew;
    
    // Get user's role in team
    const role = await getUserRole(userId, team.id);
    req.userTeamRole = role || TeamRole.ADMIN; // Default to admin if owner
    
    return true;
  } catch (error: any) {
    console.error('[TeamMiddleware] Failed to attach team context:', error);
    return res.status(500).json({ error: 'Failed to load team context' });
  }
}
