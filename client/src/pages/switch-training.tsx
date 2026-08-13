import { useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  Zap,
  Brain,
  Clock,
  Compass,
  Wallet,
  Users,
  Home,
  Sprout,
  ArrowLeft,
  Power,
  Check,
  MessageCircle,
  Send,
  Loader2,
  Sparkles,
} from "lucide-react";
import { 
  getSingleSwitchData, 
  startSwitchTraining, 
  recordSwitchCheckIn,
  saveSwitchStatus,
  type SwitchId, 
  type SwitchStatus 
} from "@/lib/switch-storage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { MilestoneMoment, type MilestoneType } from "@/components/milestone-moment";
import { 
  switchMilestoneKey, 
  statusToMilestoneType, 
  markMilestoneSeen 
} from "@/lib/milestone-storage";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  SWITCH_TO_PILLAR,
  type PillarCheckinStatus,
} from "@shared/switchPillarMap";


interface SwitchInfo {
  id: SwitchId;
  name: string;
  subtitle: string;
  icon: typeof Zap;
  color: string;
  bgColor: string;
  glowColor: string;
  perspective: string;
  whatWeTrain: string[];
  checkInPrompts: string[];
}

const SWITCH_INFO: Record<SwitchId, SwitchInfo> = {
  body: {
    id: "body",
    name: "Body",
    subtitle: "Physical Energy",
    icon: Zap,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    glowColor: "shadow-red-500/20",
    perspective: "Energy comes before motivation.",
    whatWeTrain: ["Movement", "Recovery", "Nourishment", "Sustainable strength"],
    checkInPrompts: [
      "How is your energy level right now?",
      "What does your body need today?",
      "Did you move in a way that felt good?",
    ],
  },
  mind: {
    id: "mind",
    name: "Mind",
    subtitle: "Mental & Emotional Clarity",
    icon: Brain,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    glowColor: "shadow-purple-500/20",
    perspective: "I can notice my thoughts without becoming them.",
    whatWeTrain: ["Emotional awareness", "Stress recovery", "Mental filtering"],
    checkInPrompts: [
      "What thoughts are running through your mind?",
      "How are you feeling emotionally?",
      "What would help you feel calmer?",
    ],
  },
  time: {
    id: "time",
    name: "Time",
    subtitle: "Structure & Flow",
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    glowColor: "shadow-blue-500/20",
    perspective: "A plan should support my life, not trap it.",
    whatWeTrain: ["Realistic scheduling", "Rhythm", "Flexibility", "Energy-based planning"],
    checkInPrompts: [
      "What's your priority for today?",
      "Do you feel in control of your time?",
      "What would make today feel more balanced?",
    ],
  },
  purpose: {
    id: "purpose",
    name: "Purpose",
    subtitle: "Direction & Meaning",
    icon: Compass,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    glowColor: "shadow-amber-500/20",
    perspective: "I don't need the full map — just the next aligned step.",
    whatWeTrain: ["Values alignment", "Intention setting", "Meaningful goals"],
    checkInPrompts: [
      "What feels meaningful to you right now?",
      "What's one small step aligned with your values?",
      "When did you last feel a sense of purpose?",
    ],
  },
  money: {
    id: "money",
    name: "Money",
    subtitle: "Stability & Choice",
    icon: Wallet,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    glowColor: "shadow-green-500/20",
    perspective: "Money is a tool, not a verdict on my worth.",
    whatWeTrain: ["Awareness", "Planning", "Intentional spending", "Financial clarity"],
    checkInPrompts: [
      "How do you feel about your finances today?",
      "What's one small step toward financial clarity?",
      "Are you avoiding anything money-related?",
    ],
  },
  relationships: {
    id: "relationships",
    name: "Relationships",
    subtitle: "Connection & Boundaries",
    icon: Users,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    glowColor: "shadow-pink-500/20",
    perspective: "Connection should feel safe, not draining.",
    whatWeTrain: ["Boundaries", "Communication", "Healthy connection"],
    checkInPrompts: [
      "Who did you connect with today?",
      "Are your relationships feeling balanced?",
      "Where do you need to set a boundary?",
    ],
  },
  environment: {
    id: "environment",
    name: "Environment",
    subtitle: "External Support",
    icon: Home,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    glowColor: "shadow-cyan-500/20",
    perspective: "My surroundings shape my behavior.",
    whatWeTrain: ["Space design", "Routines", "Friction removal"],
    checkInPrompts: [
      "Does your space support how you want to feel?",
      "What small change could reduce daily friction?",
      "Is there clutter affecting your focus?",
    ],
  },
  identity: {
    id: "identity",
    name: "Identity",
    subtitle: "Growth & Alignment",
    icon: Sprout,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    glowColor: "shadow-emerald-500/20",
    perspective: "I am allowed to evolve.",
    whatWeTrain: ["Self-concept", "Habits", "Growth narratives"],
    checkInPrompts: [
      "What kind of person are you becoming?",
      "What old story are you ready to let go of?",
      "What growth are you proud of?",
    ],
  },
};

const STATUS_CONFIG: Record<SwitchStatus, { label: string; color: string; bgColor: string }> = {
  off: { label: "Off", color: "text-muted-foreground", bgColor: "bg-muted" },
  flickering: { label: "Flickering", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  stable: { label: "Stable", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  powered: { label: "Powered", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
};

// Dimension-specific opening question DW asks to kick off the check-in.
const CHECKIN_OPENERS: Record<SwitchId, string> = {
  body: "How's your body been feeling the last few days — energy, movement, sleep?",
  mind: "How's your headspace lately — clear, noisy, heavy, calm?",
  time: "How's your time been feeling — in control, scattered, or somewhere between?",
  purpose: "What's felt meaningful to you lately — or has it been hard to feel that?",
  money: "How are you feeling about money right now — tight, steady, or growing?",
  relationships: "How have your relationships been feeling lately — connected or draining?",
  environment: "How does the space around you feel right now — supportive or in the way?",
  identity: "Who are you becoming lately — does it feel aligned with you?",
};

// The 4 status chips shown at wrap-up, in the pillar_checkins vocabulary.
const CHECKIN_STATUS_CHIPS: { status: PillarCheckinStatus; hint: string }[] = [
  { status: "Powered", hint: "Thriving here" },
  { status: "Stable", hint: "Steady & okay" },
  { status: "Building", hint: "Working on it" },
  { status: "Needs Attention", hint: "Struggling" },
];

const CHECKIN_STATUS_TO_SWITCH: Record<PillarCheckinStatus, SwitchStatus> = {
  Powered: "powered",
  Stable: "stable",
  Building: "flickering",
  "Needs Attention": "off",
};

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

// How many DW replies before we auto-advance to the wrap-up step.
const MAX_DW_REPLIES = 2;

export default function SwitchTrainingPage() {
  usePageMeta("Switch Training", "Train your mind to make positive switches.");
  const [, params] = useRoute("/switch/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const switchId = params?.id as SwitchId;
  
  const { user } = useAuth();
  const isAuthed = !!user;

  const switchInfo = SWITCH_INFO[switchId];
  const [switchData, setSwitchData] = useState(() => getSingleSwitchData(switchId));
  const [selectedPrompt, setSelectedPrompt] = useState<number | null>(null);
  const [activeMilestone, setActiveMilestone] = useState<MilestoneType | null>(null);

  // ── Conversational check-in state ──────────────────────────────────────
  // "idle" -> "chatting" -> "wrapup" -> "done"
  const [checkInPhase, setCheckInPhase] = useState<"idle" | "chatting" | "wrapup" | "done">("idle");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [dwThinking, setDwThinking] = useState(false);
  const [dwError, setDwError] = useState(false);
  const [dwSummary, setDwSummary] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PillarCheckinStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const dwReplyCountRef = useRef(0);

  if (!switchInfo) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Switch not found</p>
        <Link href="/switchboard">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Switchboard
          </Button>
        </Link>
      </div>
    );
  }

  const Icon = switchInfo.icon;
  const statusConfig = STATUS_CONFIG[switchData.status];

  const handleStartTraining = () => {
    const result = startSwitchTraining(switchId);
    setSwitchData(getSingleSwitchData(switchId));
    if (result.statusChanged) {
      const milestoneType = statusToMilestoneType(result.newStatus);
      if (milestoneType) {
        setActiveMilestone(milestoneType);
      }
    } else {
      toast({
        title: `${switchInfo.name} training started`,
        description: "Your switch is now flickering. Keep checking in to stabilize it.",
      });
    }
  };

  const handleMilestoneDismiss = () => {
    if (activeMilestone) {
      const newStatus = getSingleSwitchData(switchId).status;
      markMilestoneSeen(switchMilestoneKey(switchId, newStatus));
      setActiveMilestone(null);
    }
  };

  const handleTalkToDW = () => {
    const prompt = selectedPrompt !== null 
      ? switchInfo.checkInPrompts[selectedPrompt]
      : `I want to work on my ${switchInfo.name.toLowerCase()} switch. ${switchInfo.checkInPrompts[0]}`;
    navigate(`/talk?prefill=${encodeURIComponent(prompt)}&src=switch_checkin`);
  };

  // ── Conversational check-in ────────────────────────────────────────────
  const buildContext = () =>
    `switch_checkin:${switchId} — You are doing a brief 2-3 exchange check-in on the user's ${switchInfo.name} dimension. Ask at most one short follow-up, then summarize how they're doing in 1-2 sentences and gently suggest one small next step. Keep replies under 80 words.`;

  const startCheckIn = () => {
    dwReplyCountRef.current = 0;
    setDwError(false);
    setDwSummary("");
    setSelectedStatus(null);
    setMessages([{ role: "assistant", content: CHECKIN_OPENERS[switchId] }]);
    setCheckInPhase("chatting");
  };

  const sendReply = async () => {
    const text = draft.trim();
    if (!text || dwThinking) return;
    const nextMessages: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setDraft("");
    setDwThinking(true);
    setDwError(false);

    try {
      const res = await apiRequest("POST", "/api/chat/smart", {
        message: text,
        conversationHistory: nextMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        context: buildContext(),
      });
      const data = await res.json();
      const reply: string = data?.response || "Thanks for sharing that.";
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      dwReplyCountRef.current += 1;
      // Keep the latest DW reply as the default summary/note.
      setDwSummary(reply);
      if (dwReplyCountRef.current >= MAX_DW_REPLIES) {
        setCheckInPhase("wrapup");
      }
    } catch (e) {
      setDwError(true);
      // Still let the user wrap up and save with a self-picked status.
      setCheckInPhase("wrapup");
    } finally {
      setDwThinking(false);
    }
  };

  const finishCheckInEarly = () => {
    // Use the last DW reply (if any) as the summary note.
    const lastDw = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastDw && !dwSummary) setDwSummary(lastDw.content);
    setCheckInPhase("wrapup");
  };

  const confirmCheckIn = async () => {
    if (!selectedStatus || saving) return;
    setSaving(true);
    const note = dwSummary ? dwSummary.slice(0, 500) : undefined;
    const uiStatus = CHECKIN_STATUS_TO_SWITCH[selectedStatus];

    // Always keep legacy local UI coherent: record a check-in + reflect status.
    recordSwitchCheckIn(switchId);
    saveSwitchStatus(switchId, uiStatus);
    setSwitchData(getSingleSwitchData(switchId));

    let savedToServer = false;
    if (isAuthed) {
      try {
        await apiRequest("POST", "/api/pillar-checkins", {
          pillarId: SWITCH_TO_PILLAR[switchId],
          status: selectedStatus,
          note,
        });
        savedToServer = true;
        queryClient.invalidateQueries({ queryKey: ["/api/progress/summary"] });
        queryClient.invalidateQueries({ queryKey: ["/api/progress/switches"] });
        queryClient.invalidateQueries({ queryKey: ["/api/pillar-checkins"] });
        queryClient.invalidateQueries({ queryKey: ["/api/pillar-checkins/latest"] });
        queryClient.invalidateQueries({ queryKey: ["/api/life-system/pillars"] });
        // Also invalidate the tuple-style keys used by my-progress.tsx.
        queryClient.invalidateQueries({ queryKey: ["progress", "switches", "21d"] });
        queryClient.invalidateQueries({ queryKey: ["progress", "summary"] });
      } catch (e) {
        savedToServer = false;
      }
    }

    setSaving(false);
    setCheckInPhase("done");
    toast({
      title: "Check-in saved",
      description: savedToServer
        ? `${switchInfo.name} marked as ${selectedStatus}.`
        : `${switchInfo.name} saved on this device. Sign in to save your progress.`,
    });

    // Surface a milestone if the status jumped up.
    const milestoneType = statusToMilestoneType(uiStatus);
    if (milestoneType && (uiStatus === "stable" || uiStatus === "powered")) {
      setActiveMilestone(milestoneType);
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="p-4 pb-24 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/switchboard">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${switchInfo.bgColor} ${switchInfo.glowColor} shadow-lg`}>
                <Icon className={`h-5 w-5 ${switchInfo.color}`} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{switchInfo.name}</h1>
                <p className="text-sm text-muted-foreground">{switchInfo.subtitle}</p>
              </div>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
          >
            {statusConfig.label}
          </Badge>
        </div>

        <Card className={`border-border ${switchInfo.bgColor}`}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Perspective Training</p>
            <p className={`text-lg font-medium ${switchInfo.color} italic`}>
              "{switchInfo.perspective}"
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">What We Train</h2>
          <div className="grid grid-cols-2 gap-2">
            {switchInfo.whatWeTrain.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-border">
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className={`p-1 rounded ${switchInfo.bgColor}`}>
                      <Check className={`h-3 w-3 ${switchInfo.color}`} />
                    </div>
                    <span className="text-sm text-foreground">{item}</span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Check-In Prompts</h2>
          <p className="text-sm text-muted-foreground">
            Select a prompt to explore with DW, or just start a conversation.
          </p>
          <div className="space-y-2">
            {switchInfo.checkInPrompts.map((prompt, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card 
                  className={`border-border cursor-pointer transition-all ${
                    selectedPrompt === i 
                      ? `ring-1 ${switchInfo.color.replace('text-', 'ring-')} ${switchInfo.bgColor}`
                      : 'hover:border-border'
                  }`}
                  onClick={() => setSelectedPrompt(selectedPrompt === i ? null : i)}
                  data-testid={`prompt-${i}`}
                >
                  <CardContent className="p-3">
                    <p className="text-sm text-foreground">{prompt}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Conversational check-in with DW ─────────────────────────── */}
        {checkInPhase === "idle" ? (
          <div className="space-y-3 pt-4">
            {switchData.status === "off" && (
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
                onClick={handleStartTraining}
                data-testid="button-start-training"
              >
                <Power className="h-4 w-4 mr-2" />
                Start Training This Switch
              </Button>
            )}

            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
              onClick={startCheckIn}
              data-testid="button-checkin"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Check in with DW
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleTalkToDW}
              data-testid="button-talk-dw"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Talk to DW About This
            </Button>
          </div>
        ) : (
          <Card className="border-border" data-testid="checkin-conversation">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className={`h-4 w-4 ${switchInfo.color}`} />
                  {switchInfo.name} check-in
                </p>
                {checkInPhase !== "done" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground h-7"
                    onClick={() => setCheckInPhase("idle")}
                    data-testid="button-checkin-cancel"
                  >
                    Cancel
                  </Button>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto" data-testid="checkin-messages">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm max-w-[85%] ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : `${switchInfo.bgColor} text-foreground`
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {dwThinking && (
                  <div className="flex justify-start">
                    <div className={`rounded-2xl px-3 py-2 ${switchInfo.bgColor}`}>
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>

              {dwError && (
                <p className="text-xs text-amber-400" data-testid="checkin-dw-error">
                  DW couldn't respond right now — you can still save your check-in below.
                </p>
              )}

              {checkInPhase === "chatting" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder="Type your reply…"
                      disabled={dwThinking}
                      data-testid="input-checkin-reply"
                    />
                    <Button
                      size="icon"
                      onClick={sendReply}
                      disabled={dwThinking || !draft.trim()}
                      data-testid="button-checkin-send"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={finishCheckInEarly}
                    data-testid="button-checkin-finish"
                  >
                    Finish check-in
                  </Button>
                </div>
              )}

              {checkInPhase === "wrapup" && (
                <div className="space-y-3" data-testid="checkin-wrapup">
                  <p className="text-sm text-muted-foreground">
                    Where is your {switchInfo.name} switch right now?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {CHECKIN_STATUS_CHIPS.map(({ status, hint }) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setSelectedStatus(status)}
                        className={`rounded-lg border p-2.5 text-left transition-all ${
                          selectedStatus === status
                            ? `${switchInfo.bgColor} ring-1 ${switchInfo.color.replace("text-", "ring-")}`
                            : "border-border hover:border-border/80"
                        }`}
                        data-testid={`chip-status-${status.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        <span className="text-sm font-medium text-foreground block">{status}</span>
                        <span className="text-xs text-muted-foreground">{hint}</span>
                      </button>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    onClick={confirmCheckIn}
                    disabled={!selectedStatus || saving}
                    data-testid="button-checkin-confirm"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Save check-in
                  </Button>
                  {!isAuthed && (
                    <p className="text-xs text-muted-foreground text-center" data-testid="checkin-guest-note">
                      Sign in to save your progress across devices.
                    </p>
                  )}
                </div>
              )}

              {checkInPhase === "done" && (
                <div className="space-y-3" data-testid="checkin-done">
                  <p className="text-sm text-foreground">
                    Nice work checking in. Your {switchInfo.name} switch is marked as{" "}
                    <span className="font-medium">{selectedStatus}</span>.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setCheckInPhase("idle")}
                    data-testid="button-checkin-restart"
                  >
                    Done
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeMilestone && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            data-testid="switch-milestone-banner"
          >
            <MilestoneMoment
              type={activeMilestone}
              subject={switchInfo.name}
              onDismiss={handleMilestoneDismiss}
            />
          </motion.div>
        )}

        {switchData.status !== "off" && (
          <Card className="border-border bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Training Progress</span>
                <span className="text-foreground">{switchData.checkIns} check-ins</span>
              </div>
              <div className="mt-2 h-2 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${switchInfo.bgColor.replace('/10', '')} transition-all`}
                  style={{ width: `${Math.min((switchData.checkIns / 14) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {switchData.status === "flickering" && "7 check-ins to reach Stable"}
                {switchData.status === "stable" && "14 check-ins to reach Powered"}
                {switchData.status === "powered" && "You're fully powered!"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
