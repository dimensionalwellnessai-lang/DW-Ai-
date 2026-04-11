import { useState } from "react";
import { useLocation } from "wouter";
import { Sparkles, ChevronDown, ChevronUp, Loader2, BookOpen, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface DWLearnCardProps {
  topic: string;
  question: string;
  teaser?: string;
  userContext?: Record<string, unknown>;
  className?: string;
  accent?: "primary" | "violet" | "amber" | "emerald" | "rose";
  defaultOpen?: boolean;
}

const ACCENT_CLASSES = {
  primary: {
    border: "border-primary/20",
    bg: "bg-primary/5",
    icon: "text-primary",
    iconBg: "bg-primary/10",
    badge: "text-primary/80",
    link: "text-primary hover:text-primary/80",
  },
  violet: {
    border: "border-violet-500/20",
    bg: "bg-violet-500/5",
    icon: "text-violet-500",
    iconBg: "bg-violet-500/10",
    badge: "text-violet-500/80",
    link: "text-violet-500 hover:text-violet-400",
  },
  amber: {
    border: "border-amber-500/20",
    bg: "bg-amber-500/5",
    icon: "text-amber-500",
    iconBg: "bg-amber-500/10",
    badge: "text-amber-500/80",
    link: "text-amber-500 hover:text-amber-400",
  },
  emerald: {
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
    icon: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
    badge: "text-emerald-500/80",
    link: "text-emerald-500 hover:text-emerald-400",
  },
  rose: {
    border: "border-rose-500/20",
    bg: "bg-rose-500/5",
    icon: "text-rose-500",
    iconBg: "bg-rose-500/10",
    badge: "text-rose-500/80",
    link: "text-rose-500 hover:text-rose-400",
  },
};

export function DWLearnCard({
  topic,
  question,
  teaser,
  userContext,
  className,
  accent = "primary",
  defaultOpen = false,
}: DWLearnCardProps) {
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const colors = ACCENT_CLASSES[accent];

  const handleOpen = async () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening && !explanation && !loading) {
      setLoading(true);
      setError(false);
      try {
        const res = await apiRequest("POST", "/api/ai/explain", {
          topic,
          userContext: userContext ?? {},
        });
        const data = await res.json();
        setExplanation(data.explanation || null);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoDeeper = () => {
    navigate(`/talk?prompt=${encodeURIComponent(`Tell me more about: ${topic}`)}`);
  };

  // Format explanation — split into paragraphs
  const paragraphs = explanation
    ? explanation.split(/\n+/).filter((p) => p.trim().length > 0)
    : [];

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all",
        colors.border,
        colors.bg,
        className
      )}
      data-testid="card-dw-learn"
    >
      {/* Header row — always visible */}
      <button
        className="w-full flex items-start gap-3 p-4 text-left"
        onClick={handleOpen}
        data-testid="button-dw-learn-toggle"
      >
        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5", colors.iconBg)}>
          <BookOpen className={cn("h-4 w-4", colors.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1.5", colors.badge)}>
            <Sparkles className="h-3 w-3" /> DW explains
          </p>
          <p className="text-sm font-semibold text-foreground leading-snug">{question}</p>
          {teaser && !isOpen && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{teaser}</p>
          )}
        </div>
        <div className="shrink-0 text-muted-foreground/50 mt-0.5">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className={cn("h-4 w-4 animate-spin", colors.icon)} />
              <span className="text-sm text-muted-foreground">DW is thinking…</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-muted-foreground">
              Couldn't load explanation right now. Try again later.
            </p>
          )}

          {!loading && !error && paragraphs.length > 0 && (
            <div className="space-y-2.5">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-foreground/85 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          )}

          {!loading && !error && explanation && (
            <button
              onClick={handleGoDeeper}
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold pt-1 transition-colors",
                colors.link
              )}
              data-testid="button-dw-learn-deeper"
            >
              Go deeper with DW <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
