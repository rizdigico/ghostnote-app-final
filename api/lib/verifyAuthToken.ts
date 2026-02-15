// api/lib/verifyAuthToken.ts
// Middleware to verify Firebase ID tokens and ensure users can only modify their own data

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
  );
  initializeApp({ credential: cert(serviceAccount) });
}

const auth = getAuth();

export interface AuthenticatedRequest {
  userId: string; // The authenticated user's ID from the token
  body: any;
}

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Returns the decoded token user ID if valid, or null if invalid.
 * 
 * @param authHeader - The Authorization header value (Bearer <token>)
 * @returns The user ID from the token, or null if verification fails
 */
export async function verifyAuthToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader) {
    return null;
  }

  // Check for Bearer token format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  const idToken = parts[1];

  try {
    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}

/**
 * Middleware to protect API routes with Firebase authentication.
 * Use this at the start of your API handlers.
 * 
 * @param req - The request object
 * @returns Object with userId if authenticated, or null/undefined if not
 * 
 * Usage in API handler:
 * ```typescript
 * export default async function handler(req: any, res: any) {
 *   const userId = await requireAuth(req);
 *   if (!userId) {
 *     return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
 *   }
 *   // ... rest of handler uses userId from token
 * }
 * ```
 */
export async function requireAuth(req: any): Promise<string | null> {
  const authHeader = req.headers.authorization;
  return verifyAuthToken(authHeader);
}

/**
 * Validates that the authenticated user matches the requested userId.
 * Use this when the request body contains a userId that must match the token.
 * 
 * @param tokenUserId - The user ID from the verified auth token
 * @param requestedUserId - The user ID from the request body/params
 * @returns true if they match, false otherwise
 */
export function validateUserAccess(tokenUserId: string, requestedUserId: string): boolean {
  return tokenUserId === requestedUserId;
}
