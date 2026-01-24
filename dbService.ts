import { User, UserPlan, VoicePreset } from '../types';
import { VOICE_PRESETS } from '../constants';

// --- MOCK DATABASE CONFIGURATION ---
// When moving to Firebase/Supabase, replace these methods with real API calls.

const STORAGE_KEY_USER = 'ghostnote_user_session';
const STORAGE_KEY_CUSTOM_VOICES = 'ghostnote_custom_voices';

export const dbService = {
  // --- AUTHENTICATION ---

  async login(email: string): Promise<User> {
    // SIMULATE NETWORK DELAY
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if we have a saved user session in local storage to mimic "cloud" persistence
    try {
      const savedSession = localStorage.getItem(STORAGE_KEY_USER);
      if (savedSession) {
        const user = JSON.parse(savedSession);
        if (user.email === email) return user;
      }
    } catch (e) {
      console.warn("Invalid session data found, clearing.");
      localStorage.removeItem(STORAGE_KEY_USER);
    }

    // If new user (mock), create a default profile
    const newUser: User = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      email,
      name: email.split('@')[0],
      plan: 'echo',
      credits: 5,
      joinedDate: new Date().toISOString(),
      instagramConnected: false,
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    return newUser;
  },

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY_USER);
    await new Promise((resolve) => setTimeout(resolve, 500));
  },

  async deleteAccount(userId: string): Promise<void> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Remove user session
    const session = localStorage.getItem(STORAGE_KEY_USER);
    if (session) {
        const user = JSON.parse(session);
        if (user.id === userId) {
            localStorage.removeItem(STORAGE_KEY_USER);
        }
    }

    // Remove custom voices associated with this user
    const storedVoices = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
    if (storedVoices) {
      let voices = JSON.parse(storedVoices);
      if (Array.isArray(voices)) {
          // Keep only voices NOT owned by this user
          voices = voices.filter((v: any) => v.ownerId !== userId);
          localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(voices));
      }
    }
  },

  // --- USER DATA ---

  async updateUserPlan(userId: string, newPlan: UserPlan): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const session = localStorage.getItem(STORAGE_KEY_USER);
    if (!session) throw new Error("No session found");

    const user = JSON.parse(session);
    // Update plan
    user.plan = newPlan;
    
    // Reset credits if upgrading (mock logic)
    if (newPlan !== 'echo') user.credits = 999999; 

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return user;
  },

  async deductCredit(userId: string): Promise<User> {
    const session = localStorage.getItem(STORAGE_KEY_USER);
    if (!session) throw new Error("No session found");
    const user = JSON.parse(session);

    if (user.plan === 'echo') {
        user.credits = Math.max(0, user.credits - 1);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    }
    return user;
  },

  async toggleInstagramConnection(userId: string): Promise<User> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const session = localStorage.getItem(STORAGE_KEY_USER);
    if (!session) throw new Error("No session found");
    
    const user = JSON.parse(session);
    // Mock toggle
    user.instagramConnected = !user.instagramConnected;
    
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return user;
  },

  async generateApiKey(userId: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const session = localStorage.getItem(STORAGE_KEY_USER);
    if (!session) throw new Error("No session found");

    const user = JSON.parse(session);
    // Generate a mock API key
    const newKey = 'gn_live_' + Array(32).fill(0).map(() => Math.random().toString(36)[2]).join('');
    
    user.apiKey = newKey;
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    
    return newKey;
  },

  // --- VOICE PRESETS (PERSISTENCE) ---

  async getVoicePresets(userId: string): Promise<VoicePreset[]> {
    // Return default presets + user saved presets
    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
    let customVoices: VoicePreset[] = [];
    
    try {
      customVoices = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(customVoices)) customVoices = [];
    } catch (e) {
      console.warn("Corrupted voice presets found, resetting.");
      localStorage.removeItem(STORAGE_KEY_CUSTOM_VOICES);
    }
    
    // Filter customs for this user (mocking RLS)
    const userVoices = customVoices.filter(v => v.ownerId === userId);
    
    return [...VOICE_PRESETS, ...userVoices];
  },

  async saveVoicePreset(userId: string, name: string, referenceText: string): Promise<VoicePreset> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Validation
    const cleanName = name.trim();
    const cleanRef = referenceText.trim();
    
    if (!cleanName) throw new Error("Preset name is required");
    if (cleanName.length > 50) throw new Error("Preset name is too long (max 50 chars)");
    if (!cleanRef) throw new Error("Reference text is required");
    if (cleanRef.length > 20000) throw new Error("Reference text is too long");

    const newPreset: VoicePreset = {
        id: 'custom_' + Math.random().toString(36).substr(2, 9),
        name: cleanName,
        referenceText: cleanRef,
        isCustom: true,
        ownerId: userId
    };

    const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_VOICES);
    let customVoices: VoicePreset[] = [];
    try {
      customVoices = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(customVoices)) customVoices = [];
    } catch (e) {
      customVoices = [];
    }
    
    customVoices.push(newPreset);
    localStorage.setItem(STORAGE_KEY_CUSTOM_VOICES, JSON.stringify(customVoices));

    return newPreset;
  }
};