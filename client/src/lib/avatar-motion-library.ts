// Avatar Motion Library
// Defines ~30 foundational movements for the Babylon.js 3D avatar demo system.
// Each motion entry drives the procedural rig and the contextual camera.

export type MotionCategory =
  | 'strength-push'
  | 'strength-pull'
  | 'strength-lower'
  | 'core'
  | 'cardio'
  | 'stretch'
  | 'yoga'
  | 'breathwork';

/** Which camera framing to use during this motion */
export type CameraProfile = 'full-body' | 'upper-body' | 'lower-body' | 'close-up';

export interface MotionDefinition {
  /** Must match an ExerciseAnimationData.id (or a standalone motion id) */
  id: string;
  name: string;
  category: MotionCategory;
  /** Babylon.js animation clip name (embedded in GLB or built procedurally) */
  clipName: string;
  /** Animation duration in seconds for one cycle */
  cycleDurationSec: number;
  cameraProfile: CameraProfile;
  /** YouTube search query used as fallback when no animation available */
  youtubeSearch: string;
  /** Optional direct YouTube video id for the fallback */
  youtubeVideoId?: string;
  /** Tags used for closest-match scoring */
  tags: string[];
}

// ---------------------------------------------------------------------------
// Motion library – ~30 foundational movements
// ---------------------------------------------------------------------------
export const MOTION_LIBRARY: MotionDefinition[] = [
  // ---- STRENGTH – PUSH ----
  {
    id: 'push-up',
    name: 'Push-Up',
    category: 'strength-push',
    clipName: 'push_up',
    cycleDurationSec: 2,
    cameraProfile: 'full-body',
    youtubeSearch: 'perfect push-up form tutorial',
    youtubeVideoId: 'IODxDxX7oi4',
    tags: ['push', 'chest', 'triceps', 'shoulders', 'bodyweight', 'upper'],
  },
  {
    id: 'shoulder-press',
    name: 'Shoulder Press',
    category: 'strength-push',
    clipName: 'shoulder_press',
    cycleDurationSec: 2.5,
    cameraProfile: 'upper-body',
    youtubeSearch: 'dumbbell shoulder press form',
    tags: ['push', 'shoulders', 'triceps', 'upper', 'dumbbells'],
  },
  {
    id: 'band-chest-press',
    name: 'Resistance Band Chest Press',
    category: 'strength-push',
    clipName: 'band_chest_press',
    cycleDurationSec: 2.5,
    cameraProfile: 'upper-body',
    youtubeSearch: 'resistance band chest press tutorial',
    tags: ['push', 'chest', 'shoulders', 'triceps', 'bands', 'upper'],
  },
  {
    id: 'tricep-dip',
    name: 'Tricep Dip',
    category: 'strength-push',
    clipName: 'tricep_dip',
    cycleDurationSec: 2,
    cameraProfile: 'upper-body',
    youtubeSearch: 'tricep dip form tutorial bodyweight',
    tags: ['push', 'triceps', 'chest', 'bodyweight', 'upper'],
  },
  // ---- STRENGTH – PULL ----
  {
    id: 'pull-up',
    name: 'Pull-Up',
    category: 'strength-pull',
    clipName: 'pull_up',
    cycleDurationSec: 3,
    cameraProfile: 'full-body',
    youtubeSearch: 'pull-up form tutorial beginners',
    youtubeVideoId: 'eGo4IYlbE5g',
    tags: ['pull', 'back', 'biceps', 'upper', 'bar'],
  },
  {
    id: 'resistance-band-row',
    name: 'Resistance Band Row',
    category: 'strength-pull',
    clipName: 'band_row',
    cycleDurationSec: 2.5,
    cameraProfile: 'upper-body',
    youtubeSearch: 'resistance band row back exercise',
    tags: ['pull', 'back', 'biceps', 'bands', 'upper'],
  },
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell Bicep Curl',
    category: 'strength-pull',
    clipName: 'dumbbell_curl',
    cycleDurationSec: 2,
    cameraProfile: 'upper-body',
    youtubeSearch: 'dumbbell bicep curl perfect form',
    tags: ['pull', 'biceps', 'forearms', 'dumbbells', 'upper'],
  },
  {
    id: 'band-lateral-raise',
    name: 'Band Lateral Raise',
    category: 'strength-pull',
    clipName: 'band_lateral_raise',
    cycleDurationSec: 2.5,
    cameraProfile: 'upper-body',
    youtubeSearch: 'resistance band lateral raise shoulders',
    tags: ['pull', 'shoulders', 'bands', 'upper'],
  },
  // ---- STRENGTH – LOWER ----
  {
    id: 'squat',
    name: 'Bodyweight Squat',
    category: 'strength-lower',
    clipName: 'squat',
    cycleDurationSec: 2.5,
    cameraProfile: 'full-body',
    youtubeSearch: 'perfect squat form tutorial',
    youtubeVideoId: 'gsNoPYwWXeM',
    tags: ['lower', 'quads', 'glutes', 'hamstrings', 'bodyweight'],
  },
  {
    id: 'lunge',
    name: 'Forward Lunge',
    category: 'strength-lower',
    clipName: 'lunge',
    cycleDurationSec: 2.5,
    cameraProfile: 'full-body',
    youtubeSearch: 'forward lunge form tutorial',
    tags: ['lower', 'quads', 'glutes', 'hamstrings', 'bodyweight'],
  },
  {
    id: 'deadlift',
    name: 'Dumbbell Deadlift',
    category: 'strength-lower',
    clipName: 'deadlift',
    cycleDurationSec: 3,
    cameraProfile: 'full-body',
    youtubeSearch: 'dumbbell deadlift perfect form',
    tags: ['lower', 'hamstrings', 'glutes', 'back', 'dumbbells', 'hinge'],
  },
  {
    id: 'calf-raise',
    name: 'Calf Raise',
    category: 'strength-lower',
    clipName: 'calf_raise',
    cycleDurationSec: 2,
    cameraProfile: 'lower-body',
    youtubeSearch: 'standing calf raise form',
    tags: ['lower', 'calves', 'bodyweight'],
  },
  {
    id: 'band-squat',
    name: 'Resistance Band Squat',
    category: 'strength-lower',
    clipName: 'band_squat',
    cycleDurationSec: 2.5,
    cameraProfile: 'full-body',
    youtubeSearch: 'resistance band squat form',
    tags: ['lower', 'quads', 'glutes', 'hamstrings', 'bands'],
  },
  {
    id: 'glute-bridge',
    name: 'Glute Bridge',
    category: 'strength-lower',
    clipName: 'glute_bridge',
    cycleDurationSec: 2.5,
    cameraProfile: 'full-body',
    youtubeSearch: 'glute bridge exercise form',
    tags: ['lower', 'glutes', 'hamstrings', 'bodyweight'],
  },
  {
    id: 'step-up',
    name: 'Step-Up',
    category: 'strength-lower',
    clipName: 'step_up',
    cycleDurationSec: 2,
    cameraProfile: 'full-body',
    youtubeSearch: 'step-up exercise form legs',
    tags: ['lower', 'quads', 'glutes', 'bodyweight'],
  },
  // ---- CORE ----
  {
    id: 'plank',
    name: 'Plank Hold',
    category: 'core',
    clipName: 'plank',
    cycleDurationSec: 1,
    cameraProfile: 'full-body',
    youtubeSearch: 'perfect plank form core exercise',
    tags: ['core', 'abs', 'shoulders', 'bodyweight'],
  },
  {
    id: 'crunch',
    name: 'Abdominal Crunch',
    category: 'core',
    clipName: 'crunch',
    cycleDurationSec: 2,
    cameraProfile: 'upper-body',
    youtubeSearch: 'abdominal crunch proper form',
    tags: ['core', 'abs', 'bodyweight'],
  },
  {
    id: 'russian-twist',
    name: 'Russian Twist',
    category: 'core',
    clipName: 'russian_twist',
    cycleDurationSec: 2.5,
    cameraProfile: 'upper-body',
    youtubeSearch: 'russian twist core exercise form',
    tags: ['core', 'obliques', 'abs', 'bodyweight'],
  },
  {
    id: 'leg-raise',
    name: 'Leg Raise',
    category: 'core',
    clipName: 'leg_raise',
    cycleDurationSec: 3,
    cameraProfile: 'full-body',
    youtubeSearch: 'lying leg raise core abs exercise',
    tags: ['core', 'lower abs', 'hip flexors', 'bodyweight'],
  },
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    category: 'core',
    clipName: 'dead_bug',
    cycleDurationSec: 4,
    cameraProfile: 'full-body',
    youtubeSearch: 'dead bug exercise core stability',
    tags: ['core', 'abs', 'stability', 'bodyweight'],
  },
  // ---- CARDIO ----
  {
    id: 'jumping-jack',
    name: 'Jumping Jacks',
    category: 'cardio',
    clipName: 'jumping_jack',
    cycleDurationSec: 1,
    cameraProfile: 'full-body',
    youtubeSearch: 'jumping jacks warm-up exercise',
    tags: ['cardio', 'full-body', 'bodyweight'],
  },
  {
    id: 'high-knees',
    name: 'High Knees',
    category: 'cardio',
    clipName: 'high_knees',
    cycleDurationSec: 1,
    cameraProfile: 'full-body',
    youtubeSearch: 'high knees exercise cardio form',
    tags: ['cardio', 'quads', 'hip flexors', 'core', 'bodyweight'],
  },
  {
    id: 'burpee',
    name: 'Burpee',
    category: 'cardio',
    clipName: 'burpee',
    cycleDurationSec: 3,
    cameraProfile: 'full-body',
    youtubeSearch: 'burpee exercise form full body',
    tags: ['cardio', 'full-body', 'bodyweight', 'advanced'],
  },
  {
    id: 'mountain-climber',
    name: 'Mountain Climbers',
    category: 'cardio',
    clipName: 'mountain_climber',
    cycleDurationSec: 1.5,
    cameraProfile: 'full-body',
    youtubeSearch: 'mountain climbers exercise form',
    tags: ['cardio', 'core', 'shoulders', 'legs', 'bodyweight'],
  },
  // ---- STRETCH ----
  {
    id: 'standing-quad-stretch',
    name: 'Standing Quad Stretch',
    category: 'stretch',
    clipName: 'standing_quad_stretch',
    cycleDurationSec: 5,
    cameraProfile: 'full-body',
    youtubeSearch: 'standing quad stretch mobility',
    tags: ['stretch', 'quads', 'flexibility', 'bodyweight'],
  },
  {
    id: 'hamstring-stretch',
    name: 'Seated Hamstring Stretch',
    category: 'stretch',
    clipName: 'hamstring_stretch',
    cycleDurationSec: 5,
    cameraProfile: 'full-body',
    youtubeSearch: 'hamstring stretch flexibility tutorial',
    tags: ['stretch', 'hamstrings', 'flexibility', 'bodyweight'],
  },
  {
    id: 'shoulder-stretch',
    name: 'Cross-Body Shoulder Stretch',
    category: 'stretch',
    clipName: 'shoulder_stretch',
    cycleDurationSec: 5,
    cameraProfile: 'upper-body',
    youtubeSearch: 'shoulder stretch flexibility relief',
    tags: ['stretch', 'shoulders', 'flexibility', 'bodyweight'],
  },
  // ---- YOGA ----
  {
    id: 'downward-dog',
    name: 'Downward Dog',
    category: 'yoga',
    clipName: 'downward_dog',
    cycleDurationSec: 6,
    cameraProfile: 'full-body',
    youtubeSearch: 'downward dog yoga pose tutorial',
    youtubeVideoId: 'EC7RGJ975iM',
    tags: ['yoga', 'stretch', 'full-body', 'hamstrings', 'shoulders'],
  },
  {
    id: 'warrior-one',
    name: 'Warrior I',
    category: 'yoga',
    clipName: 'warrior_one',
    cycleDurationSec: 6,
    cameraProfile: 'full-body',
    youtubeSearch: 'warrior 1 pose yoga tutorial beginners',
    tags: ['yoga', 'stretch', 'lower', 'balance', 'bodyweight'],
  },
  {
    id: 'child-pose',
    name: "Child's Pose",
    category: 'yoga',
    clipName: 'child_pose',
    cycleDurationSec: 8,
    cameraProfile: 'full-body',
    youtubeSearch: "child's pose yoga rest pose",
    tags: ['yoga', 'stretch', 'back', 'hips', 'relaxation'],
  },
  // ---- BREATHWORK ----
  {
    id: 'box-breathing',
    name: 'Box Breathing (4-4-4-4)',
    category: 'breathwork',
    clipName: 'box_breathing',
    cycleDurationSec: 16,
    cameraProfile: 'close-up',
    youtubeSearch: 'box breathing technique 4x4 tutorial',
    tags: ['breathwork', 'relaxation', 'stress', 'nervous-system'],
  },
  {
    id: 'belly-breathing',
    name: 'Diaphragmatic Breathing',
    category: 'breathwork',
    clipName: 'belly_breathing',
    cycleDurationSec: 8,
    cameraProfile: 'close-up',
    youtubeSearch: 'diaphragmatic belly breathing technique',
    tags: ['breathwork', 'relaxation', 'stress', 'nervous-system'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up a motion by its id */
export function getMotionById(id: string): MotionDefinition | undefined {
  return MOTION_LIBRARY.find((m) => m.id === id);
}

/**
 * Find the closest-matching motion for an unknown exercise id.
 * Scoring: exact id match (100) > name substring (80) > tag overlap (count × 10).
 * Returns the best match and a numeric confidence score 0-100.
 */
export function findClosestMotion(exerciseId: string): {
  motion: MotionDefinition;
  score: number;
  isFallback: boolean;
} {
  const lower = exerciseId.toLowerCase().replace(/[-_\s]+/g, ' ');

  let best = MOTION_LIBRARY[0];
  let bestScore = 0;

  for (const motion of MOTION_LIBRARY) {
    let score = 0;

    // Exact id match
    if (motion.id === exerciseId) {
      return { motion, score: 100, isFallback: false };
    }

    // Name substring match
    const motionName = motion.name.toLowerCase();
    if (motionName.includes(lower) || lower.includes(motionName)) {
      score = Math.max(score, 80);
    }

    // Tag overlap
    const words = lower.split(' ');
    for (const tag of motion.tags) {
      if (words.some((w) => tag.includes(w) || w.includes(tag))) {
        score += 10;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = motion;
    }
  }

  return { motion: best, score: Math.min(bestScore, 99), isFallback: true };
}

/**
 * Report a motion fallback for analytics / debugging.
 * In production this would POST to an analytics endpoint; here we log to console.
 */
export function reportFallback(
  requestedId: string,
  matchedMotion: MotionDefinition,
  score: number,
): void {
  console.warn(
    `[AvatarMotion] Unknown exercise "${requestedId}" – using closest match "${matchedMotion.id}" (score ${score})`,
  );
}
