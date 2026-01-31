export interface VoicePreset {
  id: string;
  name: string;
  referenceText: string;
  isCustom?: boolean; // If true, it belongs to a specific user
  ownerId?: string;
}

export type UserPlan = 'echo' | 'clone' | 'syndicate';

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
}

export enum RewriteStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}