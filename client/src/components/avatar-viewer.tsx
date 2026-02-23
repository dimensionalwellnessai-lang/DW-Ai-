/**
 * AvatarViewer – Babylon.js (WebGL) 3D avatar demo component.
 *
 * Architecture
 * ============
 * 1. A Babylon.js Engine drives a WebGL canvas.
 * 2. A procedural human rig is built from primitive meshes when no GLB is present.
 * 3. Animations are implemented via Babylon.js Animation objects that drive the rig.
 * 4. Camera framing is contextual (full-body / upper-body / lower-body / close-up)
 *    and is NOT controllable by the user in v1 (no pan/gesture controls).
 * 5. The entire Babylon.js bundle is lazy-loaded via dynamic import so mobile
 *    first paint is not penalised.
 * 6. GLB loading: when `/assets/avatars/<clipName>.glb` is present it is loaded
 *    instead of the procedural rig; falls back silently to procedural.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { CameraProfile, MotionDefinition } from '@/lib/avatar-motion-library';

// ---------------------------------------------------------------------------
// Types exposed to consumers
// ---------------------------------------------------------------------------

export interface AvatarViewerProps {
  /** MotionDefinition to demonstrate */
  motion: MotionDefinition;
  /** Override play state; defaults to true */
  isPlaying?: boolean;
  /** Container width in px (canvas fills this) */
  width?: number;
  /** Container height in px */
  height?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Camera position presets (Babylon.js ArcRotateCamera alpha/beta/radius)
// ---------------------------------------------------------------------------

interface CameraPreset {
  alpha: number; // radians – horizontal rotation
  beta: number;  // radians – vertical angle
  radius: number; // distance from target
  targetY: number; // look-at Y (world)
}

const CAMERA_PRESETS: Record<CameraProfile, CameraPreset> = {
  'full-body':   { alpha: -Math.PI / 2, beta: 1.4,  radius: 5.5, targetY: 1.0 },
  'upper-body':  { alpha: -Math.PI / 2, beta: 1.35, radius: 3.5, targetY: 1.4 },
  'lower-body':  { alpha: -Math.PI / 2, beta: 1.5,  radius: 3.5, targetY: 0.4 },
  'close-up':    { alpha: -Math.PI / 2, beta: 1.3,  radius: 2.0, targetY: 1.6 },
};

// ---------------------------------------------------------------------------
// Procedural rig geometry constants (all in Babylon world units)
// Rough proportions of a stylised standing human.
// ---------------------------------------------------------------------------

const RIG = {
  headRadius: 0.18,
  headY: 1.72,
  neckHeight: 0.12,
  neckY: 1.54,
  torsoW: 0.4, torsoH: 0.6, torsoD: 0.22, torsoY: 1.15,
  upperArmL: 0.3, upperArmW: 0.1,
  lowerArmL: 0.28, lowerArmW: 0.09,
  shoulderOffsetX: 0.28,
  upperLegL: 0.42, upperLegW: 0.13,
  lowerLegL: 0.40, lowerLegW: 0.11,
  footL: 0.22, footH: 0.08,
  hipOffsetX: 0.12,
  hipY: 0.85,
  floorY: 0,
};

// ---------------------------------------------------------------------------
// Animation key-frame definitions (procedural rig only)
// Each entry drives the torso Y offset and a simplified arm/leg rotation.
// Real GLB clips will replace these when assets are available.
// ---------------------------------------------------------------------------

interface ProcKeyFrame {
  frame: number;   // animation frame index
  torsoY: number;  // world-Y of torso pivot
  armAngle: number;   // shoulder rotation (radians)
  legAngle: number;   // hip rotation (radians)
}

type ProcAnim = ProcKeyFrame[];

/** Returns a simple 60fps keyframe sequence for the given clip name. */
function getProceduralAnim(clipName: string): ProcAnim {
  switch (clipName) {
    case 'push_up':
      return [
        { frame: 0,  torsoY: 0.5, armAngle: -1.1, legAngle: 0 },
        { frame: 30, torsoY: 0.3, armAngle: -1.5, legAngle: 0 },
        { frame: 60, torsoY: 0.5, armAngle: -1.1, legAngle: 0 },
      ];
    case 'squat':
    case 'band_squat':
      return [
        { frame: 0,  torsoY: 1.15, armAngle: 0.3, legAngle: 0    },
        { frame: 45, torsoY: 0.75, armAngle: 0.5, legAngle: 0.8  },
        { frame: 90, torsoY: 1.15, armAngle: 0.3, legAngle: 0    },
      ];
    case 'lunge':
      return [
        { frame: 0,  torsoY: 1.15, armAngle: 0.1, legAngle: 0.0 },
        { frame: 45, torsoY: 0.85, armAngle: 0.2, legAngle: 0.6 },
        { frame: 90, torsoY: 1.15, armAngle: 0.1, legAngle: 0.0 },
      ];
    case 'pull_up':
      return [
        { frame: 0,  torsoY: 1.15, armAngle: -2.5, legAngle: 0   },
        { frame: 45, torsoY: 1.45, armAngle: -1.8, legAngle: 0.2 },
        { frame: 90, torsoY: 1.15, armAngle: -2.5, legAngle: 0   },
      ];
    case 'shoulder_press':
      return [
        { frame: 0,  torsoY: 1.15, armAngle: 0.2,  legAngle: 0 },
        { frame: 45, torsoY: 1.15, armAngle: -2.6, legAngle: 0 },
        { frame: 90, torsoY: 1.15, armAngle: 0.2,  legAngle: 0 },
      ];
    case 'dumbbell_curl':
    case 'band_lateral_raise':
    case 'band_chest_press':
    case 'band_row':
      return [
        { frame: 0,  torsoY: 1.15, armAngle: 0.0,  legAngle: 0 },
        { frame: 40, torsoY: 1.15, armAngle: -1.2, legAngle: 0 },
        { frame: 80, torsoY: 1.15, armAngle: 0.0,  legAngle: 0 },
      ];
    case 'deadlift':
      return [
        { frame: 0,  torsoY: 1.15, armAngle: 0.1, legAngle: 0   },
        { frame: 45, torsoY: 0.85, armAngle: 0.3, legAngle: 0.3 },
        { frame: 90, torsoY: 1.15, armAngle: 0.1, legAngle: 0   },
      ];
    case 'calf_raise':
      return [
        { frame: 0,  torsoY: 1.15, armAngle: 0, legAngle: 0   },
        { frame: 30, torsoY: 1.25, armAngle: 0, legAngle: 0.1 },
        { frame: 60, torsoY: 1.15, armAngle: 0, legAngle: 0   },
      ];
    case 'glute_bridge':
      return [
        { frame: 0,  torsoY: 0.3, armAngle: 0.1, legAngle: 0   },
        { frame: 40, torsoY: 0.6, armAngle: 0.1, legAngle: 0.5 },
        { frame: 80, torsoY: 0.3, armAngle: 0.1, legAngle: 0   },
      ];
    case 'step_up':
      return [
        { frame: 0,  torsoY: 1.15, armAngle: 0.1, legAngle: 0   },
        { frame: 30, torsoY: 1.35, armAngle: 0.3, legAngle: 0.5 },
        { frame: 60, torsoY: 1.15, armAngle: 0.1, legAngle: 0   },
      ];
    case 'plank':
      return [
        { frame: 0,  torsoY: 0.5, armAngle: -1.3, legAngle: 0    },
        { frame: 30, torsoY: 0.52, armAngle: -1.3, legAngle: 0.02 },
        { frame: 60, torsoY: 0.5,  armAngle: -1.3, legAngle: 0    },
      ];
    case 'crunch':
      return [
        { frame: 0,  torsoY: 0.25, armAngle: 0.8, legAngle: 0.5 },
        { frame: 35, torsoY: 0.45, armAngle: 0.3, legAngle: 0.5 },
        { frame: 70, torsoY: 0.25, armAngle: 0.8, legAngle: 0.5 },
      ];
    case 'russian_twist':
      return [
        { frame: 0,  torsoY: 0.35, armAngle: 0.6, legAngle: 0.4 },
        { frame: 30, torsoY: 0.35, armAngle: 1.0, legAngle: 0.4 },
        { frame: 60, torsoY: 0.35, armAngle: 0.2, legAngle: 0.4 },
        { frame: 90, torsoY: 0.35, armAngle: 0.6, legAngle: 0.4 },
      ];
    case 'leg_raise':
      return [
        { frame: 0,  torsoY: 0.2, armAngle: 0.1, legAngle: 0   },
        { frame: 45, torsoY: 0.2, armAngle: 0.1, legAngle: -0.9 },
        { frame: 90, torsoY: 0.2, armAngle: 0.1, legAngle: 0    },
      ];
    case 'dead_bug':
      return [
        { frame: 0,  torsoY: 0.2, armAngle: -1.6, legAngle: 0.5 },
        { frame: 40, torsoY: 0.2, armAngle: 0.1,  legAngle: -0.5 },
        { frame: 80, torsoY: 0.2, armAngle: -1.6, legAngle: 0.5  },
      ];
    case 'jumping_jack':
      return [
        { frame: 0,  torsoY: 1.15, armAngle: 0.1,  legAngle: 0.0 },
        { frame: 20, torsoY: 1.2,  armAngle: -1.5, legAngle: 0.5 },
        { frame: 40, torsoY: 1.15, armAngle: 0.1,  legAngle: 0.0 },
      ];
    case 'high_knees':
      return [
        { frame: 0,  torsoY: 1.15, armAngle: 0.2,  legAngle: 0.0 },
        { frame: 15, torsoY: 1.15, armAngle: -0.4, legAngle: 0.8 },
        { frame: 30, torsoY: 1.15, armAngle: 0.4,  legAngle: -0.4 },
        { frame: 45, torsoY: 1.15, armAngle: -0.4, legAngle: 0.8  },
        { frame: 60, torsoY: 1.15, armAngle: 0.2,  legAngle: 0.0  },
      ];
    case 'burpee':
      return [
        { frame: 0,  torsoY: 1.15, armAngle: 0.1,  legAngle: 0.0 },
        { frame: 25, torsoY: 0.5,  armAngle: -1.3, legAngle: 0.0 },
        { frame: 50, torsoY: 0.5,  armAngle: -1.3, legAngle: 0.0 },
        { frame: 70, torsoY: 1.2,  armAngle: -2.0, legAngle: 0.5 },
        { frame: 90, torsoY: 1.15, armAngle: 0.1,  legAngle: 0.0 },
      ];
    case 'mountain_climber':
      return [
        { frame: 0,  torsoY: 0.55, armAngle: -1.3, legAngle: 0.0 },
        { frame: 20, torsoY: 0.55, armAngle: -1.3, legAngle: 0.9 },
        { frame: 40, torsoY: 0.55, armAngle: -1.3, legAngle: 0.0 },
        { frame: 60, torsoY: 0.55, armAngle: -1.3, legAngle: 0.9 },
        { frame: 80, torsoY: 0.55, armAngle: -1.3, legAngle: 0.0 },
      ];
    // Stretches, yoga & breathwork use a gentle sway
    case 'downward_dog':
    case 'warrior_one':
    case 'child_pose':
    case 'standing_quad_stretch':
    case 'hamstring_stretch':
    case 'shoulder_stretch':
    case 'box_breathing':
    case 'belly_breathing':
    case 'tricep_dip':
    default:
      return [
        { frame: 0,   torsoY: 1.15, armAngle: 0.0,  legAngle: 0.0 },
        { frame: 60,  torsoY: 1.17, armAngle: 0.05, legAngle: 0.0 },
        { frame: 120, torsoY: 1.15, armAngle: 0.0,  legAngle: 0.0 },
      ];
  }
}

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

/** Unified play/pause handle covering both GLB animation groups and procedural animatables. */
interface AnimHandle {
  play(): void;
  pause(): void;
}

export function AvatarViewer({
  motion,
  isPlaying = true,
  width = 320,
  height = 400,
  className = '',
}: AvatarViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<unknown>(null);
  const sceneRef = useRef<unknown>(null);
  /** Unified handle for both GLB animation groups and procedural animatables. */
  const animHandleRef = useRef<AnimHandle | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ---- Build / rebuild the Babylon scene ----
  const buildScene = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Lazy-load Babylon.js so it doesn't bloat the initial bundle
      const BABYLON = await import('@babylonjs/core');
      await import('@babylonjs/loaders'); // registers glTF/GLB loaders

      // Dispose previous engine if re-mounting
      if (engineRef.current) {
        (engineRef.current as { dispose(): void }).dispose();
      }

      // ---- Engine ----
      const engine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        // Reduce memory footprint on mobile
        limitDeviceRatio: Math.min(window.devicePixelRatio, 2),
      });
      engineRef.current = engine;

      // ---- Scene ----
      const scene = new BABYLON.Scene(engine);
      scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // transparent bg
      sceneRef.current = scene;

      // ---- Camera (read-only in v1 – no pan/gesture controls) ----
      const preset = CAMERA_PRESETS[motion.cameraProfile];
      const camera = new BABYLON.ArcRotateCamera(
        'cam',
        preset.alpha,
        preset.beta,
        preset.radius,
        new BABYLON.Vector3(0, preset.targetY, 0),
        scene,
      );
      // Intentionally NOT attaching controls so the camera is fixed (v1 spec)
      // camera.attachControl(canvas, false); ← disabled on purpose

      // ---- Lighting ----
      const hemi = new BABYLON.HemisphericLight(
        'hemi',
        new BABYLON.Vector3(0, 1, 0),
        scene,
      );
      hemi.intensity = 0.8;
      const dir = new BABYLON.DirectionalLight(
        'dir',
        new BABYLON.Vector3(-1, -2, -1),
        scene,
      );
      dir.intensity = 0.5;

      // ---- Try to load GLB first ----
      let glbLoaded = false;
      try {
        const glbUrl = `/assets/avatars/${motion.clipName}.glb`;
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
          '',
          '',
          glbUrl,
          scene,
        );
        if (result.meshes.length > 0) {
          glbLoaded = true;
          // Play first animation group if present
          if (scene.animationGroups.length > 0) {
            const ag = scene.animationGroups[0];
            animHandleRef.current = {
              play: () => ag.play(true),
              pause: () => ag.pause(),
            };
            if (isPlaying) ag.play(true);
            else ag.pause();
          }
        }
      } catch {
        // GLB not available – fall through to procedural rig
      }

      // ---- Procedural rig (fallback when no GLB) ----
      if (!glbLoaded) {
        const animatables = buildProceduralRig(scene, BABYLON, motion);
        animHandleRef.current = {
          play: () => animatables.forEach((a) => a.restart()),
          pause: () => animatables.forEach((a) => a.pause()),
        };
        if (!isPlaying) animatables.forEach((a) => a.pause());
      }

      // ---- Floor grid (subtle) ----
      const ground = BABYLON.MeshBuilder.CreateGround(
        'ground',
        { width: 4, height: 4 },
        scene,
      );
      const groundMat = new BABYLON.StandardMaterial('groundMat', scene);
      groundMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15);
      groundMat.alpha = 0.4;
      ground.material = groundMat;

      // ---- Render loop ----
      engine.runRenderLoop(() => scene.render());
      const onResize = () => engine.resize();
      window.addEventListener('resize', onResize);
      // Store cleanup on the engine so the effect cleanup can remove it
      (engine as unknown as { _resizeHandler: () => void })._resizeHandler = onResize;

      setIsLoaded(true);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to initialise 3D engine',
      );
    }
  }, [motion, isPlaying]);

  // Initial mount – rebuild scene when motion changes
  useEffect(() => {
    buildScene();
    return () => {
      if (engineRef.current) {
        const engine = engineRef.current as {
          dispose(): void;
          _resizeHandler?: () => void;
        };
        if (engine._resizeHandler) {
          window.removeEventListener('resize', engine._resizeHandler);
        }
        engine.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion.id]);

  // Sync play state without rebuilding the scene
  useEffect(() => {
    if (!animHandleRef.current) return;
    if (isPlaying) animHandleRef.current.play();
    else animHandleRef.current.pause();
  }, [isPlaying]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-transparent ${className}`}
      style={{ width, height }}
      data-testid="avatar-viewer"
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-label={`3D demonstration of ${motion.name}`}
        role="img"
      />
      {/* Loading overlay */}
      {!isLoaded && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/60 rounded-lg">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
      {/* Error overlay */}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/60 rounded-lg p-4">
          <p className="text-xs text-muted-foreground text-center">{loadError}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Procedural rig builder
// ---------------------------------------------------------------------------

type BabylonModule = typeof import('@babylonjs/core');

function buildProceduralRig(
  scene: import('@babylonjs/core').Scene,
  BABYLON: BabylonModule,
  motion: MotionDefinition,
): import('@babylonjs/core').Animatable[] {
  const mat = new BABYLON.StandardMaterial('rigMat', scene);
  mat.diffuseColor = new BABYLON.Color3(0.3, 0.55, 0.9);
  mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

  const makeMesh = (
    name: string,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    parent?: import('@babylonjs/core').Mesh,
  ) => {
    const m = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z);
    m.material = mat;
    if (parent) m.parent = parent;
    return m;
  };

  // Root pivot at floor
  const root = new BABYLON.TransformNode('avatarRoot', scene);
  root.position.y = RIG.floorY;

  // Torso pivot – this is what our main animation drives
  const torsoPivot = new BABYLON.TransformNode('torsoPivot', scene);
  torsoPivot.parent = root;
  torsoPivot.position.y = RIG.torsoY;

  makeMesh('torso', RIG.torsoW, RIG.torsoH, RIG.torsoD, 0, 0, 0);
  // Neck
  makeMesh('neck', 0.1, RIG.neckHeight, 0.1, 0, RIG.neckHeight / 2 + RIG.torsoH / 2, 0);
  // Head
  const head = BABYLON.MeshBuilder.CreateSphere('head', { diameter: RIG.headRadius * 2 }, scene);
  head.position.set(0, RIG.torsoH / 2 + RIG.neckHeight + RIG.headRadius, 0);
  head.material = mat;

  // Upper arms (pivot at shoulder)
  const lShoulderPivot = new BABYLON.TransformNode('lShoulder', scene);
  lShoulderPivot.parent = torsoPivot;
  lShoulderPivot.position.set(-RIG.shoulderOffsetX, RIG.torsoH / 2 - 0.05, 0);

  const rShoulderPivot = new BABYLON.TransformNode('rShoulder', scene);
  rShoulderPivot.parent = torsoPivot;
  rShoulderPivot.position.set(RIG.shoulderOffsetX, RIG.torsoH / 2 - 0.05, 0);

  const lUpperArm = makeMesh('lUpperArm', RIG.upperArmW, RIG.upperArmL, RIG.upperArmW,
    0, -RIG.upperArmL / 2, 0);
  lUpperArm.parent = lShoulderPivot;

  const rUpperArm = makeMesh('rUpperArm', RIG.upperArmW, RIG.upperArmL, RIG.upperArmW,
    0, -RIG.upperArmL / 2, 0);
  rUpperArm.parent = rShoulderPivot;

  // Forearms
  const lElbowPivot = new BABYLON.TransformNode('lElbow', scene);
  lElbowPivot.parent = lShoulderPivot;
  lElbowPivot.position.set(0, -RIG.upperArmL, 0);

  const rElbowPivot = new BABYLON.TransformNode('rElbow', scene);
  rElbowPivot.parent = rShoulderPivot;
  rElbowPivot.position.set(0, -RIG.upperArmL, 0);

  makeMesh('lLowerArm', RIG.lowerArmW, RIG.lowerArmL, RIG.lowerArmW, 0, -RIG.lowerArmL / 2, 0).parent = lElbowPivot;
  makeMesh('rLowerArm', RIG.lowerArmW, RIG.lowerArmL, RIG.lowerArmW, 0, -RIG.lowerArmL / 2, 0).parent = rElbowPivot;

  // Legs (pivot at hip)
  const lHipPivot = new BABYLON.TransformNode('lHip', scene);
  lHipPivot.parent = torsoPivot;
  lHipPivot.position.set(-RIG.hipOffsetX, -RIG.torsoH / 2, 0);

  const rHipPivot = new BABYLON.TransformNode('rHip', scene);
  rHipPivot.parent = torsoPivot;
  rHipPivot.position.set(RIG.hipOffsetX, -RIG.torsoH / 2, 0);

  makeMesh('lUpperLeg', RIG.upperLegW, RIG.upperLegL, RIG.upperLegW, 0, -RIG.upperLegL / 2, 0).parent = lHipPivot;
  makeMesh('rUpperLeg', RIG.upperLegW, RIG.upperLegL, RIG.upperLegW, 0, -RIG.upperLegL / 2, 0).parent = rHipPivot;

  const lKneePivot = new BABYLON.TransformNode('lKnee', scene);
  lKneePivot.parent = lHipPivot;
  lKneePivot.position.set(0, -RIG.upperLegL, 0);

  const rKneePivot = new BABYLON.TransformNode('rKnee', scene);
  rKneePivot.parent = rHipPivot;
  rKneePivot.position.set(0, -RIG.upperLegL, 0);

  makeMesh('lLowerLeg', RIG.lowerLegW, RIG.lowerLegL, RIG.lowerLegW, 0, -RIG.lowerLegL / 2, 0).parent = lKneePivot;
  makeMesh('rLowerLeg', RIG.lowerLegW, RIG.lowerLegL, RIG.lowerLegW, 0, -RIG.lowerLegL / 2, 0).parent = rKneePivot;

  // Feet
  makeMesh('lFoot', RIG.footL, RIG.footH, 0.1, 0.04, -RIG.lowerLegL - RIG.footH / 2, 0.06).parent = lKneePivot;
  makeMesh('rFoot', RIG.footL, RIG.footH, 0.1, 0.04, -RIG.lowerLegL - RIG.footH / 2, 0.06).parent = rKneePivot;

  // Reparent loose meshes under torsoPivot
  const meshNames = ['torso', 'neck', 'head'];
  for (const name of meshNames) {
    const mesh = scene.getMeshByName(name);
    if (mesh) mesh.parent = torsoPivot;
  }

  // ---- Procedural animation ----
  const keyFrames = getProceduralAnim(motion.clipName);
  const lastFrame = keyFrames[keyFrames.length - 1].frame;
  const fps = 60;

  // torso Y
  const torsoAnim = new BABYLON.Animation(
    'torsoY',
    'position.y',
    fps,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  torsoAnim.setKeys(
    keyFrames.map((kf) => ({ frame: kf.frame, value: kf.torsoY })),
  );
  torsoPivot.animations = [torsoAnim];

  // Arm swing (left shoulder Z rotation)
  const armAnim = new BABYLON.Animation(
    'armAngle',
    'rotation.z',
    fps,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  armAnim.setKeys(
    keyFrames.map((kf) => ({ frame: kf.frame, value: kf.armAngle })),
  );
  lShoulderPivot.animations = [armAnim];

  // Leg swing (left hip X rotation)
  const legAnim = new BABYLON.Animation(
    'legAngle',
    'rotation.x',
    fps,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  legAnim.setKeys(
    keyFrames.map((kf) => ({ frame: kf.frame, value: kf.legAngle })),
  );
  lHipPivot.animations = [legAnim];

  const animatables = [
    scene.beginAnimation(torsoPivot, 0, lastFrame, true),
    scene.beginAnimation(lShoulderPivot, 0, lastFrame, true),
    scene.beginAnimation(lHipPivot, 0, lastFrame, true),
  ];

  return animatables;
}
