import { useLocation } from "wouter";
import { DWOrb } from "@/components/dw-orb";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Target,
  CheckCircle2,
  Brain,
  Moon,
  Compass,
  type LucideIcon,
} from "lucide-react";

interface OrbitModule {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

const MODULES: OrbitModule[] = [
  { id: "insights",  label: "Insights",  href: "/insights",       icon: BarChart3,    color: "text-violet-500",  bg: "bg-violet-500/10" },
  { id: "plan",      label: "Plan",      href: "/plan",           icon: Target,       color: "text-amber-500",   bg: "bg-amber-500/10" },
  { id: "habits",    label: "Habits",    href: "/habits",         icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "mood",      label: "Mood",      href: "/mood-tracker",   icon: Brain,        color: "text-rose-500",    bg: "bg-rose-500/10" },
  { id: "cosmic",    label: "Cosmic",    href: "/cosmic",         icon: Moon,         color: "text-indigo-500",  bg: "bg-indigo-500/10" },
  { id: "blueprint", label: "Blueprint", href: "/life-blueprint", icon: Compass,      color: "text-sky-500",     bg: "bg-sky-500/10" },
];

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
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
      data-testid="command-center-orbit"
    >
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
          label="Talk with DW"
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
          </button>
        );
      })}

      <div className="absolute inset-x-0 -bottom-6 flex justify-center">
        <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-[10px] text-muted-foreground/70 text-center max-w-[260px]">
          {MODULES.map((m) => (
            <span key={m.id} className="truncate">{m.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
