import { useLocation } from "wouter";
import { DWOrb } from "@/components/dw-orb";
import { cn } from "@/lib/utils";
import { ORBIT_MODULES as MODULES } from "@/config/navigation";

interface CommandCenterOrbitProps {
  size?: number;
  className?: string;
}

export function CommandCenterOrbit({ size = 280, className }: CommandCenterOrbitProps) {
  const [, navigate] = useLocation();

  const iconSize = 48;
  const center = size / 2;
  const radius = size / 2 - iconSize / 2 - 6;

  return (
    <div className={cn("flex flex-col items-center", className)} data-testid="command-center-orbit">
      <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute rounded-full border border-border/30"
        style={{ inset: iconSize / 2 + 2 }}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <DWOrb
          size={Math.round(size * 0.32)}
          state="idle"
          onTap={() => navigate("/talk")}
          label="Talk to DW"
        />
      </div>

      {MODULES.map((mod, i) => {
        const angleDeg = (i * 360) / MODULES.length - 90;
        const angle = (angleDeg * Math.PI) / 180;
        const x = center + radius * Math.cos(angle) - iconSize / 2;
        const y = center + radius * Math.sin(angle) - iconSize / 2;
        const Icon = mod.icon;
        return (
          <button
            key={mod.id}
            type="button"
            onClick={() => navigate(mod.href)}
            className={cn(
              "absolute flex flex-col items-center justify-center gap-0.5 rounded-full transition-transform active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            )}
            style={{ left: x, top: y, width: iconSize, height: iconSize }}
            aria-label={mod.label}
            data-testid={`orbit-module-${mod.id}`}
          >
            <span
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shadow-sm border border-border/40 bg-card",
                mod.bg,
              )}
            >
              <Icon className={cn("h-4 w-4", mod.color)} />
            </span>
            <span className="absolute top-full mt-0.5 text-xs leading-none text-muted-foreground whitespace-nowrap">
              {mod.label}
            </span>
          </button>
        );
      })}

      </div>
    </div>
  );
}
