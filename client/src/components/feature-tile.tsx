import { Link } from 'wouter';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
      <Card 
        className="cursor-pointer hover:border-primary/50 transition-colors h-full"
        onClick={handleClick}
      >
        <CardContent className="p-4 flex flex-col items-center text-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xs font-medium text-foreground leading-tight">
            {label}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
