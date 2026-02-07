import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Preferences {
  theme: 'light' | 'dark' | 'system';
  voiceEnabled: boolean;
  notificationsEnabled: boolean;
  autoSpeak: boolean;
  voiceRate: number;
  voicePitch: number;
  voiceVolume: number;
  preferredVoice: string;
}

interface PreferencesStore extends Preferences {
  setTheme: (theme: Preferences['theme']) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setAutoSpeak: (enabled: boolean) => void;
  setVoiceRate: (rate: number) => void;
  setVoicePitch: (pitch: number) => void;
  setVoiceVolume: (volume: number) => void;
  setPreferredVoice: (voice: string) => void;
  updatePreferences: (preferences: Partial<Preferences>) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      // Defaults
      theme: 'system',
      voiceEnabled: false,
      notificationsEnabled: true,
      autoSpeak: false,
      voiceRate: 1,
      voicePitch: 1,
      voiceVolume: 1,
      preferredVoice: '',

      // Actions
      setTheme: (theme) => set({ theme }),
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setAutoSpeak: (autoSpeak) => set({ autoSpeak }),
      setVoiceRate: (voiceRate) => set({ voiceRate }),
      setVoicePitch: (voicePitch) => set({ voicePitch }),
      setVoiceVolume: (voiceVolume) => set({ voiceVolume }),
      setPreferredVoice: (preferredVoice) => set({ preferredVoice }),
      updatePreferences: (preferences) => set((state) => ({ ...state, ...preferences })),
    }),
    {
      name: 'preferences-storage',
    }
  )
);
