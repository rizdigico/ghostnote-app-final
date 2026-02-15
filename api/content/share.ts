/**
 * Content Share API
 * 
 * Handles sharing content with clients (Client Approval Mode).
 * - Clone plan: Standard public link (read-only)
 * - Syndicate plan: Password-protected review mode with comments
 */

import { db } from '../../src/lib/firebase';
import { 
  collection, 
  addDoc, 
  getDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  updateDoc,
  deleteDoc 
} from 'firebase/firestore';
import { hasClientApproval, canInviteRole } from '../../config/subscriptionLimits';
import { getUserPlan } from '../lib/teamMiddleware';
import { getUserTeam } from '../lib/teamMiddleware';

export const config = {
  runtime: 'edge',
};

interface ShareRequest {
  contentId: string;
  content: string;
  title?: string;
  password?: string;
  expiresInDays?: number;
}

interface ShareResponse {
  success: boolean;
  shareUrl?: string;
  shareId?: string;
  error?: string;
}

/**
 * Create a share link for content
 */
export async function createShareLink(
  userId: string,
  data: ShareRequest
): Promise<ShareResponse> {
  try {
    // Get user's plan
    const plan = await getUserPlan(userId);
    
    // Check if user can create share links
    if (!hasClientApproval(plan)) {
      return {
        success: false,
        error: 'Advanced sharing features are available on Syndicate plan only.'
      };
    }
    
    // Get user's team
    const { team } = await getUserTeam(userId);
    
    // Generate share token
    const shareToken = generateShareToken();
    
    // Hash password if provided
    let passwordHash = null;
    let isPasswordProtected = false;
    
    if (data.password && data.password.length > 0) {
      // In production, use proper password hashing (bcrypt, etc.)
      passwordHash = hashPassword(data.password);
      isPasswordProtected = true;
    }
    
    // Calculate expiration
    const expiresAt = data.expiresInDays 
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    
    // Create share record
    const sharesRef = collection(db, 'client_shares');
    const shareDoc = await addDoc(sharesRef, {
      teamId: team.id,
      contentId: data.contentId,
      shareToken,
      passwordHash,
      isPasswordProtected,
      createdBy: userId,
      content: data.content,
      title: data.title || 'Shared Content',
      expiresAt: expiresAt?.toISOString() || null,
      createdAt: new Date().toISOString()
    });
    
    // Generate share URL
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ghostnote.app'}/share/${shareToken}`;
    
    return {
      success: true,
      shareUrl,
      shareId: shareDoc.id
    };
  } catch (error) {
    console.error('[ShareAPI] Failed to create share link:', error);
    return {
      success: false,
      error: 'Failed to create share link'
    };
  }
}

/**
 * Get shared content by token
 */
export async function getSharedContent(
  token: string,
  password?: string
): Promise<{
  success: boolean;
  content?: string;
  title?: string;
  error?: string;
  requiresPassword?: boolean;
}> {
  try {
    const sharesRef = collection(db, 'client_shares');
    const q = query(sharesRef, where('shareToken', '==', token));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return {
        success: false,
        error: 'Share link not found or has expired'
      };
    }
    
    const shareData = snapshot.docs[0].data();
    
    // Check expiration
    if (shareData.expiresAt) {
      const expiresAt = new Date(shareData.expiresAt);
      if (expiresAt < new Date()) {
        return {
          success: false,
          error: 'Share link has expired'
        };
      }
    }
    
    // Check password
    if (shareData.isPasswordProtected) {
      if (!password) {
        return {
          success: false,
          requiresPassword: true,
          error: 'Password required'
        };
      }
      
      const hashedInput = hashPassword(password);
      if (hashedInput !== shareData.passwordHash) {
        return {
          success: false,
          error: 'Incorrect password'
        };
      }
    }
    
    return {
      success: true,
      content: shareData.content,
      title: shareData.title
    };
  } catch (error) {
    console.error('[ShareAPI] Failed to get shared content:', error);
    return {
      success: false,
      error: 'Failed to retrieve shared content'
    };
  }
}

/**
 * Delete a share link
 */
export async function deleteShareLink(
  userId: string,
  shareId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const shareDoc = await getDoc(doc(db, 'client_shares', shareId));
    
    if (!shareDoc.exists()) {
      return { success: false, error: 'Share not found' };
    }
    
    const shareData = shareDoc.data();
    
    // Verify ownership
    if (shareData.createdBy !== userId) {
      return { success: false, error: 'Not authorized to delete this share' };
    }
    
    await deleteDoc(doc(db, 'client_shares', shareId));
    
    return { success: true };
  } catch (error) {
    console.error('[ShareAPI] Failed to delete share:', error);
    return { success: false, error: 'Failed to delete share' };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateShareToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  for (let i = 0; i < 32; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

function hashPassword(password: string): string {
  // Simple hash for demo - use bcrypt in production
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}
