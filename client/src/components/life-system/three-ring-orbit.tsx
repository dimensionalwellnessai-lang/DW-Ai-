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
  /**
   * Projects to render on the outer ring. Each may optionally carry an id; the
   * orbit falls back to `name` as the node identifier when no id is provided.
   * `litProjects` and `onProjectClick` operate on the same identifier
   * (id when present, otherwise name) so callers can wire either shape.
   */
  projects?: { id?: string; name: string }[];
  litProjects?: Set<string>;
  /** Diameter in pixels. */
  size?: number;
  className?: string;
  /** Tap handler for lit Core or Expression pillar nodes. */
  onPillarClick?: (id: LifeSystemPillarId) => void;
  /**
   * Tap handler for lit Creation (project) nodes on the outer ring.
   * Receives the same identifier used in `litProjects` — the project's id
   * when provided on the project item, otherwise its name.
   * NOTE: ignored when `collapseProjects` is true.
   */
  onProjectClick?: (projectKey: string) => void;
  /**
   * When true (the default for the home orb), all active projects are
   * represented as a SINGLE "Projects (N)" node on the outer ring. Tapping
   * fires `onProjectsClick` (e.g. open a list sheet) instead of
   * `onProjectClick`.
   * Set to `false` for the onboarding reveal animation where each project
   * lights up individually.
   */
  collapseProjects?: boolean;
  /** Tap handler for the collapsed projects node. */
  onProjectsClick?: () => void;
  /** Tap handler for the central DW orb. */
  onCenterClick?: () => void;
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
  onPillarClick,
  onProjectClick,
  collapseProjects = false,
  onProjectsClick,
  onCenterClick,
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
        return { id: p.id, label: p.label, x, y, color: LEVEL_META.core.ringColor, kind: "pillar" as const };
      }),
    [innerR],
  );

  // Middle ring should only render Expression pillars the user has enabled.
  // (When `litPillars` is undefined we render all — used as a static preview.)
  const visibleExpression = useMemo(
    () =>
      allLit
        ? expressionPillars
        : expressionPillars.filter(p => litPillars!.has(p.id)),
    [allLit, litPillars],
  );

  const middleNodes = useMemo(
    () => {
      const list = visibleExpression;
      const denom = Math.max(list.length, 1);
      return list.map((p, i) => {
        const angle = (360 / denom) * i + 18;
        const { x, y } = polar(middleR, angle);
        return { id: p.id, label: p.label, x, y, color: LEVEL_META.expression.ringColor, kind: "pillar" as const };
      });
    },
    [middleR, visibleExpression],
  );

  const outerNodes = useMemo(
    () => {
      if (projects.length === 0) return [];
      // Collapsed mode: one node at the top of the outer ring labeled
      // "Projects (N)". Used on the home orb to keep the outer ring tidy
      // regardless of how many active projects the user has.
      if (collapseProjects) {
        const { x, y } = polar(outerR, 0);
        return [{
          id: "__projects__",
          label: `Projects (${projects.length})`,
          x, y,
          color: LEVEL_META.creation.ringColor,
          kind: "projects-collapsed" as const,
        }];
      }
      return projects.map((p, i) => {
        const angle = (360 / Math.max(projects.length, 3)) * i + 30;
        const { x, y } = polar(outerR, angle);
        return { id: p.id ?? p.name, label: p.name, x, y, color: LEVEL_META.creation.ringColor, kind: "project" as const };
      });
    },
    [outerR, projects, collapseProjects],
  );

  function isLit(id: string) {
    if (allLit) return true;
    if (id === "__projects__") return projects.length > 0;
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
      <g
        onClick={onCenterClick ? () => onCenterClick() : undefined}
        onKeyDown={
          onCenterClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onCenterClick();
                }
              }
            : undefined
        }
        role={onCenterClick ? "button" : undefined}
        tabIndex={onCenterClick ? 0 : undefined}
        aria-label={onCenterClick ? "Open Life System Document" : undefined}
        data-testid="orbit-center-dw"
        style={{ cursor: onCenterClick ? "pointer" : "default", outline: "none" }}
      >
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
          style={{ pointerEvents: "none" }}
        >
          DW
        </text>
      </g>

      {/* ── Nodes per ring ─────────────────────────────────────────────── */}
      {[...innerNodes, ...middleNodes, ...outerNodes].map(n => {
        const lit = isLit(n.id);
        const handler = !lit
          ? undefined
          : n.kind === "projects-collapsed"
            ? (onProjectsClick ? () => onProjectsClick() : undefined)
            : n.kind === "project"
              ? (onProjectClick ? () => onProjectClick(n.id) : undefined)
              : (onPillarClick ? () => onPillarClick(n.id as LifeSystemPillarId) : undefined);
        const interactive = !!handler;
        return (
          <g
            key={n.id}
            onClick={handler}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handler!();
                    }
                  }
                : undefined
            }
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? n.label : undefined}
            data-testid={`orbit-node-${n.id}`}
            style={{
              transition: "opacity 600ms ease, filter 600ms ease",
              opacity: lit ? 1 : 0.18,
              filter: lit ? `drop-shadow(0 0 6px hsl(${n.color.replace("hsl(", "").replace(")", "")} / 0.6))` : "none",
              cursor: interactive ? "pointer" : "default",
              outline: "none",
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
              style={{ pointerEvents: "none" }}
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
