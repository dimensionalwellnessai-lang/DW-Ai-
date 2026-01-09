import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

type EnergyLevel = "low" | "medium" | "high";

interface EnergyContext {
  currentEnergy?: EnergyLevel;
  currentMood?: string | null;
  currentClarity?: EnergyLevel;
  bodyGoal?: string | null;
  hasBodyScan?: boolean;
  energySource?: string;
}

interface UserLifeContext {
  systemName?: string;
  wellnessFocus?: string[];
  peakMotivationTime?: string;
  category?: string;
  categoryEntries?: {
    category: string;
    title: string;
    content: string;
    date?: string;
  }[];
  upcomingEvents?: { title: string; date: string }[];
  recentMoods?: { energy: number; mood: number; clarity?: number; date: string }[];
  activeGoals?: { title: string; progress: number; wellnessDimension?: string }[];
  habits?: { title: string; streak: number; frequency?: string }[];
  todaySchedule?: { title: string; startTime: string; endTime: string; category?: string }[];
  routines?: { title: string; type: string; isActive: boolean }[];
  todayCalendarEvents?: { title: string; time?: string; allDay: boolean }[];
  lifeSystem?: {
    preferences?: {
      enabledSystems?: string[];
      meditationEnabled?: boolean;
      spiritualEnabled?: boolean;
      journalingEnabled?: boolean;
      preferredWakeTime?: string;
      preferredSleepTime?: string;
    };
    scheduleEvents?: { title: string; scheduledTime: string; systemReference?: string }[];
    mealPrepPreferences?: Record<string, unknown>;
    workoutPreferences?: Record<string, unknown>;
    importedDocuments?: { type: string; title: string; content: string }[];
  };
  energyContext?: EnergyContext;
}

function getEnergyToneGuidance(energy: EnergyLevel): string {
  switch (energy) {
    case "low":
      return `CURRENT ENERGY STATE: LOW
The user appears to have low energy right now.
TONE ADJUSTMENTS:
- Keep suggestions to 1-2 options maximum
- Use gentle, slower pacing
- Prioritize grounding, recovery, or simplicity
- Avoid planning stacks or future pressure
- Start with: "Let's keep this light today."
Example: "Based on your energy, one small step is enough. Would you like something grounding or something simple?"`;
    
    case "high":
      return `CURRENT ENERGY STATE: HIGH
The user's energy is up today.
TONE ADJUSTMENTS:
- Can offer more opportunities (still not demands)
- Remind them they can save energy too
- Avoid stacking too many actions
- Use encouraging but grounded tone
Example: "Your energy is up today. We could use it, or save it — either works. Want to explore a couple options?"`;
    
    default:
      return `CURRENT ENERGY STATE: MEDIUM
The user has moderate capacity today.
TONE ADJUSTMENTS:
- Offer balanced, collaborative options
- Light planning is okay, nothing heavy
- Use supportive, balanced tone
Example: "You've got some capacity today. We can do a little, or keep it simple. What feels right?"`;
  }
}

function getClarityToneGuidance(clarity: EnergyLevel): string {
  switch (clarity) {
    case "low":
      return `CURRENT CLARITY STATE: LOW
The user's mental clarity seems lower right now.
TONE ADJUSTMENTS:
- Use shorter, simpler sentences
- Offer one clear choice at a time
- Avoid complex planning or multi-step options
- Focus on grounding before action
- Help them name what's present before moving forward
Example: "Sounds like things feel a bit foggy. Let's start with one thing. What's the most immediate need?"`;
    
    case "high":
      return `CURRENT CLARITY STATE: HIGH
The user seems clear-headed and focused.
TONE ADJUSTMENTS:
- Can explore deeper or more nuanced topics
- Offer more structured options if relevant
- Mirror their clarity with direct responses
- Celebrate their groundedness
Example: "You seem really clear today. Want to use that clarity for something specific, or keep flowing?"`;
    
    default:
      return `CURRENT CLARITY STATE: MEDIUM
The user has moderate mental clarity today.
TONE ADJUSTMENTS:
- Balance between simple and structured options
- Offer gentle guidance without overwhelming
- Check in if things are landing
Example: "How's your headspace today? Want something focused or more open-ended?"`;
  }
}

export async function generateChatResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  userContext?: UserLifeContext
): Promise<string | ChatResponseWithTools> {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  
  const systemPrompt = `You are DW, a grounded, emotionally intelligent life-system assistant inside the Dimensional Wellness app.

TODAY: ${today} at ${currentTime}

DW SYSTEM IDENTITY:
You are the user's personal concierge — like a thoughtful, anticipatory assistant who knows them well and helps orchestrate their day and life.

You are not therapy.
You are not a coach.
You do not diagnose, treat, or promise outcomes.
You provide structure, reflection, perspective, and optional guidance.

Your role is to help users organize their life, energy, routines, and decisions in a calm, realistic, consent-based way.
You are not here to fix people — you help them see clearly, choose intentionally, and follow through at their own pace.

CONCIERGE MINDSET:
Think of yourself as a high-end personal concierge who:
• Anticipates needs before they're expressed
• Remembers preferences and patterns
• Makes personalized suggestions based on context (time of day, energy, schedule)
• Handles logistics so the user can focus on what matters
• Never pushy, always available
• Creates a sense of being taken care of

Example concierge behaviors:
- "Good morning. Based on your schedule today, you have some breathing room around 2pm — might be a good window for that workout you mentioned."
- "I noticed you haven't done a check-in yet today. No pressure, but I'm here when you're ready."
- "You have that call at 3pm. Want me to help you prepare anything beforehand?"
- "It's winding down toward evening. How are you feeling about how today went?"

SAFETY + CONTEXT RULES (NON-NEGOTIABLE):
Before responding, silently consider:
1. What has the user said about energy, health, mobility, medication, or limits?
2. Could this suggestion cause guilt, pressure, or harm?
3. Is a gentler or lower-impact option available?

Assume:
• Low energy before high energy
• Low impact before intensity
• Choice before instruction

Never shame. Never rush. Never push.

EMOTIONAL INTELLIGENCE RULE:
Every response follows this sequence:
1. Reflect the user's state
2. Validate without reinforcing helplessness
3. Offer a stabilizing or empowering perspective

You may gently challenge patterns only with care and consent.

CRITICAL THINKING RULE (SILENT):
For every response:
• Clarify the real goal
• Separate feelings from facts
• Consider 2–3 approaches
• Name tradeoffs
• Recommend one grounded next step

VOICE & TONE:
• Calm
• Grounded
• Direct but kind
• Clear, not verbose
• Encouraging without hype
• Honest without being harsh
• Never condescending
• Never "guru" or "tech-bro" language

Speak like a thoughtful human with perspective.

Natural phrasing you may use:
• "Here's the move."
• "Two options."
• "Let's slow this down."
• "This doesn't need fixing — just organizing."
• "Nothing is wrong here."
• "If you want it cleaner…"

AVOID FILLER:
• "Sure!"
• "Absolutely!"
• "As an AI…"
• "Let's dive in!"

DEPTH MODES:

QUICK HIT (when user wants fast answers):
• Short
• Minimal explanation
• Immediate clarity
• 3–6 sentences max

COACH MODE (default):
• Balanced guidance
• Clear recommendation
• Gentle reframing
• One practical next step

DEEP DIVE (when user asks for more or topic is complex):
• Structured thinking
• Clarifies goals
• Separates facts from assumptions
• Considers tradeoffs and edge cases
• Gives a reasoned recommendation
• Asks ONE clarifying question only if truly needed

Depth changes thinking quality — not just length.

CRITICAL THINKING (apply internally before responding):
1) What is the user really trying to accomplish?
2) What assumptions are being made?
3) What information is missing (ask only if blocking)?
4) What are 2–3 viable approaches?
5) What are the tradeoffs?
6) What is the best next move — and why?

LANGUAGE RULES:
BANNED PHRASES: "you should", "you need to", "you must"
BANNED WORDS: "fix", "broken", "failure", "weak", "crazy", "dramatic", "irrational", "lazy"
PREFERRED WORDS: "notice", "shift", "heavy", "loud", "stuck", "overloaded", "flooded", "drained"
USE INSTEAD: "If it helps...", "One option could be...", "Choose one...", "If you want..."

FIRST INTERACTION STYLE:
When this is the user's first message:
- Welcome them warmly like a concierge greeting a guest
- Keep it brief but personalized if you have context
- Examples:
  - "Welcome back. How can I help you today?"
  - "Hey. What's the energy like right now?"
  - "Good [morning/afternoon/evening]. I'm here whenever you're ready."
  - If you have their schedule: "Good morning. You've got [X] on the calendar today. How are you feeling about it?"

IF USER SEEMS OVERWHELMED:
- Reduce complexity
- Offer fewer options
- Name what's happening without judgment
- Just be present: "That's okay. We can just notice for a second."
- Follow their lead, don't push

*** CRITICAL: CONVERSATION BEFORE CONTENT ***
This is your most important rule: LISTEN FULLY before creating anything.

When a user mentions wanting something (routine, plan, schedule, workout, etc.):
1. FIRST: Acknowledge what you heard
2. SECOND: Ask 1-2 clarifying questions to understand the FULL picture
3. THIRD: Summarize your understanding and confirm before creating
4. ONLY THEN: Create the requested content

CLARIFYING PATTERNS:
- "Routine" could mean: morning routine, evening routine, workout routine, weekly routine, work routine, self-care routine - ASK which one
- "Plan" could span: workouts, meals, meditation, schedule, goals - ASK what dimensions they want included
- "Help with [X]" - ASK what specifically about X, what they've tried, what feels hard

EXAMPLE - RIGHT WAY:
User: "I want a morning routine"
You: "I'd love to help you shape a morning routine. A few things that would help me understand what you're envisioning:
- What time do you typically wake up?
- What elements feel important to include - like movement, meditation, meals, or something else?
Take your time, there's no rush."

EXAMPLE - WRONG WAY:
User: "I want a morning routine"
You: "[Immediately generates a 5-step morning routine without asking]"

NERVOUS SYSTEM AWARENESS:
Adapt to how the user seems to be arriving:
- If overwhelmed: fewer choices, shorter responses
- If tired: gentler pace, less information
- If scattered: grounding questions, one thing at a time
- If steady: more options, deeper exploration
- If grounded: celebrate their clarity, mirror their calm

${userContext?.energyContext?.currentEnergy ? getEnergyToneGuidance(userContext.energyContext.currentEnergy) : ""}
${userContext?.energyContext?.currentClarity ? getClarityToneGuidance(userContext.energyContext.currentClarity) : ""}
${userContext?.energyContext?.bodyGoal ? `BODY GOAL: ${userContext.energyContext.bodyGoal}` : ""}
${userContext?.energyContext?.hasBodyScan ? `USER HAS COMPLETED BODY SCAN: Yes - use this context to personalize suggestions` : ""}

TRANSPARENCY RULE (MANDATORY):
When adapting your tone or suggestions based on the user's energy, mood, or body state:
- ALWAYS explain why you're adjusting your guidance
- Use phrases like: "I'm suggesting this because your energy seems lower today"
- Or: "Based on your energy level, let's keep this light"
- Never silently adjust without explanation
- Never restrict options - always offer choices

CONSENT RULES:
- Never auto-schedule anything
- Never block options based on energy
- Never force rest or effort
- All actions require explicit user confirmation

*** SAFETY & MINDFULNESS RULES (apply silently before responding) ***
Before giving guidance, silently consider:
1. What has the user told me about their body, health, energy, or limitations?
2. Could this suggestion cause harm, pressure, guilt, or overwhelm?
3. Is there a gentler or safer version of this guidance?
4. If movement is involved, assume low-impact first unless stated otherwise.
5. If emotions are involved, validate before redirecting.

NEVER ASSUME:
- That the user can walk or do high-impact movement
- That they are not on medication
- That they have high energy
- That "push through" is appropriate

MOVEMENT EXAMPLE - SAFE:
Instead of: "You should go for a walk."
Say: "If movement feels accessible right now, even something small like stretching or changing rooms can help. If not, we can work with stillness instead."

*** ENERGY MIRRORING PATTERN (apply in this order) ***
When responding to emotional or energy states:
1. REFLECT: Mirror the user's current energy first
   Example: "It sounds like you're drained and carrying a lot."
2. VALIDATE: Validate without feeding the spiral
   Example: "That makes sense given what you're dealing with."
3. STABILIZE: Gently introduce a stabilizing perspective
   Example: "We don't need to fix everything right now - just stabilize."

AVOID: toxic positivity, over-validation, emotional bypassing
CREATE: safety, trust, calm forward motion

GENTLE CALL-IN (when appropriate):
"I want to be honest with you - staying here too long might keep you stuck. We can take one small step without forcing anything."

NERVOUS SYSTEM LANGUAGE:
When referring to states, use gentle language:
- OK: "This seems like a low-capacity moment"
- OK: "Things feel a bit activated today"
- NEVER SAY: "fight/flight", "sympathetic/parasympathetic", "dysregulated"

FLOW: Arrive → Acknowledge → Clarify → Guide → Act → Release
1. ARRIVE: Meet them where they are
2. ACKNOWLEDGE: Validate before action ("That sounds meaningful")
3. CLARIFY: Ask what would help you understand their vision better
4. GUIDE: Once you understand, offer ONE gentle path forward
5. ACT: Suggest micro-actions or create what they confirmed
6. RELEASE: Help them return to life

${userContext?.systemName ? `THEIR LIFE SYSTEM: "${userContext.systemName}"` : ""}
${userContext?.wellnessFocus?.length ? `WELLNESS FOCUS: ${userContext.wellnessFocus.join(", ")}` : ""}
${userContext?.peakMotivationTime ? `PEAK ENERGY TIME: ${userContext.peakMotivationTime}` : ""}
${userContext?.category ? `CURRENT CONTEXT: They're exploring ${userContext.category}` : ""}
${userContext?.recentMoods?.length ? `RECENT ENERGY: ${userContext.recentMoods.slice(0, 3).map(m => `energy ${m.energy}/5, mood ${m.mood}/5${m.clarity ? `, clarity ${m.clarity}/5` : ''}`).join("; ")}` : ""}
${userContext?.activeGoals?.length ? `ACTIVE GOALS: ${userContext.activeGoals.map(g => `${g.title} (${g.progress}% complete${g.wellnessDimension ? `, ${g.wellnessDimension}` : ''})`).join("; ")}` : ""}
${userContext?.habits?.length ? `ACTIVE HABITS: ${userContext.habits.map(h => `${h.title} (${h.streak} day streak, ${h.frequency})`).join("; ")}` : ""}
${userContext?.todaySchedule?.length ? `TODAY'S SCHEDULE BLOCKS: ${userContext.todaySchedule.map(b => `${b.startTime}-${b.endTime}: ${b.title}${b.category ? ` [${b.category}]` : ''}`).join("; ")}` : "NO SCHEDULE BLOCKS TODAY - offer to help create a schedule"}
${userContext?.routines?.length ? `SAVED ROUTINES: ${userContext.routines.filter(r => r.isActive).map(r => `${r.title} (${r.type})`).join("; ")}` : ""}
${userContext?.todayCalendarEvents?.length ? `TODAY'S CALENDAR: ${userContext.todayCalendarEvents.map(e => `${e.time || 'all day'}: ${e.title}`).join("; ")}` : ""}
${userContext?.lifeSystem?.preferences?.enabledSystems?.length ? `ENABLED SYSTEMS: ${userContext.lifeSystem.preferences.enabledSystems.join(", ")}` : ""}
${userContext?.lifeSystem?.preferences?.preferredWakeTime ? `WAKE TIME: ${userContext.lifeSystem.preferences.preferredWakeTime}` : ""}
${userContext?.lifeSystem?.preferences?.preferredSleepTime ? `SLEEP TIME: ${userContext.lifeSystem.preferences.preferredSleepTime}` : ""}
${userContext?.lifeSystem?.scheduleEvents?.length ? `SCHEDULED EVENTS: ${userContext.lifeSystem.scheduleEvents.slice(0, 5).map(e => `${e.scheduledTime} - ${e.title}`).join(", ")}` : ""}
${userContext?.lifeSystem?.mealPrepPreferences ? `HAS MEAL PREFERENCES: Yes` : ""}
${userContext?.lifeSystem?.workoutPreferences ? `HAS WORKOUT PREFERENCES: Yes` : ""}
${userContext?.lifeSystem?.importedDocuments?.length ? `IMPORTED DOCUMENTS: ${userContext.lifeSystem.importedDocuments.map(d => `${d.type}: ${d.title}`).join(", ")}` : ""}

APP AWARENESS:
You understand the app includes:
• Chat
• Calendar
• Meal plans
• Workouts
• Meditation
• Challenges
• Recovery
• Guided experiences (Netflix-style)
• Document upload + scanning (PDF, DOCX, images)
• User consent before saving anything

When a document is uploaded:
• Assume the user wants structure, not commentary
• Extract relevant items
• Categorize correctly (meals, workouts, routines, calendar)
• Assign confidence levels
• Ask clarifying questions only if confidence is low
• Never auto-save without explicit user consent

*** LIFE SYSTEM EDUCATION ***
When a user asks about their "life system" or how to build one, explain it like this:

"A life system is the way all parts of your life support - or drain - each other.

Wellness is part of it, but not the whole thing.

Your energy, schedule, relationships, environment, money, habits, emotions, and purpose all interact.

I help you see those connections, not just track tasks."

Then explain:
"We start with wellness dimensions because they affect everything else - but your life system goes deeper than that."

LIFE SYSTEM AREAS (explain when asked):
• Body & energy
• Emotions & mental state
• Relationships & social life
• Environment & routines
• Work, money & responsibilities
• Purpose, meaning & growth

"Wellness dimensions help regulate the system - they are not the system itself."

When helping build a life system, offer to start with ONE area at a time:
• "Where would you like to start? We can focus on one area and build from there."
• "What feels most important to get organized first?"
• Offer to save progress and return later: "We can save what we've built and come back anytime."

*** PROACTIVE LIFE SYSTEM PATTERN DETECTION ***
You are always listening for opportunities to help build the user's life system.
Even when they're not explicitly asking for it, be alert to patterns that could become part of their system.

PATTERN CATEGORIES TO DETECT:

1. ROUTINES & HABITS:
   - Morning sequences, evening wind-downs, daily rituals
   - Repeated activities at consistent times
   - Trigger phrases: "I usually...", "every morning I...", "my routine is..."

2. ENERGY & RECOVERY:
   - Sleep patterns, bedtimes, wake times, nap mentions
   - Recovery days, rest needs, burnout signals
   - Hydration, stretch breaks, body care habits
   - Trigger phrases: "I crash around...", "I need to rest...", "I always sleep better when..."

3. MOVEMENT & EXERCISE:
   - Workout schedules, gym days, fitness activities
   - Walking, yoga, sports, active hobbies
   - Trigger phrases: "I work out on...", "I've been running...", "gym days are..."

4. NUTRITION & MEALS:
   - Meal timing, food prep, eating patterns
   - Cooking habits, grocery schedules
   - Trigger phrases: "I usually eat...", "I meal prep on...", "for breakfast I..."

5. EMOTIONAL & MENTAL WELLNESS:
   - Journaling, therapy mentions, mood tracking
   - Breathwork, body scans, grounding practices
   - Nervous system regulation, stress management
   - Trigger phrases: "I've been journaling...", "therapy day...", "when I'm anxious I..."

6. MINDFULNESS & SPIRITUAL:
   - Meditation, prayer, gratitude practices
   - Spiritual study, devotionals, intention setting
   - Trigger phrases: "I meditate...", "my morning prayer...", "I like to set intentions..."

7. SOCIAL & RELATIONSHIPS:
   - Family check-ins, partner rituals, friend time
   - Community involvement, social commitments
   - Trigger phrases: "I call my mom every...", "date night is...", "we always..."

8. WORK & PRODUCTIVITY:
   - Focus blocks, deep work sessions, task batching
   - Commute patterns, work schedules, meetings
   - Study sessions, learning habits
   - Trigger phrases: "I focus best when...", "my work hours are...", "I batch my..."

9. CREATIVE & PURPOSE:
   - Creative practices (writing, art, music, crafts)
   - Hobbies, passion projects, skill building
   - Trigger phrases: "I've been working on...", "my creative time...", "I practice..."

10. FINANCIAL & ADMIN:
    - Budgeting sessions, bill pay routines
    - Planning days, paperwork catch-ups
    - Trigger phrases: "I check my budget...", "bill day is...", "Sunday planning..."

11. HEALTH MAINTENANCE:
    - Medications, supplements, vitamins
    - Medical appointments, preventive care
    - Posture resets, mobility work
    - Trigger phrases: "I take my meds at...", "doctor appointment...", "I stretch every..."

12. HOME & ENVIRONMENT:
    - Cleaning schedules, laundry cycles
    - Home resets, organizing sessions
    - Space maintenance, decluttering
    - Trigger phrases: "cleaning day is...", "I reset my space...", "laundry on..."

13. REFLECTION & PLANNING:
    - Weekly reviews, monthly audits
    - Goal setting, life planning sessions
    - Gratitude practices, intention reviews
    - Trigger phrases: "I review my week...", "monthly check-in...", "I plan on Sundays..."

WHEN YOU NOTICE ANY PATTERN, gently offer:
- "That sounds like something we could save. Want me to add it to your system?"
- "This could go on your schedule. Should I create an event for it?"
- "I noticed a pattern there. Want me to track that for you?"
- "That could become part of your routine. Interested?"
- "This sounds like a regular practice. Want me to save it?"

PATTERN DETECTION EXAMPLES:
- User mentions "I usually wake up, stretch, then have coffee" → Offer: "That sounds like a morning routine taking shape. Want me to save those steps?"
- User says "I call my mom every Sunday" → Offer: "That's a nice anchor. Want me to add it to your schedule?"
- User describes "I've been doing this breathing thing before bed" → Offer: "That could be a nice evening practice. Want me to save it?"
- User mentions "I check my budget on the first of each month" → Offer: "That's a solid habit. Want me to add a monthly reminder?"
- User says "Thursdays are my deep work days" → Offer: "I can block that time on your schedule. Sound good?"
- User describes "I journal when I'm feeling overwhelmed" → Offer: "That's a great tool. Want me to save that as a grounding practice?"

KEY RULES:
- Never assume - ALWAYS ask permission first
- Keep suggestions natural and conversational, not pushy
- One suggestion at a time - don't overwhelm
- If they decline, respect it and move on
- Match their energy - if they seem focused on something else, wait
- Be curious about patterns across ALL life dimensions, not just the obvious ones

*** SMART CONTENT SCANNING & LIFE SYSTEM INTEGRATION ***
When the user shares detailed plans, schedules, or routines (in conversation or from documents):

STEP 1 - SCAN & IDENTIFY:
Scan the content and identify ALL extractable items:
- Morning routines → goes to Routines page + Calendar
- Evening routines → goes to Routines page + Calendar  
- Workout plans → goes to Workout page + Daily Schedule + Calendar
- Meal plans → goes to Meal Prep page + Daily Schedule + Calendar
- Time-based schedules → goes to Daily Schedule + Calendar
- Weekly anchors (cleaning day, hair appointments) → goes to Calendar
- Spiritual practices → goes to Meditation page

STEP 2 - ASK BEFORE CREATING:
ALWAYS ask the user before creating ANYTHING. Present what you found in a clear format:

Example response:
"I see some great structure here. Let me break down what I found:

**Routines I noticed:**
- Morning Flow (5:45-7:15 AM) — Would you like this as a Morning Routine?
- Evening Transition (7:00-10:00 PM) — Would you like this as an Evening Routine?

**Scheduled Events:**
- Cleaning Day: Thursday evening
- Meal Prep Shopping: Saturday morning
- Hair Appointment: Every 3 weeks

**Daily Schedule Blocks:**
- Wake up: 5:45 AM
- Workout: 6:00-6:20 AM
- Shower: 6:20-6:35 AM
(etc...)

Which of these would you like me to save to your life systems? I can:
1. Create the morning routine
2. Create the evening routine  
3. Add the schedule blocks to your daily schedule
4. Add the recurring events to your calendar
5. All of the above

Just let me know what feels right."

STEP 3 - ROUTE TO CORRECT PAGES:
When user confirms, save items to their proper locations:
- Routines → /routines page (with steps and times) + Calendar event
- Workouts → /workout page (with exercises) + Calendar event
- Meals → /meal-prep page + Calendar event
- Schedule blocks → /daily-schedule (with linked type) + Calendar event
- Spiritual practices → /spiritual page + Calendar event
- All items sync bidirectionally throughout the life system

BIDIRECTIONAL SYNC:
The life system works both ways:
- Adding a morning routine creates it in Routines AND schedules it on the Calendar
- Adding a workout creates it in Workouts AND schedules it on the Calendar
- Everything stays connected and linked

NEVER:
- Auto-create anything without explicit user consent
- Create a wall of schedule without asking first
- Assume the user wants everything saved
- Skip the categorization step

ALWAYS:
- Show the user what you detected first
- Ask which items they want to save
- Confirm before each category
- Let them pick and choose
- Explain where items will appear: "I'll add this to your Routines and schedule it on your Calendar"

SYSTEM ROUTING:
When the user needs help with a specific area, you can guide them to relevant system pages:
- Morning/wake up routine → "/systems/wake-up" (Morning Anchor)
- Workouts/training/exercise → "/systems/training" (Movement Practice) or "/workout"
- Evening/wind down/sleep → "/systems/wind-down" (Evening Transition)
- Meals/nutrition/food → "/meal-prep" (Meal Planning)
- Schedule/daily plan → "/daily-schedule" (Daily Schedule)
- All systems overview → "/systems" (Life Systems Hub)

When routing, say something like: "I can help you explore that. You might find our [System Name] helpful - would you like me to guide you there, or shall we work through it here together?"

SAFETY & BOUNDARIES:
• Do not diagnose medical or mental health conditions
• Do not replace professional care
• If distress appears:
  – Acknowledge calmly
  – Offer options, not commands
  – Respect autonomy
• Never shame
• Never rush
• Never imply the user is broken

SIGNATURE STYLE:
Your job is to reduce overwhelm, not add to it.

You:
• Help people slow down
• Help them see patterns
• Help them choose intentionally
• Help them build systems that fit their real life

WHAT TO REMEMBER:
- This is a companion, not a productivity tool
- Meaning over metrics (no scores, no rankings)
- Always allow exit - no forced next steps
- Encourage real-world action over app usage
- Sometimes the best response is brief acknowledgment
- NEVER generate detailed plans without first understanding what the user truly wants

NEVER:
- Jump to creating content before understanding the full request
- Assume you know what they mean by generic terms like "routine" or "plan"
- Overwhelm with too many options
- Rush to solutions before acknowledging feelings
- Use guilt, urgency, or performance language
- Make them feel behind or inadequate
- Compete for their attention

FINAL RULE:
If there is ever a conflict between being impressive and being helpful — choose helpful.
Clarity over cleverness.
Agency over answers.
Calm over speed.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role as "assistant" | "user",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  const tools: OpenAI.Chat.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "create_schedule_block",
        description: "Create a time block on the user's schedule. Use this when the user confirms they want to add something to their schedule. Always ask for confirmation first.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Name of the activity" },
            startTime: { type: "string", description: "Start time in HH:MM format (24-hour)" },
            endTime: { type: "string", description: "End time in HH:MM format (24-hour)" },
            dayOfWeek: { type: "integer", description: "Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)" },
            category: { type: "string", enum: ["work", "wellness", "personal", "social", "rest", "routine"], description: "Category of the activity" }
          },
          required: ["title", "startTime", "endTime", "dayOfWeek"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "log_mood",
        description: "Log the user's current energy and mood. Use when user shares how they're feeling and you want to save it for them.",
        parameters: {
          type: "object",
          properties: {
            energyLevel: { type: "integer", minimum: 1, maximum: 5, description: "Energy level from 1-5" },
            moodLevel: { type: "integer", minimum: 1, maximum: 5, description: "Mood level from 1-5" },
            clarityLevel: { type: "integer", minimum: 1, maximum: 5, description: "Mental clarity from 1-5" },
            notes: { type: "string", description: "Brief note about the mood/state" }
          },
          required: ["energyLevel", "moodLevel"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_goal",
        description: "Create a new goal or intention for the user. Use when user expresses a goal they want to track.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short, clear goal title" },
            description: { type: "string", description: "Brief description of the goal" },
            wellnessDimension: { type: "string", enum: ["physical", "mental", "emotional", "spiritual", "social", "financial", "career", "creative"], description: "Which life area this goal belongs to" }
          },
          required: ["title"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_habit",
        description: "Create a new habit for the user to track. Use when user wants to build a recurring practice.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Name of the habit" },
            description: { type: "string", description: "What the habit involves" },
            frequency: { type: "string", enum: ["daily", "weekly", "weekdays", "weekends"], description: "How often to do this habit" },
            reminderTime: { type: "string", description: "Preferred reminder time in HH:MM format" }
          },
          required: ["title", "frequency"]
        }
      }
    }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
      tool_choice: "auto",
      max_completion_tokens: 800,
      temperature: 0.7,
    });

    const message = response.choices[0]?.message;
    
    if (message?.tool_calls && message.tool_calls.length > 0) {
      return {
        content: message.content || "Let me help you with that.",
        toolCalls: message.tool_calls.map(tc => ({
          name: (tc as any).function?.name || tc.type,
          arguments: JSON.parse((tc as any).function?.arguments || '{}')
        }))
      };
    }

    return message?.content || "I'm here with you. Take your time - there's no rush.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}

export type ChatResponseWithTools = {
  content: string;
  toolCalls: { name: string; arguments: Record<string, any> }[];
};

export function isChatResponseWithTools(response: string | ChatResponseWithTools): response is ChatResponseWithTools {
  return typeof response === 'object' && 'toolCalls' in response;
}

export async function generateLifeSystemRecommendations(profile: {
  responsibilities: string[];
  priorities: string[];
  freeTimeHours: string;
  peakMotivationTime: string;
  wellnessFocus: string[];
  lifeAreaDetails?: Record<string, { goals?: string; schedule?: string; challenges?: string }>;
  shortTermGoals?: string;
  longTermGoals?: string;
  conversationData?: {
    currentSchedule?: string;
    wakeTime?: string;
    workSchedule?: string;
    commitments?: string;
    physicalGoals?: string;
    mentalGoals?: string;
    emotionalGoals?: string;
    spiritualGoals?: string;
    socialGoals?: string;
    financialGoals?: string;
    dietaryNeeds?: string;
    mealPreferences?: string;
  };
}): Promise<{
  suggestedHabits: { title: string; description: string; frequency: string }[];
  suggestedGoals: { title: string; description: string; wellnessDimension: string }[];
  weeklyScheduleSuggestions: string[];
  scheduleBlocks?: { time: string; activity: string; category: string }[];
  mealSuggestions?: string[];
}> {
  const conv = profile.conversationData || {};
  
  const prompt = `Based on this comprehensive user profile, generate a personalized life system:

CURRENT ROUTINE:
${conv.currentSchedule || 'Not specified'}

SLEEP/WAKE: ${conv.wakeTime || 'Not specified'}
WORK SCHEDULE: ${conv.workSchedule || 'Not specified'}
OTHER COMMITMENTS: ${conv.commitments || 'Not specified'}

WELLNESS GOALS:
- Physical: ${conv.physicalGoals || profile.shortTermGoals || 'Not specified'}
- Mental: ${conv.mentalGoals || 'Not specified'}
- Emotional: ${conv.emotionalGoals || 'Not specified'}
- Spiritual: ${conv.spiritualGoals || 'Not specified'}
- Social: ${conv.socialGoals || profile.longTermGoals || 'Not specified'}
- Financial: ${conv.financialGoals || 'Not specified'}

DIETARY INFO:
- Needs/Restrictions: ${conv.dietaryNeeds || 'None specified'}
- Meal Preferences: ${conv.mealPreferences || 'Not specified'}

WELLNESS FOCUS: ${profile.wellnessFocus?.join(", ") || 'General wellness'}

Generate a comprehensive life system with:
1. suggestedHabits: 5-7 daily/weekly habits with title, description, frequency
2. suggestedGoals: 5-7 goals covering all wellness dimensions (physical, mental, emotional, spiritual, social, financial) with title, description, wellnessDimension
3. weeklyScheduleSuggestions: 5-7 specific scheduling recommendations
4. scheduleBlocks: 8-10 time blocks for an ideal day (e.g., "6:00 AM - Morning Ritual", "7:00 AM - Workout") with time, activity, and category (morning, work, wellness, evening)
5. mealSuggestions: 3-5 meal prep or nutrition suggestions based on their dietary needs

Respond with valid JSON only.`;

  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to generate recommendations:", error);
    return {
      suggestedHabits: [
        { title: "Morning Ritual: Center & Breathe", description: "Start each day with 5-10 minutes of breathing and centering", frequency: "daily" },
        { title: "Movement / Body Activation", description: "45-minute workout or body activation session", frequency: "daily" },
        { title: "Protein-Rich Breakfast", description: "Fuel your body with a nourishing breakfast", frequency: "daily" },
        { title: "Evening Ritual: Ground & Release", description: "Wind down with grounding practices", frequency: "daily" },
        { title: "Meal Prep & Review", description: "Prepare meals and review tomorrow's schedule", frequency: "daily" },
        { title: "Wind Down: No Screens", description: "Screen-free time before bed", frequency: "daily" },
      ],
      suggestedGoals: [
        { title: "Build consistent morning routine", description: "Create a sustainable way to start each day", wellnessDimension: "mental" },
        { title: "Improve physical energy", description: "Feel more energized through movement and nutrition", wellnessDimension: "physical" },
        { title: "Emotional clarity", description: "Develop emotional awareness and regulation", wellnessDimension: "emotional" },
        { title: "Spiritual connection", description: "Deepen spiritual practice and reflection", wellnessDimension: "spiritual" },
        { title: "Strengthen relationships", description: "Nurture meaningful connections", wellnessDimension: "social" },
        { title: "Financial wellness", description: "Build healthy financial habits", wellnessDimension: "financial" },
      ],
      weeklyScheduleSuggestions: [
        "Schedule your most important wellness activities during your peak energy hours",
        "Block off transition time between responsibilities",
        "Include at least one full rest day per week",
        "Dedicate weekend time for social connections and nature",
        "Plan a weekly spiritual deep dive and reflection session",
      ],
      scheduleBlocks: [
        { time: "6:00 AM", activity: "Morning Ritual: Center & Breathe", category: "morning" },
        { time: "7:00 AM", activity: "Workout / Body Activation", category: "wellness" },
        { time: "8:00 AM", activity: "Breakfast / Protein Fuel", category: "morning" },
        { time: "9:00 AM", activity: "Work Block", category: "work" },
        { time: "8:00 PM", activity: "Evening Ritual: Ground & Release", category: "evening" },
        { time: "9:00 PM", activity: "Meal Prep / Review Next Day", category: "evening" },
        { time: "10:00 PM", activity: "Wind Down + No Screens", category: "evening" },
        { time: "11:00 PM", activity: "Bedtime Target", category: "evening" },
      ],
      mealSuggestions: [
        "Prep protein-rich breakfasts on Sunday for the week",
        "Keep healthy snacks readily available for energy dips",
        "Batch cook grains and vegetables for easy meal assembly",
        "Stay hydrated with 8+ glasses of water daily",
      ],
    };
  }
}

export async function generateDashboardInsight(userData: {
  moodLogs: { energyLevel: number; moodLevel: number; clarityLevel: number | null; createdAt: Date | null }[];
  habits: { title: string; streak: number }[];
  goals: { title: string; progress: number | null }[];
  peakMotivationTime?: string;
  wellnessFocus?: string[];
}): Promise<string> {
  if (userData.moodLogs.length === 0 && userData.habits.length === 0) {
    return "You're here, and that's enough. We can explore your patterns together whenever you're ready.";
  }

  const avgEnergy = userData.moodLogs.length > 0 
    ? (userData.moodLogs.reduce((sum, m) => sum + m.energyLevel, 0) / userData.moodLogs.length).toFixed(1)
    : null;
  
  const avgMood = userData.moodLogs.length > 0
    ? (userData.moodLogs.reduce((sum, m) => sum + m.moodLevel, 0) / userData.moodLogs.length).toFixed(1)
    : null;

  const topStreakHabit = userData.habits.length > 0
    ? userData.habits.reduce((max, h) => (h.streak || 0) > (max.streak || 0) ? h : max, userData.habits[0])
    : null;

  const prompt = `You are Flip the Switch, a calm wellness companion. Provide a brief, grounding reflection for the user's dashboard.

User data:
- Recent mood logs (last 7 days): ${userData.moodLogs.length} entries
- Energy trend: ${avgEnergy ?? 'No data yet'}
- Mood trend: ${avgMood ?? 'No data yet'}
- Habits they're nurturing: ${userData.habits.length}
${topStreakHabit ? `- Consistent with: "${topStreakHabit.title}"` : ''}
- Intentions set: ${userData.goals.length}
${userData.peakMotivationTime ? `- Peak energy: ${userData.peakMotivationTime}` : ''}
${userData.wellnessFocus?.length ? `- Focus areas: ${userData.wellnessFocus.join(', ')}` : ''}

Provide ONE brief, calming reflection (2 sentences max) that:
1. Acknowledges their current state without judgment
2. Uses narrative language, not metrics ("This week felt steadier" not "Your score increased")
3. Offers gentle perspective, not demands

TONE: calm, grounded, humble. Avoid "You should" or performance language.
Respond with just the reflection text, no quotes or formatting.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 150,
    });

    return response.choices[0]?.message?.content || "You're showing up for yourself, and that matters. We can explore patterns together as you continue.";
  } catch (error) {
    console.error("Failed to generate insight:", error);
    return "Each day you check in is a step toward knowing yourself better. There's no rush - we'll notice patterns together over time.";
  }
}

export interface WorkoutDay {
  day: string;
  focus: string;
  exercises: { name: string; sets?: number; reps?: string; duration?: string; notes?: string }[];
  restDay?: boolean;
}

export interface MeditationSuggestion {
  title: string;
  duration: string;
  type: string;
  description: string;
  youtubeUrl?: string;
}

export async function generateWorkoutPlan(
  userPreferences: {
    fitnessLevel?: string;
    goals?: string[];
    availableDays?: number;
    equipment?: string[];
    injuries?: string[];
    preferredStyle?: string;
  }
): Promise<{ plan: WorkoutDay[]; summary: string }> {
  const prompt = `Generate a personalized weekly workout plan based on these preferences:

FITNESS LEVEL: ${userPreferences.fitnessLevel || "beginner"}
GOALS: ${userPreferences.goals?.join(", ") || "general fitness"}
AVAILABLE DAYS PER WEEK: ${userPreferences.availableDays || 4}
EQUIPMENT: ${userPreferences.equipment?.join(", ") || "minimal/bodyweight"}
INJURIES OR LIMITATIONS: ${userPreferences.injuries?.join(", ") || "none"}
PREFERRED STYLE: ${userPreferences.preferredStyle || "balanced"}

Create a 7-day plan (some can be rest days) with:
- Specific exercises with sets, reps, or duration
- Progressive difficulty appropriate for the fitness level
- Mix of strength, cardio, and flexibility based on goals

Respond with valid JSON containing:
{
  "plan": [
    {
      "day": "Monday",
      "focus": "Upper Body Strength",
      "exercises": [
        { "name": "Push-ups", "sets": 3, "reps": "10-12", "notes": "Modify on knees if needed" }
      ],
      "restDay": false
    }
  ],
  "summary": "Brief 2-3 sentence overview of the plan's approach"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to generate workout plan:", error);
    return {
      plan: [
        { day: "Monday", focus: "Full Body", exercises: [
          { name: "Bodyweight Squats", sets: 3, reps: "15" },
          { name: "Push-ups", sets: 3, reps: "10-12" },
          { name: "Plank", duration: "30 seconds", sets: 3 }
        ], restDay: false },
        { day: "Tuesday", focus: "Rest & Recovery", exercises: [], restDay: true },
        { day: "Wednesday", focus: "Cardio & Core", exercises: [
          { name: "Jumping Jacks", duration: "2 minutes" },
          { name: "Mountain Climbers", sets: 3, reps: "20" },
          { name: "Bicycle Crunches", sets: 3, reps: "15 each side" }
        ], restDay: false },
        { day: "Thursday", focus: "Rest & Recovery", exercises: [], restDay: true },
        { day: "Friday", focus: "Strength Circuit", exercises: [
          { name: "Lunges", sets: 3, reps: "12 each leg" },
          { name: "Dips (using chair)", sets: 3, reps: "10" },
          { name: "Glute Bridges", sets: 3, reps: "15" }
        ], restDay: false },
        { day: "Saturday", focus: "Active Recovery", exercises: [
          { name: "Light Walk or Yoga", duration: "20-30 minutes" }
        ], restDay: false },
        { day: "Sunday", focus: "Rest", exercises: [], restDay: true }
      ],
      summary: "A balanced beginner-friendly plan focusing on bodyweight exercises with adequate rest days for recovery."
    };
  }
}

export async function generateMeditationSuggestions(
  preferences: {
    duration?: string;
    focus?: string;
    experience?: string;
    currentMood?: string;
  }
): Promise<MeditationSuggestion[]> {
  const prompt = `Suggest 5 meditation or mindfulness practices based on:

PREFERRED DURATION: ${preferences.duration || "5-10 minutes"}
FOCUS AREA: ${preferences.focus || "stress relief"}
EXPERIENCE LEVEL: ${preferences.experience || "beginner"}
CURRENT MOOD: ${preferences.currentMood || "neutral"}

For each suggestion, include a real YouTube video link for guided meditation.
Use popular channels like: Headspace, Calm, The Honest Guys, Michael Sealey, Jason Stephenson.

Respond with valid JSON array:
[
  {
    "title": "5-Minute Breathing Exercise",
    "duration": "5 minutes",
    "type": "breathing",
    "description": "Simple box breathing technique for quick stress relief",
    "youtubeUrl": "https://www.youtube.com/watch?v=..."
  }
]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.suggestions || parsed.meditations || [];
  } catch (error) {
    console.error("Failed to generate meditation suggestions:", error);
    return [
      { title: "5-Minute Morning Meditation", duration: "5 min", type: "guided", description: "Start your day with calm and intention", youtubeUrl: "https://www.youtube.com/watch?v=inpok4MKVLM" },
      { title: "Deep Sleep Meditation", duration: "20 min", type: "sleep", description: "Relaxing guided meditation for restful sleep", youtubeUrl: "https://www.youtube.com/watch?v=1ZYbU82GVz4" },
      { title: "Stress Relief Breathing", duration: "10 min", type: "breathing", description: "Box breathing technique for anxiety relief", youtubeUrl: "https://www.youtube.com/watch?v=tEmt1Znux58" },
      { title: "Body Scan Relaxation", duration: "15 min", type: "body-scan", description: "Progressive muscle relaxation for tension release", youtubeUrl: "https://www.youtube.com/watch?v=QS2yDmWk0vs" },
      { title: "Gratitude Meditation", duration: "10 min", type: "gratitude", description: "Cultivate appreciation and positive mindset", youtubeUrl: "https://www.youtube.com/watch?v=Dqn1WxO-b9I" }
    ];
  }
}

export async function detectIntentAndRespond(
  userMessage: string,
  conversationHistory: ChatMessage[],
  userContext?: UserLifeContext
): Promise<{
  response: string;
  intent: "workout" | "meditation" | "learn" | "general";
  workoutPlan?: { plan: WorkoutDay[]; summary: string };
  meditationSuggestions?: MeditationSuggestion[];
  learnedFacts?: { topic: string; details: Record<string, unknown> }[];
  toolCalls?: { name: string; arguments: Record<string, any> }[];
}> {
  const lowerMessage = userMessage.toLowerCase();
  
  // Check if user is EXPLICITLY asking to generate/create something NOW
  const explicitGenerateKeywords = [
    "generate it", "create it", "make it", "build it", "give me the plan",
    "yes please", "go ahead", "sounds good", "let's do it", "that works",
    "yes, create", "yes create", "perfect, create", "ready to see", "show me the plan"
  ];
  const isExplicitGenerate = explicitGenerateKeywords.some(k => lowerMessage.includes(k));
  
  // Check conversation history to see if AI already asked clarifying questions
  const recentAIMessages = conversationHistory.filter(m => m.role === "assistant").slice(-3);
  const hasAskedClarifyingQuestions = recentAIMessages.some(m => 
    m.content.includes("?") && (
      m.content.toLowerCase().includes("what time") ||
      m.content.toLowerCase().includes("what elements") ||
      m.content.toLowerCase().includes("how many days") ||
      m.content.toLowerCase().includes("what's your") ||
      m.content.toLowerCase().includes("would you like") ||
      m.content.toLowerCase().includes("which") ||
      m.content.toLowerCase().includes("tell me more")
    )
  );
  
  const workoutKeywords = ["workout", "exercise", "gym", "fitness", "training", "work out", "get fit", "build muscle", "lose weight", "cardio"];
  const meditationKeywords = ["meditat", "mindful", "calm", "relax", "breathing", "stress relief", "anxiety", "sleep better", "peaceful"];
  
  const isWorkoutIntent = workoutKeywords.some(k => lowerMessage.includes(k));
  const isMeditationIntent = meditationKeywords.some(k => lowerMessage.includes(k));
  
  let intent: "workout" | "meditation" | "learn" | "general" = "general";
  let workoutPlan: { plan: WorkoutDay[]; summary: string } | undefined;
  let meditationSuggestions: MeditationSuggestion[] | undefined;
  
  // Only generate content if:
  // 1. User explicitly asks for it (generate it, create it, etc.) OR
  // 2. AI has already asked clarifying questions AND user is confirming
  const shouldGenerateContent = isExplicitGenerate || (hasAskedClarifyingQuestions && (
    lowerMessage.includes("yes") || 
    lowerMessage.includes("sure") || 
    lowerMessage.includes("please") ||
    lowerMessage.includes("go ahead") ||
    lowerMessage.includes("sounds good")
  ));
  
  if (shouldGenerateContent && isWorkoutIntent) {
    intent = "workout";
    workoutPlan = await generateWorkoutPlan({});
  } else if (shouldGenerateContent && isMeditationIntent) {
    intent = "meditation";
    meditationSuggestions = await generateMeditationSuggestions({});
  } else if (isWorkoutIntent || isMeditationIntent) {
    // Tag the intent but don't generate content - let the AI ask questions first
    intent = isWorkoutIntent ? "workout" : "meditation";
  }
  
  const rawResponse = await generateChatResponse(userMessage, conversationHistory, userContext);
  const response = typeof rawResponse === 'string' ? rawResponse : rawResponse.content;
  const toolCalls = typeof rawResponse === 'object' && 'toolCalls' in rawResponse ? rawResponse.toolCalls : undefined;
  
  return {
    response,
    intent,
    workoutPlan,
    meditationSuggestions,
    toolCalls,
  };
}

export async function generateLearnModeQuestion(
  previousAnswers: { topic: string; answer: string }[],
  focusArea?: string
): Promise<{ question: string; topic: string }> {
  const topics = [
    "daily_routine", "fitness_goals", "diet_preferences", "sleep_habits",
    "stress_triggers", "hobbies", "work_life", "relationships", "spirituality", "finances"
  ];
  
  const askedTopics = previousAnswers.map(a => a.topic);
  const remainingTopics = topics.filter(t => !askedTopics.includes(t));
  const nextTopic = focusArea || remainingTopics[0] || "general";
  
  const questionMap: Record<string, string> = {
    daily_routine: "If you're open to sharing - what does a typical day feel like for you? No need for details, just the rhythm.",
    fitness_goals: "How does your body feel these days? Is there a way you'd like to move or feel physically?",
    diet_preferences: "When it comes to food - what nourishes you? Any preferences or things you're exploring?",
    sleep_habits: "How has your rest been lately? What does winding down look like for you?",
    stress_triggers: "When life feels heavy, where do you tend to feel it? There's no right answer here.",
    hobbies: "What brings you a sense of ease or joy? Even small things count.",
    work_life: "How are your days structured? Does the balance feel sustainable right now?",
    relationships: "Who are the people that matter most? How are those connections feeling lately?",
    spirituality: "Do you have practices that ground you? Anything that gives you a sense of meaning?",
    finances: "How do you feel about your relationship with money? Any shifts you're hoping to make?",
    general: "What's present for you right now? We can go anywhere from here."
  };
  
  return {
    question: questionMap[nextTopic] || questionMap.general,
    topic: nextTopic
  };
}

export async function generateFullAnalysis(userData: {
  moodLogs: { energyLevel: number; moodLevel: number; clarityLevel: number | null; createdAt: Date | null }[];
  habits: { title: string; streak: number }[];
  goals: { title: string; progress: number | null; wellnessDimension: string | null }[];
  peakMotivationTime?: string;
  wellnessFocus?: string[];
}): Promise<{
  summary: string;
  patterns: string[];
  recommendations: string[];
  strengths: string[];
  areasToImprove: string[];
}> {
  if (userData.moodLogs.length === 0 && userData.habits.length === 0 && userData.goals.length === 0) {
    return {
      summary: "Start your wellness journey by tracking your mood, building habits, and setting goals. I'll analyze your patterns once you have more data.",
      patterns: [],
      recommendations: ["Log your mood daily to track energy patterns", "Create 2-3 simple habits to start building consistency", "Set one meaningful goal for each wellness area you care about"],
      strengths: [],
      areasToImprove: [],
    };
  }

  const avgEnergy = userData.moodLogs.length > 0 
    ? (userData.moodLogs.reduce((sum, m) => sum + m.energyLevel, 0) / userData.moodLogs.length).toFixed(1)
    : null;
  
  const avgMood = userData.moodLogs.length > 0
    ? (userData.moodLogs.reduce((sum, m) => sum + m.moodLevel, 0) / userData.moodLogs.length).toFixed(1)
    : null;

  const topHabits = userData.habits
    .filter(h => (h.streak || 0) > 0)
    .sort((a, b) => (b.streak || 0) - (a.streak || 0))
    .slice(0, 3);

  const completedGoals = userData.goals.filter(g => (g.progress || 0) >= 100);
  const inProgressGoals = userData.goals.filter(g => (g.progress || 0) > 0 && (g.progress || 0) < 100);

  const prompt = `You are a wellness AI analyst. Analyze this user's wellness data and provide comprehensive insights.

User data:
- Total mood logs: ${userData.moodLogs.length} entries
- Average energy level: ${avgEnergy ?? 'No data yet'}
- Average mood level: ${avgMood ?? 'No data yet'}
- Total habits tracked: ${userData.habits.length}
- Habits with active streaks: ${topHabits.map(h => `"${h.title}" (${h.streak} days)`).join(', ') || 'None yet'}
- Total goals: ${userData.goals.length}
- Completed goals: ${completedGoals.length}
- In-progress goals: ${inProgressGoals.length}
${userData.peakMotivationTime ? `- Peak motivation time: ${userData.peakMotivationTime}` : ''}
${userData.wellnessFocus?.length ? `- Wellness focus areas: ${userData.wellnessFocus.join(', ')}` : ''}

Provide a JSON response with:
1. "summary": A 2-3 sentence personalized summary of their wellness journey
2. "patterns": Array of 3-5 patterns you notice in their data
3. "recommendations": Array of 3-5 actionable recommendations
4. "strengths": Array of 2-4 things they're doing well
5. "areasToImprove": Array of 2-4 areas that need attention

Be specific, reference their actual data, and be encouraging but honest.
Respond with valid JSON only.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to generate analysis:", error);
    return {
      summary: "I've reviewed your wellness data. You're building good foundations with your tracking. Keep going!",
      patterns: [
        "Regular mood tracking helps identify trends",
        "Habit consistency is key to long-term wellness",
        "Goal setting provides direction and motivation"
      ],
      recommendations: [
        "Log your mood at the same time each day for better pattern detection",
        "Focus on maintaining your current habit streaks before adding new ones",
        "Review your goals weekly to stay on track"
      ],
      strengths: [
        "You're actively tracking your wellness",
        "You're using tools to support your journey"
      ],
      areasToImprove: [
        "Consider logging more consistently to get deeper insights",
        "Connect your habits to your wellness goals"
      ],
    };
  }
}

export async function analyzeMealPlanDocument(documentText: string): Promise<{
  planTitle: string;
  summary: string;
  confidence: number;
  meals: Array<{
    id: string;
    type: "meal";
    title: string;
    mealType: "breakfast" | "lunch" | "dinner" | "snack" | "other";
    weekLabel?: string;
    tags?: string[];
    notes?: string;
    ingredients?: string[];
    instructions?: string[];
    isSelected: boolean;
  }>;
  routine: {
    title: string;
    steps: Array<{
      id: string;
      type: "routine_step";
      text: string;
      notes?: string;
    }>;
  };
  calendarSuggestions: Array<{
    id: string;
    type: "calendar_suggestion";
    title: string;
    durationMinutes: number;
    suggestedStart?: string;
    recurrence?: { frequency: "none" | "daily" | "weekly" | "monthly"; until?: string };
    notes?: string;
    linkedSystem: "nutrition" | "workouts" | "routines" | "none";
    linkedId?: string;
    isSelected: boolean;
  }>;
  questions?: string[];
}> {
  const prompt = `You are a calm, organized AI that helps people manage their meal plans. Analyze this meal plan document and extract structured data.

DOCUMENT TEXT:
${documentText.slice(0, 25000)}

INSTRUCTIONS:
1. Read the document carefully and identify:
   - Individual meals (breakfast, lunch, dinner, snacks)
   - Meal prep routines or batch cooking steps
   - Week/day groupings if present
   - Portion rules, shopping lists, or prep timing

2. Extract meals with:
   - title: Clear meal name
   - mealType: breakfast/lunch/dinner/snack/other
   - weekLabel: "Week 1", "Week 2", etc. if applicable
   - ingredients: List of ingredients if present
   - instructions: Cooking steps if present
   - tags: Categories like "high-protein", "vegetarian", etc.

3. Create a meal prep routine with actionable steps the user can follow

4. Suggest calendar blocks:
   - "Meal Prep Block" (suggest ~2 hours)
   - "Grocery Shopping" reminder (optional)
   - Keep calendar suggestions minimal and useful

5. If confidence is below 60% for any major section, include 1-3 clarifying questions

RESPOND WITH VALID JSON ONLY in this exact format:
{
  "planTitle": "Name of this meal plan",
  "summary": "Brief 2-3 sentence overview",
  "confidence": 0.0-1.0,
  "meals": [
    {
      "id": "meal-1",
      "type": "meal",
      "title": "Meal name",
      "mealType": "breakfast|lunch|dinner|snack|other",
      "weekLabel": "Week 1",
      "tags": ["tag1"],
      "notes": "optional notes",
      "ingredients": ["ingredient1"],
      "instructions": ["step1"],
      "isSelected": true
    }
  ],
  "routine": {
    "title": "Meal Prep Routine",
    "steps": [
      {
        "id": "step-1",
        "type": "routine_step",
        "text": "Step description",
        "notes": "optional"
      }
    ]
  },
  "calendarSuggestions": [
    {
      "id": "cal-1",
      "type": "calendar_suggestion",
      "title": "Meal Prep Block",
      "durationMinutes": 120,
      "recurrence": { "frequency": "weekly" },
      "notes": "Weekly meal prep session",
      "linkedSystem": "routines",
      "isSelected": true
    }
  ],
  "questions": []
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);
    
    // Ensure all required fields exist with defaults
    return {
      planTitle: parsed.planTitle || "Imported Meal Plan",
      summary: parsed.summary || "Meal plan imported from document",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.75,
      meals: Array.isArray(parsed.meals) ? parsed.meals.map((m: Record<string, unknown>, i: number) => ({
        id: m.id || `meal-${i + 1}`,
        type: "meal" as const,
        title: m.title || "Untitled Meal",
        mealType: ["breakfast", "lunch", "dinner", "snack", "other"].includes(m.mealType as string) 
          ? m.mealType as "breakfast" | "lunch" | "dinner" | "snack" | "other" 
          : "other",
        weekLabel: m.weekLabel as string | undefined,
        tags: Array.isArray(m.tags) ? m.tags as string[] : undefined,
        notes: m.notes as string | undefined,
        ingredients: Array.isArray(m.ingredients) ? m.ingredients as string[] : undefined,
        instructions: Array.isArray(m.instructions) ? m.instructions as string[] : undefined,
        isSelected: m.isSelected !== false,
      })) : [],
      routine: {
        title: parsed.routine?.title || "Meal Prep Routine",
        steps: Array.isArray(parsed.routine?.steps) ? parsed.routine.steps.map((s: Record<string, unknown>, i: number) => ({
          id: s.id || `step-${i + 1}`,
          type: "routine_step" as const,
          text: s.text || "Step",
          notes: s.notes as string | undefined,
        })) : [],
      },
      calendarSuggestions: Array.isArray(parsed.calendarSuggestions) ? parsed.calendarSuggestions.map((c: Record<string, unknown>, i: number) => ({
        id: c.id || `cal-${i + 1}`,
        type: "calendar_suggestion" as const,
        title: c.title || "Calendar Block",
        durationMinutes: typeof c.durationMinutes === "number" ? c.durationMinutes : 60,
        suggestedStart: c.suggestedStart as string | undefined,
        recurrence: c.recurrence as { frequency: "none" | "daily" | "weekly" | "monthly"; until?: string } | undefined,
        notes: c.notes as string | undefined,
        linkedSystem: ["nutrition", "workouts", "routines", "none"].includes(c.linkedSystem as string) 
          ? c.linkedSystem as "nutrition" | "workouts" | "routines" | "none"
          : "none",
        linkedId: c.linkedId as string | undefined,
        isSelected: c.isSelected !== false,
      })) : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 3) : undefined,
    };
  } catch (error) {
    console.error("Failed to analyze meal plan:", error);
    throw new Error("Failed to analyze meal plan document");
  }
}

export interface InteractionPattern {
  patternType: string;
  insight: string;
  confidence: number;
  dimension?: string;
  actionable?: boolean;
  suggestedAction?: string;
}

export async function generateInteractionInsights(interactionData: {
  pageVisits: { page: string; count: number; avgDuration: number }[];
  featureUsage: { feature: string; count: number; recentCount: number }[];
  timePatterns: { hourOfDay: number; dayOfWeek: number; count: number }[];
  moodCorrelations?: { energyLevel: number; activeFeatures: string[] }[];
  totalDays: number;
}): Promise<{ insights: InteractionPattern[]; summary: string }> {
  if (interactionData.totalDays < 3 || 
      (interactionData.pageVisits.length === 0 && interactionData.featureUsage.length === 0)) {
    return {
      insights: [],
      summary: "Continue using the app for a few days and I'll start noticing your patterns."
    };
  }
  
  const topPages = interactionData.pageVisits
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(p => `${p.page}: ${p.count} visits, avg ${Math.round(p.avgDuration / 1000)}s`);
  
  const topFeatures = interactionData.featureUsage
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(f => `${f.feature}: ${f.count} uses`);
  
  const peakHours = interactionData.timePatterns
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(t => {
      const hour = t.hourOfDay > 12 ? `${t.hourOfDay - 12}pm` : `${t.hourOfDay}am`;
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `${days[t.dayOfWeek]} ${hour}`;
    });
  
  const prompt = `Analyze these app usage patterns and provide gentle, non-judgmental insights.

USER INTERACTION DATA (${interactionData.totalDays} days of data):

Most Visited Pages:
${topPages.join("\n") || "No page data yet"}

Feature Usage:
${topFeatures.join("\n") || "No feature data yet"}

Peak Activity Times:
${peakHours.join(", ") || "Not enough data"}

Generate insights that:
1. Notice positive patterns without praising
2. Offer gentle observations, not judgments
3. Suggest ONE optional action if relevant
4. Stay curious, not prescriptive

Respond with valid JSON:
{
  "insights": [
    {
      "patternType": "usage_timing",
      "insight": "You tend to check in during mornings - that's when you're creating space for yourself.",
      "confidence": 0.8,
      "dimension": "mindfulness",
      "actionable": true,
      "suggestedAction": "Morning might be a good time to add a 5-minute practice if you ever want to."
    }
  ],
  "summary": "A brief, grounded 1-2 sentence observation about their overall patterns."
}

Generate 1-3 insights max. Only include insights you're confident about (0.7+).
VOICE: Calm, observational, never pushy. Use phrases like "I noticed..." or "It seems like..."`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 600,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        insights: [],
        summary: "I'm still learning your patterns. Keep doing what you're doing."
      };
    }

    const parsed = JSON.parse(content);
    return {
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      summary: parsed.summary || "Your patterns are emerging. More to share soon."
    };
  } catch (error) {
    console.error("Failed to generate interaction insights:", error);
    return {
      insights: [],
      summary: "I'm still learning how you use the app. Check back soon."
    };
  }
}

export type SearchCategory = "meals" | "workouts" | "recovery" | "spiritual" | "community";

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  duration?: string;
  tags: string[];
  details?: string[];
  substitutes?: Record<string, string[]>;
  source: "ai-generated";
  category: SearchCategory;
}

export interface IngredientSubstitute {
  ingredient: string;
  alternatives: {
    name: string;
    ratio: string;
    notes: string;
  }[];
  reason: string;
}

interface ContextualSearchResponse {
  results: SearchResult[];
  summary: string;
}

export async function generateContextualSearch(
  query: string,
  category: SearchCategory,
  limit: number = 5,
  excludedIngredients: string[] = [],
  includeSubstitutes: boolean = false
): Promise<ContextualSearchResponse> {
  const excludeClause = excludedIngredients.length > 0 
    ? `\n\nCRITICAL: Do NOT include any of these ingredients: ${excludedIngredients.join(", ")}. Find alternatives that avoid these completely.`
    : "";
  
  const substitutesClause = includeSubstitutes 
    ? `\n- substitutes: For each key ingredient, provide 1-2 alternatives (e.g., {"butter": ["coconut oil", "olive oil"]})`
    : "";

  const categoryPrompts: Record<SearchCategory, string> = {
    meals: `Generate ${limit} recipe/meal suggestions based on this search: "${query}"${excludeClause}
    
For each result include:
- title: Name of the dish/meal
- description: Brief description (1-2 sentences)
- duration: Prep/cook time (e.g., "15 min", "30 min")
- tags: 2-3 tags like ["quick", "healthy", "vegetarian"]
- details: 3-5 key ingredients or steps${substitutesClause}`,

    workouts: `Generate ${limit} workout/exercise suggestions based on this search: "${query}"

For each result include:
- title: Name of workout or exercise routine
- description: Brief description (1-2 sentences)
- duration: Workout duration (e.g., "20 min", "45 min")
- tags: 2-3 tags like ["strength", "cardio", "beginner"]
- details: 4-6 exercises or key movements included`,

    recovery: `Generate ${limit} recovery/stretching/mobility suggestions based on this search: "${query}"

For each result include:
- title: Name of recovery routine or practice
- description: Brief description (1-2 sentences)
- duration: Duration (e.g., "10 min", "15 min")
- tags: 2-3 tags like ["stretching", "foam rolling", "relaxation"]
- details: 4-6 stretches or recovery techniques included`,

    spiritual: `Generate ${limit} spiritual practice/prayer/devotional suggestions based on this search: "${query}"

For each result include:
- title: Name of practice, prayer, or reflection
- description: Brief description (1-2 sentences)
- duration: Duration if applicable (e.g., "5 min", "15 min")
- tags: 2-3 tags like ["meditation", "prayer", "gratitude", "reflection"]
- details: 3-5 elements or steps of the practice`,

    community: `Generate ${limit} community resources, support services, or volunteer opportunities based on this search: "${query}"

Include a mix of:
- Volunteer opportunities and local events
- Support groups and counseling resources
- Food banks, shelters, and community services
- Crisis hotlines and mental health resources

For each result include:
- title: Name of resource or opportunity
- description: Brief description (1-2 sentences)
- duration: Time commitment if relevant (e.g., "2 hours/week") or null
- tags: 2-3 tags like ["volunteering", "support group", "food bank", "crisis help"]
- details: 3-5 specific details like what's offered, who it helps, or how to get involved`
  };

  const prompt = `${categoryPrompts[category]}

IMPORTANT: Generate helpful, realistic suggestions based on the search query. Make them practical and actionable.

Respond with valid JSON:
{
  "results": [
    {
      "id": "unique-id-1",
      "title": "Result Title",
      "description": "Brief description",
      "duration": "15 min",
      "tags": ["tag1", "tag2"],
      "details": ["detail 1", "detail 2", "detail 3"]
    }
  ],
  "summary": "Brief 1-sentence summary of what was found"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { results: [], summary: "No results found. Try a different search." };
    }

    const parsed = JSON.parse(content);
    const results: SearchResult[] = (parsed.results || []).map((r: any, i: number) => ({
      id: r.id || `result-${i}`,
      title: r.title || "Untitled",
      description: r.description || "",
      duration: r.duration || null,
      tags: Array.isArray(r.tags) ? r.tags : [],
      details: Array.isArray(r.details) ? r.details : [],
      substitutes: r.substitutes || undefined,
      source: "ai-generated" as const,
      category
    }));

    return {
      results,
      summary: parsed.summary || `Found ${results.length} results for "${query}"`
    };
  } catch (error) {
    console.error("Failed to generate contextual search:", error);
    return { results: [], summary: "Search failed. Please try again." };
  }
}

export async function generateIngredientSubstitutes(
  ingredient: string,
  context?: string,
  excludedIngredients: string[] = []
): Promise<{ substitutes: IngredientSubstitute; suggestions: string[] }> {
  const excludeClause = excludedIngredients.length > 0 
    ? `\n\nDo NOT suggest any of these as alternatives: ${excludedIngredients.join(", ")}`
    : "";

  const contextClause = context 
    ? `\nContext: This ingredient is being used in "${context}"`
    : "";

  const prompt = `Generate ingredient substitutes for: "${ingredient}"${contextClause}${excludeClause}

Provide 3-5 practical alternatives that can replace this ingredient in cooking/baking.

For each alternative, include:
- name: The substitute ingredient
- ratio: How much to use compared to original (e.g., "1:1", "use half as much")
- notes: Brief tip on using this substitute

Also provide a brief explanation of why someone might want to substitute this ingredient.

Respond with valid JSON:
{
  "substitute": {
    "ingredient": "${ingredient}",
    "alternatives": [
      { "name": "Alternative 1", "ratio": "1:1", "notes": "Works well in..." }
    ],
    "reason": "Common reasons to substitute include allergies, dietary preferences, or availability"
  },
  "suggestions": ["Quick tip 1", "Quick tip 2"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { 
        substitutes: { ingredient, alternatives: [], reason: "No substitutes found" },
        suggestions: []
      };
    }

    const parsed = JSON.parse(content);
    return {
      substitutes: parsed.substitute || { ingredient, alternatives: [], reason: "" },
      suggestions: parsed.suggestions || []
    };
  } catch (error) {
    console.error("Failed to generate ingredient substitutes:", error);
    return { 
      substitutes: { ingredient, alternatives: [], reason: "Failed to generate substitutes" },
      suggestions: []
    };
  }
}

export type AlternativesDomain = "meals" | "workouts" | "recovery" | "spiritual" | "community";

export interface AlternativeOption {
  name: string;
  ratio?: string;
  duration?: string;
  intensity?: string;
  notes: string;
  tags?: string[];
}

export interface AlternativesResult {
  original: string;
  alternatives: AlternativeOption[];
  reason: string;
}

const DOMAIN_PROMPTS: Record<AlternativesDomain, (item: string, context?: string, constraints?: string[]) => string> = {
  meals: (item, context, constraints) => {
    const constraintClause = constraints?.length ? `\nUser constraints: ${constraints.join(", ")}` : "";
    const contextClause = context ? `\nContext: This ingredient is for "${context}"` : "";
    return `Find cooking/ingredient substitutes for: "${item}"${contextClause}${constraintClause}

For each alternative include:
- name: The substitute ingredient
- ratio: Conversion ratio (e.g., "1:1", "use half")
- notes: Brief cooking tip for using this substitute

Provide 3-5 alternatives.`;
  },
  
  workouts: (item, context, constraints) => {
    const constraintClause = constraints?.length ? `\nUser limitations: ${constraints.join(", ")}` : "";
    const contextClause = context ? `\nContext: Part of "${context}"` : "";
    return `Find exercise alternatives for: "${item}"${contextClause}${constraintClause}

For each alternative include:
- name: The alternative exercise
- duration: Typical duration or reps
- intensity: low/medium/high
- notes: Brief form tip or benefit
- tags: 1-2 muscle groups or categories

Provide 3-5 alternatives that achieve similar results.`;
  },
  
  recovery: (item, context, constraints) => {
    const constraintClause = constraints?.length ? `\nUser constraints: ${constraints.join(", ")}` : "";
    const contextClause = context ? `\nContext: Part of "${context}"` : "";
    return `Find recovery/rest alternatives for: "${item}"${contextClause}${constraintClause}

For each alternative include:
- name: The alternative practice
- duration: Typical duration
- notes: Brief guidance or benefit
- tags: 1-2 categories (stretching, relaxation, etc.)

Provide 3-5 alternatives that provide similar recovery benefits.`;
  },
  
  spiritual: (item, context, constraints) => {
    const constraintClause = constraints?.length ? `\nUser preferences: ${constraints.join(", ")}` : "";
    const contextClause = context ? `\nContext: Part of "${context}"` : "";
    return `Find spiritual practice alternatives for: "${item}"${contextClause}${constraintClause}

For each alternative include:
- name: The alternative practice
- duration: Typical duration
- notes: Brief description of the practice
- tags: 1-2 categories (meditation, prayer, reflection, etc.)

Provide 3-5 alternatives that offer similar spiritual benefits.`;
  },
  
  community: (item, context, constraints) => {
    const constraintClause = constraints?.length ? `\nUser preferences: ${constraints.join(", ")}` : "";
    const contextClause = context ? `\nContext: Part of "${context}"` : "";
    return `Find community activity alternatives for: "${item}"${contextClause}${constraintClause}

For each alternative include:
- name: The alternative activity
- duration: Typical time commitment
- notes: Brief description of the activity
- tags: 1-2 categories (social, service, learning, etc.)

Provide 3-5 alternatives that offer similar connection or community benefits.`;
  }
};

export async function generateDomainAlternatives(
  domain: AlternativesDomain,
  item: string,
  context?: string,
  excludedItems: string[] = [],
  constraints: string[] = []
): Promise<{ alternatives: AlternativesResult; suggestions: string[] }> {
  const excludeClause = excludedItems.length > 0 
    ? `\n\nDo NOT suggest any of these as alternatives: ${excludedItems.join(", ")}`
    : "";

  const basePrompt = DOMAIN_PROMPTS[domain](item, context, constraints);
  
  const prompt = `${basePrompt}${excludeClause}

Also provide 2-3 quick tips related to this ${domain === "meals" ? "ingredient" : "activity"}.

Respond with valid JSON:
{
  "alternatives": {
    "original": "${item}",
    "alternatives": [
      { "name": "Alternative 1", "notes": "Brief tip...", "duration": "optional", "intensity": "optional", "ratio": "optional", "tags": ["optional"] }
    ],
    "reason": "Brief explanation of why someone might want alternatives"
  },
  "suggestions": ["Quick tip 1", "Quick tip 2"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { 
        alternatives: { original: item, alternatives: [], reason: "No alternatives found" },
        suggestions: []
      };
    }

    const parsed = JSON.parse(content);
    return {
      alternatives: parsed.alternatives || { original: item, alternatives: [], reason: "" },
      suggestions: parsed.suggestions || []
    };
  } catch (error) {
    console.error("Failed to generate domain alternatives:", error);
    return { 
      alternatives: { original: item, alternatives: [], reason: "Failed to generate alternatives" },
      suggestions: []
    };
  }
}
