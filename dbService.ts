import { User, UserPlan, VoicePreset, Team, TeamMember, TeamRole, TeamSettings, Invite } from './types';
import { VOICE_PRESETS, SYSTEM_PRESETS } from './constants';

// --- MOCK DATABASE CONFIGURATION ---
// When moving to Firebase/Supabase, replace these methods with real API calls.

const STORAGE_KEY_USER = 'ghostnote_user_session';
const STORAGE_KEY_CUSTOM_VOICES = 'ghostnote_custom_voices';
const STORAGE_KEY_TEAMS = 'ghostnote_teams';
const STORAGE_KEY_TEAM_MEMBERS = 'ghostnote_team_members';
const STORAGE_KEY_INVITES = 'ghostnote_invites';

export const dbService = {
  // --- AUTHENTICATION ---

  async login(email: string): Promise<User> {
    // SIMULATE NETWORK DELAY
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if we have a saved user session in local storage to mimic "cloud" persistence
    try {
      const savedSession = localStorage.getItem(STORAGE_KEY_USER);
      if (savedSession) {
        const user = JSON.parse(savedSession);
        if (user.email === email) return user;
      }
    } catch (e) {
      console.warn("Invalid session data found, clearing.");
      localStorage.removeItem(STORAGE_KEY_USER);
    }

    // If new user (mock), create a default profile
    const newUser: User = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      email,
      name: email.split('@')[0],
      plan: 'echo',
      credits: 10,
      joinedDate: new Date().toISOString(),
      instagramConnected: false,
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    return newUser;
  },

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY_USER);
    await new Promise((resolve) => setTimeout(resolve, 500));
  },

  async deleteAccount(userId: string): Promise<void> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Remove user session
    const session = localStorage.getItem(STORAGE_KEY_USER);
    if (session) {
        const user = JSON.parse(session);
        if (user.id === userId) {
            localStorage.removeItem(STORAGE_KEY_USER);
        }
    }

    // Remove custom voices associated with this user
    const storedVoices = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
    if (storedVoices) {
      let voices = JSON.parse(storedVoices);
      if (Array.isArray(voices)) {
          // Keep only voices NOT owned by this user
          voices = voices.filter((v: any) => v.ownerId !== userId);
          localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(voices));
      }
    }
  },

  // --- USER DATA ---

  async updateUserPlan(userId: string, newPlan: UserPlan): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const session = localStorage.getItem(STORAGE_KEY_USER);
    if (!session) throw new Error("No session found");

    const user = JSON.parse(session);
    // Update plan
    user.plan = newPlan;
    
    // Reset credits if upgrading (mock logic)
    if (newPlan !== 'echo') user.credits = 999999; 

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return user;
  },

  async deductCredit(userId: string): Promise<User> {
    const session = localStorage.getItem(STORAGE_KEY_USER);
    if (!session) throw new Error("No session found");
    const user = JSON.parse(session);

    if (user.plan === 'echo') {
        user.credits = Math.max(0, user.credits - 1);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    }
    return user;
  },

  async toggleInstagramConnection(userId: string): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const session = localStorage.getItem(STORAGE_KEY_USER);
    if (!session) throw new Error("No session found");
    
    const user = JSON.parse(session);
    // Mock toggle
    user.instagramConnected = !user.instagramConnected;
    
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return user;
  },

  async generateApiKey(userId: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const session = localStorage.getItem(STORAGE_KEY_USER);
    if (!session) throw new Error("No session found");

    const user = JSON.parse(session);
    // Generate a mock API key
    const newKey = 'gn_live_' + Array(32).fill(0).map(() => Math.random().toString(36)[2]).join('');
    
    user.apiKey = newKey;
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    
    return newKey;
  },

  // --- VOICE PRESETS (PERSISTENCE) ---

  async getVoicePresets(userId: string): Promise<VoicePreset[]> {
    // Return default presets + user saved presets + system presets
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
    let customVoices: VoicePreset[] = [];
    
    try {
      customVoices = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(customVoices)) customVoices = [];
    } catch (e) {
      console.warn("Corrupted voice presets found, resetting.");
      localStorage.removeItem(STORAGE_KEY_CUSTOM_VOICES);
    }
    
    // Filter customs for this user (mocking RLS)
    const userVoices = customVoices.filter(v => v.ownerId === userId);
    
    // Return: System presets (global) + Default presets + User's custom presets
    return [...SYSTEM_PRESETS, ...VOICE_PRESETS, ...userVoices];
  },

  async getVoicePresetById(userId: string, presetId: string): Promise<VoicePreset | null> {
    // Get all accessible presets for the user
    const allPresets = await this.getVoicePresets(userId);
    
    // Find preset by ID
    return allPresets.find(preset => preset.id === presetId) || null;
  },

  async saveVoicePreset(userId: string, name: string, referenceText: string): Promise<VoicePreset> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Validation
    const cleanName = name.trim();
    const cleanRef = referenceText.trim();
    
    if (!cleanName) throw new Error("Preset name is required");
    if (cleanName.length > 50) throw new Error("Preset name is too long (max 50 chars)");
    if (!cleanRef) throw new Error("Reference text is required");
    if (cleanRef.length > 20000) throw new Error("Reference text is too long");

    const newPreset: VoicePreset = {
        id: 'custom_' + Math.random().toString(36).substr(2, 9),
        name: cleanName,
        referenceText: cleanRef,
        isCustom: true,
        ownerId: userId,
        createdBy: userId,
        visibility: 'private'
    };

    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
    let customVoices: VoicePreset[] = [];
    try {
      customVoices = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(customVoices)) customVoices = [];
    } catch (e) {
      customVoices = [];
    }
    
    customVoices.push(newPreset);
    localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(customVoices));

    return newPreset;
  },

  async deleteVoicePreset(userId: string, presetId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
    if (!stored) return;

    let customVoices: VoicePreset[] = [];
    try {
      customVoices = JSON.parse(stored);
      if (!Array.isArray(customVoices)) customVoices = [];
    } catch (e) {
      customVoices = [];
    }

    // Only delete if the preset belongs to the user
    const updatedVoices = customVoices.filter(
      (v) => !(v.id === presetId && v.ownerId === userId)
    );

    localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(updatedVoices));
  },

  // ============ TEAM OPERATIONS ============

  /**
   * Get or create a team for a user (lazy creation)
   * This ensures backward compatibility - existing users get a team on first access
   */
  async getOrCreateUserTeam(userId: string): Promise<Team> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const teams = dbService.getTeamsFromStorage();
    let team = teams.find(t => t.ownerId === userId);
    
    if (!team) {
      // Create a new team for this user
      const user = await dbService.getUserById(userId);
      const teamId = 'team_' + Math.random().toString(36).substr(2, 9);
      
      team = {
        id: teamId,
        name: user ? `${user.name}'s Team` : "User's Team",
        ownerId: userId,
        subscriptionStatus: 'active',
        subscriptionPlan: user?.plan || 'echo',
        settings: {
          allowMemberInvites: true,
          defaultRole: TeamRole.EDITOR,
          sharingEnabled: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      teams.push(team);
      dbService.saveTeamsToStorage(teams);
      
      // Also create the team member relationship
      await dbService.addTeamMember(teamId, userId, TeamRole.ADMIN);
      
      console.log(`[TeamService] Created team ${teamId} for user ${userId}`);
    }
    
    return team;
  },

  /**
   * Get team by ID
   */
  async getTeam(teamId: string): Promise<Team | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    const teams = dbService.getTeamsFromStorage();
    return teams.find(t => t.id === teamId) || null;
  },

  /**
   * Get team by owner ID
   */
  async getTeamByOwnerId(ownerId: string): Promise<Team | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    const teams = dbService.getTeamsFromStorage();
    return teams.find(t => t.ownerId === ownerId) || null;
  },

  /**
   * Update team settings
   */
  async updateTeamSettings(teamId: string, settings: Partial<TeamSettings>): Promise<Team> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const teams = dbService.getTeamsFromStorage();
    const teamIndex = teams.findIndex(t => t.id === teamId);
    
    if (teamIndex === -1) {
      throw new Error('Team not found');
    }
    
    teams[teamIndex] = {
      ...teams[teamIndex],
      settings: { ...teams[teamIndex].settings, ...settings },
      updatedAt: new Date().toISOString()
    };
    
    dbService.saveTeamsToStorage(teams);
    return teams[teamIndex];
  },

  /**
   * Update team name
   */
  async updateTeamName(teamId: string, newName: string): Promise<Team> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const teams = dbService.getTeamsFromStorage();
    const teamIndex = teams.findIndex(t => t.id === teamId);
    
    if (teamIndex === -1) {
      throw new Error('Team not found');
    }
    
    const cleanName = newName.trim();
    if (!cleanName) {
      throw new Error('Team name is required');
    }
    
    teams[teamIndex] = {
      ...teams[teamIndex],
      name: cleanName,
      updatedAt: new Date().toISOString()
    };
    
    dbService.saveTeamsToStorage(teams);
    return teams[teamIndex];
  },

  /**
   * Add a member to a team
   */
  async addTeamMember(teamId: string, userId: string, role: TeamRole): Promise<TeamMember> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const members = dbService.getTeamMembersFromStorage();
    
    // Check if already a member
    const existingMember = members.find(m => m.teamId === teamId && m.userId === userId);
    if (existingMember) {
      throw new Error('User is already a team member');
    }
    
    const member: TeamMember = {
      id: 'member_' + Math.random().toString(36).substr(2, 9),
      teamId,
      userId,
      role,
      joinedAt: new Date().toISOString()
    };
    
    members.push(member);
    dbService.saveTeamMembersToStorage(members);
    
    return member;
  },

  /**
   * Remove a member from a team
   */
  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const members = dbService.getTeamMembersFromStorage();
    const filtered = members.filter(m => !(m.teamId === teamId && m.userId === userId));
    dbService.saveTeamMembersToStorage(filtered);
  },

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    const members = dbService.getTeamMembersFromStorage();
    return members.filter(m => m.teamId === teamId);
  },

  /**
   * Get user's role in a team
   */
  async getUserTeamRole(userId: string, teamId: string): Promise<TeamRole | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    const members = dbService.getTeamMembersFromStorage();
    const member = members.find(m => m.teamId === teamId && m.userId === userId);
    return member?.role || null;
  },

  // ============ TEAM-BASED VOICE PRESET OPERATIONS ============

  /**
   * Get voice presets accessible to user (owned by user OR user's team)
   * Supports both legacy (ownerId) and new (teamId) ownership
   */
  async getVoicePresetsForUser(userId: string): Promise<VoicePreset[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Get user's team
    const team = await dbService.getOrCreateUserTeam(userId);
    
    // Get all custom voices
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
    let customVoices: VoicePreset[] = [];
    
    try {
      customVoices = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(customVoices)) customVoices = [];
    } catch (e) {
      console.warn('Corrupted voice presets found, resetting.');
      localStorage.removeItem(STORAGE_KEY_CUSTOM_VOICES);
    }
    
    // Filter voices that are:
    // 1. Owned by the user directly (legacy)
    // 2. Owned by the user's team
    const userVoices = customVoices.filter(v => 
      v.ownerId === userId || v.teamId === team.id
    );
    
    return [...VOICE_PRESETS, ...userVoices];
  },

  /**
   * Save voice preset with team ownership
   * Uses team ID if available, falls back to user ID for legacy
   */
  async saveVoicePresetWithTeam(
    userId: string, 
    name: string, 
    referenceText: string,
    teamId?: string
  ): Promise<VoicePreset> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Validation
    const cleanName = name.trim();
    const cleanRef = referenceText.trim();
    
    if (!cleanName) throw new Error('Preset name is required');
    if (cleanName.length > 50) throw new Error('Preset name is too long (max 50 chars)');
    if (!cleanRef) throw new Error('Reference text is required');
    if (cleanRef.length > 20000) throw new Error('Reference text is too long');

    // Get team ID (fallback to user's team if not provided)
    let targetTeam = teamId ? await dbService.getTeam(teamId) : null;
    if (!targetTeam) {
      targetTeam = await dbService.getOrCreateUserTeam(userId);
    }
    
    const newPreset: VoicePreset = {
        id: 'custom_' + Math.random().toString(36).substr(2, 9),
        name: cleanName,
        referenceText: cleanRef,
        isCustom: true,
        ownerId: userId,
        createdBy: userId,
        teamId: targetTeam.id,
        visibility: 'private' // Default to private, can be updated to 'team'
    };

    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
    let customVoices: VoicePreset[] = [];
    try {
      customVoices = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(customVoices)) customVoices = [];
    } catch (e) {
      customVoices = [];
    }
    
    customVoices.push(newPreset);
    localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(customVoices));

    return newPreset;
  },

  /**
   * Delete voice preset with team permission check
   * Allows deletion if user is owner OR has editor/admin role in team
   */
  async deleteVoicePresetWithTeam(
    userId: string, 
    presetId: string,
    presetOwnerId: string,
    presetTeamId?: string
  ): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Check if user can delete:
    // 1. User is the owner
    // 2. User is admin/editor in the team that owns the preset
    const isOwner = presetOwnerId === userId;
    
    let canDelete = isOwner;
    
    if (!isOwner && presetTeamId) {
      const userRole = await dbService.getUserTeamRole(userId, presetTeamId);
      canDelete = userRole === TeamRole.ADMIN || userRole === TeamRole.EDITOR;
    }
    
    if (!canDelete) {
      throw new Error('You do not have permission to delete this preset');
    }

    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
    if (!stored) return false;

    let customVoices: VoicePreset[] = [];
    try {
      customVoices = JSON.parse(stored);
      if (!Array.isArray(customVoices)) customVoices = [];
    } catch (e) {
      customVoices = [];
    }

    const updatedVoices = customVoices.filter((v) => v.id !== presetId);
    localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(updatedVoices));
    
    return true;
  },

  // ============ PRIVATE STORAGE HELPERS ============

  getTeamsFromStorage(): Team[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TEAMS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Error reading teams from storage:', e);
      return [];
    }
  },

  saveTeamsToStorage(teams: Team[]): void {
    localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams));
  },

  getTeamMembersFromStorage(): TeamMember[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TEAM_MEMBERS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Error reading team members from storage:', e);
      return [];
    }
  },

  saveTeamMembersToStorage(members: TeamMember[]): void {
    localStorage.setItem(STORAGE_KEY_TEAM_MEMBERS, JSON.stringify(members));
  },

  /**
    * Get user by ID (helper for team creation)
    */
  async getUserById(userId: string): Promise<User | null> {
    const savedSession = localStorage.getItem(STORAGE_KEY_USER);
    if (savedSession) {
      const user = JSON.parse(savedSession);
      if (user.id === userId) return user;
    }
    return null;
  },

  // ============ INVITE OPERATIONS ============

  /**
   * Create a new team invitation
   */
  async createInvite(teamId: string, role: TeamRole, createdBy: string): Promise<Invite> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    // Generate cryptographically secure token
    const token = 'invite_' + crypto.randomUUID();
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const invite: Invite = {
      id: 'invite_' + crypto.randomUUID(),
      token,
      teamId,
      role,
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy
    };
    
    const invites = dbService.getInvitesFromStorage();
    invites.push(invite);
    dbService.saveInvitesToStorage(invites);
    
    return invite;
  },

  /**
   * Get invite by token
   */
  async getInviteByToken(token: string): Promise<Invite | null> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    const invites = dbService.getInvitesFromStorage();
    const inviteIndex = invites.findIndex(i => i.token === token);
    
    if (inviteIndex === -1) {
      return null;
    }
    
    const invite = invites[inviteIndex];
    
    // Check if expired
    if (new Date(invite.expiresAt) < new Date() && invite.status === 'pending') {
      invite.status = 'expired';
      dbService.saveInvitesToStorage(invites);
    }
    
    return invite;
  },

  /**
   * Accept an invitation
   */
  async acceptInvite(token: string, userId: string): Promise<Invite> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    const invites = dbService.getInvitesFromStorage();
    const inviteIndex = invites.findIndex(i => i.token === token);
    
    if (inviteIndex === -1) {
      throw new Error('Invite not found');
    }
    
    const invite = invites[inviteIndex];
    
    if (invite.status !== 'pending') {
      throw new Error('Invite is no longer valid');
    }
    
    if (new Date(invite.expiresAt) < new Date()) {
      invite.status = 'expired';
      dbService.saveInvitesToStorage(invites);
      throw new Error('Invite has expired');
    }
    
    // Check if user is already a member
    const members = dbService.getTeamMembersFromStorage();
    const existingMember = members.find(m => m.teamId === invite.teamId && m.userId === userId);
    if (existingMember) {
      throw new Error('User is already a member of this team');
    }
    
    // Mark as accepted
    invite.status = 'accepted';
    dbService.saveInvitesToStorage(invites);
    
    // Add user to team
    await dbService.addTeamMember(invite.teamId, userId, invite.role);
    
    return invite;
  },

  /**
   * Get all invites for a team
   */
  async getTeamInvites(teamId: string): Promise<Invite[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    const invites = dbService.getInvitesFromStorage();
    return invites.filter(i => i.teamId === teamId);
  },

  /**
   * Delete an invite
   */
  async deleteInvite(inviteId: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    const invites = dbService.getInvitesFromStorage();
    const filtered = invites.filter(i => i.id !== inviteId);
    dbService.saveInvitesToStorage(filtered);
  },

  // ============ STORAGE HELPERS ============

  getInvitesFromStorage(): Invite[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INVITES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Error reading invites from storage:', e);
      return [];
    }
  },

  saveInvitesToStorage(invites: Invite[]): void {
    localStorage.setItem(STORAGE_KEY_INVITES, JSON.stringify(invites));
  }
};
