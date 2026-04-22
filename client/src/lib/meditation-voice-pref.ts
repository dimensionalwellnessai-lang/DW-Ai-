import { useEffect, useState } from "react";

const STORAGE_KEY = "meditation-voice-guidance";

export function getMeditationVoicePref(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function setMeditationVoicePref(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    window.dispatchEvent(new CustomEvent("meditation-voice-pref-change", { detail: value }));
  } catch {
    /* ignore */
  }
}

export function useMeditationVoicePref(): [boolean, (v: boolean) => void] {
  const [pref, setPref] = useState<boolean>(() => getMeditationVoicePref());

  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === "boolean") setPref(detail);
    }
    window.addEventListener("meditation-voice-pref-change", onChange);
    return () => window.removeEventListener("meditation-voice-pref-change", onChange);
  }, []);

  return [pref, (v: boolean) => { setMeditationVoicePref(v); setPref(v); }];
}
