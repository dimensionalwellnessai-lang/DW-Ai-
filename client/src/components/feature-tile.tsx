import { Link } from 'wouter';
import { LucideIcon } from 'lucide-react';
import { useAILearningStore } from '@/stores/useAILearningStore';

interface FeatureTileProps {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  onClick?: () => void;
}

export function FeatureTile({ id, label, icon: Icon, path, onClick }: FeatureTileProps) {
  const trackFeatureUse = useAILearningStore((state) => state.trackFeatureUse);

  const handleClick = () => {
    trackFeatureUse(id);
    if (onClick) onClick();
  };

  return (
    <Link href={path}>
      <span 
        className="cursor-pointer hover:scale-105 transition-transform active:scale-95 flex flex-col items-center text-center gap-2 p-2 no-underline block"
        onClick={handleClick}
      >
        <span className="p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors inline-block">
          <Icon className="h-6 w-6 text-primary" />
        </span>
        <span className="text-xs font-medium text-foreground leading-tight w-full">
          {label}
        </span>
      </span>
    </Link>
  );
}
