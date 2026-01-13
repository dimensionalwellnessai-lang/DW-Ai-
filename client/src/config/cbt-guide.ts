/**
 * Cognitive Behavioral Therapy (CBT) Configuration
 * "Flip the Script" - Structured thought work for Dimensional Wellness
 */

export const CBT_GUIDE = {
  philosophy: "Thoughts influence feelings, feelings influence behavior. By noticing and reframing thoughts, we shift the whole pattern.",
  
  coreQuestions: {
    notice: "What thought just came up?",
    feel: "What feeling does that thought create?",
    evidence: "What's the evidence for this thought?",
    alternative: "What's another way to see this?",
    action: "What's one small thing you could do differently?",
  },

  flipTheScript: {
    description: "A simple reframing technique to challenge unhelpful thought patterns",
    steps: [
      { name: "catch", prompt: "What's the thought that's bothering you?" },
      { name: "check", prompt: "Is this thought fact or feeling?" },
      { name: "challenge", prompt: "What would you tell a friend with this thought?" },
      { name: "change", prompt: "What's a more balanced way to see this?" },
    ],
  },

  cognitiveDistortions: {
    allOrNothing: {
      name: "All-or-Nothing Thinking",
      example: "I failed at this, so I'm a complete failure.",
      reframe: "One outcome doesn't define everything. What went well?",
    },
    catastrophizing: {
      name: "Catastrophizing",
      example: "This is going to be a disaster.",
      reframe: "What's the most likely outcome? What can you control?",
    },
    mindReading: {
      name: "Mind Reading",
      example: "They must think I'm stupid.",
      reframe: "What do you actually know? What's another explanation?",
    },
    shouldStatements: {
      name: "Should Statements",
      example: "I should be further along by now.",
      reframe: "Says who? What if you're exactly where you need to be?",
    },
    filtering: {
      name: "Mental Filtering",
      example: "Nothing went right today.",
      reframe: "What's one small thing that did work?",
    },
    personalization: {
      name: "Personalization",
      example: "It's all my fault.",
      reframe: "What other factors were at play? What's in your control vs. not?",
    },
    overgeneralization: {
      name: "Overgeneralization",
      example: "This always happens to me.",
      reframe: "Always? Can you think of a time it went differently?",
    },
    emotionalReasoning: {
      name: "Emotional Reasoning",
      example: "I feel like a failure, so I must be one.",
      reframe: "Feelings aren't facts. What would the evidence say?",
    },
  },

  behavioralActivation: {
    description: "Small actions shift mood. Movement before motivation.",
    microActions: [
      "Stand up and stretch for 30 seconds",
      "Drink a glass of water",
      "Step outside for 2 minutes",
      "Send one text to someone you care about",
      "Write down one thing you're grateful for",
      "Take 5 slow breaths",
    ],
  },

  thoughtChallenging: {
    questions: [
      "What's the evidence for this thought?",
      "What's the evidence against it?",
      "Am I confusing a thought with a fact?",
      "What would I tell a friend in this situation?",
      "Will this matter in a week? A month? A year?",
      "What's the most realistic outcome?",
      "What's one thing I can do right now?",
    ],
  },

  copingStatements: {
    anxiety: [
      "This feeling will pass.",
      "I've handled hard things before.",
      "I don't have to figure everything out right now.",
      "Discomfort is not danger.",
    ],
    depression: [
      "Small steps count.",
      "I don't have to feel motivated to take action.",
      "This moment is not forever.",
      "What's one tiny thing I can do?",
    ],
    overwhelm: [
      "I can only do one thing at a time.",
      "What's the next small step?",
      "Progress, not perfection.",
      "I'm allowed to take a break.",
    ],
    anger: [
      "I can feel angry without acting on it.",
      "What's underneath this anger?",
      "What do I actually need right now?",
      "Pause. Breathe. Respond (don't react).",
    ],
  },

  dailyPractices: {
    morningIntention: {
      prompt: "What's one thought pattern you want to notice today?",
      followUp: "What's the reframe you'll use if it comes up?",
    },
    eveningReflection: {
      prompt: "What thought challenged you today?",
      followUp: "How did you handle it? What would you do differently?",
    },
  },
};

export const CBT_PROMPTS = {
  moodCheckin: {
    base: "Where are you at right now?",
    followUp: "What thought is connected to that feeling?",
    reframe: "What's another way to look at this situation?",
  },
  
  intakeQuestions: {
    body: {
      question: "How would you describe your physical energy lately?",
      cbtFollowUp: "What thoughts come up when you notice your energy level?",
      perspective: "Energy comes before motivation. We're not broken — we're building capacity.",
    },
    mind: {
      question: "How clear does your mind feel most days?",
      cbtFollowUp: "When your mind feels foggy, what stories do you tell yourself?",
      perspective: "Thoughts are visitors, not residents. We can notice them without becoming them.",
    },
    time: {
      question: "How in control of your time do you feel?",
      cbtFollowUp: "What belief about time keeps you stuck?",
      perspective: "A plan supports life — it doesn't trap it. We can adjust anytime.",
    },
    purpose: {
      question: "How connected do you feel to your sense of direction?",
      cbtFollowUp: "What thought blocks you from feeling aligned?",
      perspective: "We don't need the full map — just the next honest step.",
    },
    money: {
      question: "How do you feel about your financial situation?",
      cbtFollowUp: "What story do you tell yourself about money?",
      perspective: "Money is a tool, not a verdict on your worth.",
    },
    relationships: {
      question: "How nourishing are your relationships right now?",
      cbtFollowUp: "What thought pattern shows up in your relationships?",
      perspective: "Connection should feel safe, not draining. We can set boundaries.",
    },
    environment: {
      question: "How well does your physical space support you?",
      cbtFollowUp: "What do you believe about yourself when your space is messy?",
      perspective: "Environment shapes behavior. Small changes create big shifts.",
    },
    identity: {
      question: "How aligned do you feel with who you're becoming?",
      cbtFollowUp: "What limiting belief holds you back from growth?",
      perspective: "We are allowed to evolve. Old stories don't define new chapters.",
    },
  },

  checkInQuestions: {
    afterAction: [
      "What thought came up during that?",
      "Did anything shift in how you see yourself?",
      "What would you tell yourself before starting, now that you've done it?",
    ],
    energyCheck: [
      "What story is your energy telling you?",
      "Is that story helping or holding you back?",
      "What's a more balanced perspective?",
    ],
    patternNotice: [
      "Is this a familiar pattern?",
      "What usually triggers this?",
      "What's one small thing you could try differently?",
    ],
  },
};

export type CognitiveDistortion = keyof typeof CBT_GUIDE.cognitiveDistortions;
export type CopingCategory = keyof typeof CBT_GUIDE.copingStatements;
