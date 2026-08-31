/**
 * The Constellation — geometric SVG identity mark for DW.
 *
 * Replaces the DWOrb with a mature, sacred-geometry feel:
 * 5 points of light connected by thin lines, animated by state.
 *
 * Props:
 *   zone   — Which Zone is active (shifts accent hue)
 *   state  — "idle" | "listening" | "speaking" | "alert"
 *   size   — Overall diameter in px (default 80)
 */

import { useEffect, useRef, useId } from "react";
import { cn } from "@/lib/utils";

export type ConstellationState = "idle" | "listening" | "speaking" | "alert";

export type ZoneId =
  | "physical" | "mental" | "spiritual" | "financial"
  | "relationships" | "career" | "learning" | "environment"
  | "creativity" | "fun" | "community" | "rest" | "identity";

interface ConstellationProps {
  zone?: ZoneId;
  state?: ConstellationState;
  size?: number;
  className?: string;
  /** Highlight a specific zone's point when state is "alert" */
  alertZone?: ZoneId;
}

// Zone hue accents — sophisticated, not rainbow
const ZONE_COLORS: Record<ZoneId, string> = {
  physical:      "#e8c97a",   // warm gold
  mental:        "#7ab8e8",   // cool blue
  spiritual:     "#b87ae8",   // violet
  financial:     "#7ae8a8",   // jade
  relationships: "#e87aab",   // rose
  career:        "#e8a87a",   // amber
  learning:      "#7ad4e8",   // sky
  environment:   "#a8e87a",   // sage
  creativity:    "#d47ae8",   // orchid
  fun:           "#e8d47a",   // yellow
  community:     "#7a9ce8",   // periwinkle
  rest:          "#8ecfe8",   // mist
  identity:      "#c8b8f0",   // lavender
};

const DEFAULT_COLOR = "#ffd700";

// Point layout: a loose star-cluster, not perfectly symmetric
const BASE_POINTS = [
  { x: 50, y: 12 },   // apex
  { x: 84, y: 38 },   // upper-right
  { x: 72, y: 78 },   // lower-right
  { x: 28, y: 78 },   // lower-left
  { x: 16, y: 38 },   // upper-left
];

// Which points connect (indices into BASE_POINTS)
const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
  [0, 2], [1, 3],
];

export function Constellation({
  zone,
  state = "idle",
  size = 80,
  className,
}: ConstellationProps) {
  // Unique ID per instance to avoid SVG def collisions when multiple
  // Constellation instances render on the same page.
  const uid = useId().replace(/:/g, "");
  const bgId = `cst-bg-${uid}`;
  const glowId = `cst-glow-${uid}`;
  const pointGlowId = `cst-pt-${uid}`;

  const accent = zone ? ZONE_COLORS[zone] : DEFAULT_COLOR;
  const svgRef = useRef<SVGSVGElement>(null);

  // Continuous rotation for idle / alert states
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const group = svg.querySelector<SVGGElement>(".cst-group");
    if (!group) return;

    let frame: number;
    let angle = 0;
    let start: number | null = null;

    const tick = (ts: number) => {
      if (!start) start = ts;
      const speed = state === "alert" ? 0.6 : state === "idle" ? 0.2 : 0;
      angle = ((ts - start) * speed) % 360;
      group.setAttribute("transform", `rotate(${angle}, 50, 50)`);
      frame = requestAnimationFrame(tick);
    };

    if (state === "idle" || state === "alert") {
      frame = requestAnimationFrame(tick);
    } else {
      group.setAttribute("transform", `rotate(0, 50, 50)`);
    }

    return () => cancelAnimationFrame(frame);
  }, [state]);

  const lineOpacity =
    state === "idle" ? 0.35 :
    state === "listening" ? 0.65 :
    state === "speaking" ? 0.55 :
    0.45;

  // Keyframe class selection — static names, no interpolation
  const pointAnimClass =
    state === "speaking" ? "cst-point--speaking" :
    state === "listening" ? "cst-point--listening" :
    "";

  const alertAnimClass = state === "alert" ? "cst-point--alert" : "";

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn("constellation", className)}
      aria-label={`DW Constellation — ${state}`}
      role="img"
    >
      <defs>
        <radialGradient id={bgId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a1a2e" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0a0a0f" stopOpacity="0.95" />
        </radialGradient>

        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={pointGlowId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* All keyframe variants defined statically — no interpolation */}
        <style>{`
          .cst-point--speaking {
            animation: cst-pulse-speaking 0.8s ease-in-out infinite alternate;
          }
          .cst-point--listening {
            animation: cst-pulse-listening 1.6s ease-in-out infinite alternate;
          }
          .cst-point--alert {
            animation: cst-flash 0.6s ease-in-out infinite alternate;
          }
          @keyframes cst-pulse-speaking {
            from { r: 2.5; opacity: 0.8; }
            to   { r: 4.5; opacity: 1; }
          }
          @keyframes cst-pulse-listening {
            from { r: 2.5; opacity: 0.7; }
            to   { r: 4;   opacity: 1; }
          }
          @keyframes cst-flash {
            from { opacity: 0.3; }
            to   { opacity: 1; }
          }
        `}</style>
      </defs>

      {/* Background disc */}
      <circle cx="50" cy="50" r="48" fill={`url(#${bgId})`} />

      {/* Outer subtle ring */}
      <circle
        cx="50" cy="50" r="46"
        fill="none"
        stroke={accent}
        strokeWidth="0.3"
        opacity="0.2"
      />

      {/* Rotating inner group */}
      <g className="cst-group">
        {/* Connecting lines */}
        {EDGES.map(([a, b], i) => (
          <line
            key={i}
            x1={BASE_POINTS[a].x}
            y1={BASE_POINTS[a].y}
            x2={BASE_POINTS[b].x}
            y2={BASE_POINTS[b].y}
            stroke={accent}
            strokeWidth="0.4"
            opacity={lineOpacity}
            filter={`url(#${glowId})`}
          />
        ))}

        {/* Points */}
        {BASE_POINTS.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={i === 0 ? 3.5 : 2.5}
            fill={accent}
            opacity={state === "idle" ? 0.7 : 0.95}
            filter={`url(#${pointGlowId})`}
            className={cn(
              pointAnimClass,
              i === 0 && alertAnimClass
            )}
          />
        ))}
      </g>

      {/* Central anchor point */}
      <circle
        cx="50" cy="50"
        r="1.8"
        fill={accent}
        opacity="0.9"
        filter={`url(#${pointGlowId})`}
      />
    </svg>
  );
}
