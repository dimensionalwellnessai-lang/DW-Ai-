/**
 * Dimension-specific meaningful questions for Life Blueprint
 * 
 * Each dimension has 3-5 thoughtful questions designed to help users:
 * - Understand the dimension deeply
 * - Reflect on their role and accountability
 * - Recognize reciprocal relationships with their environment
 * - Get actionable insights for managing that dimension
 */

export interface DimensionQuestion {
  question: string;
  subtext: string;
}

export interface DimensionQuestionSet {
  dimension: string;
  questions: DimensionQuestion[];
}

export const DIMENSION_QUESTIONS: DimensionQuestionSet[] = [
  {
    dimension: "Social",
    questions: [
      {
        question: "How do you want to show up for the people you care about?",
        subtext: "Think about your presence, not their reactions - you can't control how others feel, but you can control your actions"
      },
      {
        question: "What patterns in your relationships would you like to change?",
        subtext: "Consider both how you respond to others and situations that trigger you"
      },
      {
        question: "How do the people around you affect your energy and wellbeing?",
        subtext: "Your environment shapes you just as you shape it"
      },
      {
        question: "What does accountability in relationships mean to you?",
        subtext: "Being responsible for your actions, words, and their impact"
      },
      {
        question: "What boundaries do you need to protect your relationships AND yourself?",
        subtext: "Healthy boundaries help relationships thrive"
      }
    ]
  },
  {
    dimension: "Environmental",
    questions: [
      {
        question: "How does your current living space make you feel?",
        subtext: "Your environment affects your mood, energy, and behavior more than you might realize"
      },
      {
        question: "What changes to your environment would support your wellbeing?",
        subtext: "Small changes can have big impacts - lighting, organization, plants, sounds"
      },
      {
        question: "How do you want to affect the spaces you're in?",
        subtext: "You shape your environment just as it shapes you"
      },
      {
        question: "What environmental triggers negatively affect you?",
        subtext: "Clutter, noise, certain spaces - awareness is the first step"
      }
    ]
  },
  {
    dimension: "Physical",
    questions: [
      {
        question: "How does your body communicate with you?",
        subtext: "Pain, energy, tension - your body is always giving you information"
      },
      {
        question: "What movement makes you feel most alive?",
        subtext: "Not what you 'should' do, but what genuinely energizes you"
      },
      {
        question: "How does your physical state affect your mental state?",
        subtext: "The body-mind connection works both ways"
      },
      {
        question: "What does rest look like for you?",
        subtext: "Rest isn't just sleep - it's recovery, stillness, and restoration"
      }
    ]
  },
  {
    dimension: "Emotional",
    questions: [
      {
        question: "How do you typically process difficult emotions?",
        subtext: "There's no right way - just understanding your patterns"
      },
      {
        question: "What triggers strong emotional responses for you?",
        subtext: "Awareness of triggers helps you respond rather than react"
      },
      {
        question: "How do you want to feel on a daily basis?",
        subtext: "Your emotional baseline - not constant happiness, but a sustainable state"
      },
      {
        question: "Who or what helps you process emotions?",
        subtext: "People, activities, practices that support emotional processing"
      }
    ]
  },
  {
    dimension: "Mental",
    questions: [
      {
        question: "What stimulates your mind in a positive way?",
        subtext: "Learning, creativity, problem-solving, conversations"
      },
      {
        question: "When does your mind feel cluttered or overwhelmed?",
        subtext: "Understanding patterns helps you manage mental load"
      },
      {
        question: "How do you want to grow intellectually?",
        subtext: "Skills, knowledge, perspectives you want to develop"
      },
      {
        question: "What mental habits serve you? Which don't?",
        subtext: "Thought patterns, self-talk, rumination"
      }
    ]
  },
  {
    dimension: "Spiritual",
    questions: [
      {
        question: "What gives your life meaning and purpose?",
        subtext: "This doesn't have to be religious - it's about what matters deeply to you"
      },
      {
        question: "When do you feel most connected to something greater than yourself?",
        subtext: "Nature, community, creativity, meditation, service"
      },
      {
        question: "What practices help you feel grounded and centered?",
        subtext: "Rituals, routines, or moments that bring you back to yourself"
      },
      {
        question: "How do you want to contribute to the world?",
        subtext: "Your impact, however big or small"
      }
    ]
  },
  {
    dimension: "Financial",
    questions: [
      {
        question: "What does financial security mean to you?",
        subtext: "Not a number - a feeling, a state of being"
      },
      {
        question: "How does money stress affect other areas of your life?",
        subtext: "Financial health connects to everything else"
      },
      {
        question: "What financial habits support your wellbeing?",
        subtext: "Beyond budgeting - your relationship with money"
      },
      {
        question: "What would you do differently if money wasn't a worry?",
        subtext: "Understanding your values separate from financial constraints"
      }
    ]
  },
  {
    dimension: "Occupational",
    questions: [
      {
        question: "What does meaningful work look like for you?",
        subtext: "Not just your job - how you spend your productive energy"
      },
      {
        question: "How does your work affect your other life dimensions?",
        subtext: "Energy, relationships, health, time"
      },
      {
        question: "What would better work-life integration look like?",
        subtext: "Not balance (which implies conflict) but integration"
      },
      {
        question: "What skills or experiences do you want from your work?",
        subtext: "Growth, contribution, connection, mastery"
      }
    ]
  }
];

/**
 * Get questions for a specific dimension
 * @param dimensionName - The name of the dimension (e.g., "Social", "Environmental")
 * @returns Array of questions for that dimension, or empty array if not found
 */
export function getQuestionsForDimension(dimensionName: string): DimensionQuestion[] {
  const dimensionSet = DIMENSION_QUESTIONS.find(
    d => d.dimension.toLowerCase() === dimensionName.toLowerCase()
  );
  return dimensionSet?.questions || [];
}

/**
 * Get all dimension names that have questions
 * @returns Array of dimension names
 */
export function getDimensionNames(): string[] {
  return DIMENSION_QUESTIONS.map(d => d.dimension);
}
