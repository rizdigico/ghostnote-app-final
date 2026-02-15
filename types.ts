export type VoicePresetVisibility = 'private' | 'team';

// Linguistic DNA - Phase 2.0 Structure
// Detailed metrics for scientific voice cloning
export interface CadenceMetrics {
  avgSentenceLength: number;
  variance: 'low' | 'medium' | 'high';
  minLength: number;
  maxLength: number;
}

export interface VocabularyMetrics {
  complexity: 'simple' | 'moderate' | 'complex';
  jargonLevel: 'none' | 'low' | 'medium' | 'high';
  uniqueWordRatio: number;
}

export interface FormattingFingerprint {
  casing: 'lowercase' | 'uppercase' | 'mixed' | 'sentence';
  punctuation: 'minimal' | 'standard' | 'heavy';
  emojiFrequency: 'none' | 'low' | 'medium' | 'high';
  usesOxfordComma: boolean | null;
  doubleSpacing: boolean | null;
}

// Complete Linguistic DNA object
export interface LinguisticDNA {
  tone: string;
  cadence: CadenceMetrics;
  vocabulary: VocabularyMetrics;
  formatting: FormattingFingerprint;
  signaturePhrases: string[];
  topWords: string[];
  sampleSentences: string[];
  analyzedAt?: string; // ISO timestamp
}

// Legacy interface alias for backward compatibility
export type LinguisticDna = LinguisticDNA;

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
  isLocked?: boolean; // Syndicate-only: lock preset from editing
  metadata?: {
    source?: 'manual' | 'url' | 'file';
    sourceUrl?: string;
    linguisticDna?: LinguisticDna;
  };
}

export type UserPlan = 'echo' | 'clone' | 'syndicate';

// Subscription status for UI display
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'none';

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
  
  // Subscription lifecycle fields
  subscriptionId?: string; // Stripe subscription ID (sub_xxx)
  customerId?: string; // Stripe customer ID (cus_xxx)
  cancelAtPeriodEnd?: boolean; // True if user scheduled cancellation
  currentPeriodEnd?: string; // ISO timestamp when access ends
  paymentWarning?: boolean; // Payment failure notification flag
}

// Team roles
export enum TeamRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  CLIENT = 'client' // External stakeholder - Syndicate only
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