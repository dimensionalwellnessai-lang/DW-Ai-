import { DWOrb } from "@/components/dw-orb";
import { useLocation } from "wouter";

export function FloatingAIWidget() {
  const [location, navigate] = useLocation();

  const hiddenPages = ["/talk", "/welcome", "/enhanced-onboarding", "/app-tour", "/login", "/reset-password"];
  const shouldHide = hiddenPages.some(page => location === page || location.startsWith(page + "/") || location.startsWith(page + "?"));

  if (shouldHide) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-50" data-testid="floating-dw-orb">
      <DWOrb
        size={48}
        state="idle"
        onTap={() => navigate("/talk")}
      />
    </div>
  );
}
