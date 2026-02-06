import type { TimeOfDay } from '@/stores/useNavigationStore';

interface ContextualGreetingProps {
  timeOfDay: TimeOfDay;
  userName?: string;
  className?: string;
}

const GREETINGS: Record<TimeOfDay, string> = {
  morning: 'Good Morning',
  afternoon: 'Good Afternoon',
  evening: 'Good Evening',
  night: 'Good Night',
};

export function ContextualGreeting({ timeOfDay, userName, className = "" }: ContextualGreetingProps) {
  const greeting = GREETINGS[timeOfDay];
  
  return (
    <h2 className={`text-lg font-semibold text-foreground ${className}`}>
      {greeting}{userName ? `, ${userName}` : ''}
    </h2>
  );
}
