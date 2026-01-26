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
  type AuthError,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
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
          console.log('✅ User document ensured in Firestore');
          // Page will now show dashboard via router.push in useEffect below
        } else {
          console.log('ℹ️ No redirect result found (normal page load)');
        }
      } catch (error: any) {
        console.error('❌ Failed to handle Google redirect result:', error);
        // CRITICAL: Reset loading state to prevent button from getting stuck
        setIsLoading(false);
        setAuthError('Failed to complete Google login. Please try again.');
      }
    };
    
    handleGoogleRedirectResult();
  }, []); // Run ONCE on mount

  // Listen to Firebase auth state changes
  useEffect(() => {
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
      }
    });

    return () => unsubscribe();
  }, []);

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
      const updatedUser = { ...user, plan };
      await setDoc(userDocRef, updatedUser);
      setUser(updatedUser);
    } catch (error) {
      console.error("Failed to update plan", error);
    }
  };

  const deductCredit = async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.id);
      const newCredits = Math.max(0, user.credits - 1);
      const updatedUser = { ...user, credits: newCredits };
      await setDoc(userDocRef, updatedUser);
      setUser(updatedUser);
    } catch (error) {
      console.error("Failed to deduct credit", error);
    }
  }

  const toggleInstagram = async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.id);
      const updatedUser = { ...user, instagramConnected: !user.instagramConnected };
      await setDoc(userDocRef, updatedUser);
      setUser(updatedUser);
    } catch (error) {
      console.error("Failed to toggle Instagram", error);
    }
  }

  const deleteAccount = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.id);
      await setDoc(userDocRef, {}, { merge: false }); // Delete by setting empty
      await signOut(auth);
      setUser(null);
    } catch (e) {
      console.error("Failed to delete account", e);
    } finally {
      setIsLoading(false);
    }
  }

  const generateApiKey = async () => {
    if (!user) return;
    try {
      const apiKey = 'key_' + Math.random().toString(36).substr(2, 32);
      const userDocRef = doc(db, 'users', user.id);
      const updatedUser = { ...user, apiKey };
      await setDoc(userDocRef, updatedUser);
      setUser(updatedUser);
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
