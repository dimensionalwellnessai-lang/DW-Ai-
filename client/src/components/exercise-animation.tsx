import { useState, useEffect } from "react";
import { getExerciseWithMatchType, type ExerciseAnimationData } from "@/lib/exercise-animations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

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
            <h3 className="text-lg font-semibold">{exercise.name}</h3>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {exercise.category}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {exercise.difficulty}
              </Badge>
              {exercise.equipment.map((eq) => (
                <Badge key={eq} variant="outline" className="text-xs">
                  {eq.replace('-', ' ')}
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

        {/* Animation Container */}
        <div className="bg-muted rounded-lg p-8 mb-4 flex items-center justify-center min-h-[300px]">
          <div className={`exercise-animation ${isPlaying ? 'playing' : 'paused'}`}>
            <SilhouetteFigure exercise={exercise} isPlaying={isPlaying} />
          </div>
        </div>

        {/* Play/Pause Control */}
        <div className="flex justify-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? 'Pause' : 'Play'} Animation
          </Button>
        </div>

        {/* Muscle Groups */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Target Muscles:</h4>
          <div className="flex gap-1 flex-wrap">
            {exercise.muscleGroups.map((muscle) => (
              <Badge key={muscle} variant="secondary" className="text-xs">
                {muscle}
              </Badge>
            ))}
          </div>
        </div>

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

// Silhouette Figure Component - SVG-based human mannequin
function SilhouetteFigure({ exercise, isPlaying }: { exercise: ExerciseAnimationData; isPlaying: boolean }) {
  const animationName = exercise.animationKeyframes;
  const duration = exercise.category === 'cardio' ? '1s' : '2s';

  return (
    <svg
      viewBox="0 0 200 300"
      xmlns="http://www.w3.org/2000/svg"
      className="silhouette-figure w-full h-full"
      style={{
        animation: isPlaying ? `${animationName} ${duration} ease-in-out infinite` : 'none',
      }}
    >
      {/* Head - circle with no facial features */}
      <circle cx="100" cy="40" r="25" className="fill-current" />
      
      {/* Torso - rounded rectangle */}
      <rect x="70" y="65" width="60" height="100" rx="15" className="fill-current" />
      
      {/* Left Arm */}
      <g>
        <rect x="45" y="70" width="25" height="70" rx="12" className="fill-current" />
        <rect x="40" y="135" width="20" height="50" rx="10" className="fill-current" />
      </g>
      
      {/* Right Arm */}
      <g>
        <rect x="130" y="70" width="25" height="70" rx="12" className="fill-current" />
        <rect x="140" y="135" width="20" height="50" rx="10" className="fill-current" />
      </g>
      
      {/* Left Leg */}
      <g>
        <rect x="75" y="165" width="22" height="90" rx="11" className="fill-current" />
        <rect x="70" y="250" width="25" height="40" rx="10" className="fill-current" />
      </g>
      
      {/* Right Leg */}
      <g>
        <rect x="103" y="165" width="22" height="90" rx="11" className="fill-current" />
        <rect x="105" y="250" width="25" height="40" rx="10" className="fill-current" />
      </g>
    </svg>
  );
}
