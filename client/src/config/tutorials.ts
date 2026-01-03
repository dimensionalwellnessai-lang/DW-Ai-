export interface TutorialStep {
  targetTestId: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
}

export interface PageTutorial {
  pageId: string;
  pageName: string;
  welcomeMessage?: string;
  steps: TutorialStep[];
}

export const PAGE_TUTORIALS: Record<string, PageTutorial> = {
  chat: {
    pageId: "chat",
    pageName: "Home",
    welcomeMessage: "Welcome to your wellness companion. This is your space to check in.",
    steps: [
      {
        targetTestId: "button-menu",
        title: "Navigation Menu",
        description: "Notice what's available here. Open the menu to explore different areas when you're ready.",
        placement: "right"
      },
      {
        targetTestId: "input-message",
        title: "Share Your Thoughts",
        description: "Type whatever feels present for you. There's no right or wrong here.",
        placement: "top"
      },
      {
        targetTestId: "button-send",
        title: "Send Message",
        description: "When you feel steady, share your message.",
        placement: "left"
      },
      {
        targetTestId: "button-attach",
        title: "Add Context",
        description: "If it helps, attach documents or images that ground what you're working through.",
        placement: "top"
      },
      {
        targetTestId: "button-new-chat",
        title: "Fresh Start",
        description: "Start a new conversation whenever you need a clean slate. A fresh space is always here.",
        placement: "bottom"
      },
      {
        targetTestId: "button-history",
        title: "Conversation History",
        description: "Revisit past conversations to notice patterns over time.",
        placement: "bottom"
      }
    ]
  },
  browse: {
    pageId: "browse",
    pageName: "Browse",
    welcomeMessage: "Explore resources organized by what matters to you.",
    steps: [
      {
        targetTestId: "button-ai-customize",
        title: "Personalized Picks",
        description: "Get recommendations tailored to how you're feeling right now.",
        placement: "bottom"
      },
      {
        targetTestId: "button-category-all",
        title: "Categories",
        description: "Filter by category to find content that resonates with your current focus.",
        placement: "bottom"
      }
    ]
  },
  "meal-prep": {
    pageId: "meal-prep",
    pageName: "Meal Plans",
    welcomeMessage: "Nourishment made simple. Find meals that fit your rhythm.",
    steps: [
      {
        targetTestId: "tab-meal-plans",
        title: "Meal Plans",
        description: "Browse curated meal plans designed for different goals and preferences.",
        placement: "bottom"
      },
      {
        targetTestId: "tab-videos",
        title: "Cooking Videos",
        description: "Watch step-by-step tutorials to build confidence in the kitchen.",
        placement: "bottom"
      },
      {
        targetTestId: "button-set-preferences",
        title: "Your Preferences",
        description: "Set your dietary preferences so recommendations feel right for you.",
        placement: "bottom"
      }
    ]
  },
  astrology: {
    pageId: "astrology",
    pageName: "Astrology",
    welcomeMessage: "Explore the patterns in your chart. Notice what resonates.",
    steps: [
      {
        targetTestId: "button-create-birth-chart",
        title: "Your Birth Chart",
        description: "Enter your birth details to generate a personalized cosmic map.",
        placement: "bottom"
      },
      {
        targetTestId: "tab-placements",
        title: "Planetary Placements",
        description: "Explore where each planet was when you were born and what it might mean.",
        placement: "bottom"
      },
      {
        targetTestId: "tab-aspects",
        title: "Aspects",
        description: "Notice the relationships between planets in your chart.",
        placement: "bottom"
      }
    ]
  },
  workout: {
    pageId: "workout",
    pageName: "Workouts",
    welcomeMessage: "Movement is medicine. Find what feels good in your body.",
    steps: [
      {
        targetTestId: "tabs-workout",
        title: "Workout Types",
        description: "Browse different movement styles based on your energy level.",
        placement: "bottom"
      }
    ]
  },
  challenges: {
    pageId: "challenges",
    pageName: "Challenges",
    welcomeMessage: "Small steps, steady progress. Choose challenges that feel supportive.",
    steps: [
      {
        targetTestId: "tabs-challenges",
        title: "Challenge Categories",
        description: "Explore challenges across different dimensions of wellness.",
        placement: "bottom"
      }
    ]
  },
  meditation: {
    pageId: "meditation",
    pageName: "Meditation",
    welcomeMessage: "A space for stillness. Breathe and settle.",
    steps: [
      {
        targetTestId: "cards-meditation",
        title: "Guided Sessions",
        description: "Choose a meditation that matches where you are right now.",
        placement: "top"
      }
    ]
  },
  journal: {
    pageId: "journal",
    pageName: "Journal",
    welcomeMessage: "Write freely. This space is just for you.",
    steps: [
      {
        targetTestId: "button-new-entry",
        title: "New Entry",
        description: "Start a fresh journal entry whenever you need to process.",
        placement: "left"
      },
      {
        targetTestId: "list-entries",
        title: "Past Entries",
        description: "Revisit previous reflections to notice patterns over time.",
        placement: "top"
      }
    ]
  },
  routines: {
    pageId: "routines",
    pageName: "Routines",
    welcomeMessage: "Build rhythms that support you. Small, steady practices.",
    steps: [
      {
        targetTestId: "tabs-routines",
        title: "Routine Types",
        description: "Explore morning, evening, and custom routines.",
        placement: "bottom"
      }
    ]
  },
  progress: {
    pageId: "progress",
    pageName: "Progress",
    welcomeMessage: "Notice your journey. Progress isn't always linear.",
    steps: [
      {
        targetTestId: "chart-progress",
        title: "Your Trends",
        description: "Observe patterns in your wellness journey over time.",
        placement: "top"
      }
    ]
  },
  profile: {
    pageId: "profile",
    pageName: "Profile",
    welcomeMessage: "Your preferences and settings live here.",
    steps: [
      {
        targetTestId: "section-body-profile",
        title: "Body Profile",
        description: "Update physical details that help personalize your experience.",
        placement: "top"
      },
      {
        targetTestId: "section-dimension-signals",
        title: "Wellness Signals",
        description: "Set preferences that shape how the app supports you.",
        placement: "top"
      }
    ]
  }
};

export function getTutorialForPage(pageId: string): PageTutorial | null {
  return PAGE_TUTORIALS[pageId] || null;
}
