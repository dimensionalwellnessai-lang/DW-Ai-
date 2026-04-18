// /onboarding — six-act conversational onboarding that ends in the orbit
// power-on reveal + Life System Document.
//
// Acts:
//   1. Welcome + Big Idea       — explain the 3 layers, single CTA "Let's build yours."
//   2. Basics                   — name, birthday, wake/sleep, schedule, location
//   3. Stabilize Your Core      — one open question per Core pillar (9)
//   4. Define Your Expression   — pick which Expression pillars are on, then one Q each
//   5. Build Your Creation      — 1–3 active projects (auto-seeds "Living my Life System")
//   6. Reveal                   — orbit power-on animation → Life System Document
//
// The whole flow saves silently in the background — pillar.content.userVoice
// captures the user's own words for each pillar so the final document can
// weave them in.
//
// "Adopt the Starter Template" on the welcome screen is an alternate path
// that skips Acts 2–5 and jumps straight to a populated Reveal.
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  PILLARS_BY_LEVEL,
  LEVEL_META,
  toneForLevel,
  type LifeSystemPillarId,
  type PillarDefinition,
} from "@shared/lifeSystemTaxonomy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ThreeRingOrbit } from "@/components/life-system/three-ring-orbit";
import { Loader2, Sparkles, ArrowRight, SkipForward } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  upsertPillar,
  createProject,
  adoptStarterTemplate,
  generateLifeSystemDocument,
} from "@/lib/life-system";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/use-page-meta";

type Act = "welcome" | "basics" | "core" | "expression" | "creation" | "reveal";

interface BasicsState {
  name: string;
  birthday: string;
  wakeTime: string;
  sleepTime: string;
  workSchedule: string;
  city: string;
}

const CORE = PILLARS_BY_LEVEL.core;
const EXPRESSION = PILLARS_BY_LEVEL.expression;

export default function LifeSystemOnboardingPage() {
  usePageMeta("Build Your Life System", "DW will help you build your operating system, layer by layer.");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [act, setAct] = useState<Act>("welcome");

  // ── State that persists across acts ────────────────────────────────────
  const [basics, setBasics] = useState<BasicsState>({
    name: "",
    birthday: "",
    wakeTime: "06:30",
    sleepTime: "23:00",
    workSchedule: "Mon–Thu 8:30–5",
    city: "",
  });
  const [coreAnswers, setCoreAnswers] = useState<Record<string, string>>({});
  const [expressionEnabled, setExpressionEnabled] = useState<Record<string, boolean>>(
    () => Object.fromEntries(EXPRESSION.map(p => [p.id, p.defaultOn])),
  );
  const [expressionAnswers, setExpressionAnswers] = useState<Record<string, string>>({});
  const [projectNames, setProjectNames] = useState<string[]>([""]);
  const [savingFinal, setSavingFinal] = useState(false);

  // ── Lit set for the live orbit (right pane in core / expression) ──────
  const litPillars = useMemo(() => {
    const set = new Set<LifeSystemPillarId>();
    for (const p of CORE) {
      if ((coreAnswers[p.id] ?? "").trim() !== "") set.add(p.id);
    }
    for (const p of EXPRESSION) {
      if (expressionEnabled[p.id] && (expressionAnswers[p.id] ?? "").trim() !== "") set.add(p.id);
    }
    return set;
  }, [coreAnswers, expressionEnabled, expressionAnswers]);

  const litProjectsSet = useMemo(
    () => new Set(projectNames.map(n => n.trim()).filter(Boolean)),
    [projectNames],
  );
  const projectsForOrbit = useMemo(
    () => projectNames.map(n => n.trim()).filter(Boolean).map(n => ({ name: n })),
    [projectNames],
  );

  // ───────────────────────────────────────────────────────────────────────
  async function adoptStarterAndSkip() {
    setSavingFinal(true);
    try {
      await adoptStarterTemplate(true);
      await generateLifeSystemDocument();
      finishOnboarding();
    } catch (e) {
      toast({ title: "Couldn't adopt", variant: "destructive" });
    } finally {
      setSavingFinal(false);
    }
  }

  /**
   * Save everything captured during the conversation — basics, every Core
   * pillar with the user's voice, every enabled Expression pillar, every
   * named Project — then generate the Life System Document for the reveal.
   */
  async function persistAllAndGenerate() {
    setSavingFinal(true);
    try {
      // 1) Basics → user record + onboarding profile (best-effort).
      if (basics.name.trim()) {
        await apiRequest("PATCH", "/api/users/me", {
          firstName: basics.name.trim().slice(0, 50),
        }).catch(() => {});
      }
      await apiRequest("POST", "/api/onboarding/complete", {
        responsibilities: [],
        priorities: [],
        wellnessFocus: ["physical"],
        shortTermGoals: "",
        longTermGoals: "",
        schedule: {
          wakeTime: basics.wakeTime,
          sleepTime: basics.sleepTime,
        },
        lifeAreaDetails: {
          birthDate: basics.birthday || undefined,
          currentLocation: basics.city || undefined,
          wakeTime: basics.wakeTime,
          sleepTime: basics.sleepTime,
          workSchedule: basics.workSchedule,
        },
        systemName: basics.name ? `${basics.name}'s Life System` : "My Life System",
      }).catch(() => {});

      // 2) Foundation pillar gets the identity headline.
      const foundationContent = {
        identityStatement: `I am ${basics.name || "someone"} who chooses, on purpose. My life runs on systems I've built.`,
        userVoice: coreAnswers["foundation"] ?? "",
      };
      await upsertPillar("foundation", { enabled: true, content: foundationContent });

      // 3) Every other Core pillar gets the user's spoken answer as userVoice.
      for (const p of CORE) {
        if (p.id === "foundation") continue;
        const voice = (coreAnswers[p.id] ?? "").trim();
        if (!voice) continue;
        await upsertPillar(p.id, { enabled: true, content: { userVoice: voice } });
      }

      // 4) Expression pillars: enable & save voice (or disable explicitly).
      for (const p of EXPRESSION) {
        const enabled = !!expressionEnabled[p.id];
        const voice = (expressionAnswers[p.id] ?? "").trim();
        await upsertPillar(p.id, {
          enabled,
          content: voice ? { userVoice: voice } : {},
        });
      }

      // 5) Creation: ensure Projects pillar is on, then create projects.
      await upsertPillar("projects", { enabled: true, content: {} });
      const names = projectNames.map(n => n.trim()).filter(Boolean);
      const projectsToSeed = names.length > 0 ? names : ["Living my Life System"];
      for (const name of projectsToSeed) {
        await createProject({ name, status: "active" });
      }

      // 6) Generate the Life System Document.
      await generateLifeSystemDocument();
      await queryClient.invalidateQueries({ queryKey: ["/api/life-system/pillars"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/life-system/document"] });
    } catch (e) {
      console.error("life-system onboarding save failed", e);
      toast({ title: "Saved most of it, but something hiccuped", variant: "destructive" });
    } finally {
      setSavingFinal(false);
    }
  }

  function finishOnboarding() {
    try {
      localStorage.setItem("dw:isReturning", "1");
      localStorage.setItem("dw_onboarding_completed", "1");
    } catch {}
    setLocation("/life-system/document");
  }

  // ───────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background"
      data-testid="page-life-system-onboarding"
    >
      <div className="max-w-3xl mx-auto px-4 py-10">
        <AnimatePresence mode="wait">
          {act === "welcome" && (
            <ActWrap key="welcome">
              <ActWelcome
                onContinue={() => setAct("basics")}
                onAdoptStarter={adoptStarterAndSkip}
                adopting={savingFinal}
              />
            </ActWrap>
          )}

          {act === "basics" && (
            <ActWrap key="basics">
              <ActBasics
                value={basics}
                onChange={setBasics}
                onContinue={() => setAct("core")}
                onSkip={() => setAct("core")}
              />
            </ActWrap>
          )}

          {act === "core" && (
            <ActWrap key="core">
              <ActCore
                answers={coreAnswers}
                onAnswer={(id, v) => setCoreAnswers(s => ({ ...s, [id]: v }))}
                litPillars={litPillars}
                onContinue={() => setAct("expression")}
              />
            </ActWrap>
          )}

          {act === "expression" && (
            <ActWrap key="expression">
              <ActExpression
                enabled={expressionEnabled}
                onToggle={(id, v) => setExpressionEnabled(s => ({ ...s, [id]: v }))}
                answers={expressionAnswers}
                onAnswer={(id, v) => setExpressionAnswers(s => ({ ...s, [id]: v }))}
                litPillars={litPillars}
                onContinue={() => setAct("creation")}
              />
            </ActWrap>
          )}

          {act === "creation" && (
            <ActWrap key="creation">
              <ActCreation
                projects={projectNames}
                onChange={setProjectNames}
                projectsForOrbit={projectsForOrbit}
                litPillars={litPillars}
                litProjects={litProjectsSet}
                onContinue={async () => {
                  setAct("reveal");
                  await persistAllAndGenerate();
                }}
              />
            </ActWrap>
          )}

          {act === "reveal" && (
            <ActWrap key="reveal">
              <ActReveal
                projectsForOrbit={projectsForOrbit}
                litPillars={litPillars}
                litProjects={litProjectsSet}
                saving={savingFinal}
                name={basics.name}
                onFinish={finishOnboarding}
              />
            </ActWrap>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Animation wrapper
// ─────────────────────────────────────────────────────────────────────────
function ActWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Act 1 — Welcome + Big Idea
// ─────────────────────────────────────────────────────────────────────────
function ActWelcome({
  onContinue,
  onAdoptStarter,
  adopting,
}: { onContinue: () => void; onAdoptStarter: () => void; adopting: boolean }) {
  return (
    <div className="text-center space-y-8 py-6" data-testid="act-welcome">
      <div className="space-y-3">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Hi. I'm <span className="text-primary">DW</span>.
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          I'm going to help you build your <strong>Life System</strong> — the operating
          system you actually run on. It comes in three layers.
        </p>
      </div>

      <div className="my-6 flex justify-center">
        <ThreeRingOrbit size={300} />
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-left max-w-2xl mx-auto">
        {(["core", "expression", "creation"] as const).map(level => {
          const meta = LEVEL_META[level];
          return (
            <Card key={level} className="p-4" data-testid={`card-level-${level}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.ringColor }} />
                <span className="font-semibold">{meta.label}</span>
              </div>
              <p className="text-sm text-muted-foreground">{meta.tagline}</p>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <Button size="lg" onClick={onContinue} data-testid="button-lets-build">
          Let's build yours <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={onAdoptStarter}
          disabled={adopting}
          data-testid="button-adopt-starter-onboarding"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {adopting ? "Adopting…" : "Or adopt the Starter Template"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Act 2 — Basics
// ─────────────────────────────────────────────────────────────────────────
function ActBasics({
  value,
  onChange,
  onContinue,
  onSkip,
}: {
  value: BasicsState;
  onChange: (s: BasicsState) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  function set<K extends keyof BasicsState>(k: K, v: BasicsState[K]) {
    onChange({ ...value, [k]: v });
  }
  return (
    <div className="space-y-6" data-testid="act-basics">
      <ActHeader
        kicker="Act 2 — The basics"
        title="A few quick things, then we get into it."
        sub="Skip anything you don't want to share."
      />

      <Card className="p-6 space-y-4">
        <Field label="What should I call you?">
          <Input
            value={value.name}
            onChange={e => set("name", e.target.value)}
            placeholder="Your name"
            data-testid="input-basics-name"
          />
        </Field>
        <Field label="Birthday (helps with Cosmic stuff later)">
          <Input
            type="date"
            value={value.birthday}
            onChange={e => set("birthday", e.target.value)}
            data-testid="input-basics-birthday"
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Wake time">
            <Input type="time" value={value.wakeTime} onChange={e => set("wakeTime", e.target.value)} data-testid="input-basics-wake" />
          </Field>
          <Field label="Sleep time">
            <Input type="time" value={value.sleepTime} onChange={e => set("sleepTime", e.target.value)} data-testid="input-basics-sleep" />
          </Field>
        </div>
        <Field label="Work / school schedule">
          <Input
            value={value.workSchedule}
            onChange={e => set("workSchedule", e.target.value)}
            placeholder="e.g. Mon–Thu 8:30–5, Friday personal"
            data-testid="input-basics-schedule"
          />
        </Field>
        <Field label="City / timezone">
          <Input
            value={value.city}
            onChange={e => set("city", e.target.value)}
            placeholder="e.g. Brooklyn, NY"
            data-testid="input-basics-city"
          />
        </Field>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onSkip} data-testid="button-skip-basics">
          <SkipForward className="w-4 h-4 mr-1" /> Skip
        </Button>
        <Button onClick={onContinue} data-testid="button-continue-basics">
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Act 3 — Stabilize Your Core
// ─────────────────────────────────────────────────────────────────────────
function ActCore({
  answers,
  onAnswer,
  litPillars,
  onContinue,
}: {
  answers: Record<string, string>;
  onAnswer: (id: string, v: string) => void;
  litPillars: Set<LifeSystemPillarId>;
  onContinue: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const total = CORE.length;
  const current = CORE[idx];
  const isLast = idx === total - 1;

  function next() {
    if (isLast) onContinue();
    else setIdx(i => i + 1);
  }

  return (
    <div className="space-y-6" data-testid="act-core">
      <ActHeader
        kicker={`Act 3 — Stabilize Your Core (${idx + 1} / ${total})`}
        title={toneForLevel("core")}
        sub="Before anything personal, the foundation. Every life runs on these nine — whether you manage them or not."
        accent={LEVEL_META.core.ringColor}
      />

      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
        <PillarConversation
          pillar={current}
          value={answers[current.id] ?? ""}
          onChange={v => onAnswer(current.id, v)}
          onSkipPillar={() => next()}
          onContinue={next}
          continueLabel={isLast ? "Onward to Expression" : "Next"}
        />
        <div className="hidden md:block">
          <ThreeRingOrbit size={260} litPillars={litPillars} />
        </div>
      </div>

      <ProgressDots total={total} index={idx} onJump={setIdx} accent={LEVEL_META.core.ringColor} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Act 4 — Define Your Expression
// ─────────────────────────────────────────────────────────────────────────
function ActExpression({
  enabled,
  onToggle,
  answers,
  onAnswer,
  litPillars,
  onContinue,
}: {
  enabled: Record<string, boolean>;
  onToggle: (id: string, v: boolean) => void;
  answers: Record<string, string>;
  onAnswer: (id: string, v: string) => void;
  litPillars: Set<LifeSystemPillarId>;
  onContinue: () => void;
}) {
  const [stage, setStage] = useState<"pick" | "talk">("pick");
  const enabledList = EXPRESSION.filter(p => enabled[p.id]);
  const [idx, setIdx] = useState(0);

  if (stage === "pick") {
    return (
      <div className="space-y-6" data-testid="act-expression-pick">
        <ActHeader
          kicker="Act 4 — Define Your Expression"
          title={toneForLevel("expression")}
          sub="Now the part that makes this you. Pick what's actually part of your life right now — you can change anything later."
          accent={LEVEL_META.expression.ringColor}
        />

        <div className="grid sm:grid-cols-2 gap-3">
          {EXPRESSION.map(p => (
            <Card key={p.id} className="p-4 flex items-center gap-3" data-testid={`pick-${p.id}`}>
              <div className="flex-1">
                <div className="font-medium">{p.label}</div>
                <div className="text-sm text-muted-foreground">{p.summary}</div>
              </div>
              <Switch
                checked={!!enabled[p.id]}
                onCheckedChange={v => onToggle(p.id, v)}
                aria-label={`Toggle ${p.label}`}
                data-testid={`switch-pick-${p.id}`}
              />
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => (enabledList.length > 0 ? setStage("talk") : onContinue())}
            data-testid="button-expression-continue"
          >
            {enabledList.length > 0 ? "Continue" : "Skip — none for now"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Talk stage — one question per enabled expression pillar.
  if (enabledList.length === 0) {
    onContinue();
    return null;
  }
  const current = enabledList[idx];
  const isLast = idx === enabledList.length - 1;

  function next() {
    if (isLast) onContinue();
    else setIdx(i => i + 1);
  }

  return (
    <div className="space-y-6" data-testid="act-expression-talk">
      <ActHeader
        kicker={`Act 4 — ${current.label} (${idx + 1} / ${enabledList.length})`}
        title={toneForLevel("expression")}
        accent={LEVEL_META.expression.ringColor}
      />

      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
        <PillarConversation
          pillar={current}
          value={answers[current.id] ?? ""}
          onChange={v => onAnswer(current.id, v)}
          onSkipPillar={next}
          onContinue={next}
          continueLabel={isLast ? "Onward to Creation" : "Next"}
        />
        <div className="hidden md:block">
          <ThreeRingOrbit size={260} litPillars={litPillars} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Act 5 — Build Your Creation
// ─────────────────────────────────────────────────────────────────────────
function ActCreation({
  projects,
  onChange,
  projectsForOrbit,
  litPillars,
  litProjects,
  onContinue,
}: {
  projects: string[];
  onChange: (s: string[]) => void;
  projectsForOrbit: { name: string }[];
  litPillars: Set<LifeSystemPillarId>;
  litProjects: Set<string>;
  onContinue: () => void;
}) {
  function setIdx(i: number, v: string) {
    const next = [...projects];
    next[i] = v;
    onChange(next);
  }
  function addRow() {
    if (projects.length >= 3) return;
    onChange([...projects, ""]);
  }

  return (
    <div className="space-y-6" data-testid="act-creation">
      <ActHeader
        kicker="Act 5 — Build Your Creation"
        title={toneForLevel("creation")}
        sub="What are you actually building right now? Name 1 to 3. (If nothing yet, I'll seed Living my Life System for you.)"
        accent={LEVEL_META.creation.ringColor}
      />

      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
        <Card className="p-6 space-y-3 flex-1">
          {projects.map((name, i) => (
            <Input
              key={i}
              value={name}
              onChange={e => setIdx(i, e.target.value)}
              placeholder={i === 0 ? "e.g. The DW App" : i === 1 ? "e.g. My weekly content" : "e.g. ..."}
              data-testid={`input-project-${i}`}
            />
          ))}
          {projects.length < 3 && (
            <Button variant="outline" onClick={addRow} data-testid="button-add-project-row">
              + Add another project
            </Button>
          )}
        </Card>
        <div className="hidden md:block">
          <ThreeRingOrbit
            size={260}
            litPillars={litPillars}
            projects={projectsForOrbit}
            litProjects={litProjects}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onContinue} data-testid="button-creation-continue">
          See my system <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Act 6 — The Reveal
// ─────────────────────────────────────────────────────────────────────────
function ActReveal({
  projectsForOrbit,
  litPillars,
  litProjects,
  saving,
  name,
  onFinish,
}: {
  projectsForOrbit: { name: string }[];
  litPillars: Set<LifeSystemPillarId>;
  litProjects: Set<string>;
  saving: boolean;
  name: string;
  onFinish: () => void;
}) {
  // Power-on animation: tick lit pillars onto a growing set over time.
  const allPillars = [...PILLARS_BY_LEVEL.core, ...PILLARS_BY_LEVEL.expression]
    .filter(p => litPillars.has(p.id) || p.level === "core")
    .map(p => p.id);
  const allProjects = projectsForOrbit.length > 0 ? projectsForOrbit : [{ name: "Living my Life System" }];

  const [stage, setStage] = useState(0); // 0=core lighting up, 1=expression, 2=projects, 3=done
  const [revealed, setRevealed] = useState<Set<LifeSystemPillarId>>(new Set());
  const [revealedProjects, setRevealedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const coreIds = allPillars.filter(id => PILLARS_BY_LEVEL.core.find(p => p.id === id));
    const exprIds = allPillars.filter(id => PILLARS_BY_LEVEL.expression.find(p => p.id === id));

    let i = 0;
    const lightCore = () => {
      if (i < coreIds.length) {
        const next = coreIds[i] as LifeSystemPillarId;
        setRevealed(prev => {
          const s = new Set(Array.from(prev));
          s.add(next);
          return s;
        });
        i++;
        t = setTimeout(lightCore, 220);
      } else {
        setStage(1);
        let j = 0;
        const lightExpr = () => {
          if (j < exprIds.length) {
            const next = exprIds[j] as LifeSystemPillarId;
            setRevealed(prev => {
              const s = new Set(Array.from(prev));
              s.add(next);
              return s;
            });
            j++;
            t = setTimeout(lightExpr, 260);
          } else {
            setStage(2);
            let k = 0;
            const lightProj = () => {
              if (k < allProjects.length) {
                const next = allProjects[k].name;
                setRevealedProjects(prev => {
                  const s = new Set(Array.from(prev));
                  s.add(next);
                  return s;
                });
                k++;
                t = setTimeout(lightProj, 320);
              } else {
                setStage(3);
              }
            };
            lightProj();
          }
        };
        lightExpr();
      }
    };
    t = setTimeout(lightCore, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageLabel =
    stage === 0 ? "Stabilizing your Core…" :
    stage === 1 ? "Aligning your Expression…" :
    stage === 2 ? "Powering your Creation…" :
    saving ? "Composing your Life System Document…" :
    "Your operating system is online.";

  return (
    <div className="text-center space-y-8 py-4" data-testid="act-reveal">
      <ActHeader
        kicker="Act 6 — The Reveal"
        title={name ? `Here it is, ${name}.` : "Here it is."}
        sub="This is what every other surface of the app will run on top of."
      />

      <div className="flex justify-center">
        <ThreeRingOrbit
          size={380}
          litPillars={revealed}
          projects={allProjects}
          litProjects={revealedProjects}
        />
      </div>

      <p
        className="text-sm font-medium tracking-wide uppercase text-muted-foreground"
        data-testid="text-reveal-stage"
      >
        {saving && <Loader2 className="inline w-4 h-4 mr-2 animate-spin" />}
        {stageLabel}
      </p>

      <div className="pt-4">
        <Button
          size="lg"
          onClick={onFinish}
          disabled={stage < 3 || saving}
          data-testid="button-finish-onboarding"
        >
          This is my operating system. Let's live it.
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────
function ActHeader({
  kicker,
  title,
  sub,
  accent,
}: { kicker: string; title: string; sub?: string; accent?: string }) {
  return (
    <header className="space-y-2 text-center">
      <div
        className="text-xs font-semibold tracking-widest uppercase"
        style={accent ? { color: accent } : { color: "hsl(var(--primary))" }}
        data-testid="text-act-kicker"
      >
        {kicker}
      </div>
      <h2 className="text-2xl md:text-3xl font-bold" data-testid="text-act-title">{title}</h2>
      {sub && <p className="text-muted-foreground max-w-xl mx-auto">{sub}</p>}
    </header>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function PillarConversation({
  pillar,
  value,
  onChange,
  onSkipPillar,
  onContinue,
  continueLabel,
}: {
  pillar: PillarDefinition;
  value: string;
  onChange: (v: string) => void;
  onSkipPillar: () => void;
  onContinue: () => void;
  continueLabel: string;
}) {
  return (
    <Card className="p-6 space-y-4 flex-1" data-testid={`conv-${pillar.id}`}>
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: `hsl(${pillar.color})` }}
        />
        <span className="text-sm font-medium text-muted-foreground">{pillar.label}</span>
      </div>
      <p className="text-lg leading-relaxed" data-testid={`text-question-${pillar.id}`}>
        {pillar.openingQuestion}
      </p>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Talk to me. Whatever comes to mind."
        rows={4}
        data-testid={`textarea-answer-${pillar.id}`}
      />
      <div className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={onSkipPillar} data-testid={`button-skip-${pillar.id}`}>
          Skip this one
        </Button>
        <Button onClick={onContinue} data-testid={`button-next-${pillar.id}`}>
          {continueLabel} <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </Card>
  );
}

function ProgressDots({
  total,
  index,
  onJump,
  accent,
}: { total: number; index: number; onJump: (i: number) => void; accent: string }) {
  return (
    <div className="flex justify-center gap-1.5" aria-label="Progress" data-testid="progress-dots">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onJump(i)}
          className="h-1.5 rounded-full transition-all"
          style={{
            width: i === index ? 22 : 8,
            background: i <= index ? accent : "hsl(var(--muted-foreground) / 0.3)",
          }}
          aria-label={`Jump to step ${i + 1}`}
        />
      ))}
    </div>
  );
}
