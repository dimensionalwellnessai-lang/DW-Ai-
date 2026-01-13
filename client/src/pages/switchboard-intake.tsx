import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Brain,
  Clock,
  Compass,
  Wallet,
  Users,
  Home,
  Sprout,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { 
  initializeSwitchData,
  type SwitchId, 
  type SwitchStatus 
} from "@/lib/switch-storage";

interface IntakeQuestion {
  switchId: SwitchId;
  name: string;
  icon: typeof Zap;
  color: string;
  bgColor: string;
  question: string;
  perspective: string;
  options: {
    label: string;
    value: number;
    description: string;
  }[];
}

const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    switchId: "body",
    name: "Body",
    icon: Zap,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    question: "How would you describe your physical energy lately?",
    perspective: "Energy comes before motivation. We're not broken — we're building capacity.",
    options: [
      { label: "Depleted", value: 0, description: "Running on empty most days" },
      { label: "Inconsistent", value: 1, description: "Good days and bad days" },
      { label: "Steady", value: 2, description: "Generally feel okay" },
      { label: "Strong", value: 3, description: "Feel physically capable" },
    ],
  },
  {
    switchId: "mind",
    name: "Mind",
    icon: Brain,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    question: "How clear does your mind feel most days?",
    perspective: "Thoughts are visitors, not residents. We can notice them without becoming them.",
    options: [
      { label: "Overwhelmed", value: 0, description: "Constant mental noise" },
      { label: "Foggy", value: 1, description: "Hard to focus or think clearly" },
      { label: "Managing", value: 2, description: "Some clarity, some chaos" },
      { label: "Clear", value: 3, description: "Thoughts feel organized" },
    ],
  },
  {
    switchId: "time",
    name: "Time",
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    question: "How in control of your time do you feel?",
    perspective: "A plan supports life — it doesn't trap it. We can adjust anytime.",
    options: [
      { label: "Chaotic", value: 0, description: "Days just happen to me" },
      { label: "Reactive", value: 1, description: "Always catching up" },
      { label: "Structured", value: 2, description: "Some rhythm to my days" },
      { label: "Flowing", value: 3, description: "Time works with me" },
    ],
  },
  {
    switchId: "purpose",
    name: "Purpose",
    icon: Compass,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    question: "How connected do you feel to your sense of direction?",
    perspective: "We don't need the full map — just the next honest step.",
    options: [
      { label: "Lost", value: 0, description: "No idea what I'm working toward" },
      { label: "Searching", value: 1, description: "Looking for meaning" },
      { label: "Glimpses", value: 2, description: "Sometimes I see it clearly" },
      { label: "Aligned", value: 3, description: "I know my direction" },
    ],
  },
  {
    switchId: "money",
    name: "Money",
    icon: Wallet,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    question: "How do you feel about your financial situation?",
    perspective: "Money is a tool, not a verdict on your worth. Stories about money can be rewritten.",
    options: [
      { label: "Stressed", value: 0, description: "Constant worry about money" },
      { label: "Anxious", value: 1, description: "Uncertain and avoiding it" },
      { label: "Aware", value: 2, description: "I know where I stand" },
      { label: "Stable", value: 3, description: "Feel secure and intentional" },
    ],
  },
  {
    switchId: "relationships",
    name: "Relationships",
    icon: Users,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    question: "How nourishing are your relationships right now?",
    perspective: "Connection should feel safe, not draining. We can set boundaries.",
    options: [
      { label: "Isolated", value: 0, description: "Feeling alone or disconnected" },
      { label: "Draining", value: 1, description: "More taking than giving" },
      { label: "Mixed", value: 2, description: "Some good, some challenging" },
      { label: "Supportive", value: 3, description: "Feel seen and supported" },
    ],
  },
  {
    switchId: "environment",
    name: "Environment",
    icon: Home,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    question: "How well does your physical space support you?",
    perspective: "Environment shapes behavior. Small changes create big shifts.",
    options: [
      { label: "Cluttered", value: 0, description: "Space adds to my stress" },
      { label: "Neglected", value: 1, description: "Could use attention" },
      { label: "Functional", value: 2, description: "Works for the basics" },
      { label: "Supportive", value: 3, description: "Space helps me thrive" },
    ],
  },
  {
    switchId: "identity",
    name: "Identity",
    icon: Sprout,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    question: "How aligned do you feel with who you're becoming?",
    perspective: "We are allowed to evolve. Old stories don't define new chapters.",
    options: [
      { label: "Stuck", value: 0, description: "Feel trapped in old patterns" },
      { label: "Questioning", value: 1, description: "Not sure who I am anymore" },
      { label: "Growing", value: 2, description: "Making progress slowly" },
      { label: "Evolving", value: 3, description: "Actively becoming who I want" },
    ],
  },
];

function scoreToStatus(score: number): SwitchStatus {
  if (score === 0) return "off";
  if (score === 1) return "flickering";
  if (score === 2) return "stable";
  return "powered";
}

export default function SwitchboardIntakePage() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<SwitchId, number>>({} as Record<SwitchId, number>);
  const [showIntro, setShowIntro] = useState(true);
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = INTAKE_QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / INTAKE_QUESTIONS.length) * 100;
  const hasAnswered = currentQuestion && answers[currentQuestion.switchId] !== undefined;

  const handleAnswer = (value: number) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.switchId]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < INTAKE_QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    const statuses = Object.entries(answers).reduce((acc, [switchId, score]) => {
      acc[switchId as SwitchId] = scoreToStatus(score);
      return acc;
    }, {} as Record<SwitchId, SwitchStatus>);
    
    initializeSwitchData(statuses);
    localStorage.setItem("fts_intake_complete", "true");
    navigate("/switchboard");
  };

  const getPrioritySwitch = () => {
    let lowest: { switchId: SwitchId; score: number } | null = null;
    Object.entries(answers).forEach(([switchId, score]) => {
      if (!lowest || score < lowest.score) {
        lowest = { switchId: switchId as SwitchId, score };
      }
    });
    return lowest ? INTAKE_QUESTIONS.find(q => q.switchId === lowest!.switchId) : null;
  };

  if (showIntro) {
    return (
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 pt-8"
          >
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Discover Your Switches
            </h1>
            <p className="text-slate-400 leading-relaxed">
              Life isn't one thing — it's many dimensions working together. 
              Let's see where you stand in each area so we can help you focus 
              on what matters most.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-white/10 bg-slate-800/30">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-medium text-slate-200">How this works:</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>8 quick questions about different life areas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>No right or wrong answers — just honest reflection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>Get personalized recommendations for where to start</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-purple-500/20 bg-purple-500/5">
              <CardContent className="p-4">
                <p className="text-sm text-purple-300 italic text-center">
                  "You don't have to fix everything at once. 
                  You just need to know which switch to flip first."
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
              onClick={() => setShowIntro(false)}
              data-testid="button-start-intake"
            >
              Begin Assessment
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </ScrollArea>
    );
  }

  if (showResults) {
    const prioritySwitch = getPrioritySwitch();
    const Icon = prioritySwitch?.icon || Sparkles;

    return (
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4 pt-8"
          >
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Your Switchboard is Ready
            </h1>
            <p className="text-slate-400">
              Based on your responses, here's what we found.
            </p>
          </motion.div>

          <div className="space-y-2">
            {INTAKE_QUESTIONS.map((q, i) => {
              const score = answers[q.switchId];
              const status = scoreToStatus(score);
              const QIcon = q.icon;
              
              return (
                <motion.div
                  key={q.switchId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`border-white/5 ${score <= 1 ? q.bgColor : ''}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${q.bgColor}`}>
                        <QIcon className={`h-4 w-4 ${q.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-200">{q.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{status}</p>
                      </div>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map(level => (
                          <div
                            key={level}
                            className={`w-2 h-2 rounded-full ${
                              level <= score 
                                ? q.color.replace('text-', 'bg-').replace('-400', '-500')
                                : 'bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {prioritySwitch && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className={`border-${prioritySwitch.color.replace('text-', '')}/30 ${prioritySwitch.bgColor}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${prioritySwitch.bgColor}`}>
                      <Icon className={`h-5 w-5 ${prioritySwitch.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Suggested Focus</p>
                      <p className="font-medium text-slate-200">{prioritySwitch.name} Switch</p>
                    </div>
                  </div>
                  <p className={`text-sm ${prioritySwitch.color} italic`}>
                    "{prioritySwitch.perspective}"
                  </p>
                  <p className="text-sm text-slate-400">
                    This area could use some attention. Start here and build momentum.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25"
              onClick={handleComplete}
              data-testid="button-go-to-switchboard"
            >
              Go to My Switchboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </ScrollArea>
    );
  }

  const Icon = currentQuestion.icon;

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Question {currentStep + 1} of {INTAKE_QUESTIONS.length}</span>
            <span className="text-slate-500">{currentQuestion.name}</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="text-center space-y-4 pt-4">
              <div className={`w-14 h-14 mx-auto rounded-xl ${currentQuestion.bgColor} flex items-center justify-center`}>
                <Icon className={`h-7 w-7 ${currentQuestion.color}`} />
              </div>
              <h2 className="text-xl font-semibold text-white">
                {currentQuestion.question}
              </h2>
              <p className={`text-sm ${currentQuestion.color} italic`}>
                "{currentQuestion.perspective}"
              </p>
            </div>

            <div className="space-y-2">
              {currentQuestion.options.map((option, i) => (
                <Card
                  key={i}
                  className={`border-white/5 cursor-pointer transition-all ${
                    answers[currentQuestion.switchId] === option.value
                      ? `ring-1 ${currentQuestion.color.replace('text-', 'ring-')} ${currentQuestion.bgColor}`
                      : 'hover:border-white/10'
                  }`}
                  onClick={() => handleAnswer(option.value)}
                  data-testid={`option-${i}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        answers[currentQuestion.switchId] === option.value
                          ? `${currentQuestion.color.replace('text-', 'border-')} ${currentQuestion.color.replace('text-', 'bg-')}`
                          : 'border-slate-600'
                      }`}>
                        {answers[currentQuestion.switchId] === option.value && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">{option.label}</p>
                        <p className="text-sm text-slate-500">{option.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 pt-4">
          {currentStep > 0 && (
            <Button 
              variant="outline" 
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button 
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white disabled:opacity-50"
            onClick={handleNext}
            disabled={!hasAnswered}
            data-testid="button-next"
          >
            {currentStep === INTAKE_QUESTIONS.length - 1 ? 'See Results' : 'Next'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
