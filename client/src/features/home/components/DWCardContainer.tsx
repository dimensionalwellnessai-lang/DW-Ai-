/**
 * DWCardContainer – shared card shell for all Home Command Center cards.
 *
 * Provides consistent padding, border, rounded corners, and an optional
 * "Talk to DW about this" secondary action that routes to /talk with prefill.
 */

import { useLocation } from "wouter";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DWCardContainerProps {
  children: React.ReactNode;
  className?: string;
  /** If provided, clicking "Talk to DW about this" navigates to /talk with this prefill text. */
  chatPrefill?: string;
}

export function DWCardContainer({ children, className, chatPrefill }: DWCardContainerProps) {
  const [, navigate] = useLocation();

  function handleChatClick() {
    if (!chatPrefill) {
      navigate("/talk");
      return;
    }
    const params = new URLSearchParams();
    params.set("prefill", chatPrefill);
    params.set("src", "home_card");
    navigate(`/talk?${params.toString()}`);
  }

  return (
    <Card className={cn("border border-border/60 bg-card shadow-none", className)}>
      <CardContent className="p-4 space-y-3">
        {children}
        {chatPrefill !== undefined && (
          <button
            type="button"
            onClick={handleChatClick}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <MessageCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Talk to DW about this</span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}
