import React, { useState, useEffect } from 'react';
import { X, Users, Shield, Trash2, Mail, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { TeamMember, TeamRole } from '../types';
import Button from './Button';
import Select from './Select';

interface TeamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TeamSettingsModal: React.FC<TeamSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, team, teamMembers, addTeamMember, removeTeamMember, refreshTeam } = useAuth();
  
  const [teamName, setTeamName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>(TeamRole.EDITOR);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (team) {
      setTeamName(team.name);
    }
  }, [team]);

  if (!isOpen || !user || !team) return null;

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteError('Email is required');
      return;
    }
    
    if (!inviteEmail.includes('@')) {
      setInviteError('Please enter a valid email');
      return;
    }

    setIsInviting(true);
    setInviteError('');

    try {
      const inviteLink = `${window.location.origin}/invite?team=${team.id}&email=${encodeURIComponent(inviteEmail)}&role=${inviteRole}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopiedInviteLink(true);
      setTimeout(() => setCopiedInviteLink(false), 3000);
    } catch (error) {
      setInviteError('Failed to create invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (memberUserId === user.id) return;
    
    setRemovingMemberId(memberUserId);
    try {
      await removeTeamMember(memberUserId);
      await refreshTeam();
    } catch (error) {
      console.error('Failed to remove member:', error);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getRoleBadgeColor = (role: TeamRole) => {
    switch (role) {
      case TeamRole.ADMIN:
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case TeamRole.EDITOR:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case TeamRole.VIEWER:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const roleOptions = [
    { value: TeamRole.ADMIN, label: 'Admin - Full access' },
    { value: TeamRole.EDITOR, label: 'Editor - Can create/edit content' },
    { value: TeamRole.VIEWER, label: 'Viewer - Read only' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
        <div className="relative w-full max-w-3xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh]">
          
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-xl font-bold text-textMain flex items-center gap-2">
                <Users size={20} className="text-accent" />
                Team & Members
              </h2>
              <p className="text-xs text-textMuted mt-1">Manage your team and invite collaborators</p>
            </div>
            <button onClick={onClose} className="p-2 text-textMuted hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            <div className="mb-8">
              <label className="text-xs font-semibold text-textMuted uppercase tracking-widest">Team Name</label>
              <div className="mt-2">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md px-4 py-2 text-sm text-textMain focus:border-accent focus:outline-none"
                  placeholder="Enter team name"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-semibold text-textMuted uppercase tracking-widest">
                  Team Members ({teamMembers.length})
                </label>
                <Button variant="secondary" onClick={() => setShowInviteModal(true)} className="flex items-center gap-2">
                  <UserPlus size={14} />
                  Invite Member
                </Button>
              </div>

              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-black border border-border flex items-center justify-center text-textMain font-bold">
                        {member.userId.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-textMain">
                          {member.userId === user.id ? 'You' : member.userId}
                        </p>
                        <p className="text-xs text-textMuted">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(member.role)}`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                      
                      {member.userId !== user.id && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={removingMemberId === member.userId}
                          className="p-2 text-textMuted hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Remove member"
                        >
                          {removingMemberId === member.userId ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {teamMembers.length === 0 && (
                  <div className="text-center py-8 text-textMuted">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No team members yet</p>
                    <p className="text-xs">Invite someone to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl p-6">
            <button 
              onClick={() => {
                setShowInviteModal(false);
                setInviteEmail('');
                setInviteError('');
              }}
              className="absolute top-4 right-4 p-2 text-textMuted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-textMain mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-accent" />
              Invite Team Member
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-textMuted uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError('');
                  }}
                  className="mt-2 w-full bg-surface border border-border rounded-md px-4 py-2 text-sm text-textMain focus:border-accent focus:outline-none"
                  placeholder="colleague@company.com"
                />
                {inviteError && <p className="mt-1 text-xs text-red-400">{inviteError}</p>}
              </div>

              <Select
                label="Role"
                options={roleOptions}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as TeamRole)}
              />

              <div className="p-4 bg-surface/50 border border-border rounded-lg">
                <p className="text-xs text-textMuted mb-2"><Shield size={12} className="inline mr-1" />Role Permissions:</p>
                <ul className="text-xs text-textMuted space-y-1">
                  <li>• <span className="text-red-400">Admin</span>: Full access, manage settings</li>
                  <li>• <span className="text-blue-400">Editor</span>: Create and edit content</li>
                  <li>• <span className="text-gray-400">Viewer</span>: Read-only access</li>
                </ul>
              </div>

              <Button variant="primary" onClick={handleInvite} isLoading={isInviting} className="w-full">
                {copiedInviteLink ? 'Link Copied!' : 'Generate Invite Link'}
              </Button>
              
              {copiedInviteLink && (
                <p className="text-xs text-center text-green-400">Invite link copied! Send it to your colleague.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamSettingsModal;
