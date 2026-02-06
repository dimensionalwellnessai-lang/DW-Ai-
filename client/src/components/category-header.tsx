import { LucideIcon } from 'lucide-react';

interface CategoryHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

export function CategoryHeader({ icon: Icon, title, subtitle }: CategoryHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
