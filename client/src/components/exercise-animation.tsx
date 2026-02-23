import { useState, useEffect } from "react";
import { getExerciseWithMatchType, type ExerciseAnimationData } from "@/lib/exercise-animations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

// Lazy-load the heavy Babylon.js viewer so it doesn't block initial render
const AvatarViewer = lazy(() =>
  import("@/components/avatar-viewer").then((m) => ({ default: m.AvatarViewer }))
);

interface ExerciseAnimationProps {
  exerciseId: string;
  onClose?: () => void;
  autoPlay?: boolean;
  /** Original exercise name the user requested (for mismatch reporting) */
  requestedExercise?: string;
}

export function ExerciseAnimation({ exerciseId, onClose, autoPlay = true }: ExerciseAnimationProps) {
  const result = getExerciseWithMatchType(exerciseId);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [, setLocation] = useLocation();

  useEffect(() => {
    setIsPlaying(autoPlay);
  }, [exerciseId, autoPlay]);

  if (!result) {
    return null;
  }

  const { exercise, isClosestMatch, requestedId } = result;

  const handleReportMismatch = () => {
    const params = new URLSearchParams({
      type: "mismatch",
      desc: `Exercise demo mismatch: requested "${requestedId}" but showed "${exercise.id}" (${exercise.name}) as the closest match.`,
    });
    onClose?.();
    setLocation(`/support/report?${params.toString()}`);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        {/* Closest-match notice */}
        {isClosestMatch && (
          <div className="flex items-center justify-between rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 mb-4 text-xs text-amber-800 dark:text-amber-300">
            <span>Showing closest match for &quot;{requestedId}&quot;</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
              onClick={handleReportMismatch}
              data-testid="button-report-mismatch"
            >
              <Flag className="h-3 w-3 mr-1" />
              Report mismatch
            </Button>
          </div>
        )}

        {/* Header with close button */}
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
        <div>
          <h4 className="text-sm font-medium mb-2">Form Tips:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {exercise.formTips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Report mismatch */}
        <div className="pt-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground gap-1"
            onClick={() => setReportOpen(true)}
          >
            <Flag className="w-3 h-3" />
            Report mismatch
          </Button>
        </div>
      </CardContent>

      <ReportIssueModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        eventType="exercise_demo_mismatch"
        requestedItem={requestedExercise || exercise.name}
        closestMatch={exercise.name}
        pageContext={typeof window !== "undefined" ? window.location.pathname : undefined}
      />

      {/* CSS Animations */}
      <style>{`
        .exercise-animation {
          width: 200px;
          height: 300px;
          position: relative;
        }

        .silhouette-figure {
          fill: currentColor;
          color: hsl(var(--foreground));
          opacity: 0.9;
        }

        /* Animation States */
        .exercise-animation.paused .silhouette-figure {
          animation-play-state: paused !important;
        }

        .exercise-animation.playing .silhouette-figure {
          animation-play-state: running !important;
        }

        /* Push-Up Animation */
        @keyframes pushUpAnimation {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-20px) scaleY(0.95); }
        }

        /* Squat Animation */
        @keyframes squatAnimation {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(30px) scaleY(0.85); }
        }

        /* Curl Animation */
        @keyframes dumbbellCurlAnimation {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-15deg); }
        }

        /* Plank Animation */
        @keyframes plankAnimation {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(2px); }
        }

        /* Jumping Jack Animation */
        @keyframes jumpingJackAnimation {
          0%, 100% { transform: scaleX(0.8) scaleY(1); }
          50% { transform: scaleX(1.1) scaleY(0.95); }
        }

        /* High Knees Animation */
        @keyframes highKneesAnimation {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-10px); }
          75% { transform: translateY(-10px); }
        }

        /* Lunge Animation */
        @keyframes lungeAnimation {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(20px) scaleY(0.9); }
        }

        /* Resistance Band Row Animation */
        @keyframes resistanceBandRowAnimation {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(0.95); }
        }

        /* Pull-Up Animation */
        @keyframes pullUpAnimation {
          0%, 100% { transform: translateY(20px); }
          50% { transform: translateY(-10px); }
        }

        /* Shoulder Press Animation */
        @keyframes shoulderPressAnimation {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        /* Deadlift Animation */
        @keyframes deadliftAnimation {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          50% { transform: rotate(15deg) translateY(15px); }
        }

        /* Calf Raise Animation */
        @keyframes calfRaiseAnimation {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        /* Crunch Animation */
        @keyframes crunchAnimation {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-10deg); }
        }

        /* Russian Twist Animation */
        @keyframes russianTwistAnimation {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }

        /* Leg Raise Animation */
        @keyframes legRaiseAnimation {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-30deg); }
        }

        /* Burpee Animation */
        @keyframes burpeeAnimation {
          0%, 100% { transform: translateY(0) scaleY(1); }
          25% { transform: translateY(20px) scaleY(0.8); }
          50% { transform: translateY(-10px) scaleY(1.05); }
          75% { transform: translateY(20px) scaleY(0.8); }
        }

        /* Mountain Climber Animation */
        @keyframes mountainClimberAnimation {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        /* Resistance Band Exercises */
        @keyframes bandChestPressAnimation {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.1); }
        }

        @keyframes bandSquatAnimation {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(30px) scaleY(0.85); }
        }

        @keyframes bandLateralRaiseAnimation {
          0%, 100% { transform: scaleX(0.9); }
          50% { transform: scaleX(1.2); }
        }
      `}</style>
    </Card>
  );
}
