/**
 * Plan templates shared between the client (the "New plan" picker) and the
 * server (which seeds milestones + an opening DW message when one is chosen).
 *
 * Add a template here and it shows up in both places automatically. The
 * `intro` field is what DW says first inside the new plan's chat. Each
 * template ships 3–5 starter milestones the user can edit or delete.
 */

export interface PlanTemplate {
  id: string;
  label: string;
  description: string;
  tags: string[];
  milestones: string[];
  intro: string;
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "custom",
    label: "Blank plan",
    description: "",
    tags: [],
    milestones: [],
    intro: "",
  },
  {
    id: "workshop",
    label: "Workshop",
    description: "Plan a workshop or event end-to-end.",
    tags: ["purpose", "creation"],
    milestones: [
      "Pin down the date, format, and venue",
      "Define who it's for and what they'll leave with",
      "Build the agenda and any materials",
      "Open registration and promote it",
      "Run a dry run the week before",
    ],
    intro:
      "Excited to help you put this workshop together. Let's start with the basics — who's it for, and roughly when are you running it?",
  },
  {
    id: "life-redesign",
    label: "Life redesign",
    description: "Reshape a season of your life.",
    tags: ["identity"],
    milestones: [
      "Name what season you're stepping out of",
      "Picture the version of you on the other side",
      "Pick the 2–3 changes that matter most",
      "Decide what gets dropped to make room",
      "Set a check-in date 30 days out",
    ],
    intro:
      "Big move. Before we get into how, tell me what's prompting this — is something ending, or are you reaching for something new?",
  },
  {
    id: "trip",
    label: "Trip",
    description: "Plan a trip, big or small.",
    tags: ["environment"],
    milestones: [
      "Lock in dates and rough budget",
      "Book transport and lodging",
      "Sketch the day-by-day shape of the trip",
      "Sort logistics — packing list, docs, money",
      "Tell people who need to know you're away",
    ],
    intro:
      "Love a good trip. Where are you headed, and is this more 'recharge' or 'adventure'?",
  },
  {
    id: "project",
    label: "Project",
    description: "Build something concrete.",
    tags: ["creation"],
    milestones: [
      "Write a one-line description of what 'done' looks like",
      "Break the work into 3–5 visible chunks",
      "Pick the first chunk and start it this week",
      "Set a weekly check-in to keep it moving",
      "Decide who (if anyone) you're shipping it to",
    ],
    intro:
      "Let's get this off the ground. In one sentence — what is it, and why does it matter to you right now?",
  },
  {
    id: "creative",
    label: "Creative work",
    description: "A piece of writing, art, or making.",
    tags: ["mind", "creation"],
    milestones: [
      "Capture the spark — what's the seed of this piece?",
      "Set the rough scope (length, medium, scale)",
      "Block daily or weekly time to work on it",
      "Get a first messy draft done",
      "Share it with one trusted person for feedback",
    ],
    intro:
      "Glad you're making something. What's the spark behind this — what made it worth starting?",
  },
];

export function getPlanTemplate(id: string | null | undefined): PlanTemplate | undefined {
  if (!id) return undefined;
  return PLAN_TEMPLATES.find((t) => t.id === id);
}
