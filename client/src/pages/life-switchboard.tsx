import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
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
  ChevronRight,
  Sparkles,
  Power,
  ArrowRight,
} from "lucide-react";
import { getSwitchStatuses, saveSwitchStatus, type SwitchStatus, type SwitchId } from "@/lib/switch-storage";

interface LifeSwitch {
  id: SwitchId;
  name: string;
  subtitle: string;
  icon: typeof Zap;
  color: string;
  bgColor: string;
  glowColor: string;
  controls: string;
  whyMatters: string;
  perspective: string;
  whenIgnored: string;
  whatWeTrain: string;
}

const LIFE_SWITCHES: LifeSwitch[] = [
  {
    id: "body",
    name: "Body",
    subtitle: "Physical Energy",
    icon: Zap,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    glowColor: "shadow-red-500/20",
    controls: "Stamina, mood, confidence, and physical resilience.",
    whyMatters: "Your body is the battery your life runs on. When energy is low, everything feels harder — even things you care about.",
    perspective: "Energy comes before motivation.",
    whenIgnored: "Burnout, inconsistency, low confidence, mental fog.",
    whatWeTrain: "Movement, recovery, nourishment, sustainable strength.",
  },
  {
    id: "mind",
    name: "Mind",
    subtitle: "Mental & Emotional Clarity",
    icon: Brain,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    glowColor: "shadow-purple-500/20",
    controls: "Thought patterns, emotional regulation, stress response.",
    whyMatters: "Not every thought is true — but unexamined thoughts run your life.",
    perspective: "I can notice my thoughts without becoming them.",
    whenIgnored: "Overthinking, emotional overload, anxiety, self-doubt.",
    whatWeTrain: "Emotional awareness, stress recovery, mental filtering.",
  },
  {
    id: "time",
    name: "Time",
    subtitle: "Structure & Flow",
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    glowColor: "shadow-blue-500/20",
    controls: "Focus, follow-through, balance, and overwhelm.",
    whyMatters: "Time isn't the issue — structure is.",
    perspective: "A plan should support my life, not trap it.",
    whenIgnored: "Chaos, procrastination, guilt, constant catch-up.",
    whatWeTrain: "Realistic scheduling, rhythm, flexibility, energy-based planning.",
  },
  {
    id: "purpose",
    name: "Purpose",
    subtitle: "Direction & Meaning",
    icon: Compass,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    glowColor: "shadow-amber-500/20",
    controls: "Motivation, fulfillment, long-term direction.",
    whyMatters: "Without direction, effort feels empty.",
    perspective: "I don't need the full map — just the next aligned step.",
    whenIgnored: "Aimlessness, burnout, comparison, disengagement.",
    whatWeTrain: "Values alignment, intention setting, meaningful goals.",
  },
  {
    id: "money",
    name: "Money",
    subtitle: "Stability & Choice",
    icon: Wallet,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    glowColor: "shadow-green-500/20",
    controls: "Security, options, stress levels, independence.",
    whyMatters: "Money doesn't buy happiness — but instability buys stress.",
    perspective: "Money is a tool, not a verdict on my worth.",
    whenIgnored: "Anxiety, avoidance, impulsive decisions, feeling trapped.",
    whatWeTrain: "Awareness, planning, intentional spending, financial clarity.",
  },
  {
    id: "relationships",
    name: "Relationships",
    subtitle: "Connection & Boundaries",
    icon: Users,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    glowColor: "shadow-pink-500/20",
    controls: "Belonging, support, emotional safety.",
    whyMatters: "Humans are wired for connection — but not at the cost of self-abandonment.",
    perspective: "Connection should feel safe, not draining.",
    whenIgnored: "Isolation, resentment, people-pleasing, emotional exhaustion.",
    whatWeTrain: "Boundaries, communication, healthy connection.",
  },
  {
    id: "environment",
    name: "Environment",
    subtitle: "External Support",
    icon: Home,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    glowColor: "shadow-cyan-500/20",
    controls: "Focus, stress levels, daily friction.",
    whyMatters: "Your environment either supports your goals — or silently works against them.",
    perspective: "My surroundings shape my behavior.",
    whenIgnored: "Distraction, overwhelm, inconsistency.",
    whatWeTrain: "Space design, routines, friction removal.",
  },
  {
    id: "identity",
    name: "Identity",
    subtitle: "Growth & Alignment",
    icon: Sprout,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    glowColor: "shadow-emerald-500/20",
    controls: "Self-trust, confidence, long-term growth.",
    whyMatters: "Change sticks when it aligns with who you believe you are.",
    perspective: "I am allowed to evolve.",
    whenIgnored: "Self-sabotage, stagnation, imposter syndrome.",
    whatWeTrain: "Self-concept, habits, growth narratives.",
  },
];

const STATUS_CONFIG: Record<SwitchStatus, { label: string; color: string; bgColor: string }> = {
  off: { label: "Off", color: "text-slate-400", bgColor: "bg-slate-500/20" },
  flickering: { label: "Flickering", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  stable: { label: "Stable", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  powered: { label: "Powered", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
};

function SwitchCard({ 
  switchData, 
  status,
  expanded, 
  onToggleExpand 
}: { 
  switchData: LifeSwitch; 
  status: SwitchStatus;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const statusConfig = STATUS_CONFIG[status];
  const Icon = switchData.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className={`overflow-hidden transition-all duration-300 cursor-pointer border-white/10 hover:border-white/20 ${expanded ? 'ring-1 ring-purple-500/30' : ''}`}
        onClick={onToggleExpand}
        data-testid={`card-switch-${switchData.id}`}
      >
        <CardContent className="p-0">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${switchData.bgColor} ${switchData.glowColor} shadow-lg`}>
                <Icon className={`h-5 w-5 ${switchData.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white">{switchData.name}</h3>
                    <p className="text-xs text-slate-400">{switchData.subtitle}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${statusConfig.bgColor} ${statusConfig.color} border-0 text-[10px] font-medium`}
                  >
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>
            </div>

            {!expanded && (
              <p className="text-sm text-slate-400 mt-3 line-clamp-2">
                {switchData.controls}
              </p>
            )}
          </div>

          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-4 space-y-4"
            >
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">What this controls</p>
                  <p className="text-sm text-slate-300">{switchData.controls}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Why it matters</p>
                  <p className="text-sm text-slate-300">{switchData.whyMatters}</p>
                </div>

                <div className={`p-3 rounded-xl ${switchData.bgColor} border border-white/5`}>
                  <p className="text-xs font-medium text-slate-400 mb-1">Perspective Training</p>
                  <p className={`text-sm font-medium ${switchData.color} italic`}>"{switchData.perspective}"</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">When ignored</p>
                  <p className="text-sm text-slate-400">{switchData.whenIgnored}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">What we train</p>
                  <p className="text-sm text-slate-300">{switchData.whatWeTrain}</p>
                </div>
              </div>

              <Link href={`/switch/${switchData.id}`}>
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`button-train-${switchData.id}`}
                >
                  <Power className="h-4 w-4 mr-2" />
                  Train This Switch
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LifeSwitchboardPage() {
  const [expandedId, setExpandedId] = useState<SwitchId | null>(null);
  const [statuses, setStatuses] = useState<Record<SwitchId, SwitchStatus>>(() => getSwitchStatuses());

  const handleToggleExpand = (id: SwitchId) => {
    setExpandedId((prev: SwitchId | null) => prev === id ? null : id);
  };

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="p-4 pb-24 space-y-6 max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 shadow-lg shadow-purple-500/10">
              <Sparkles className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Your Life Switchboard</h1>
              <p className="text-sm text-slate-400">One system. Multiple switches. You choose what to power.</p>
            </div>
          </div>

          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-blue-900/20">
            <CardContent className="p-4 space-y-3">
              <p className="text-slate-300 text-sm leading-relaxed">
                This isn't about doing more. It's about understanding what's actually draining or fueling your life.
              </p>
              <p className="text-slate-400 text-sm leading-relaxed">
                Each switch controls a different part of your system. You don't need to flip them all — just the right ones, at the right time.
              </p>
              
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30">
                  <Power className="h-3 w-3 mr-1" />
                  Perspective Training
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">
                  8 Life Dimensions
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button 
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
              onClick={() => {
                const switchSection = document.querySelector('[data-testid="card-switch-body"]');
                switchSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              data-testid="button-start-training"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Start Switch Training
            </Button>
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => {
                const switchSection = document.querySelector('[data-testid="card-switch-body"]');
                switchSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              data-testid="button-explore-switches"
            >
              Explore My Switches
            </Button>
          </div>
        </motion.div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-purple-400" />
            Your Switches
          </h2>
          
          <div className="space-y-3">
            {LIFE_SWITCHES.map((switchData, index) => (
              <motion.div
                key={switchData.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <SwitchCard
                  switchData={switchData}
                  status={statuses[switchData.id] || "off"}
                  expanded={expandedId === switchData.id}
                  onToggleExpand={() => handleToggleExpand(switchData.id)}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <Card className="border-white/5 bg-slate-800/30">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500">
              The goal is clarity, not pressure. Power the right parts of life, intentionally.
            </p>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
