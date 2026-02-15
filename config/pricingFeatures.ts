/**
 * Pricing Features Configuration
 * 
 * Centralized feature definitions for pricing tables.
 * Used by LandingPage, PricingModal, and PricingTable components.
 */

import { UserPlan } from '../types';

export interface PricingFeature {
  name: string;
  icon?: string;
  tooltip?: string;
}

export interface PricingPlanFeatures {
  id: UserPlan;
  name: string;
  features: PricingFeature[];
  disabled: PricingFeature[];
}

/**
 * Plan feature definitions with team collaboration features
 */
export const PRICING_FEATURES: Record<UserPlan, {
  features: PricingFeature[];
  disabled: PricingFeature[];
}> = {
  echo: {
    features: [
      { name: '10 Credits / Day' },
      { name: '2 Custom Voice Presets' },
      { name: 'Text Input Only' },
      { name: 'Standard Speed' },
    ],
    disabled: [
      { name: 'Team Collaboration', icon: '❌' },
      { name: 'Single User License', icon: '👤' },
      { name: 'File Upload (Brand DNA)' },
      { name: 'Tone Intensity Slider' },
      { name: 'Bulk CSV Processing' },
    ]
  },
  clone: {
    features: [
      { name: 'Unlimited Credits' },
      { name: '10 Custom Voice Presets' },
      { name: 'Brand DNA File Upload' },
      { name: 'Tone Intensity Slider' },
      { name: 'Priority Generation' },
      // Team features
      { name: 'Team Collaboration (3 Seats)', icon: '✅' },
      { name: 'Standard Roles (Admin, Editor)', icon: '🔒' },
      { name: 'Shared Voice Library', icon: '✨' },
    ],
    disabled: [
      { name: 'Bulk CSV Processing' },
      { name: 'Unlimited Team Seats' },
      { name: 'Agency Roles (Viewer, Client)' },
      { name: 'Asset Locking', tooltip: 'Prevent accidental edits to voice profiles' },
      { name: 'Team Analytics' },
    ]
  },
  syndicate: {
    features: [
      { name: 'Unlimited Credits' },
      { name: 'Unlimited Custom Voice Presets' },
      { name: 'Brand DNA File Upload' },
      { name: 'Tone Intensity Slider' },
      { name: 'Bulk CSV Processing' },
      { name: 'API Access' },
      // Team features
      { name: 'Unlimited Team Seats', icon: '✅' },
      { name: 'Agency Roles (Admin, Editor, Viewer, Client)', icon: '🛡️' },
      { name: 'Asset Locking', icon: '🔐', tooltip: 'Prevent accidental edits to voice profiles' },
      { name: 'Team Analytics', icon: '📊' },
      { name: 'Client Approval Mode', icon: '📝' },
      { name: 'Audit Logs', icon: '📋' },
    ],
    disabled: []
  }
};

/**
 * Helper to get features for a specific plan
 */
export function getPlanFeatures(plan: UserPlan) {
  return PRICING_FEATURES[plan];
}

/**
 * Collaboration section header for visual hierarchy
 */
export const COLLABORATION_SECTION = {
  title: 'Collaboration & Teams',
  echo: [
    { name: '❌ Team Collaboration' },
    { name: '👤 Single User License' },
  ],
  clone: [
    { name: '✅ Team Collaboration (3 Seats)' },
    { name: '🔒 Standard Roles (Admin, Editor)' },
    { name: '✨ Shared Voice Library' },
  ],
  syndicate: [
    { name: '✅ Unlimited Team Seats' },
    { name: '🛡️ Agency Roles (Client & Viewer)' },
    { name: '🔐 Asset Locking' },
    { name: '📊 Team Analytics' },
  ]
};

/**
 * Tooltip content for special features
 */
export const FEATURE_TOOLTIPS: Record<string, string> = {
  'Asset Locking': 'Syndicate users can lock Voice Profiles to prevent accidental edits. Editors can still use them but cannot modify the settings.',
  'Agency Roles': 'Syndicate plan includes Viewer (read-only) and Client (external stakeholder) roles for safe team collaboration.',
  'Team Analytics': 'Track usage statistics per team member. See who\'s generating the most content.',
  'Client Approval Mode': 'Share content with external clients for review with password protection and commenting.',
  'Audit Logs': 'Complete history of team actions - who created, edited, or deleted content.',
};
