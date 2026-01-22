/**
 * Text-to-Speech Service
 * Provides voice synthesis capabilities using Web Speech API
 */

export interface TTSSettings {
  enabled: boolean;
  voice?: string;
  rate: number; // 0.1 to 10, default 1
  pitch: number; // 0 to 2, default 1
  volume: number; // 0 to 1, default 1
  autoSpeak: boolean; // Auto-speak AI responses
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  enabled: false,
  voice: undefined,
  rate: 1,
  pitch: 1,
  volume: 1,
  autoSpeak: false,
};

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private settings: TTSSettings = DEFAULT_TTS_SETTINGS;
  private isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.isSupported = true;
    }
  }

  /**
   * Check if TTS is supported in this browser
   */
  isAvailable(): boolean {
    return this.isSupported;
  }

  /**
   * Get list of available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  /**
   * Update TTS settings
   */
  updateSettings(settings: Partial<TTSSettings>) {
    this.settings = { ...this.settings, ...settings };
    this.saveSettings();
  }

  /**
   * Get current settings
   */
  getSettings(): TTSSettings {
    return { ...this.settings };
  }

  /**
   * Load settings from localStorage
   */
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

  /**
   * Save settings to localStorage
   */
  private saveSettings() {
    try {
      localStorage.setItem('tts-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save TTS settings:', error);
    }
  }

  /**
   * Speak text using configured settings
   */
  speak(text: string, options?: Partial<TTSSettings>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synth || !this.isSupported) {
        reject(new Error('Text-to-speech is not supported in this browser'));
        return;
      }

      // Stop any ongoing speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      // Apply settings
      const finalSettings = { ...this.settings, ...options };
      utterance.rate = finalSettings.rate;
      utterance.pitch = finalSettings.pitch;
      utterance.volume = finalSettings.volume;

      // Set voice if specified
      if (finalSettings.voice) {
        const voices = this.getVoices();
        const selectedVoice = voices.find(v => v.name === finalSettings.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.synth.speak(utterance);
    });
  }

  /**
   * Stop current speech
   */
  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * Pause current speech
   */
  pause() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synth ? this.synth.speaking : false;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.synth ? this.synth.paused : false;
  }
}

// Create singleton instance
export const ttsService = new TTSService();

// Initialize on load
if (typeof window !== 'undefined') {
  ttsService.loadSettings();
  
  // Voices might not be loaded immediately
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      // Voices are now available
    };
  }
}
