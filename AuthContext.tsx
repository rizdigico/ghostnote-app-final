import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserPlan } from './types';
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
  type AuthError,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

interface AuthContextType {
  user: User | null;
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
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

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
      credits: 5,
      joinedDate: new Date().toISOString(),
      instagramConnected: false,
      // Generate API key immediately for all new users
      apiKey: `key_${Math.random().toString(36).substring(2, 15)}`,
      createdAt: new Date()
    };
    await setDoc(userDocRef, newUser);
    return newUser;
  }

  return userDocSnap.data() as User;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [redirectProcessed, setRedirectProcessed] = useState(false);

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
              setUser(docSnap.data() as User);
            }
            setIsLoading(false);
            setAuthError(null);
          });

          // Return cleanup function for snapshot subscription
          return () => unsubscribeSnapshot();
        } else {
          // User is signed out
          setUser(null);
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
    
    try {
      console.log('⚡ Starting optimistic account deletion (no forced popup)...');
      
      // Step 1: Delete Database Data (Silent)
      if (user) {
        console.log('🗑️ Deleting Firestore user document...');
        await deleteDoc(doc(db, 'users', auth.currentUser!.uid));
      }

      // Step 2: Delete Auth Account (Silent)
      console.log('🚀 Deleting Firebase Auth user...');
      await deleteUser(auth.currentUser!);

      // Step 3: Redirect immediately
      console.log('✅ Account deletion complete - redirecting to home');
      setUser(null);
      setAuthError(null);
      window.location.href = '/';

    } catch (error: any) {
      console.error("Delete failed", error);

      // Step 4: ONLY show popup if the session is too old
      if (error.code === 'auth/requires-recent-login') {
        console.log('🔐 Session expired - attempting re-authentication...');
        try {
          const provider = new GoogleAuthProvider();
          await reauthenticateWithPopup(auth.currentUser!, provider);
          
          // Retry delete after popup
          console.log('🔄 Retrying account deletion after re-auth...');
          await deleteDoc(doc(db, 'users', auth.currentUser!.uid));
          await deleteUser(auth.currentUser!);
          
          setUser(null);
          setAuthError(null);
          console.log('✅ Account deletion successful after re-auth');
          window.location.href = '/';
        } catch (retryError) {
          console.error('❌ Re-authentication or retry failed:', retryError);
          setAuthError('Could not verify account. Please log out and log in again.');
        }
      } else {
        setAuthError(`Deletion failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!user) return;
    try {
      const apiKey = 'key_' + Math.random().toString(36).substr(2, 32);
      const userDocRef = doc(db, 'users', user.id);
      await updateDoc(userDocRef, { apiKey });
      setUser({ ...user, apiKey });
    } catch (e) {
      console.error("Failed to generate API key", e);
      throw e;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
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
        authError,
        clearAuthError,
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
