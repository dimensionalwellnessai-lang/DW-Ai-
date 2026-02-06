import { Sunrise, Sun, Sunset, Moon } from 'lucide-react';
import type { TimeOfDay } from '@/stores/useNavigationStore';

interface TimeIconProps {
  timeOfDay: TimeOfDay;
  className?: string;
}

export function TimeIcon({ timeOfDay, className = "h-5 w-5" }: TimeIconProps) {
  const icons = {
    morning: Sunrise,
    afternoon: Sun,
    evening: Sunset,
    night: Moon,
  };

  const colors = {
    morning: "text-amber-400",
    afternoon: "text-yellow-400",
    evening: "text-orange-400",
    night: "text-blue-300",
  };

  const Icon = icons[timeOfDay];
  const color = colors[timeOfDay];

  return <Icon className={`${className} ${color}`} />;
}
