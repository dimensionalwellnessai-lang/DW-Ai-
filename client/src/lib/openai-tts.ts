/**
 * OpenAI TTS client — calls the server-side /api/tts endpoint
 * which uses the real OpenAI TTS API (Alloy voice by default).
 * Falls back to browser speech synthesis if the server is unavailable.
 */

type OAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

interface TTSOptions {
  voice?: OAIVoice;
  speed?: number;
}

let currentAudio: HTMLAudioElement | null = null;

async function fetchTTSBlob(text: string, opts: TTSOptions): Promise<Blob> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: opts.voice ?? "alloy", speed: opts.speed ?? 1.0 }),
  });
  if (!res.ok) throw new Error(`TTS server error ${res.status}`);
  return res.blob();
}

function fallbackSpeak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.onend = () => resolve();
    utt.onerror = () => resolve();
    window.speechSynthesis.speak(utt);
  });
}

export async function speakOpenAI(text: string, opts: TTSOptions = {}): Promise<void> {
  stop();
  try {
    const blob = await fetchTTSBlob(text, opts);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    return new Promise((resolve, reject) => {
      audio.onended = () => { URL.revokeObjectURL(url); currentAudio = null; resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); currentAudio = null; reject(new Error("Audio playback failed")); };
      audio.play().catch(reject);
    });
  } catch (err) {
    console.warn("[TTS] OpenAI TTS failed, falling back to browser synthesis:", err);
    await fallbackSpeak(text);
  }
}

export function stop(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}
