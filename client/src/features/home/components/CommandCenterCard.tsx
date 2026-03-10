import { useLocation } from "wouter";
import { DWOrb, type OrbState } from "@/components/dw-orb";
import type { LucideIcon } from "lucide-react";

interface CommandCenterCardProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
  dwContext: string;
  onOpen?: () => void;
  orbState?: OrbState;
  priority?: boolean;
}

export function CommandCenterCard({
  title,
  icon: Icon,
  iconColor = "text-primary",
  children,
  dwContext,
  onOpen,
  orbState = "idle",
  priority = false,
}: CommandCenterCardProps) {
  const [, navigate] = useLocation();

  function handleOrbTap() {
    const params = new URLSearchParams();
    params.set("prefill", dwContext);
    params.set("src", "command_center_orb");
    navigate(`/talk?${params.toString()}`);
  }

  function handleCardClick(e: React.MouseEvent) {
    if (!onOpen) return;
    if ((e.target as HTMLElement).closest("[data-testid='dw-orb']")) return;
    onOpen();
  }

  function handleCardKeyDown(e: React.KeyboardEvent) {
    if (!onOpen) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  }

  return (
    <div
      className={`cc-card${priority ? " cc-card--primary" : ""}`}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      data-testid={`cc-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="p-1.5 rounded-lg bg-muted/50">
                <Icon className={`h-4 w-4 ${iconColor}`} aria-hidden="true" />
              </div>
            )}
            <p className="text-base font-semibold text-foreground">{title}</p>
          </div>
          <div className="space-y-1">{children}</div>
        </div>
        <div className="shrink-0 flex items-center">
          <DWOrb
            size={40}
            state={orbState}
            context={dwContext}
            onTap={handleOrbTap}
            label={`Talk with DW about ${title}`}
          />
        </div>
      </div>
    </div>
  );
}
