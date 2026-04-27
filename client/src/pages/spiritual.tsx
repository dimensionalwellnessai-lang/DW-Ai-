import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import {
  Sparkles, Heart, Wind, Clock, Play, Pause, Square, Loader2, Moon, Sun,
  Star, Flame, Globe, Trash2, Plus, X, Users, BookOpen, Volume2, VolumeX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ttsService } from "@/lib/tts-service";
import { useMeditationVoicePref } from "@/lib/meditation-voice-pref";
import { WearableInfluenceBadge } from "@/components/wearable-influence-badge";

// ─── Types (mirror server schema) ─────────────────────────────────────────────
export type MeditationItem = {
  id: string;
  slug: string;
  title: string;
  theme: string;
  durationMinutes: number;
  scriptText: string;
  audioUrl: string | null;
  description: string | null;
};

type MeditationSession = {
  id: string;
  libraryId: string | null;
  themeOverride: string | null;
  durationSec: number;
  completedAt: string;
  moodBefore: number | null;
  moodAfter: number | null;
  notes: string | null;
};

type PrayerEntry = {
  id: string;
  intention: string | null;
  gratitudeList: string[] | null;
  shareCollective: boolean;
  createdAt: string;
};

type CollectivePrayerEntry = {
  id: string;
  intention: string | null;
  gratitudeCount: number;
  createdAt: string;
};

type PlanetMovement = { planet: string; sign: string; longitude: number };

type CollectiveEnergy = {
  date: string;
  energyWord: string;
  moonPhase: string;
  moonPhaseEmoji: string;
  moonSign: string;
  sunSign: string;
  blurb: string;
  planetaryMovements: PlanetMovement[];
  collectiveCount: number;
  source: "perplexity" | "fallback";
};

type CosmicToday = {
  date: string;
  moonPhase: string;
  moonPhaseEmoji: string;
  moonSign: string;
  sunSign: string;
  energyWord: string;
  events: Array<{ name: string; description?: string; impact?: string }>;
  planets: PlanetMovement[];
};

type SpiritualSummary = {
  windowDays: number;
  sessionCount: number;
  totalMinutes: number;
  prayerCount: number;
  sharedPrayerCount: number;
  currentStreakDays: number;
  moodCorrelation: { samples: number; avgMoodDelta: number | null };
  weekly: Array<{ weekStart: string; sessions: number; minutes: number; prayers: number }>;
  insights: {
    gratitudePattern: string | null;
    retrogrades: Array<{ planet: string; sign: string }>;
  };
};

type CosmicPersonal = {
  hasChart: boolean;
  personalReading: string;
  snapshot: {
    date: string;
    moonPhase: string;
    moonPhaseEmoji: string;
    moonSign: string;
    sunSign: string;
    energyWord: string;
  };
  natal: Array<{ planet: string; sign: string; house: number | null }> | null;
  transits: Array<{ planet: string; sign: string; degree: number; retrograde: boolean }>;
};

type MoodLog = {
  id: string;
  energyLevel: number;
  moodLevel: number;
  createdAt: string;
};

const THEME_OPTIONS = [
  { value: "all", label: "All themes" },
  { value: "calm", label: "Calm" },
  { value: "focus", label: "Focus" },
  { value: "sleep", label: "Sleep" },
  { value: "grief", label: "Grief" },
  { value: "gratitude", label: "Gratitude" },
  { value: "energy", label: "Energy" },
  { value: "release", label: "Release" },
  { value: "connection", label: "Connection" },
  { value: "clarity", label: "Clarity" },
];

const DURATION_OPTIONS = [
  { value: "any", label: "Any length" },
  { value: "5", label: "5 min or less" },
  { value: "10", label: "10 min or less" },
  { value: "15", label: "15 min or less" },
  { value: "30", label: "30 min or less" },
];

// ─── Page ────────────────────────────────────────────────────────────────────
export default function SpiritualPage() {
  usePageMeta(
    "Spiritual — Find Your Soul",
    "Meditate, pray, reflect, and tune into the cosmic field.",
  );

  // Allow ?tab=meditate|pray|cosmic|insights deep links from chat suggestions.
  const initialTab = useMemo(() => {
    if (typeof window === "undefined") return "meditate";
    const t = new URLSearchParams(window.location.search).get("tab");
    return ["meditate", "pray", "cosmic", "insights"].includes(t || "") ? t! : "meditate";
  }, []);
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Spiritual
          </span>
        }
      />
      <p className="text-sm text-muted-foreground mt-1">
        A quiet workspace for meditation, prayer, reflection, and the wider cosmic field.
      </p>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl" data-testid="tabs-spiritual">
          <TabsTrigger value="meditate" data-testid="tab-meditate">
            <Wind className="h-4 w-4 mr-2" />Meditate
          </TabsTrigger>
          <TabsTrigger value="pray" data-testid="tab-pray">
            <Heart className="h-4 w-4 mr-2" />Pray / Reflect
          </TabsTrigger>
          <TabsTrigger value="cosmic" data-testid="tab-cosmic">
            <Moon className="h-4 w-4 mr-2" />Cosmic
          </TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">
            <Flame className="h-4 w-4 mr-2" />Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meditate" className="mt-6">
          <MeditateTab />
        </TabsContent>
        <TabsContent value="pray" className="mt-6">
          <PrayTab />
        </TabsContent>
        <TabsContent value="cosmic" className="mt-6">
          <CosmicTab />
        </TabsContent>
        <TabsContent value="insights" className="mt-6">
          <InsightsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Meditate ────────────────────────────────────────────────────────────────
function MeditateTab() {
  const [theme, setTheme] = useState<string>("all");
  const [duration, setDuration] = useState<string>("any");
  const [activeItem, setActiveItem] = useState<MeditationItem | null>(null);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (theme !== "all") params.set("theme", theme);
    if (duration !== "any") params.set("maxMinutes", duration);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [theme, duration]);

  const { data: items, isLoading } = useQuery<MeditationItem[]>({
    queryKey: ["/api/meditations", theme, duration],
    queryFn: async () => {
      const res = await fetch(`/api/meditations${queryParams}`);
      if (!res.ok) throw new Error("Failed to load meditations");
      return res.json();
    },
  });

  const { data: sessions } = useQuery<MeditationSession[]>({
    queryKey: ["/api/meditation-sessions"],
  });

  return (
    <div className="space-y-6">
      <WearableInfluenceBadge
        onlyWhenInfluential
        testIdSuffix="meditate"
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Find a practice</CardTitle>
          <CardDescription>Filter by what you need right now and how much time you have.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="mt-1" data-testid="select-meditation-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} data-testid={`option-theme-${o.value}`}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="mt-1" data-testid="select-meditation-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} data-testid={`option-duration-${o.value}`}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
        {!isLoading && (items ?? []).length === 0 && (
          <Card className="md:col-span-3">
            <CardContent className="p-8 text-center text-muted-foreground" data-testid="text-meditations-empty">
              Nothing matches those filters yet — try widening the time or theme.
            </CardContent>
          </Card>
        )}
        {(items ?? []).map(item => (
          <Card key={item.id} className="hover-elevate" data-testid={`card-meditation-${item.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base" data-testid={`text-meditation-title-${item.id}`}>{item.title}</CardTitle>
                <Badge variant="outline" className="capitalize">{item.theme}</Badge>
              </div>
              <CardDescription className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" /> {item.durationMinutes} min
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={() => setActiveItem(item)}
                data-testid={`button-start-meditation-${item.id}`}
              >
                <Play className="h-3 w-3 mr-2" /> Start session
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {sessions && sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <ul className="space-y-2">
                {sessions.slice(0, 20).map(s => (
                  <li key={s.id} className="flex items-center justify-between text-sm" data-testid={`row-session-${s.id}`}>
                    <span>
                      {Math.round(s.durationSec / 60)} min
                      {s.themeOverride && <span className="text-muted-foreground"> · {s.themeOverride}</span>}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(s.completedAt).toLocaleString()}
                      {typeof s.moodAfter === "number" && typeof s.moodBefore === "number" && (
                        <span className="ml-2">Δ {s.moodAfter - s.moodBefore > 0 ? "+" : ""}{s.moodAfter - s.moodBefore}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {activeItem && (
        <SessionTimerDialog item={activeItem} onClose={() => setActiveItem(null)} />
      )}
    </div>
  );
}

export function SessionTimerDialog({ item, onClose }: { item: MeditationItem; onClose: () => void }) {
  const totalSec = item.durationMinutes * 60;
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<"running" | "log">("running");
  const [autoLogged, setAutoLogged] = useState(false);
  const [autoSessionId, setAutoSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const [voicePref] = useMeditationVoicePref();

  // ─── Guided audio playback ──────────────────────────────────────────────────
  // When the library item has an audioUrl, use a real <audio> element so we
  // get true play/pause + seek + a progress bar driven by playback time.
  // Otherwise fall back to the existing TTS service (one-shot, no scrubbing).
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCurrent, setAudioCurrent] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [voiceFallbackOn, setVoiceFallbackOn] = useState(false);
  const hasGuidedAudio = !!item.audioUrl && !audioError;

  useEffect(() => {
    if (!running || phase !== "running") return;
    const id = setInterval(() => setElapsed(e => Math.min(e + 1, totalSec)), 1000);
    return () => clearInterval(id);
  }, [running, phase, totalSec]);

  // Stop any in-flight TTS when the dialog closes/unmounts.
  useEffect(() => {
    return () => { try { ttsService.stop(); } catch { /* noop */ } };
  }, []);

  // Auto-play guided audio on open if the user opted in.
  useEffect(() => {
    if (!hasGuidedAudio || !voicePref) return;
    const el = audioRef.current;
    if (!el) return;
    el.play().catch((err) => {
      // Autoplay may be blocked by the browser until first user gesture —
      // that's fine, the play button is still available.
      console.warn("[spiritual] meditation audio autoplay blocked:", err);
    });
    // Only run once per dialog open / item swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGuidedAudio, item.id]);

  // Pause audio whenever the timer is paused, and resume it on un-pause if
  // it was playing at the moment the timer paused. We remember that state
  // in a ref so the post-pause `audioPlaying=false` doesn't make us forget.
  const wasPlayingAtTimerPauseRef = useRef(false);
  useEffect(() => {
    if (!hasGuidedAudio) return;
    const el = audioRef.current;
    if (!el) return;
    if (!running || phase !== "running") {
      if (!el.paused) {
        wasPlayingAtTimerPauseRef.current = true;
        el.pause();
      }
    } else if (wasPlayingAtTimerPauseRef.current) {
      wasPlayingAtTimerPauseRef.current = false;
      el.play().catch(() => {/* noop */});
    }
  }, [running, phase, hasGuidedAudio]);

  const toggleAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {/* noop */});
    } else {
      el.pause();
    }
  };

  const seekAudio = (sec: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(sec, audioDuration || sec));
  };

  // Fallback TTS (used only when audioUrl is missing or fails to load).
  const toggleVoiceFallback = async () => {
    if (voiceFallbackOn) {
      ttsService.stop();
      setVoiceFallbackOn(false);
      return;
    }
    setVoiceFallbackOn(true);
    try {
      await ttsService.speak(item.scriptText);
    } catch (err) {
      console.error("[spiritual] TTS failed:", err);
      toast({
        title: "Voice guidance unavailable",
        description: "Falling back to silent timer.",
        variant: "destructive",
      });
    } finally {
      setVoiceFallbackOn(false);
    }
  };

  const log = useMutation({
    mutationFn: async (vars: { auto: boolean }) => {
      // If a session row was already created on natural completion (auto-log),
      // PATCH that row with the post-session mood + notes instead of POSTing
      // a duplicate. Otherwise, POST a fresh session record.
      const res = !vars.auto && autoSessionId
        ? await apiRequest("PATCH", `/api/meditation-sessions/${autoSessionId}`, {
            moodBefore,
            moodAfter,
            notes: notes.trim() || null,
          })
        : await apiRequest("POST", "/api/meditation-sessions", {
            libraryId: item.id,
            themeOverride: item.theme,
            // Preserve true elapsed time (early-end keeps the partial duration),
            // and only fall back to the planned length when auto-logging at
            // natural completion (where elapsed === totalSec anyway).
            durationSec: vars.auto ? totalSec : Math.max(1, elapsed),
            moodBefore,
            moodAfter,
            notes: notes.trim() || null,
          });
      const sessionRes = (await res.json().catch(() => ({}))) as { id?: string };

      // Cross-feature mood correlation: when both pulses are present, also
      // write a mood-tracker entry so daily-mood charts include the session.
      // Only fire on the manual save (auto-log has no after-pulse yet).
      if (
        !vars.auto &&
        typeof moodBefore === "number" &&
        typeof moodAfter === "number"
      ) {
        try {
          await apiRequest("POST", "/api/mood", {
            energyLevel: moodAfter,
            moodLevel: moodAfter,
            notes: `After ${item.title}`,
          });
        } catch (err) {
          console.warn("[spiritual] mood log failed:", err);
        }
      }
      return { sessionRes, auto: vars.auto };
    },
    onSuccess: ({ sessionRes, auto }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meditation-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spiritual/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood"] });
      if (auto) {
        // Remember the row id so the manual save can PATCH it.
        if (sessionRes?.id) setAutoSessionId(sessionRes.id);
        toast({ title: "Session complete & logged" });
      } else {
        toast({ title: autoSessionId ? "Session updated" : "Session logged" });
        onClose();
      }
    },
    onError: (err: Error) => {
      toast({ title: "Failed to log session", description: err.message, variant: "destructive" });
    },
  });

  // Auto-log on natural completion (timer hits zero) — fire once.
  useEffect(() => {
    if (phase === "running" && elapsed >= totalSec) {
      setRunning(false);
      ttsService.stop();
      setVoiceFallbackOn(false);
      try { audioRef.current?.pause(); } catch { /* noop */ }
      if (!autoLogged) {
        setAutoLogged(true);
        log.mutate({ auto: true });
      }
      setPhase("log");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, totalSec, phase]);

  const mm = String(Math.floor((totalSec - elapsed) / 60)).padStart(2, "0");
  const ss = String((totalSec - elapsed) % 60).padStart(2, "0");
  const pct = Math.round((elapsed / totalSec) * 100);

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) {
        ttsService.stop();
        try { audioRef.current?.pause(); } catch { /* noop */ }
        onClose();
      }
    }}>
      <DialogContent className="max-w-lg" data-testid="dialog-session-timer">
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription className="capitalize">
            {item.theme} · {item.durationMinutes} minutes
          </DialogDescription>
        </DialogHeader>

        {phase === "running" ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-light tabular-nums" data-testid="text-timer-remaining">{mm}:{ss}</div>
              <div className="text-xs text-muted-foreground mt-1">{pct}% complete</div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>

            {hasGuidedAudio && (
              <div
                className="rounded-md border bg-muted/30 p-3 space-y-2"
                data-testid="meditation-audio-player"
              >
                <audio
                  ref={audioRef}
                  src={item.audioUrl ?? undefined}
                  preload="auto"
                  onPlay={() => setAudioPlaying(true)}
                  onPause={() => setAudioPlaying(false)}
                  onEnded={() => setAudioPlaying(false)}
                  onTimeUpdate={(e) => setAudioCurrent(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    if (Number.isFinite(d)) setAudioDuration(d);
                  }}
                  onError={() => setAudioError(true)}
                  data-testid="audio-meditation"
                />
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    size="icon"
                    variant="default"
                    className="h-9 w-9 shrink-0"
                    onClick={toggleAudio}
                    aria-label={audioPlaying ? "Pause guided audio" : "Play guided audio"}
                    data-testid="button-audio-toggle"
                  >
                    {audioPlaying
                      ? <Pause className="h-4 w-4" />
                      : <Play className="h-4 w-4" />}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div
                      className="relative h-2 rounded-full bg-background overflow-hidden cursor-pointer"
                      role="slider"
                      aria-label="Audio progress"
                      aria-valuemin={0}
                      aria-valuemax={Math.max(1, Math.round(audioDuration))}
                      aria-valuenow={Math.round(audioCurrent)}
                      onClick={(e) => {
                        if (!audioDuration) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = (e.clientX - rect.left) / rect.width;
                        seekAudio(ratio * audioDuration);
                      }}
                      data-testid="audio-progress-bar"
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-primary transition-[width]"
                        style={{
                          width: audioDuration
                            ? `${Math.min(100, (audioCurrent / audioDuration) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular-nums">
                      <span data-testid="text-audio-current">{fmtAudioTime(audioCurrent)}</span>
                      <span data-testid="text-audio-duration">{fmtAudioTime(audioDuration)}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/70 leading-tight">
                  Guided narration. {voicePref ? "Auto-plays from settings." : "Voice guidance is off in settings — press play to listen."}
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs">Mood right now (1–5)</Label>
              <MoodPicker value={moodBefore} onChange={setMoodBefore} testIdPrefix="mood-before" />
            </div>
            <ScrollArea className="h-40 rounded-md border p-3 text-sm whitespace-pre-line">
              {item.scriptText}
            </ScrollArea>
            <div className="flex flex-wrap gap-2 justify-end">
              {!hasGuidedAudio && (
                <Button variant="outline" onClick={toggleVoiceFallback} data-testid="button-toggle-voice">
                  {voiceFallbackOn
                    ? <><VolumeX className="h-3 w-3 mr-2" />Stop voice</>
                    : <><Volume2 className="h-3 w-3 mr-2" />Voice guidance</>}
                </Button>
              )}
              <Button variant="outline" onClick={() => setRunning(r => !r)} data-testid="button-toggle-timer">
                {running ? <><Pause className="h-3 w-3 mr-2" />Pause</> : <><Play className="h-3 w-3 mr-2" />Resume</>}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  ttsService.stop();
                  setVoiceFallbackOn(false);
                  try { audioRef.current?.pause(); } catch { /* noop */ }
                  setPhase("log");
                }}
                data-testid="button-end-early"
              >
                <Square className="h-3 w-3 mr-2" />End early
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {autoLogged
                ? `Nicely done — ${Math.max(1, Math.round(elapsed / 60))} minute(s) logged automatically.`
                : `You sat for ${Math.max(1, Math.round(elapsed / 60))} minute(s). How do you feel now?`}
            </p>
            <div>
              <Label className="text-xs">Mood now (1–5)</Label>
              <MoodPicker value={moodAfter} onChange={setMoodAfter} testIdPrefix="mood-after" />
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Anything you want to remember…"
                data-testid="input-session-notes"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose} data-testid="button-cancel-log">
                {autoLogged ? "Done" : "Cancel"}
              </Button>
              <Button
                onClick={() => log.mutate({ auto: false })}
                disabled={log.isPending}
                data-testid="button-save-session"
              >
                {log.isPending && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                {autoLogged ? "Update with mood + notes" : "Save session"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function fmtAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MoodPicker({
  value, onChange, testIdPrefix,
}: { value: number | null; onChange: (v: number) => void; testIdPrefix: string }) {
  return (
    <div className="flex gap-2 mt-1">
      {[1, 2, 3, 4, 5].map(n => (
        <Button
          key={n}
          type="button"
          variant={value === n ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => onChange(n)}
          data-testid={`button-${testIdPrefix}-${n}`}
        >
          {n}
        </Button>
      ))}
    </div>
  );
}

// ─── Pray / Reflect ──────────────────────────────────────────────────────────
function PrayTab() {
  const [intention, setIntention] = useState("");
  const [gratitude, setGratitude] = useState<string[]>([""]);
  const [share, setShare] = useState(false);
  const { toast } = useToast();

  const { data: entries, isLoading } = useQuery<PrayerEntry[]>({
    queryKey: ["/api/prayer-entries"],
  });

  const create = useMutation({
    mutationFn: async () => {
      const cleaned = gratitude.map(g => g.trim()).filter(Boolean);
      return apiRequest("POST", "/api/prayer-entries", {
        intention: intention.trim() || null,
        gratitudeList: cleaned.length ? cleaned : null,
        shareCollective: share,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prayer-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spiritual/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cosmic/collective"] });
      setIntention("");
      setGratitude([""]);
      setShare(false);
      toast({ title: "Saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't save", description: err.message, variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/prayer-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prayer-entries"] });
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New entry</CardTitle>
          <CardDescription>An intention, a gratitude list, or both. Private by default.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Intention or prayer</Label>
            <Textarea
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              rows={4}
              placeholder="What are you holding right now?"
              data-testid="input-prayer-intention"
            />
          </div>
          <div>
            <Label className="text-xs">Gratitude</Label>
            <div className="space-y-2 mt-1">
              {gratitude.map((g, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={g}
                    onChange={(e) => {
                      const next = [...gratitude];
                      next[i] = e.target.value;
                      setGratitude(next);
                    }}
                    placeholder={`Gratitude ${i + 1}`}
                    data-testid={`input-gratitude-${i}`}
                  />
                  {gratitude.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setGratitude(gratitude.filter((_, idx) => idx !== i))}
                      data-testid={`button-remove-gratitude-${i}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGratitude([...gratitude, ""])}
                data-testid="button-add-gratitude"
              >
                <Plus className="h-3 w-3 mr-2" /> Add another
              </Button>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Switch checked={share} onCheckedChange={setShare} data-testid="switch-share-collective" />
            <div className="text-xs">
              <div className="font-medium">Share anonymously to the collective</div>
              <div className="text-muted-foreground mt-0.5">
                Your name is never attached. Names in your text are masked. You can delete anytime.
              </div>
            </div>
          </div>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || (!intention.trim() && gratitude.every(g => !g.trim()))}
            className="w-full"
            data-testid="button-save-prayer"
          >
            {create.isPending && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
            Save entry
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your journal</CardTitle>
          <CardDescription>Most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-40" />}
          {!isLoading && (entries ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground" data-testid="text-prayer-empty">
              No entries yet — write something on the left.
            </p>
          )}
          <ScrollArea className="h-[420px] pr-3">
            <ul className="space-y-3">
              {(entries ?? []).map(e => (
                <li key={e.id} className="rounded-md border p-3" data-testid={`row-prayer-${e.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString()}
                      {e.shareCollective && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          <Globe className="h-2.5 w-2.5 mr-1" /> Shared
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove.mutate(e.id)}
                      data-testid={`button-delete-prayer-${e.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {e.intention && <p className="mt-2 text-sm whitespace-pre-line">{e.intention}</p>}
                  {e.gratitudeList && e.gratitudeList.length > 0 && (
                    <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground">
                      {e.gratitudeList.map((g, i) => <li key={i}>{g}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Cosmic ──────────────────────────────────────────────────────────────────
function CosmicTab() {
  // Personal data is user-aware: pulls the user's stored natal placements and
  // pairs them with today's transits + a daily reading anchored to their chart.
  const { data: personal, isLoading: loadingPersonal } = useQuery<CosmicPersonal>({
    queryKey: ["/api/cosmic/personal"],
  });

  const { data: collective, isLoading } = useQuery<CollectiveEnergy>({
    queryKey: ["/api/cosmic/collective"],
  });

  const { data: feed } = useQuery<CollectivePrayerEntry[]>({
    queryKey: ["/api/prayer-entries/collective"],
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Personal — user-aware natal + transits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-4 w-4" /> Personal
          </CardTitle>
          <CardDescription>Your chart, today's transits, and a personal reading.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingPersonal && <Skeleton className="h-32" />}
          {personal && (
            <>
              <div className="flex flex-wrap gap-2 text-xs" data-testid="row-today-badges">
                <Badge variant="secondary">
                  <span className="mr-1">{personal.snapshot.moonPhaseEmoji}</span>{personal.snapshot.moonPhase}
                </Badge>
                <Badge variant="outline"><Moon className="h-3 w-3 mr-1" />Moon in {personal.snapshot.moonSign}</Badge>
                <Badge variant="outline"><Sun className="h-3 w-3 mr-1" />Sun in {personal.snapshot.sunSign}</Badge>
                <Badge variant="outline">{personal.snapshot.energyWord}</Badge>
              </div>

              <p className="text-sm leading-relaxed" data-testid="text-daily-reading">
                {personal.personalReading}
              </p>

              {personal.natal && personal.natal.length > 0 && (
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Your natal placements</Label>
                  <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    {personal.natal.map((p) => (
                      <li key={p.planet} className="flex justify-between" data-testid={`row-natal-${p.planet}`}>
                        <span className="text-muted-foreground">{p.planet}</span>
                        <span className="font-medium">
                          {p.sign}{typeof p.house === "number" ? ` · H${p.house}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <Label className="text-xs uppercase text-muted-foreground">Today's transits</Label>
                <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {personal.transits.slice(0, 10).map((p) => (
                    <li key={p.planet} className="flex justify-between" data-testid={`row-transit-${p.planet}`}>
                      <span className="text-muted-foreground">{p.planet}</span>
                      <span className="font-medium">
                        {p.sign}{p.retrograde ? " ℞" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {!personal.hasChart && (
                <p className="text-xs text-muted-foreground italic" data-testid="text-no-chart">
                  Add your birth details in the Cosmic workspace for a fully personalised reading.
                </p>
              )}

              <Link href="/cosmic">
                <Button variant="outline" size="sm" className="w-full" data-testid="button-open-cosmic">
                  <Moon className="h-3 w-3 mr-2" /> Open full Cosmic workspace
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      {/* Collective */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-4 w-4" /> Collective
          </CardTitle>
          <CardDescription>The shared energy of today, refreshed every 12 hours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <Skeleton className="h-24" />}
          {collective && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary" data-testid="badge-energy-word">{collective.energyWord}</Badge>
                <Badge variant="outline">
                  <Moon className="h-3 w-3 mr-1" />
                  {collective.moonPhase} · {collective.moonSign}
                </Badge>
                <Badge variant="outline"><Sun className="h-3 w-3 mr-1" />Sun in {collective.sunSign}</Badge>
              </div>
              <p className="text-sm leading-relaxed" data-testid="text-collective-blurb">{collective.blurb}</p>

              {collective.planetaryMovements?.length > 0 && (
                <div className="text-xs text-muted-foreground" data-testid="text-planetary-movements">
                  <span className="font-medium text-foreground">Planetary movements: </span>
                  {collective.planetaryMovements.slice(0, 6).map((p, i) => (
                    <span key={p.planet}>
                      {i > 0 && " · "}
                      {p.planet} in {p.sign}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {collective.collectiveCount} {collective.collectiveCount === 1 ? "person has" : "people have"} shared an intention today.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Collective feed (full width on this row) */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Recent shared intentions
          </CardTitle>
          <CardDescription>Anonymous. The 50 most recent shared intentions.</CardDescription>
        </CardHeader>
        <CardContent>
          {(!feed || feed.length === 0) && (
            <p className="text-sm text-muted-foreground" data-testid="text-collective-empty">
              No shared intentions yet. Be the first by writing one in Pray / Reflect.
            </p>
          )}
          {feed && feed.length > 0 && (
            <ScrollArea className="h-72 pr-3">
              <ul className="space-y-3">
                {feed.map(e => (
                  <li key={e.id} className="rounded-md border p-3 text-sm" data-testid={`row-collective-${e.id}`}>
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(e.createdAt).toLocaleDateString()}
                      {e.gratitudeCount > 0 && <span> · {e.gratitudeCount} gratitude note(s)</span>}
                    </div>
                    {e.intention ? <p className="whitespace-pre-line">{e.intention}</p>
                      : <p className="italic text-muted-foreground">A silent intention</p>}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Insights ────────────────────────────────────────────────────────────────
function InsightsTab() {
  const { data: summary, isLoading } = useQuery<SpiritualSummary>({
    queryKey: ["/api/spiritual/summary"],
  });

  // Mood correlation hook: pull recent mood logs + sessions to render a tiny
  // "on practice days, mood averaged X vs Y on non-practice days" comparison.
  const { data: moodLogs } = useQuery<MoodLog[]>({
    queryKey: ["/api/mood"],
  });
  const { data: sessions } = useQuery<MeditationSession[]>({
    queryKey: ["/api/meditation-sessions"],
  });

  const moodCompare = useMemo(() => {
    if (!moodLogs || !sessions) return null;
    const practiceDays = new Set(
      sessions.map(s => new Date(s.completedAt).toISOString().slice(0, 10))
    );
    const onDays: number[] = [];
    const offDays: number[] = [];
    for (const m of moodLogs.slice(0, 60)) {
      const day = new Date(m.createdAt).toISOString().slice(0, 10);
      (practiceDays.has(day) ? onDays : offDays).push(m.moodLevel);
    }
    if (onDays.length === 0 || offDays.length === 0) return null;
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    return {
      onAvg: avg(onDays),
      offAvg: avg(offDays),
      onCount: onDays.length,
      offCount: offDays.length,
    };
  }, [moodLogs, sessions]);

  if (isLoading) {
    return <Skeleton className="h-48" />;
  }
  if (!summary) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Sit for a session or write an intention — your insights will show up here.
        </CardContent>
      </Card>
    );
  }

  const delta = summary.moodCorrelation.avgMoodDelta;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Current streak" value={`${summary.currentStreakDays}d`} icon={<Flame className="h-4 w-4" />} testId="stat-streak" />
        <StatCard label="Sessions (30d)" value={String(summary.sessionCount)} icon={<Wind className="h-4 w-4" />} testId="stat-sessions" />
        <StatCard label="Minutes (30d)" value={String(summary.totalMinutes)} icon={<Clock className="h-4 w-4" />} testId="stat-minutes" />
        <StatCard label="Journal entries" value={String(summary.prayerCount)} icon={<Heart className="h-4 w-4" />} testId="stat-prayers" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mood pulse from sessions</CardTitle>
          <CardDescription>Average lift in mood from before to after each meditation.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.moodCorrelation.samples === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a 1–5 mood pulse before and after a session to start tracking lift.
            </p>
          ) : (
            <p className="text-sm" data-testid="text-mood-delta">
              Across <strong>{summary.moodCorrelation.samples}</strong> session
              {summary.moodCorrelation.samples === 1 ? "" : "s"} with both pulses,
              your mood changed on average by{" "}
              <strong>{delta !== null ? (delta > 0 ? "+" : "") + delta.toFixed(2) : "—"}</strong>.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Rolling weekly summary — last 4 weeks of practice + journaling */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly rhythm</CardTitle>
          <CardDescription>Sessions, minutes, and journal entries per week (last 4 weeks).</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.weekly.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sit for a session to start filling this in.</p>
          ) : (
            <div className="space-y-2" data-testid="list-weekly-rhythm">
              {summary.weekly.map((w) => {
                const max = Math.max(1, ...summary.weekly.map(x => x.minutes));
                const pct = Math.round((w.minutes / max) * 100);
                return (
                  <div key={w.weekStart} className="space-y-1" data-testid={`row-week-${w.weekStart}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Week of {new Date(w.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                      <span className="font-medium">
                        {w.sessions} session{w.sessions === 1 ? "" : "s"} · {w.minutes} min · {w.prayers} entr{w.prayers === 1 ? "y" : "ies"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Behaviour + astrology insight cards */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card data-testid="card-gratitude-pattern">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4" /> Reflection pattern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {summary.insights.gratitudePattern ??
                "Write a few journal entries to see when you tend to reflect most."}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-astro-headsup">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4" /> Astrology heads-up
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.insights.retrogrades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No major planets are retrograde today — a clear-sky moment.</p>
            ) : (
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Currently retrograde:</p>
                <ul className="list-disc pl-5">
                  {summary.insights.retrogrades.map((r) => (
                    <li key={r.planet} data-testid={`row-retrograde-${r.planet}`}>
                      <span className="font-medium">{r.planet}</span> in {r.sign}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Practice-day correlation</CardTitle>
          <CardDescription>Average daily mood on days you practiced vs. didn't.</CardDescription>
        </CardHeader>
        <CardContent>
          {!moodCompare ? (
            <p className="text-sm text-muted-foreground">
              Not enough data yet — log moods on both kinds of days to see the comparison.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm" data-testid="text-mood-compare">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Practice days</div>
                <div className="text-xl font-light">{moodCompare.onAvg.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">{moodCompare.onCount} log(s)</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Other days</div>
                <div className="text-xl font-light">{moodCompare.offAvg.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">{moodCompare.offCount} log(s)</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label, value, icon, testId,
}: { label: string; value: string; icon: React.ReactNode; testId: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}{label}
        </div>
        <div className="text-2xl font-light mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
