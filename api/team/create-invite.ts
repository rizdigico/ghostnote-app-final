import { requireAuth } from '../lib/verifyAuthToken';
import { hasTeamPermission } from '../lib/teamMiddleware';
import { dbService } from '../../dbService';
import { TeamRole } from '../../types';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' } });
  }

  try {
    const userId = await requireAuth(req);
    if (!userId) {
      return res.status(401).json({ 
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' } 
      });
    }

    const { teamId, role } = req.body;

    if (!teamId || !role) {
      return res.status(400).json({ 
        error: { code: 'BAD_REQUEST', message: 'teamId and role are required' } 
      });
    }

    // Validate role is a valid TeamRole
    const validRoles = Object.values(TeamRole);
    if (!validRoles.includes(role as TeamRole)) {
      return res.status(400).json({ 
        error: { code: 'INVALID_ROLE', message: 'Invalid role' } 
      });
    }

    // Check if user has admin permissions for the team
    const isAdmin = await hasTeamPermission(userId, teamId, TeamRole.ADMIN);
    if (!isAdmin) {
      return res.status(403).json({ 
        error: { code: 'FORBIDDEN', message: 'Only admins can create invites' } 
      });
    }

    // Create the invite
    const invite = await dbService.createInvite(teamId, role as TeamRole, userId);

    // Generate the complete invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'production' ? 'https://app.ghostnote.ai' : 'http://localhost:3000');
    const inviteUrl = `${baseUrl}/invite/${invite.token}`;

    res.status(200).json({
      success: true,
      inviteUrl,
      token: invite.token,
      expiresAt: invite.expiresAt
    });

  } catch (error: any) {
    console.error('Error creating invite:', error);
    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to create invite' } 
    });
  }
}