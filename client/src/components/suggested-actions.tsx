import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Coffee, Utensils, Calendar, BookOpen, Moon, Sunset, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TimeOfDay } from '@/stores/useNavigationStore';
import { useAILearningStore } from '@/stores/useAILearningStore';

interface ActionItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const SUGGESTED_ACTIONS: Record<TimeOfDay, ActionItem[]> = {
  morning: [
    { id: 'routines', label: 'Morning Routine', icon: Coffee, path: '/routines' },
    { id: 'workout', label: "Today's Workout", icon: Activity, path: '/workout' },
    { id: 'meal-prep', label: 'Breakfast Plan', icon: Utensils, path: '/meal-prep' },
    { id: 'today-hub', label: "Today's Schedule", icon: Calendar, path: '/today' },
  ],
  afternoon: [
    { id: 'meal-prep', label: 'Lunch Plan', icon: Utensils, path: '/meal-prep' },
    { id: 'today-hub', label: 'Midday Check-in', icon: Activity, path: '/today' },
    { id: 'tracking', label: 'Review Progress', icon: Calendar, path: '/tracking' },
    { id: 'journal', label: 'Quick Journal', icon: BookOpen, path: '/journal' },
  ],
  evening: [
    { id: 'meal-prep', label: 'Dinner Plan', icon: Utensils, path: '/meal-prep' },
    { id: 'journal', label: 'Evening Reflection', icon: BookOpen, path: '/journal' },
    { id: 'today-hub', label: "Review Today", icon: Calendar, path: '/today' },
    { id: 'routines', label: 'Wind Down Routine', icon: Sunset, path: '/routines' },
  ],
  night: [
    { id: 'meditation', label: 'Sleep Preparation', icon: Moon, path: '/spiritual' },
    { id: 'journal', label: 'Journal Entry', icon: BookOpen, path: '/journal' },
    { id: 'calendar-week', label: 'Tomorrow Planning', icon: Calendar, path: '/calendar' },
    { id: 'routines', label: 'Bedtime Routine', icon: Moon, path: '/routines' },
  ],
};

interface SuggestedActionsProps {
  timeOfDay: TimeOfDay;
  limit?: number;
}

export function SuggestedActions({ timeOfDay, limit = 4 }: SuggestedActionsProps) {
  const trackFeatureUse = useAILearningStore((state) => state.trackFeatureUse);
  
  const actions = SUGGESTED_ACTIONS[timeOfDay].slice(0, limit);

  const handleActionClick = (actionId: string) => {
    trackFeatureUse(actionId);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground px-1">Suggested for you:</p>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Link key={action.id} href={action.path}>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3 px-3"
              onClick={() => handleActionClick(action.id)}
            >
              <action.icon className="h-4 w-4 mr-2 shrink-0" />
              <span className="text-xs truncate">{action.label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
