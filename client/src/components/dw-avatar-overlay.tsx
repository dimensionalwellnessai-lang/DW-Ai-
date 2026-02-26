/**
 * DWAvatarOverlay – 3D avatar overlay shown on every post-onboarding page.
 *
 * Architecture
 * ============
 * - Lazy-loads Babylon.js so it does not bloat the initial bundle.
 * - Builds a minimal procedural humanoid rig with a gentle idle breathing
 *   animation; falls back to a static placeholder when WebGL is unavailable
 *   or the user has prefers-reduced-motion enabled.
 * - Supports two layout modes: "full-body" and "head-shoulders" (upper crop).
 * - The user can toggle visibility and cycle layout; both preferences are
 *   persisted to localStorage.
 * - Hidden entirely on auth / onboarding pages, and while onboarding is
 *   incomplete.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, User } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pages where the avatar must not appear. */
const HIDDEN_PAGES = [
  '/welcome',
  '/login',
  '/reset-password',
  '/voice-onboarding',
  '/enhanced-onboarding',
  '/app-tour',
  '/account/delete',
  '/subscription',
  '/paywall',
];

const PREF_VISIBLE_KEY = 'dw:avatarOverlayVisible';
const PREF_LAYOUT_KEY = 'dw:avatarOverlayLayout';

export type AvatarLayoutMode = 'full-body' | 'head-shoulders';

/** Canvas dimensions per layout mode. */
const LAYOUT_DIMS: Record<AvatarLayoutMode, { w: number; h: number }> = {
  'full-body':     { w: 90,  h: 210 },
  'head-shoulders':{ w: 78,  h: 96  },
};

/**
 * Idle breathing keyframes – very subtle torso rise/fall over ~6 s cycle
 * (180 frames @ 30 fps).
 */
const IDLE_KEYFRAMES = [
  { frame: 0,   torsoY: 1.15, armAngle: 0.00 },
  { frame: 90,  torsoY: 1.17, armAngle: 0.03 },
  { frame: 180, torsoY: 1.15, armAngle: 0.00 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readBool(key: string, defaultVal: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return defaultVal;
    return v === '1';
  } catch {
    return defaultVal;
  }
}

function writeBool(key: string, value: boolean): void {
  try { localStorage.setItem(key, value ? '1' : '0'); } catch { /* ignore */ }
}

function readLayout(): AvatarLayoutMode {
  try {
    const v = localStorage.getItem(PREF_LAYOUT_KEY);
    if (v === 'head-shoulders') return 'head-shoulders';
  } catch { /* ignore */ }
  return 'full-body';
}

function writeLayout(v: AvatarLayoutMode): void {
  try { localStorage.setItem(PREF_LAYOUT_KEY, v); } catch { /* ignore */ }
}

function isOnboardingComplete(): boolean {
  try {
    if (localStorage.getItem('dw_onboarding_completed') === '1') return true;
    const data = localStorage.getItem('dw_guest_data');
    if (data) {
      const parsed = JSON.parse(data);
      return !!parsed.profileSetup?.completedAt;
    }
  } catch { /* ignore */ }
  return false;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Static fallback avatar (SVG-based silhouette)
// ---------------------------------------------------------------------------

function StaticAvatarFallback({ mode }: { mode: AvatarLayoutMode }) {
  const isHeadShoulders = mode === 'head-shoulders';
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-0.5 opacity-50">
        {/* Head */}
        <div className="w-7 h-7 rounded-full bg-primary/30" />
        {/* Neck */}
        <div className="w-2.5 h-2 bg-primary/20" />
        {/* Shoulders / torso */}
        <div className="w-10 h-7 rounded-sm bg-primary/20" />
        {!isHeadShoulders && (
          <>
            {/* Arms */}
            <div className="flex gap-5 -mt-6 mb-1">
              <div className="w-2 h-10 rounded bg-primary/15" />
              <div className="w-2 h-10 rounded bg-primary/15" />
            </div>
            {/* Legs */}
            <div className="flex gap-3 mt-1">
              <div className="w-2.5 h-12 rounded bg-primary/20" />
              <div className="w-2.5 h-12 rounded bg-primary/20" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DWAvatarOverlay() {
  const [location] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<unknown>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);

  const [isVisible, setIsVisible] = useState(() => readBool(PREF_VISIBLE_KEY, true));
  const [layoutMode, setLayoutMode] = useState<AvatarLayoutMode>(readLayout);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const shouldHide = HIDDEN_PAGES.some(
    (p) => location === p || location.startsWith(p + '/'),
  );
  const onboardingDone = isOnboardingComplete();
  const reducedMotion = prefersReducedMotion();

  // Build (or rebuild) the Babylon.js scene
  const buildScene = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Lazy-load Babylon – does not block initial render
      const BABYLON = await import('@babylonjs/core');

      // Dispose previous engine if switching layout
      if (engineRef.current) {
        (engineRef.current as { dispose(): void }).dispose();
        engineRef.current = null;
      }

      const engine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: false,
        stencil: false,
        limitDeviceRatio: Math.min(window.devicePixelRatio, 1.5),
      });
      engineRef.current = engine;

      const scene = new BABYLON.Scene(engine);
      scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // transparent

      // ---- Camera (fixed; no user controls in v1) ----
      const isHeadShoulders = layoutMode === 'head-shoulders';
      new BABYLON.ArcRotateCamera(
        'cam',
        -Math.PI / 2,
        isHeadShoulders ? 1.28 : 1.4,
        isHeadShoulders ? 1.9 : 5.2,
        new BABYLON.Vector3(0, isHeadShoulders ? 1.62 : 1.0, 0),
        scene,
      );

      // ---- Lighting ----
      const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
      hemi.intensity = 0.9;
      const dir = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-0.5, -1, -0.5), scene);
      dir.intensity = 0.4;

      // ---- Procedural rig material ----
      const mat = new BABYLON.StandardMaterial('dwMat', scene);
      mat.diffuseColor = new BABYLON.Color3(0.38, 0.50, 0.88);
      mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

      const mkBox = (
        name: string,
        w: number, h: number, d: number,
        x: number, y: number, z: number,
        parent?: import('@babylonjs/core').Node,
      ) => {
        const m = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
        m.position.set(x, y, z);
        m.material = mat;
        if (parent) m.parent = parent;
        return m;
      };

      // Root / torso pivot
      const root = new BABYLON.TransformNode('root', scene);
      root.position.y = 0;

      const torsoPivot = new BABYLON.TransformNode('torsoPivot', scene);
      torsoPivot.parent = root;
      torsoPivot.position.y = 1.15;

      mkBox('torso', 0.40, 0.60, 0.22, 0, 0, 0).parent = torsoPivot;
      mkBox('neck',  0.10, 0.12, 0.10, 0, 0.36, 0).parent = torsoPivot;

      const head = BABYLON.MeshBuilder.CreateSphere('head', { diameter: 0.36 }, scene);
      head.position.set(0, 0.54, 0);
      head.material = mat;
      head.parent = torsoPivot;

      // Arms
      const lShoulder = new BABYLON.TransformNode('lShoulder', scene);
      lShoulder.parent = torsoPivot;
      lShoulder.position.set(-0.28, 0.25, 0);
      mkBox('lArm', 0.10, 0.58, 0.10, 0, -0.29, 0).parent = lShoulder;

      const rShoulder = new BABYLON.TransformNode('rShoulder', scene);
      rShoulder.parent = torsoPivot;
      rShoulder.position.set(0.28, 0.25, 0);
      mkBox('rArm', 0.10, 0.58, 0.10, 0, -0.29, 0).parent = rShoulder;

      // Legs
      const lHip = new BABYLON.TransformNode('lHip', scene);
      lHip.parent = torsoPivot;
      lHip.position.set(-0.12, -0.30, 0);
      mkBox('lLeg', 0.12, 0.82, 0.12, 0, -0.41, 0).parent = lHip;

      const rHip = new BABYLON.TransformNode('rHip', scene);
      rHip.parent = torsoPivot;
      rHip.position.set(0.12, -0.30, 0);
      mkBox('rLeg', 0.12, 0.82, 0.12, 0, -0.41, 0).parent = rHip;

      // Feet
      mkBox('lFoot', 0.18, 0.07, 0.10, 0.03, -0.82, 0.04).parent = lHip;
      mkBox('rFoot', 0.18, 0.07, 0.10, 0.03, -0.82, 0.04).parent = rHip;

      // ---- Idle breathing animation ----
      const fps = 30;
      const lastFrame = IDLE_KEYFRAMES[IDLE_KEYFRAMES.length - 1].frame;

      const torsoAnim = new BABYLON.Animation(
        'torsoBreath', 'position.y', fps,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
      );
      torsoAnim.setKeys(IDLE_KEYFRAMES.map((kf) => ({ frame: kf.frame, value: kf.torsoY })));
      torsoPivot.animations = [torsoAnim];

      // Subtle arm sway
      const armAnim = new BABYLON.Animation(
        'armSway', 'rotation.z', fps,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
      );
      armAnim.setKeys(IDLE_KEYFRAMES.map((kf) => ({ frame: kf.frame, value: kf.armAngle })));
      lShoulder.animations = [armAnim];

      scene.beginAnimation(torsoPivot, 0, lastFrame, true);
      scene.beginAnimation(lShoulder, 0, lastFrame, true);

      // ---- Render loop ----
      engine.runRenderLoop(() => scene.render());

      const onResize = () => engine.resize();
      resizeHandlerRef.current = onResize;
      window.addEventListener('resize', onResize);

      setIsLoaded(true);
    } catch {
      setLoadError(true);
    }
  }, [layoutMode]);

  // Mount / re-mount scene when visibility, layout, or routing changes
  useEffect(() => {
    if (!isVisible || shouldHide || !onboardingDone || reducedMotion) return;

    setIsLoaded(false);
    setLoadError(false);
    buildScene();

    return () => {
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
        resizeHandlerRef.current = null;
      }
      if (engineRef.current) {
        (engineRef.current as { dispose(): void }).dispose();
        engineRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildScene, isVisible, shouldHide, onboardingDone]);

  // ---- Toggle handlers ----

  const toggleVisible = () => {
    setIsVisible((v) => {
      const next = !v;
      writeBool(PREF_VISIBLE_KEY, next);
      return next;
    });
  };

  const cycleLayout = () => {
    setLayoutMode((m) => {
      const next: AvatarLayoutMode = m === 'full-body' ? 'head-shoulders' : 'full-body';
      writeLayout(next);
      return next;
    });
  };

  // Do not render on auth/onboarding pages or before onboarding completes
  if (shouldHide || !onboardingDone) return null;

  const { w, h } = LAYOUT_DIMS[layoutMode];
  const showCanvas = isVisible && !reducedMotion && !loadError;
  const showFallback = isVisible && (reducedMotion || loadError);

  return (
    <div
      className="fixed z-40 select-none pointer-events-none"
      style={{
        bottom: 'calc(var(--bottom-nav-total-height, 88px) + 8px)',
        right: '8px',
      }}
      data-testid="dw-avatar-overlay"
    >
      {/* Show/hide toggle – always pointer-events enabled */}
      <button
        onClick={toggleVisible}
        className={cn(
          'pointer-events-auto absolute -top-2 -left-2 z-10',
          'rounded-full w-6 h-6 flex items-center justify-center',
          'bg-background/80 border border-border shadow-sm',
          'text-muted-foreground hover:text-foreground',
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
          'transition-colors',
        )}
        aria-label={isVisible ? 'Hide DW avatar' : 'Show DW avatar'}
        title={isVisible ? 'Hide avatar' : 'Show avatar'}
      >
        {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>

      {isVisible && (
        <>
          {/* Layout toggle */}
          <button
            onClick={cycleLayout}
            className={cn(
              'pointer-events-auto absolute -top-2 right-0 z-10',
              'rounded-full w-6 h-6 flex items-center justify-center',
              'bg-background/80 border border-border shadow-sm',
              'text-muted-foreground hover:text-foreground',
              'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
              'transition-colors',
            )}
            aria-label={`Switch to ${layoutMode === 'full-body' ? 'head and shoulders' : 'full body'} view`}
            title="Toggle avatar size"
          >
            <User className="h-3 w-3" />
          </button>

          {/* Avatar container */}
          <div
            className={cn(
              'relative rounded-xl overflow-hidden shadow-lg',
              'bg-gradient-to-b from-muted/20 to-muted/5',
              'border border-border/40',
              'transition-all duration-300',
            )}
            style={{ width: w, height: h }}
          >
            {/* WebGL canvas */}
            {showCanvas && (
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', display: 'block' }}
                aria-label="DW 3D avatar"
                role="img"
              />
            )}

            {/* Loading spinner */}
            {isVisible && !isLoaded && !loadError && !reducedMotion && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {/* Static fallback (reduced motion or WebGL error) */}
            {showFallback && <StaticAvatarFallback mode={layoutMode} />}
          </div>
        </>
      )}
    </div>
  );
}
