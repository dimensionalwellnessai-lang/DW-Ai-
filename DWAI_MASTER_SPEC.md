# DWAI — Master Spec (Structured + Flexible)
Owner: Reil Brown
Product Type: Personal Wellness Assistant (Hybrid Tools + AI)
Default first-time flow: D (Mood → Assistant)
Spec Level: Structured but flexible (buildable now, expandable later)

## 0) Product Identity
DWAI is a personal assistant for wellness + life organization.
It helps users create routines, schedule events, build meal plans, and track goals across the dimensions of wellness.

DWAI is NOT a chat-only app.
DWAI is a tools-first system where AI connects everything.

Non-negotiables:
- Tools work without AI
- AI is a separate place (Assistant tab)
- Anything "finalized" in AI becomes a real object saved into the right tool
- Projects organize chats + plans + objects

## 1) Navigation (Hybrid Model C)
Home is a tool dashboard (categories).
Assistant is a dedicated chat experience (like ChatGPT).
Projects organize everything.
Me contains profile/preferences/legal.

Required main screens:
1) Home (Tools)
2) Assistant (Chat + Voice)
3) Projects
4) Me (Settings)

Home tool categories (modules):
- Calendar
- Tasks & Goals
- Routines
- Meals
- Meditation
- Workouts
- Insights

Dimensions of wellness are TAGS (filters), not separate tools:
Physical, Emotional, Social, Spiritual, Intellectual, Occupational, Environmental, Financial

## 2) First-Time Experience (Flow D)
Default start = Mood check-in, then Assistant.

Step D1 Mood Check-in (fast):
Prompt: "How are you arriving right now?"
Defaults: Calm / Scattered / Tired (expandable)
User can skip.

Step D2 Assistant starts empty but context-aware:
It opens as an empty chat input.
It may show one optional starter suggestion (not forced):
- "Plan my day"
- "Build a routine"
- "Make a meal plan"
- "Just ground me"

DWAI accelerates learning with micro-questions, not long onboarding.
If the user asks for something that requires preferences (meals, workouts, schedule), ask only what's missing.

## 3) Core Objects (Data Model Concept)
All tools and AI revolve around real objects.

### 3.1 UserProfile
- wake_time, sleep_time (optional)
- work/school schedule blocks (optional)
- diet restrictions + allergies (multi-select)
- calorie/macros preference (optional)
- workout preference: home/gym + equipment + limitations (optional)
- reminder preference: none/light/normal
- preferred pace: gentle/steady/focused

### 3.2 Project (Context container)
A Project is a life focus area (e.g., "Body Recomp", "Grief Support", "Morning Structure").
A Project contains:
- linked dimensions (tags)
- conversations (chat history)
- goals/tasks
- routines
- calendar events
- meals/meditations/workouts references

### 3.3 Task
- title
- status (todo/doing/done)
- due_date (optional)
- scheduled_start/end (optional)
- dimension_tags (1+)
- linked_project_id (optional)
- linked_goal_id (optional)
- linked_routine_id (optional)

### 3.4 CalendarEvent
- title
- start/end time
- type (event | task-block | routine-session | meal-prep)
- dimension_tags (1+)
- linked_tasks (optional)
- linked_project_id (optional)
- linked_routine_id (optional)

### 3.5 Goal
- title
- target_date (optional)
- dimension_tags (1+)
- linked_project_id (optional)
- tasks (0+)

### 3.6 Routine
Signature feature: minute-by-minute steps.
- name
- dimension_tags (1+)
- steps[]: {title, instruction, duration_seconds}
- mode: guided OR instructions-only
- linked_project_id (optional)

### 3.7 Meal + MealPlan
Meal:
- name, tags, restrictions supported, calories/macros, prep time, link/recipe
MealPlan:
- date range (daily/weekly)
- meals assigned per day/slot
- grocery list (built-in checklist + export)

### 3.8 MeditationItem
- title
- mood tags + intention tags
- duration
- style (guided | instructions-only)
- link (for now)

### 3.9 WorkoutItem / WorkoutPlan
- workout library entries
- plan builder
- optional player mode (timer/sets) OR links (user preference)

## 4) Tools: Required Behavior

### 4.1 Calendar (Real calendar tool)
Must support:
- Day / Week / Month views
- Create/edit events
- Recurring events (routines)
- Two-way Google Calendar sync (phase 2; stub now if needed)

Task ↔ Calendar two-way linking:
- Task can be scheduled → shows on calendar as a task-block
- Drag task to calendar sets time
- Calendar event can include tasks checklist
- Checking task updates everywhere

### 4.2 Tasks & Goals
- Goals contain tasks
- Tasks can exist without goals
- Tasks can be scheduled onto calendar
- Filter by dimension tags + project

### 4.3 Routines (Minute-by-minute)
- Create routines with steps + durations
- Routine player:
  Start / Pause / Next / Back / Skip
- Schedule routine sessions to calendar
- Completion logging (for Insights)

### 4.4 Meals
- Meal library with filters: ALL restrictions + allergies
- Always show calories + macros (user preference = YES)
- Meal plan builder (daily/weekly)
- Grocery list: built-in checklist + export option

### 4.5 Meditation (Netflix-style browsing)
- Browse/search by:
  mood categories (include grief)
  intention categories (include manifestation)
  duration
  style (guided vs instructions)
- Items are links for now
- Can schedule to calendar
- Can save to project
- Can add into routines as steps/links

### 4.6 Workouts
- Workout library + plan builder
- Supports user preference/ability (home/gym, equipment, limitations)
- Player mode OR links (user preference)
- Schedule sessions to calendar
- Save plan to project

### 4.7 Insights (Patterns, not scoring)
Insights should:
- Summarize patterns narratively (no shame)
- Show dimension coverage visually (not "grades")
- Use mood + calendar load + routine completion
- Suggest small adjustments

## 5) Assistant (Personal assistant like ChatGPT)
Assistant is its own screen with:
- Empty chat box by default
- Voice input option (phase 2)
- History drawer (view previous chats)
- Create project button
- Chats can be associated with projects
- Ability to start new chat

AI roles:
- Life coach tone (supportive, calm)
- Scheduling helper
- Planner across tools
- Pattern observer
- Draft creator for routines, meal plans, and schedules

Core rule: Chat → Objects
If user finalizes something, AI must create objects:
- routine
- calendar event(s)
- tasks
- meal plan
- meditation list
- project

Auto-create is ON.
After creation show a Review summary:
"Created 2 events + 1 routine + 5 tasks. Undo / Edit."

Assistant action bar under responses:
[Create Routine] [Schedule Event] [Make Meal Plan] [Add Tasks] [Save to Project]

## 6) Projects
Projects solve "everything is one conversation."
Each project has:
- Overview
- Linked tools (calendar items, tasks, routines, meal plans, meditations, workouts)
- Project chat history

Flow:
- When AI creates a plan, it asks:
  "Save to an existing project or create a new one?"
Default: create new project when unclear.

## 7) Accelerated "Get to know me"
Micro-onboarding:
Ask questions only when needed, and store in UserProfile:
- Meal plan request → restrictions + calorie target
- Workout plan request → ability/equipment + schedule
- Weekly planning request → work/school blocks + preferred pace

Optional "Body & Goals Assessment" (phase 2):
Start with questionnaire first; photo-based analysis later with explicit consent and no body-type labeling.

## 8) Legal / Safety
Must include:
- Privacy Policy
- Terms of Use
- Disclaimer:
"DWAI provides wellness support and self-reflection tools. It is not medical or therapeutic treatment."

WRAP-inspired planning:
Do NOT use WRAP name/terms/structure.
Call it "Wellness Blueprint" with original wording.

## 9) Build Phases
Phase 1 (MVP quality):
- Home tools navigation
- Assistant chat screen + history drawer (basic)
- Projects container (basic)
- Calendar: day/week/month basic + create/edit
- Tasks scheduling to calendar
- Routines create + player
- Meals: basic library + filters + simple plan + grocery list
- Meditation: Netflix-style browsing + scheduling links
- Workouts: library + plan stubs + scheduling
- Insights: simple narrative summaries

Phase 2:
- Two-way Google Calendar sync
- Voice input + transcription
- Deeper pattern engine
- Body assessment (questionnaire first)
- Better content libraries

End of master spec.
