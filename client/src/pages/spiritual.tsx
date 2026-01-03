import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import { 
  Sparkles, 
  Settings2, 
  Heart, 
  Wind,
  ChevronDown,
  ChevronUp,
  Clock,
  Play
} from "lucide-react";
import { SpiritualProfileDialog } from "@/components/spiritual-profile-dialog";
import { 
  getSpiritualProfile, 
  hasCompletedSpiritualProfile,
  getSavedRoutinesByType,
  saveRoutine,
  getBodyProfile,
  type SpiritualProfile,
  type SavedRoutine
} from "@/lib/guest-storage";

const PRACTICE_LABELS: Record<string, string> = {
  meditation: "Meditation",
  prayer: "Prayer",
  breathwork: "Breathwork",
  journaling: "Journaling",
  gratitude: "Gratitude",
  nature: "Nature",
  yoga: "Yoga",
  mindfulness: "Mindfulness",
};

const NEED_LABELS: Record<string, string> = {
  calm: "Calm",
  clarity: "Clarity",
  connection: "Connection",
  energy: "Energy",
  release: "Release",
};

interface PracticeData {
  title: string;
  description: string;
  duration: number;
  practices: string[];
  forNeeds: string[];
  steps: string[];
  guidance: string;
}

const SAMPLE_PRACTICES: PracticeData[] = [
  {
    title: "Morning Gratitude",
    description: "Start your day by noticing three things you're grateful for",
    duration: 5,
    practices: ["gratitude", "mindfulness"],
    forNeeds: ["calm", "connection"],
    steps: [
      "Find a quiet spot and sit comfortably",
      "Take three deep breaths to center yourself",
      "Think of one person you're grateful for - feel the warmth",
      "Think of one experience from yesterday you're thankful for",
      "Think of one simple thing in your life you appreciate",
      "Carry this gratitude with you into your day"
    ],
    guidance: "This practice rewires your brain to notice the good. There's no right or wrong - whatever comes up is perfect."
  },
  {
    title: "Breath of Release",
    description: "A gentle breathing exercise to let go of tension",
    duration: 10,
    practices: ["breathwork"],
    forNeeds: ["calm", "release"],
    steps: [
      "Sit or lie down in a comfortable position",
      "Close your eyes and notice your natural breath",
      "Inhale slowly through your nose for 4 counts",
      "Hold gently for 2 counts",
      "Exhale through your mouth for 6 counts, releasing tension",
      "Repeat 8-10 times, letting go more with each exhale",
      "Return to natural breathing and notice how you feel"
    ],
    guidance: "The extended exhale activates your parasympathetic nervous system, signaling safety to your body. No need to force anything."
  },
  {
    title: "Body Scan Meditation",
    description: "Connect with your body through mindful awareness",
    duration: 15,
    practices: ["meditation", "mindfulness"],
    forNeeds: ["calm", "clarity", "connection"],
    steps: [
      "Lie down or sit comfortably with eyes closed",
      "Take a few deep breaths to settle",
      "Bring awareness to the top of your head",
      "Slowly scan down: forehead, eyes, jaw (release tension)",
      "Move to neck, shoulders, arms, hands",
      "Notice chest, belly, lower back",
      "Scan hips, legs, feet, toes",
      "Feel your whole body as one - rest here for a moment",
      "Gently wiggle fingers and toes, open eyes slowly"
    ],
    guidance: "Simply notice without judging. If you find tension, don't force it away - just acknowledge it with kindness."
  },
  {
    title: "Evening Reflection",
    description: "Journal prompts to process your day",
    duration: 10,
    practices: ["journaling"],
    forNeeds: ["clarity", "release"],
    steps: [
      "Find a quiet space with your journal",
      "Write: What went well today? (2-3 things)",
      "Write: What challenged me? (be honest, no judgment)",
      "Write: What did I learn about myself?",
      "Write: What am I letting go of before sleep?",
      "Close with one intention for tomorrow"
    ],
    guidance: "This isn't about perfection. Let your thoughts flow freely. The act of writing helps your brain process and release."
  },
  {
    title: "Nature Walk Meditation",
    description: "Mindful walking in nature to restore your spirit",
    duration: 20,
    practices: ["nature", "mindfulness"],
    forNeeds: ["energy", "connection"],
    steps: [
      "Find a natural space - park, trail, or even a tree-lined street",
      "Before walking, stand still and take 3 deep breaths",
      "Begin walking slowly, feeling each step",
      "Notice 5 things you can see (colors, textures, movement)",
      "Notice 4 things you can hear (near and far)",
      "Notice 3 things you can feel (air, ground, temperature)",
      "Continue walking mindfully for remaining time",
      "End by standing still and expressing silent gratitude"
    ],
    guidance: "Nature has a way of resetting our nervous system. Let the natural world do the work - you just need to be present."
  },
  {
    title: "Gentle Morning Yoga",
    description: "Wake up your body with slow, intentional movement",
    duration: 15,
    practices: ["yoga"],
    forNeeds: ["energy", "calm"],
    steps: [
      "Start in child's pose - rest here for 5 breaths",
      "Move to cat-cow stretches - 5 rounds with breath",
      "Downward dog - pedal your feet, hold 5 breaths",
      "Step forward to forward fold - hang loosely",
      "Roll up slowly to standing",
      "Gentle side stretches - 3 breaths each side",
      "Mountain pose - stand tall, breathe deeply",
      "Set an intention for your day"
    ],
    guidance: "Move slowly and honor what your body needs today. This isn't about performance - it's about waking up gently."
  },
];

export default function SpiritualPage() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [spiritualProfile, setSpiritualProfile] = useState<SpiritualProfile | null>(getSpiritualProfile());
  const [savedPractices, setSavedPractices] = useState<SavedRoutine[]>(getSavedRoutinesByType("spiritual_practice"));
  const [hasProfile, setHasProfile] = useState(hasCompletedSpiritualProfile());
  const [expandedPractice, setExpandedPractice] = useState<number | null>(null);
  const bodyProfile = getBodyProfile();

  const handleProfileComplete = () => {
    setProfileOpen(false);
    setSpiritualProfile(getSpiritualProfile());
    setHasProfile(hasCompletedSpiritualProfile());
  };

  const handleSavePractice = (practice: PracticeData) => {
    const saved = saveRoutine({
      type: "spiritual_practice",
      title: practice.title,
      description: practice.description,
      data: { duration: practice.duration, practices: practice.practices },
      tags: [...practice.practices, ...practice.forNeeds],
    });
    setSavedPractices([saved, ...savedPractices]);
  };

  const getPersonalizedPractices = () => {
    if (!spiritualProfile) return [];
    
    return SAMPLE_PRACTICES.filter(practice => {
      const matchesPractice = practice.practices.some(p => 
        spiritualProfile.practices.includes(p as any)
      );
      const matchesNeed = practice.forNeeds.some(n => 
        spiritualProfile.groundingNeeds.includes(n as any)
      );
      return matchesPractice || matchesNeed;
    });
  };

  const getEnergyBasedSuggestion = () => {
    if (!bodyProfile?.energyLevel) return null;
    
    const energy = bodyProfile.energyLevel;
    if (energy === "depleted" || energy === "low") {
      return SAMPLE_PRACTICES.find(p => p.forNeeds.includes("energy"));
    }
    if (energy === "scattered" || energy === "overstimulated") {
      return SAMPLE_PRACTICES.find(p => p.forNeeds.includes("calm"));
    }
    return null;
  };

  const personalizedPractices = getPersonalizedPractices();
  const energySuggestion = getEnergyBasedSuggestion();

  const renderPracticeCard = (practice: PracticeData, index: number, testIdPrefix: string) => {
    const isExpanded = expandedPractice === index;
    
    return (
      <Card 
        key={index} 
        className="hover-elevate cursor-pointer"
        data-testid={`card-${testIdPrefix}-${index}`}
        onClick={() => setExpandedPractice(isExpanded ? null : index)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{practice.title}</h3>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {practice.description}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {practice.duration} min
                </span>
                {practice.practices.slice(0, 2).map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {PRACTICE_LABELS[p] || p}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSavePractice(practice);
                }}
                data-testid={`button-save-${testIdPrefix}-${index}`}
              >
                Save
              </Button>
            </div>
          </div>
          
          {isExpanded && (
            <div className="mt-4 pt-4 border-t space-y-4">
              <div className="bg-primary/5 rounded-lg p-3">
                <p className="text-sm italic text-muted-foreground">{practice.guidance}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Play className="w-4 h-4 text-primary" />
                  Step-by-Step Guide
                </h4>
                <ol className="space-y-2 list-decimal list-inside">
                  {practice.steps.map((step, stepIdx) => (
                    <li key={stepIdx} className="text-sm text-muted-foreground">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">Great for:</span>
                {practice.forNeeds.map((need) => (
                  <Badge key={need} variant="secondary" className="text-xs">
                    {NEED_LABELS[need] || need}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Meditation" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-8">
          <p className="text-muted-foreground text-center">
            Practices that nourish your spirit and ground your being
          </p>

          {!hasProfile ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Tell us what grounds you</h3>
                  <p className="text-sm text-muted-foreground">
                    Help us suggest practices that resonate with your spirit
                  </p>
                </div>
                <Button onClick={() => setProfileOpen(true)} data-testid="button-open-spiritual-profile">
                  Get started
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base font-medium">Your Spiritual Profile</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setProfileOpen(true)}
                  data-testid="button-edit-spiritual-profile"
                >
                  <Settings2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {spiritualProfile?.practices && spiritualProfile.practices.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {spiritualProfile.practices.map((practice) => (
                      <Badge key={practice} variant="secondary" className="text-xs">
                        {PRACTICE_LABELS[practice] || practice}
                      </Badge>
                    ))}
                  </div>
                )}
                {spiritualProfile?.groundingNeeds && spiritualProfile.groundingNeeds.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Heart className="w-4 h-4" />
                    <span>Seeking: {spiritualProfile.groundingNeeds.map(n => NEED_LABELS[n]).join(", ")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {energySuggestion && (
            <Card className="bg-purple-500/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Wind className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">Based on your energy</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {energySuggestion.title} - {energySuggestion.description}
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleSavePractice(energySuggestion)}
                      data-testid="button-save-energy-suggestion"
                    >
                      Save this
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {hasProfile && personalizedPractices.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Personalized for you</h2>
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Based on your needs
                </Badge>
              </div>

              <div className="space-y-3">
                {personalizedPractices.map((practice, index) => 
                  renderPracticeCard(practice, index, "personalized")
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">All Practices</h2>
            <div className="space-y-3">
              {SAMPLE_PRACTICES.map((practice, index) => 
                renderPracticeCard(practice, index + 100, "all")
              )}
            </div>
          </div>

          <SpiritualProfileDialog
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            onComplete={handleProfileComplete}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
