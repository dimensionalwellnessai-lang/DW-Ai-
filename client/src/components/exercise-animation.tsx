import { lazy, Suspense, useState } from "react";
import { getExerciseById } from "@/lib/exercise-animations";
import {
  getMotionById,
  findClosestMotion,
  reportFallback,
} from "@/lib/avatar-motion-library";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Lazy-load the heavy Babylon.js viewer so it doesn't block initial render
const AvatarViewer = lazy(() =>
  import("@/components/avatar-viewer").then((m) => ({ default: m.AvatarViewer }))
);

interface ExerciseAnimationProps {
  exerciseId: string;
  onClose?: () => void;
  autoPlay?: boolean;
}

const AVATAR_HEIGHT = 320;

/** Map motion-library categories (fine-grained) to exercise-DB display labels. */
function motionCategoryLabel(cat: string): string {
  const MAP: Record<string, string> = {
    'strength-push': 'upper',
    'strength-pull': 'upper',
    'strength-lower': 'lower',
    'core': 'core',
    'cardio': 'cardio',
    'stretch': 'stretch',
    'yoga': 'yoga',
    'breathwork': 'breathwork',
  };
  return MAP[cat] ?? cat;
}

export function ExerciseAnimation({
  exerciseId,
  onClose,
  autoPlay = true,
}: ExerciseAnimationProps) {
  const exercise = getExerciseById(exerciseId);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  // Resolve motion: exact match first, then closest match from the motion library
  const exactMotion = getMotionById(exerciseId);
  const { motion, score, isFallback } = exactMotion
    ? { motion: exactMotion, score: 100, isFallback: false }
    : findClosestMotion(exerciseId);

  if (isFallback) {
    reportFallback(exerciseId, motion, score);
  }

  // YouTube fallback URL
  const youtubeUrl = motion.youtubeVideoId
    ? `https://www.youtube.com/watch?v=${motion.youtubeVideoId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(motion.youtubeSearch)}`;

  // Display name: prefer the exercise DB entry, fall back to motion library name
  const displayName = exercise?.name ?? motion.name;
  const category = exercise?.category ?? motionCategoryLabel(motion.category);
  const difficulty = exercise?.difficulty;
  const equipment = exercise?.equipment ?? [];
  const muscleGroups = exercise?.muscleGroups ?? [];
  const formTips = exercise?.formTips ?? [];

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{displayName}</h3>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {category}
              </Badge>
              {difficulty && (
                <Badge variant="outline" className="text-xs">
                  {difficulty}
                </Badge>
              )}
              {equipment.map((eq) => (
                <Badge key={eq} variant="outline" className="text-xs">
                  {eq.replace(/-/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Closest-match notice */}
        {isFallback && (
          <div className="flex items-start gap-2 mb-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              No exact demo found for &ldquo;{exerciseId}&rdquo;. Showing
              closest match: <strong>{motion.name}</strong> (score {score}/100).
            </span>
          </div>
        )}

        {/* 3D Avatar Viewer */}
        <div className="mb-4 rounded-lg overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center" style={{ minHeight: AVATAR_HEIGHT }}>
          <Suspense
            fallback={
              <div
                className="flex items-center justify-center"
                style={{ height: AVATAR_HEIGHT, width: "100%" }}
                role="status"
                aria-live="polite"
                aria-label="Loading exercise demo"
              >
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            }
          >
            <AvatarViewer
              motion={motion}
              isPlaying={isPlaying}
              width={320}
              height={AVATAR_HEIGHT}
            />
          </Suspense>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? "Pause" : "Play"} Demo
          </Button>

          {/* YouTube fallback */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground hover:text-foreground gap-1"
          >
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Watch ${displayName} on YouTube`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Watch on YouTube
            </a>
          </Button>
        </div>

        {/* Muscle Groups */}
        {muscleGroups.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Target Muscles:</h4>
            <div className="flex gap-1 flex-wrap">
              {muscleGroups.map((muscle) => (
                <Badge key={muscle} variant="secondary" className="text-xs">
                  {muscle}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Form Tips */}
        {formTips.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Form Tips:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {formTips.map((tip, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
