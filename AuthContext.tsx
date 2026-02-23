import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserPlan, Team, TeamMember, TeamRole } from './types';
import { dbService } from './dbService';
import { auth } from './src/lib/firebase';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
  reauthenticateWithPopup,
  getIdToken,
  type AuthError,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

interface AuthContextType {
  user: User | null;
  team: Team | null;
  teamMembers: TeamMember[];
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePlan: (plan: UserPlan) => Promise<void>;
  deductCredit: () => Promise<void>;
  toggleInstagram: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  generateApiKey: () => Promise<void>;
  // Subscription lifecycle methods
  cancelSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
  clearPaymentWarning: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
  // Team functions
  refreshTeam: () => Promise<void>;
  addTeamMember: (userId: string, role: TeamRole) => Promise<void>;
  removeTeamMember: (userId: string) => Promise<void>;
  updateTeamSettings: (settings: Partial<Team['settings']>) => Promise<void>;
  updateTeamName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

// --- SECURITY: SECURE API KEY GENERATION ---
function generateSecureApiKey(): string {
  // Use crypto API for cryptographically secure random values
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return `key_${hex}`;
}

// --- SECURITY: AUTH RATE LIMITING ---
const authAttempts = new Map<string, { count: number; resetTime: number }>();
const AUTH_RATE_LIMIT = 5; // attempts per 15 minutes
const AUTH_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkAuthRateLimit(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = authAttempts.get(key);
  
  if (!record || now > record.resetTime) {
    authAttempts.set(key, { count: 1, resetTime: now + AUTH_WINDOW });
    return true;
  }
  
  if (record.count >= AUTH_RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// Helper function to ensure user document exists in Firestore
const ensureUserDocument = async (firebaseUser: any) => {
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    // Create new user document with default data
    const newUser: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      plan: 'echo',
      credits: 10,
      joinedDate: new Date().toISOString(),
      instagramConnected: false,
      // Generate secure API key
      apiKey: generateSecureApiKey(),
      createdAt: new Date()
    };
    await setDoc(userDocRef, newUser);
    return newUser;
  }

  return userDocSnap.data() as User;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [redirectProcessed, setRedirectProcessed] = useState(false);

  // Function to load team data for a user
  const loadTeamData = async (userId: string, teamId?: string) => {
    try {
      let targetTeam: Team | null;
      
      if (teamId) {
        // Load specific team if ID is provided
        targetTeam = await dbService.getTeam(teamId);
        if (!targetTeam) {
          console.warn('[AuthContext] Team not found, falling back to user\'s team');
          targetTeam = await dbService.getOrCreateUserTeam(userId);
        }
      } else {
        // Get or create team for user (lazy creation)
        targetTeam = await dbService.getOrCreateUserTeam(userId);
      }
      
      setTeam(targetTeam);
      
      // Load team members
      const members = await dbService.getTeamMembers(targetTeam.id);
      setTeamMembers(members);
      
      console.log('[AuthContext] Team loaded:', targetTeam.id);
    } catch (error) {
      console.error('[AuthContext] Failed to load team data:', error);
    }
  };

  // CRITICAL: Handle Google OAuth redirect result ONCE on mount
  useEffect(() => {
    const handleGoogleRedirectResult = async () => {
      try {
        console.log('🔍 Checking for Google OAuth redirect result...');
        const result = await getRedirectResult(auth);
        
        if (result?.user) {
          console.log('✅ Google OAuth redirect detected! User:', result.user.email);
          // User just came back from Google - ensure they exist in database
          const userData = await ensureUserDocument(result.user);
          setUser(userData);
          // Load team data for the user
          await loadTeamData(userData.id);
          setRedirectProcessed(true);
          setIsLoading(false);
          setAuthError(null);
          console.log('✅ User document ensured in Firestore, setting user state');
          
          // PENDING PLAN RECOVERY: Apply any pending plan immediately
          const pendingPlan = localStorage.getItem('pendingPlan');
          if (pendingPlan && ['clone', 'syndicate'].includes(pendingPlan)) {
            try {
              console.log(`🔄 Auto-applying pending plan after redirect: ${pendingPlan}`);
              const userDocRef = doc(db, 'users', result.user.uid);
              await updateDoc(userDocRef, {
                plan: pendingPlan as UserPlan
              });
              localStorage.removeItem('pendingPlan');
              console.log('✅ Pending plan applied immediately after redirect!');
            } catch (pendingPlanError) {
              console.error('⚠️ Failed to apply pending plan after redirect:', pendingPlanError);
            }
          }
          
          // Redirect to dashboard
          if (window.location.pathname !== '/dashboard') {
            window.location.href = '/dashboard';
          }
        } else {
          console.log('ℹ️ No redirect result found (normal page load)');
          setRedirectProcessed(true);
          setIsLoading(false); // CRITICAL: Ensure loading is false on normal load
        }
      } catch (error: any) {
        console.error('❌ Failed to handle Google redirect result:', error);
        // CRITICAL: Reset loading state to prevent button from getting stuck
        setIsLoading(false);
        setAuthError('Failed to complete Google login. Please try again.');
        setRedirectProcessed(true);
      }
    };
    
    handleGoogleRedirectResult();
  }, []); // Run ONCE on mount

  // Listen to Firebase auth state changes
  useEffect(() => {
    // Skip auth state processing if redirect was already handled
    if (redirectProcessed && user) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in - ensure user document exists
          const userData = await ensureUserDocument(firebaseUser);
          
          // PENDING PLAN RECOVERY: Check if there's a pending plan upgrade
          const pendingPlan = localStorage.getItem('pendingPlan');
          if (pendingPlan && ['clone', 'syndicate'].includes(pendingPlan)) {
            try {
              console.log(`🔄 Recovering pending plan upgrade: ${pendingPlan}`);
              const userDocRef = doc(db, 'users', firebaseUser.uid);
              await updateDoc(userDocRef, {
                plan: pendingPlan as UserPlan
              });
              // Remove after successful update to prevent infinite updates
              localStorage.removeItem('pendingPlan');
              console.log('✅ Pending plan upgrade recovered and applied!');
            } catch (pendingPlanError) {
              console.error('⚠️ Failed to recover pending plan:', pendingPlanError);
              // Don't block auth - user can manually retry upgrade
            }
          }
          
          // Subscribe to real-time updates from Firestore
           const userDocRef = doc(db, 'users', firebaseUser.uid);
          const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data() as User;
              setUser(userData);
              // Load team data when user is loaded
              const activeTeamId = localStorage.getItem('activeTeamId') || undefined;
              loadTeamData(userData.id, activeTeamId);
              
              // Check if there's a pending invite token
              const pendingInviteToken = localStorage.getItem('pendingInviteToken');
              if (pendingInviteToken) {
                console.log('Pending invite token found, attempting to join team');
                handlePendingInvite(pendingInviteToken, userData.id);
              }
            }
            setIsLoading(false);
            setAuthError(null);
          });

          // Return cleanup function for snapshot subscription
          return () => unsubscribeSnapshot();
        } else {
          // User is signed out
          setUser(null);
          setTeam(null);
          setTeamMembers([]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to process auth state:", error);
        setUser(null);
        setIsLoading(false);
        setAuthError('Failed to load user data');
      }
    });

    return () => unsubscribe();
  }, [redirectProcessed, user]);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      // DO NOT AWAIT - signInWithRedirect unloads the page
      // The redirect result will be handled by the useEffect on page reload
      signInWithRedirect(auth, googleProvider);
      console.log('🔄 Redirecting to Google OAuth...');
      // Page will unload here, no code after this runs
    } catch (error: any) {
      // This catch is for synchronous errors only
      const errorMessage = error?.message || 'Failed to sign in with Google';
      setAuthError(errorMessage);
      console.error("Google login error:", error);
      setIsLoading(false);
    }
  };

  const signupWithEmail = async (email: string, password: string) => {
    // --- SECURITY: RATE LIMIT CHECK ---
    if (!checkAuthRateLimit(email)) {
      setAuthError('Too many signup attempts. Please try again in 15 minutes.');
      setIsLoading(false);
      throw new Error('Too many signup attempts');
    }
    
    setIsLoading(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // User document will be created via onAuthStateChanged listener
      // But we can ensure it here for immediate consistency
      await ensureUserDocument(userCredential.user);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to sign up';
      setAuthError(errorMessage);
      console.error("Email signup failed:", error);
      setIsLoading(false);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    // --- SECURITY: RATE LIMIT CHECK ---
    if (!checkAuthRateLimit(email)) {
      setAuthError('Too many login attempts. Please try again in 15 minutes.');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User state will be updated via onAuthStateChanged
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to sign in';
      setAuthError(errorMessage);
      console.error("Email login failed:", error);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await signOut(auth);
      setUser(null);
      setTeam(null);
      setTeamMembers([]);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to sign out';
      setAuthError(errorMessage);
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const updatePlan = async (plan: UserPlan) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, { plan });
      setUser({ ...user, plan });
    } catch (error) {
      console.error("Failed to update plan", error);
    }
  };

  const deductCredit = async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.id);
      const newCredits = Math.max(0, user.credits - 1);
      await updateDoc(userDocRef, { credits: newCredits });
      setUser({ ...user, credits: newCredits });
    } catch (error) {
      console.error("Failed to deduct credit", error);
    }
  }

  const toggleInstagram = async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.id);
      const newInstagramState = !user.instagramConnected;
      await updateDoc(userDocRef, { instagramConnected: newInstagramState });
      setUser({ ...user, instagramConnected: newInstagramState });
    } catch (error) {
      console.error("Failed to toggle Instagram", error);
    }
  }

  const deleteAccount = async () => {
    if (!user || !auth.currentUser) return;
    
    setIsLoading(true);
    setAuthError(null);
    let apiResponse: Response | null = null;
    
    try {
      console.log('⚡ Starting safe account deletion (via API)...');
      
      // Get the current user's ID token for authentication
      const idToken = await auth.currentUser.getIdToken();
      
      // Call the safe delete API which handles subscription cancellation first
      apiResponse = await fetch('/api/user/delete-account', {
        method: 'DELETE', // or 'POST' - both are supported
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ userId: auth.currentUser.uid })
      });
      
      const data = await apiResponse.json();
      
      if (!apiResponse.ok) {
        // API returned an error - likely Stripe cancellation failed
        throw new Error(data.error?.message || 'Failed to delete account');
      }
      
      console.log('✅ Account deletion successful:', data.message);
      
      // Clear user state and redirect
      setUser(null);
      setAuthError(null);
      window.location.href = '/';

    } catch (error: any) {
      console.error("Delete failed", error);

      // If the API call failed due to auth issues, try re-authentication
      if (apiResponse?.status === 401) {
        console.log('🔐 Session expired - attempting re-authentication...');
        try {
          const provider = new GoogleAuthProvider();
          await reauthenticateWithPopup(auth.currentUser!, provider);
          
          // Retry delete after popup
          console.log('🔄 Retrying account deletion after re-auth...');
          const retryIdToken = await auth.currentUser.getIdToken();
          const retryResponse = await fetch('/api/user/delete-account', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${retryIdToken}`
            },
            body: JSON.stringify({ userId: auth.currentUser!.uid })
          });
          
          const retryData = await retryResponse.json();
          
          if (!retryResponse.ok) {
            throw new Error(retryData.error?.message || 'Failed to delete account after re-auth');
          }
          
          setUser(null);
          setAuthError(null);
          console.log('✅ Account deletion successful after re-auth');
          window.location.href = '/';
        } catch (retryError) {
          console.error('❌ Re-authentication or retry failed:', retryError);
          setAuthError('Could not verify account. Please log out and log in again.');
        }
      } else {
        setAuthError(error.message || 'Deletion failed. Your subscription may still be active.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!user) return;
    try {
      // Generate cryptographically secure API key
      const apiKey = generateSecureApiKey();
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, { apiKey });
      setUser({ ...user, apiKey });
    } catch (e) {
      console.error("Failed to generate API key", e);
      throw e;
    }
  }

  const handlePendingInvite = async (token: string, userId: string) => {
    try {
      // Get Firebase ID token
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Failed to get authentication token');
      }

      const response = await fetch('/api/team/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to join team');
      }

      // Success - clear token
      localStorage.removeItem('pendingInviteToken');
      
      // Refresh team data with the new team ID
      await loadTeamData(userId, data.teamId);
      
      console.log(`Successfully joined team as ${data.role}`);
      
    } catch (error: any) {
      console.error('Failed to handle pending invite:', error);
      // Clear token to prevent repeated attempts
      localStorage.removeItem('pendingInviteToken');
      
      // Show error message to user
      setAuthError(error.message || 'Failed to join team');
    }
  };

  // ============ SUBSCRIPTION LIFECYCLE FUNCTIONS ============

  const cancelSubscription = async () => {
    if (!user) return;
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to cancel subscription');
      }
      
      // Update local user state
      setUser({
        ...user,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: data.cancelDate
      });
      
      console.log('✅ Subscription cancellation scheduled:', data.message);
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      setAuthError(error.message || 'Failed to cancel subscription');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resumeSubscription = async () => {
    if (!user) return;
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const response = await fetch('/api/billing/resume-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to resume subscription');
      }
      
      // Update local user state
      setUser({
        ...user,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: data.subscription?.currentPeriodEnd
      });
      
      console.log('✅ Subscription resumed:', data.message);
    } catch (error: any) {
      console.error('Resume subscription error:', error);
      setAuthError(error.message || 'Failed to resume subscription');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearPaymentWarning = async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, { paymentWarning: false });
      setUser({ ...user, paymentWarning: false });
    } catch (error) {
      console.error('Failed to clear payment warning:', error);
    }
  };

  // ============ TEAM FUNCTIONS ============

  const refreshTeam = async () => {
    if (!user) return;
    await loadTeamData(user.id);
  };

  const addTeamMember = async (newUserId: string, role: TeamRole) => {
    if (!team) {
      throw new Error('No team loaded');
    }
    try {
      await dbService.addTeamMember(team.id, newUserId, role);
      // Refresh members list
      const members = await dbService.getTeamMembers(team.id);
      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to add team member:', error);
      throw error;
    }
  };

  const removeTeamMember = async (removeUserId: string) => {
    if (!team) {
      throw new Error('No team loaded');
    }
    try {
      await dbService.removeTeamMember(team.id, removeUserId);
      // Refresh members list
      const members = await dbService.getTeamMembers(team.id);
      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to remove team member:', error);
      throw error;
    }
  };

  const updateTeamSettings = async (settings: Partial<Team['settings']>) => {
    if (!team) {
      throw new Error('No team loaded');
    }
    try {
      const updatedTeam = await dbService.updateTeamSettings(team.id, settings);
      setTeam(updatedTeam);
    } catch (error) {
      console.error('Failed to update team settings:', error);
      throw error;
    }
  };

  const updateTeamName = async (name: string) => {
    if (!team) {
      throw new Error('No team loaded');
    }
    try {
      const updatedTeam = await dbService.updateTeamName(team.id, name);
      setTeam(updatedTeam);
    } catch (error) {
      console.error('Failed to update team name:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        team,
        teamMembers,
        isLoading,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
        updatePlan,
        deductCredit,
        toggleInstagram,
        deleteAccount,
        generateApiKey,
        // Subscription lifecycle
        cancelSubscription,
        resumeSubscription,
        clearPaymentWarning,
        authError,
        clearAuthError,
        refreshTeam,
        addTeamMember,
        removeTeamMember,
        updateTeamSettings,
        updateTeamName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
