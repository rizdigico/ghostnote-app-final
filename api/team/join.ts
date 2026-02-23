import { requireAuth } from '../lib/verifyAuthToken';
import { dbService } from '../../dbService';

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

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        error: { code: 'BAD_REQUEST', message: 'Invite token is required' } 
      });
    }

    // Get the invite
    const invite = await dbService.getInviteByToken(token);
    if (!invite) {
      return res.status(404).json({ 
        error: { code: 'INVITE_NOT_FOUND', message: 'Invite not found' } 
      });
    }

    if (invite.status === 'accepted') {
      return res.status(400).json({ 
        error: { code: 'INVITE_ALREADY_ACCEPTED', message: 'Invite has already been accepted' } 
      });
    }

    if (invite.status === 'expired') {
      return res.status(400).json({ 
        error: { code: 'INVITE_EXPIRED', message: 'Invite has expired' } 
      });
    }

    // Accept the invite
    const acceptedInvite = await dbService.acceptInvite(token, userId);

    res.status(200).json({
      success: true,
      teamId: acceptedInvite.teamId,
      role: acceptedInvite.role,
      message: `Successfully joined the team as ${acceptedInvite.role}`
    });

  } catch (error: any) {
    console.error('Error joining team:', error);
    
    if (error.message === 'User is already a member of this team') {
      return res.status(400).json({ 
        error: { code: 'ALREADY_MEMBER', message: error.message } 
      });
    }

    res.status(500).json({ 
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to join team' } 
    });
  }
}