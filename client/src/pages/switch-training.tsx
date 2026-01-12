import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Sparkles,
} from "lucide-react";
import { 
  getSingleSwitchData, 
  startSwitchTraining, 
  recordSwitchCheckIn,
  type SwitchId, 
  type SwitchStatus 
} from "@/lib/switch-storage";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

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
  off: { label: "Off", color: "text-slate-400", bgColor: "bg-slate-500/20" },
  flickering: { label: "Flickering", color: "text-amber-400", bgColor: "bg-amber-500/20" },
  stable: { label: "Stable", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  powered: { label: "Powered", color: "text-emerald-400", bgColor: "bg-emerald-500/20" },
};

export default function SwitchTrainingPage() {
  const [, params] = useRoute("/switch/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const switchId = params?.id as SwitchId;
  
  const switchInfo = SWITCH_INFO[switchId];
  const [switchData, setSwitchData] = useState(() => getSingleSwitchData(switchId));
  const [selectedPrompt, setSelectedPrompt] = useState<number | null>(null);

  if (!switchInfo) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400">Switch not found</p>
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
    startSwitchTraining(switchId);
    setSwitchData(getSingleSwitchData(switchId));
    toast({
      title: `${switchInfo.name} training started`,
      description: "Your switch is now flickering. Keep checking in to stabilize it.",
    });
  };

  const handleCheckIn = () => {
    recordSwitchCheckIn(switchId);
    setSwitchData(getSingleSwitchData(switchId));
    toast({
      title: "Check-in recorded",
      description: `${switchData.checkIns + 1} check-ins completed. Keep going!`,
    });
  };

  const handleTalkToDW = () => {
    const prompt = selectedPrompt !== null 
      ? switchInfo.checkInPrompts[selectedPrompt]
      : `I want to work on my ${switchInfo.name.toLowerCase()} switch. ${switchInfo.checkInPrompts[0]}`;
    navigate(`/chat?prompt=${encodeURIComponent(prompt)}`);
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
                <h1 className="text-xl font-bold text-white">{switchInfo.name}</h1>
                <p className="text-sm text-slate-400">{switchInfo.subtitle}</p>
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

        <Card className={`border-white/10 ${switchInfo.bgColor}`}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-400 mb-1">Perspective Training</p>
            <p className={`text-lg font-medium ${switchInfo.color} italic`}>
              "{switchInfo.perspective}"
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">What We Train</h2>
          <div className="grid grid-cols-2 gap-2">
            {switchInfo.whatWeTrain.map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-white/5">
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className={`p-1 rounded ${switchInfo.bgColor}`}>
                      <Check className={`h-3 w-3 ${switchInfo.color}`} />
                    </div>
                    <span className="text-sm text-slate-300">{item}</span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Check-In Prompts</h2>
          <p className="text-sm text-slate-400">
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
                  className={`border-white/5 cursor-pointer transition-all ${
                    selectedPrompt === i 
                      ? `ring-1 ${switchInfo.color.replace('text-', 'ring-')} ${switchInfo.bgColor}`
                      : 'hover:border-white/10'
                  }`}
                  onClick={() => setSelectedPrompt(selectedPrompt === i ? null : i)}
                  data-testid={`prompt-${i}`}
                >
                  <CardContent className="p-3">
                    <p className="text-sm text-slate-300">{prompt}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-4">
          {switchData.status === "off" ? (
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
              onClick={handleStartTraining}
              data-testid="button-start-training"
            >
              <Power className="h-4 w-4 mr-2" />
              Start Training This Switch
            </Button>
          ) : (
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
              onClick={handleCheckIn}
              data-testid="button-checkin"
            >
              <Check className="h-4 w-4 mr-2" />
              Record Check-In ({switchData.checkIns} completed)
            </Button>
          )}
          
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

        {switchData.status !== "off" && (
          <Card className="border-white/5 bg-slate-800/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Training Progress</span>
                <span className="text-slate-300">{switchData.checkIns} check-ins</span>
              </div>
              <div className="mt-2 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${switchInfo.bgColor.replace('/10', '')} transition-all`}
                  style={{ width: `${Math.min((switchData.checkIns / 14) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
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
