export const VOICE_SCRIPTS = {
  sessionStart: `Hey. I'm here.
What would you like to focus on today?`,

  unsureUser: `That's okay.
We can take this one step at a time.`,

  beforeSuggestion: `I have an idea.
Would you like to hear it?`,

  afterSave: `Got it. I've saved that for you.`,

  skip: `No problem.
We'll adjust around it.`,

  errorFallback: `That didn't go through just yet.
We can try again or come back to it.`,

  listening: `I'm listening...`,

  processing: `One moment...`,

  voiceNotSupported: `Voice isn't available on this device. You can type instead.`,

  microphoneError: `Couldn't access the microphone. Check your browser settings.`,
};

export type VoiceScriptKey = keyof typeof VOICE_SCRIPTS;
