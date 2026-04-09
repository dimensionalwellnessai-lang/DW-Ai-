/**
 * Text-to-Speech Service
 * Routes all speech through OpenAI TTS (Alloy voice) via the server-side /api/tts endpoint.
 * Falls back to browser speech synthesis if the server is unavailable.
 * Preserves the personality/settings API for backward compatibility.
 */
import { speakOpenAI, stop as stopOAI, isSpeaking as isOAISpeaking } from "@/lib/openai-tts";

export type VoicePersonality = 'calm' | 'motivating' | 'direct';

export interface VoicePersonalityPreset {
  name: string;
  description: string;
  rate: number;
  pitch: number;
  volume: number;
}

export const VOICE_PERSONALITIES: Record<VoicePersonality, VoicePersonalityPreset> = {
  calm: {
    name: 'Calm',
    description: 'Gentle, soothing pace — ideal for reflection',
    rate: 0.9,
    pitch: 0.9,
    volume: 0.9,
  },
  motivating: {
    name: 'Motivating',
    description: 'Energetic, uplifting tone — great for action',
    rate: 1.1,
    pitch: 1.1,
    volume: 1.0,
  },
  direct: {
    name: 'Direct',
    description: 'Clear, neutral delivery — focused and precise',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  },
};

export interface TTSSettings {
  enabled: boolean;
  voice?: string;
  rate: number;
  pitch: number;
  volume: number;
  autoSpeak: boolean;
  voicePersonality: VoicePersonality;
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  enabled: true,
  voice: undefined,
  rate: 1,
  pitch: 1,
  volume: 1,
  autoSpeak: false,
  voicePersonality: 'direct',
};

class TTSService {
  private settings: TTSSettings = { ...DEFAULT_TTS_SETTINGS };

  constructor() {
    this.loadSettings();
  }

  isAvailable(): boolean {
    return true;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return [];
  }

  updateSettings(settings: Partial<TTSSettings>) {
    this.settings = { ...this.settings, ...settings };
    this.saveSettings();
  }

  applyPersonality(personality: VoicePersonality) {
    const preset = VOICE_PERSONALITIES[personality];
    this.updateSettings({
      voicePersonality: personality,
      rate: preset.rate,
      pitch: preset.pitch,
      volume: preset.volume,
    });
  }

  getSettings(): TTSSettings {
    return { ...this.settings };
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('tts-settings');
      if (saved) {
        this.settings = { ...DEFAULT_TTS_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load TTS settings:', error);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('tts-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save TTS settings:', error);
    }
  }

  speak(text: string, options?: Partial<TTSSettings>): Promise<void> {
    const finalSettings = { ...this.settings, ...options };
    if (!finalSettings.enabled) return Promise.resolve();
    this.stop();
    const speed = Math.min(Math.max(finalSettings.rate ?? 1.0, 0.5), 1.5);
    return speakOpenAI(text, { speed });
  }

  stop() {
    stopOAI();
  }

  pause() {
  }

  resume() {
  }

  isSpeaking(): boolean {
    return isOAISpeaking();
  }

  isPaused(): boolean {
    return false;
  }
}

export const ttsService = new TTSService();
