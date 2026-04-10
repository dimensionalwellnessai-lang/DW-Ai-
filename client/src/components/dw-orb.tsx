import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "suggestion" | "active" | "chat" | "speaking";

interface DWOrbProps {
  size?: number;
  state?: OrbState;
  context?: string;
  onTap?: (context?: string) => void;
  className?: string;
  label?: string;
}

export function DWOrb({
  size = 44,
  state = "idle",
  context,
  onTap,
  className,
  label,
}: DWOrbProps) {
  const [pressed, setPressed] = useState(false);
  const interactive = !!onTap;

  const handleClick = useCallback(() => {
    onTap?.(context);
  }, [onTap, context]);

  const haloSize = size + 16;

  const orbVisual = (
    <>
      <div
        className={cn(
          "dw-orb-halo absolute rounded-full",
          state === "suggestion" && "dw-orb-halo--pulse",
          state === "chat" && "dw-orb-halo--bright",
          state === "speaking" && "dw-orb-halo--speaking",
        )}
        style={{ width: haloSize, height: haloSize }}
      />
      <div
        className={cn(
          "dw-orb-sphere relative rounded-full transition-transform duration-200",
          interactive && pressed && "scale-90",
          state === "active" && "scale-110",
          state === "chat" && "dw-orb-sphere--chat",
          state === "speaking" && "dw-orb-sphere--speaking",
        )}
        style={{ width: size, height: size }}
      >
        <div className="dw-orb-swirl absolute inset-0 rounded-full" />
        <div className="dw-orb-inner-glow absolute inset-0 rounded-full" />
      </div>
    </>
  );

  if (!interactive) {
    return (
      <div
        className={cn("relative flex items-center justify-center shrink-0", className)}
        style={{ width: haloSize, height: haloSize }}
        aria-hidden="true"
        data-testid="dw-orb"
      >
        {orbVisual}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className={cn("relative flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full", className)}
      style={{ width: haloSize, height: haloSize }}
      aria-label={label ?? "Talk with DW"}
      data-testid="dw-orb"
    >
      {orbVisual}
    </button>
  );
}
