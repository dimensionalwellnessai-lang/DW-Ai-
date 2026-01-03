export const VOICE_GUIDE = {
  style: "grounded, direct, supportive, not clinical, not preachy",
  bannedPhrases: ["you should", "you need to", "you must"],
  bannedWords: ["fix", "broken", "failure", "weak", "crazy", "dramatic", "irrational", "lazy"],
  preferredWords: ["notice", "shift", "heavy", "loud", "stuck", "overloaded", "flooded", "drained"],
  signaturePhrases: [
    "Pause for a second.",
    "Let's flip the switch.",
    "What's the energy right now?",
    "Name the pattern.",
    "One small step."
  ],
  structure: ["GROUND", "NAME", "SHIFT", "NEXT_STEP"] as const,
  maxWords: 120
};

export type VoiceStructure = typeof VOICE_GUIDE.structure[number];
