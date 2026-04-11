import { DWOrb } from "@/components/dw-orb";
import { useLocation } from "wouter";
import { MessageCircle } from "lucide-react";

export function FloatingAIWidget() {
  const [location, navigate] = useLocation();

  const hiddenPages = ["/talk", "/welcome", "/enhanced-onboarding", "/app-tour", "/login", "/reset-password", "/life-system-import"];
  const shouldHide = hiddenPages.some(page => location === page || location.startsWith(page + "/") || location.startsWith(page + "?"));

  if (shouldHide) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-center gap-1.5" data-testid="floating-dw-orb">
      <div className="relative">
        <DWOrb
          size={56}
          state="suggestion"
          onTap={() => navigate("/talk")}
        />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary border-2 border-background animate-pulse" aria-hidden="true" />
      </div>
      <button
        onClick={() => navigate("/talk")}
        className="bg-background/90 backdrop-blur-sm border border-border/60 rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm hover:bg-muted/80 transition-colors"
        aria-label="Ask DW anything"
        data-testid="button-floating-ask-dw"
      >
        <MessageCircle className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-medium text-foreground/80 whitespace-nowrap">Ask DW</span>
      </button>
    </div>
  );
}
