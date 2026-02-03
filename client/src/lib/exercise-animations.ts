// Exercise Animation Data Library
// Provides structured data for exercise animations

export interface ExerciseAnimationData {
  id: string;
  name: string;
  category: 'upper' | 'lower' | 'core' | 'cardio' | 'full-body';
  equipment: string[]; // e.g., ['resistance-bands', 'bodyweight']
  muscleGroups: string[];
  animationKeyframes: string; // CSS keyframes reference
  formTips: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Exercise animation data
export const EXERCISE_ANIMATIONS: Record<string, ExerciseAnimationData> = {
  // UPPER BODY EXERCISES
  'push-up': {
    id: 'push-up',
    name: 'Push-Up',
    category: 'upper',
    equipment: ['bodyweight'],
    muscleGroups: ['chest', 'shoulders', 'triceps', 'core'],
    animationKeyframes: 'pushUpAnimation',
    formTips: [
      'Keep your body in a straight line',
      'Lower until chest nearly touches the ground',
      'Push through your palms, not your shoulders',
      'Keep core engaged throughout'
    ],
    difficulty: 'beginner'
  },
  'dumbbell-curl': {
    id: 'dumbbell-curl',
    name: 'Dumbbell Bicep Curl',
    category: 'upper',
    equipment: ['dumbbells'],
    muscleGroups: ['biceps', 'forearms'],
    animationKeyframes: 'dumbbellCurlAnimation',
    formTips: [
      'Keep elbows close to your sides',
      'Control the weight on the way down',
      'Don\'t swing or use momentum',
      'Squeeze at the top of the movement'
    ],
    difficulty: 'beginner'
  },
  'resistance-band-row': {
    id: 'resistance-band-row',
    name: 'Resistance Band Row',
    category: 'upper',
    equipment: ['resistance-bands'],
    muscleGroups: ['back', 'biceps', 'shoulders'],
    animationKeyframes: 'resistanceBandRowAnimation',
    formTips: [
      'Keep your back straight',
      'Pull elbows back, not out to the sides',
      'Squeeze shoulder blades together',
      'Control the return to start position'
    ],
    difficulty: 'beginner'
  },
  'pull-up': {
    id: 'pull-up',
    name: 'Pull-Up',
    category: 'upper',
    equipment: ['pull-up-bar'],
    muscleGroups: ['back', 'biceps', 'shoulders'],
    animationKeyframes: 'pullUpAnimation',
    formTips: [
      'Start from a dead hang',
      'Pull your chest to the bar',
      'Keep your core tight',
      'Lower with control'
    ],
    difficulty: 'advanced'
  },
  'shoulder-press': {
    id: 'shoulder-press',
    name: 'Dumbbell Shoulder Press',
    category: 'upper',
    equipment: ['dumbbells'],
    muscleGroups: ['shoulders', 'triceps', 'core'],
    animationKeyframes: 'shoulderPressAnimation',
    formTips: [
      'Press weights directly overhead',
      'Keep core engaged for stability',
      'Don\'t arch your lower back',
      'Control the descent'
    ],
    difficulty: 'intermediate'
  },
  
  // LOWER BODY EXERCISES
  'squat': {
    id: 'squat',
    name: 'Bodyweight Squat',
    category: 'lower',
    equipment: ['bodyweight'],
    muscleGroups: ['quads', 'glutes', 'hamstrings', 'core'],
    animationKeyframes: 'squatAnimation',
    formTips: [
      'Keep feet shoulder-width apart',
      'Lower until thighs are parallel to ground',
      'Keep knees in line with toes',
      'Drive through your heels to stand'
    ],
    difficulty: 'beginner'
  },
  'lunge': {
    id: 'lunge',
    name: 'Forward Lunge',
    category: 'lower',
    equipment: ['bodyweight'],
    muscleGroups: ['quads', 'glutes', 'hamstrings'],
    animationKeyframes: 'lungeAnimation',
    formTips: [
      'Step forward with one leg',
      'Lower until both knees are at 90 degrees',
      'Keep front knee behind toes',
      'Push back to starting position'
    ],
    difficulty: 'beginner'
  },
  'deadlift': {
    id: 'deadlift',
    name: 'Dumbbell Deadlift',
    category: 'lower',
    equipment: ['dumbbells'],
    muscleGroups: ['hamstrings', 'glutes', 'back', 'core'],
    animationKeyframes: 'deadliftAnimation',
    formTips: [
      'Keep back straight and chest up',
      'Hinge at the hips, not the waist',
      'Lower weights along your legs',
      'Drive through heels to stand'
    ],
    difficulty: 'intermediate'
  },
  'calf-raise': {
    id: 'calf-raise',
    name: 'Calf Raise',
    category: 'lower',
    equipment: ['bodyweight'],
    muscleGroups: ['calves'],
    animationKeyframes: 'calfRaiseAnimation',
    formTips: [
      'Rise up on the balls of your feet',
      'Hold at the top for a second',
      'Lower with control',
      'Keep legs straight'
    ],
    difficulty: 'beginner'
  },
  
  // CORE EXERCISES
  'plank': {
    id: 'plank',
    name: 'Plank Hold',
    category: 'core',
    equipment: ['bodyweight'],
    muscleGroups: ['core', 'shoulders', 'back'],
    animationKeyframes: 'plankAnimation',
    formTips: [
      'Keep body in a straight line',
      'Don\'t let hips sag or pike up',
      'Engage your core and glutes',
      'Breathe steadily'
    ],
    difficulty: 'beginner'
  },
  'crunch': {
    id: 'crunch',
    name: 'Abdominal Crunch',
    category: 'core',
    equipment: ['bodyweight'],
    muscleGroups: ['abs'],
    animationKeyframes: 'crunchAnimation',
    formTips: [
      'Keep hands behind head, not pulling on neck',
      'Lift shoulders off the ground',
      'Exhale as you crunch up',
      'Lower with control'
    ],
    difficulty: 'beginner'
  },
  'russian-twist': {
    id: 'russian-twist',
    name: 'Russian Twist',
    category: 'core',
    equipment: ['bodyweight'],
    muscleGroups: ['obliques', 'abs'],
    animationKeyframes: 'russianTwistAnimation',
    formTips: [
      'Sit with knees bent, feet off ground',
      'Rotate torso side to side',
      'Keep core engaged',
      'Move with control, not momentum'
    ],
    difficulty: 'intermediate'
  },
  'leg-raise': {
    id: 'leg-raise',
    name: 'Leg Raise',
    category: 'core',
    equipment: ['bodyweight'],
    muscleGroups: ['lower abs', 'hip flexors'],
    animationKeyframes: 'legRaiseAnimation',
    formTips: [
      'Lie flat on your back',
      'Keep legs straight as you lift',
      'Lower with control, don\'t drop',
      'Keep lower back pressed to floor'
    ],
    difficulty: 'intermediate'
  },
  
  // CARDIO EXERCISES
  'jumping-jack': {
    id: 'jumping-jack',
    name: 'Jumping Jacks',
    category: 'cardio',
    equipment: ['bodyweight'],
    muscleGroups: ['full-body'],
    animationKeyframes: 'jumpingJackAnimation',
    formTips: [
      'Jump feet out while raising arms',
      'Land softly on the balls of your feet',
      'Keep core engaged',
      'Maintain steady rhythm'
    ],
    difficulty: 'beginner'
  },
  'high-knees': {
    id: 'high-knees',
    name: 'High Knees',
    category: 'cardio',
    equipment: ['bodyweight'],
    muscleGroups: ['quads', 'hip flexors', 'core'],
    animationKeyframes: 'highKneesAnimation',
    formTips: [
      'Drive knees up to hip height',
      'Stay on the balls of your feet',
      'Pump arms in rhythm',
      'Keep core tight'
    ],
    difficulty: 'beginner'
  },
  'burpee': {
    id: 'burpee',
    name: 'Burpee',
    category: 'full-body',
    equipment: ['bodyweight'],
    muscleGroups: ['full-body'],
    animationKeyframes: 'burpeeAnimation',
    formTips: [
      'Drop to plank position',
      'Perform a push-up',
      'Jump feet to hands',
      'Jump up with arms overhead'
    ],
    difficulty: 'advanced'
  },
  'mountain-climber': {
    id: 'mountain-climber',
    name: 'Mountain Climbers',
    category: 'full-body',
    equipment: ['bodyweight'],
    muscleGroups: ['core', 'shoulders', 'legs'],
    animationKeyframes: 'mountainClimberAnimation',
    formTips: [
      'Start in plank position',
      'Drive knees to chest alternating',
      'Keep hips level',
      'Maintain plank throughout'
    ],
    difficulty: 'intermediate'
  },
  
  // RESISTANCE BAND SPECIFIC
  'band-chest-press': {
    id: 'band-chest-press',
    name: 'Resistance Band Chest Press',
    category: 'upper',
    equipment: ['resistance-bands'],
    muscleGroups: ['chest', 'shoulders', 'triceps'],
    animationKeyframes: 'bandChestPressAnimation',
    formTips: [
      'Anchor band behind you at chest height',
      'Press forward with controlled motion',
      'Keep core engaged',
      'Return slowly to starting position'
    ],
    difficulty: 'beginner'
  },
  'band-squat': {
    id: 'band-squat',
    name: 'Resistance Band Squat',
    category: 'lower',
    equipment: ['resistance-bands'],
    muscleGroups: ['quads', 'glutes', 'hamstrings'],
    animationKeyframes: 'bandSquatAnimation',
    formTips: [
      'Stand on band, hold handles at shoulders',
      'Squat down while maintaining tension',
      'Keep chest up and core tight',
      'Drive through heels to stand'
    ],
    difficulty: 'beginner'
  },
  'band-lateral-raise': {
    id: 'band-lateral-raise',
    name: 'Resistance Band Lateral Raise',
    category: 'upper',
    equipment: ['resistance-bands'],
    muscleGroups: ['shoulders'],
    animationKeyframes: 'bandLateralRaiseAnimation',
    formTips: [
      'Stand on band, hold handles at sides',
      'Raise arms out to shoulder height',
      'Keep slight bend in elbows',
      'Lower with control'
    ],
    difficulty: 'beginner'
  }
};

// Helper function to get exercises by equipment
export function getExercisesByEquipment(equipment: string[]): ExerciseAnimationData[] {
  return Object.values(EXERCISE_ANIMATIONS).filter(exercise => 
    equipment.length === 0 || 
    equipment.includes('bodyweight') ||
    exercise.equipment.some(eq => equipment.includes(eq))
  );
}

// Helper function to get exercises by category
export function getExercisesByCategory(category: ExerciseAnimationData['category']): ExerciseAnimationData[] {
  return Object.values(EXERCISE_ANIMATIONS).filter(exercise => 
    exercise.category === category
  );
}

// Helper function to get exercise by ID
export function getExerciseById(id: string): ExerciseAnimationData | undefined {
  return EXERCISE_ANIMATIONS[id];
}

// Equipment type definitions
export const EQUIPMENT_TYPES = [
  { id: 'bodyweight', name: 'Bodyweight Only', icon: '🧘' },
  { id: 'resistance-bands', name: 'Resistance Bands', icon: '🎗️' },
  { id: 'dumbbells', name: 'Dumbbells', icon: '🏋️' },
  { id: 'kettlebells', name: 'Kettlebells', icon: '⚖️' },
  { id: 'barbell', name: 'Barbell', icon: '💪' },
  { id: 'pull-up-bar', name: 'Pull-Up Bar', icon: '🏗️' },
  { id: 'yoga-mat', name: 'Yoga Mat', icon: '🧘‍♀️' },
  { id: 'bench', name: 'Bench', icon: '🪑' },
  { id: 'cable-machine', name: 'Cable Machine', icon: '⚙️' },
] as const;

export type EquipmentType = typeof EQUIPMENT_TYPES[number]['id'];
