import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserPlan } from './types';
import { dbService } from './dbService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
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

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      // In a real app, this would check Firebase/Supabase auth state
      try {
        const savedSession = localStorage.getItem('ghostnote_user_session');
        if (savedSession) {
          const parsedUser = JSON.parse(savedSession);
          if (parsedUser && typeof parsedUser === 'object') {
            setUser(parsedUser);
          }
        }
      } catch (error) {
        console.error("Failed to recover session:", error);
        // Clear corrupted session to prevent boot loop
        localStorage.removeItem('ghostnote_user_session');
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string) => {
    setIsLoading(true);
    try {
      const userData = await dbService.login(email);
      setUser(userData);
    } catch (error) {
      console.error("Login failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await dbService.logout();
    setUser(null);
    setIsLoading(false);
  };

  const updatePlan = async (plan: UserPlan) => {
    if (!user) return;
    const updatedUser = await dbService.updateUserPlan(user.id, plan);
    setUser(updatedUser);
  };

  const deductCredit = async () => {
      if (!user) return;
      const updatedUser = await dbService.deductCredit(user.id);
      setUser(updatedUser);
  }

  const toggleInstagram = async () => {
    if (!user) return;
    try {
      const updatedUser = await dbService.toggleInstagramConnection(user.id);
      setUser(updatedUser);
    } catch (error) {
      console.error("Failed to toggle Instagram", error);
    }
  }

  const deleteAccount = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
        await dbService.deleteAccount(user.id);
        setUser(null);
    } catch (e) {
        console.error("Failed to delete account", e);
    } finally {
        setIsLoading(false);
    }
  }

  const generateApiKey = async () => {
    if (!user) return;
    // Note: We don't set global loading here to allow UI to handle specific button loading state if needed,
    // but in this mock we update user state instantly.
    try {
        const apiKey = await dbService.generateApiKey(user.id);
        setUser({ ...user, apiKey });
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
