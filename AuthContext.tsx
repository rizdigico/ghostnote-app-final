import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserPlan } from './types';
import { dbService } from './dbService';
import { auth, googleProvider } from './src/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updatePlan: (plan: UserPlan) => Promise<void>;
  deductCredit: () => Promise<void>;
  toggleInstagram: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  generateApiKey: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            // User document exists, load it
            const userData = userDocSnap.data() as User;
            setUser(userData);
          } else {
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
            setUser(newUser);
          }
        } else {
          // User is signed out
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to process auth state:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // User state will be updated via onAuthStateChanged
    } catch (error) {
      console.error("Login failed", error);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setIsLoading(false);
    }
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
    <AuthContext.Provider value={{ user, isLoading, login, logout, updatePlan, deductCredit, toggleInstagram, deleteAccount, generateApiKey }}>
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
