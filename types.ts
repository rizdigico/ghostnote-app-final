export type VoicePresetVisibility = 'private' | 'team';

export interface VoicePreset {
  id: string;
  name: string;
  referenceText: string;
  isCustom?: boolean; // If true, it belongs to a specific user
  ownerId?: string;
  createdBy?: string; // Original creator
  teamId?: string; // Team ownership
  visibility?: VoicePresetVisibility; // 'private' or 'team' (optional for system presets)
}

export type UserPlan = 'echo' | 'clone' | 'syndicate';

// Preset limits per plan
export const PRESET_LIMITS: Record<UserPlan, number> = {
  echo: 2,
  clone: 10,
  syndicate: -1, // -1 means unlimited
};

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  plan: UserPlan;
  billingCycle?: 'monthly' | 'yearly';
  credits: number; // For 'echo' users
  joinedDate: string;
  instagramConnected?: boolean;
  apiKey?: string;
  createdAt?: Date; // Timestamp for when user was first created
  teamId?: string; // Associated team ID
}

// Team roles
export enum TeamRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

// Team subscription status
export type TeamSubscriptionStatus = 'active' | 'suspended' | 'cancelled';

// Team settings
export interface TeamSettings {
  allowMemberInvites: boolean;
  defaultRole: TeamRole;
  sharingEnabled: boolean;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  subscriptionStatus: TeamSubscriptionStatus;
  subscriptionPlan: UserPlan;
  settings: TeamSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
  user?: User; // Populated when fetching member details
}

export enum RewriteStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}