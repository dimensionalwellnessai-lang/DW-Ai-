import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "outline" | "ghost";
  icon?: React.ReactNode;
  "data-testid"?: string;
}

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  iconColor?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  iconColor = "text-primary",
  className,
}: EmptyStateProps) {
  const iconBg = iconColor
    .replace("text-primary", "bg-primary/10")
    .replace("text-violet-500", "bg-violet-500/10")
    .replace("text-violet-600", "bg-violet-500/10")
    .replace("text-blue-500", "bg-blue-500/10")
    .replace("text-blue-600", "bg-blue-500/10")
    .replace("text-green-500", "bg-green-500/10")
    .replace("text-green-600", "bg-green-500/10")
    .replace("text-emerald-500", "bg-emerald-500/10")
    .replace("text-emerald-600", "bg-emerald-500/10")
    .replace("text-amber-500", "bg-amber-500/10")
    .replace("text-amber-600", "bg-amber-500/10")
    .replace("text-rose-500", "bg-rose-500/10")
    .replace("text-rose-600", "bg-rose-500/10")
    .replace("text-indigo-500", "bg-indigo-500/10")
    .replace("text-indigo-600", "bg-indigo-500/10")
    .replace("text-purple-500", "bg-purple-500/10")
    .replace("text-purple-600", "bg-purple-500/10")
    .replace("text-teal-500", "bg-teal-500/10")
    .replace("text-teal-600", "bg-teal-500/10")
    .replace("text-orange-500", "bg-orange-500/10")
    .replace("text-orange-600", "bg-orange-500/10")
    .replace("text-sky-500", "bg-sky-500/10")
    .replace("text-sky-600", "bg-sky-500/10")
    .replace("text-pink-500", "bg-pink-500/10")
    .replace("text-pink-600", "bg-pink-500/10")
    .replace("text-muted-foreground", "bg-muted");

  const renderAction = (act: EmptyStateAction) => {
    const btn = (
      <Button
        size="sm"
        variant={act.variant ?? "default"}
        onClick={act.onClick}
        data-testid={act["data-testid"]}
        className="gap-1.5"
      >
        {act.icon}
        {act.label}
      </Button>
    );
    if (act.href) {
      return <Link href={act.href}>{btn}</Link>;
    }
    return btn;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center py-14 px-6 gap-4 select-none",
        className
      )}
    >
      <div
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
          iconBg
        )}
      >
        <Icon className={cn("h-8 w-8", iconColor)} />
      </div>

      <div className="space-y-1.5 max-w-[260px]">
        <p className="font-display font-semibold text-base text-foreground">
          {title}
        </p>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap gap-2 justify-center pt-1">
          {action && renderAction(action)}
          {secondaryAction && renderAction(secondaryAction)}
        </div>
      )}
    </div>
  );
}
