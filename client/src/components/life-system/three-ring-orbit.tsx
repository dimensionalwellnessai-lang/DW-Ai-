// Three-ring orbit visualization for the Life System.
//
// Inner ring  → Core (9 pillars, always present)
// Middle ring → Life Expression (only the pillars the user enabled)
// Outer ring  → Creation (one node per active project)
// Center      → DW orb
//
// Used in two surfaces:
//   1. The onboarding "Reveal" screen — pillars/projects light up as the
//      power-on animation runs (controlled via the `litPillars` / `litProjects`
//      props which gate which nodes glow).
//   2. The /life-system page header as a static visualization of the
//      user's current system.
import { useMemo } from "react";
import { PILLARS, LEVEL_META, type LifeSystemPillarId } from "@/lib/life-system";
import { cn } from "@/lib/utils";

export interface ThreeRingOrbitProps {
  /** Set of pillar ids that should appear lit. If undefined, all are lit. */
  litPillars?: Set<LifeSystemPillarId>;
  /** Project names to render on the outer ring; lit if in litProjects. */
  projects?: { name: string }[];
  litProjects?: Set<string>;
  /** Diameter in pixels. */
  size?: number;
  className?: string;
}

const corePillars = PILLARS.filter(p => p.level === "core");
const expressionPillars = PILLARS.filter(p => p.level === "expression");

function polar(radius: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
}

export function ThreeRingOrbit({
  litPillars,
  projects = [],
  litProjects,
  size = 360,
  className,
}: ThreeRingOrbitProps) {
  const allLit = !litPillars; // when undefined, treat everything as lit

  const innerR = size * 0.22;
  const middleR = size * 0.34;
  const outerR = size * 0.46;

  const innerNodes = useMemo(
    () =>
      corePillars.map((p, i) => {
        const angle = (360 / corePillars.length) * i;
        const { x, y } = polar(innerR, angle);
        return { id: p.id, label: p.label, x, y, color: LEVEL_META.core.ringColor };
      }),
    [innerR],
  );

  const middleNodes = useMemo(
    () =>
      expressionPillars.map((p, i) => {
        const angle = (360 / expressionPillars.length) * i + 18;
        const { x, y } = polar(middleR, angle);
        return { id: p.id, label: p.label, x, y, color: LEVEL_META.expression.ringColor };
      }),
    [middleR],
  );

  const outerNodes = useMemo(
    () =>
      projects.length === 0
        ? []
        : projects.map((p, i) => {
            const angle = (360 / Math.max(projects.length, 3)) * i + 30;
            const { x, y } = polar(outerR, angle);
            return { id: p.name, label: p.name, x, y, color: LEVEL_META.creation.ringColor };
          }),
    [outerR, projects],
  );

  function isLit(id: string) {
    if (allLit) return true;
    if (litPillars && litPillars.has(id as LifeSystemPillarId)) return true;
    if (litProjects && litProjects.has(id)) return true;
    return false;
  }

  return (
    <svg
      viewBox={`-${size / 2} -${size / 2} ${size} ${size}`}
      width={size}
      height={size}
      className={cn("overflow-visible", className)}
      data-testid="three-ring-orbit"
    >
      {/* ── Concentric ring guides ─────────────────────────────────────── */}
      {[innerR, middleR, outerR].map((r, i) => (
        <circle
          key={i}
          cx={0}
          cy={0}
          r={r}
          fill="none"
          stroke="hsl(var(--border))"
          strokeOpacity={0.35}
          strokeDasharray="2 4"
          strokeWidth={1}
        />
      ))}

      {/* ── Center DW orb ──────────────────────────────────────────────── */}
      <defs>
        <radialGradient id="dwOrbGradient">
          <stop offset="0%" stopColor="hsl(252 84% 72%)" />
          <stop offset="100%" stopColor="hsl(252 76% 42%)" />
        </radialGradient>
      </defs>
      <circle
        cx={0}
        cy={0}
        r={size * 0.075}
        fill="url(#dwOrbGradient)"
        style={{ filter: "drop-shadow(0 0 14px hsl(252 76% 58% / 0.6))" }}
      />
      <text
        x={0}
        y={4}
        textAnchor="middle"
        fontSize={size * 0.055}
        fontWeight={700}
        fill="white"
      >
        DW
      </text>

      {/* ── Nodes per ring ─────────────────────────────────────────────── */}
      {[...innerNodes, ...middleNodes, ...outerNodes].map(n => {
        const lit = isLit(n.id);
        return (
          <g
            key={n.id}
            style={{
              transition: "opacity 600ms ease, filter 600ms ease",
              opacity: lit ? 1 : 0.18,
              filter: lit ? `drop-shadow(0 0 6px hsl(${n.color.replace("hsl(", "").replace(")", "")} / 0.6))` : "none",
            }}
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={size * 0.026}
              fill={n.color}
              stroke="white"
              strokeOpacity={lit ? 0.7 : 0.2}
              strokeWidth={1.5}
            />
            <text
              x={n.x}
              y={n.y + size * 0.06}
              textAnchor="middle"
              fontSize={size * 0.028}
              fill="hsl(var(--foreground))"
              opacity={lit ? 0.9 : 0.4}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default ThreeRingOrbit;
