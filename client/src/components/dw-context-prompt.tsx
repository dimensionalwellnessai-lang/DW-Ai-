import { useLocation } from "wouter";
import { MessageCircle, Sparkles } from "lucide-react";

interface DWContextPromptProps {
  topic: string;
  placeholder?: string;
  className?: string;
  context?: string;
}

export function DWContextPrompt({ topic, placeholder, className = "", context }: DWContextPromptProps) {
  const [, navigate] = useLocation();

  const handleClick = () => {
    const url = context
      ? `/talk?context=${encodeURIComponent(context)}&prompt=${encodeURIComponent(topic)}`
      : `/talk?prompt=${encodeURIComponent(topic)}`;
    navigate(url);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all text-left ${className}`}
      data-testid="button-dw-context-prompt"
    >
      <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5">Ask DW</p>
        <p className="text-sm text-foreground/80 leading-snug">
          {placeholder || topic}
        </p>
      </div>
      <MessageCircle className="h-4 w-4 text-primary/60 shrink-0" />
    </button>
  );
}
