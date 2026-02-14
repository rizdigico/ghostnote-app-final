export type VoicePresetVisibility = 'private' | 'team';

// Linguistic DNA extracted from voice profiles for efficient prompting
export interface LinguisticDna {
  tone: string[];
  vocabulary: string[];
  sentencePatterns: string[];
  keywords: string[];
}

// Voice injection with intensity (for style mixing)
export interface VoiceInjection {
  voiceId: string;
  intensity: number; // 0.1 to 1.0
}

export interface VoicePreset {
  id: string;
  name: string;
  referenceText: string;
  isCustom?: boolean; // If true, it belongs to a specific user
  is_system_preset?: boolean; // System-level voice (global, read-only)
  ownerId?: string;
  createdBy?: string; // Original creator
  teamId?: string; // Team ownership
  visibility?: VoicePresetVisibility; // 'private' or 'team' (optional for system presets)
  metadata?: {
    source?: 'manual' | 'url' | 'file';
    sourceUrl?: string;
    linguisticDna?: LinguisticDna;
  };
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