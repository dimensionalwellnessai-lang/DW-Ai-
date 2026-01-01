import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  Settings2, 
  Heart, 
  Sun,
  Moon,
  Wind,
  Feather,
  ChevronRight
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

const SAMPLE_PRACTICES = [
  {
    title: "Morning Gratitude",
    description: "Start your day by noticing three things you're grateful for",
    duration: 5,
    practices: ["gratitude", "mindfulness"],
    forNeeds: ["calm", "connection"],
  },
  {
    title: "Breath of Release",
    description: "A gentle breathing exercise to let go of tension",
    duration: 10,
    practices: ["breathwork"],
    forNeeds: ["calm", "release"],
  },
  {
    title: "Body Scan Meditation",
    description: "Connect with your body through mindful awareness",
    duration: 15,
    practices: ["meditation", "mindfulness"],
    forNeeds: ["calm", "clarity", "connection"],
  },
  {
    title: "Evening Reflection",
    description: "Journal prompts to process your day",
    duration: 10,
    practices: ["journaling"],
    forNeeds: ["clarity", "release"],
  },
  {
    title: "Nature Walk Meditation",
    description: "Mindful walking in nature to restore your spirit",
    duration: 20,
    practices: ["nature", "mindfulness"],
    forNeeds: ["energy", "connection"],
  },
  {
    title: "Gentle Morning Yoga",
    description: "Wake up your body with slow, intentional movement",
    duration: 15,
    practices: ["yoga"],
    forNeeds: ["energy", "calm"],
  },
];

export default function SpiritualPage() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [spiritualProfile, setSpiritualProfile] = useState<SpiritualProfile | null>(getSpiritualProfile());
  const [savedPractices, setSavedPractices] = useState<SavedRoutine[]>(getSavedRoutinesByType("spiritual_practice"));
  const [hasProfile, setHasProfile] = useState(hasCompletedSpiritualProfile());
  const bodyProfile = getBodyProfile();

  const handleProfileComplete = () => {
    setProfileOpen(false);
    setSpiritualProfile(getSpiritualProfile());
    setHasProfile(hasCompletedSpiritualProfile());
  };

  const handleSavePractice = (practice: typeof SAMPLE_PRACTICES[0]) => {
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

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Spiritual Wellness</h1>
          <p className="text-muted-foreground">
            Practices that nourish your spirit and ground your being
          </p>
        </div>

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
              {spiritualProfile?.values && spiritualProfile.values.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {spiritualProfile.values.slice(0, 4).map((value) => (
                    <Badge key={value} variant="outline" className="text-xs">
                      {value}
                    </Badge>
                  ))}
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
              {personalizedPractices.map((practice, index) => (
                <Card 
                  key={index} 
                  className="hover-elevate cursor-pointer"
                  data-testid={`card-personalized-practice-${index}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{practice.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {practice.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">{practice.duration} min</span>
                          {practice.practices.slice(0, 2).map((p) => (
                            <Badge key={p} variant="outline" className="text-xs">
                              {PRACTICE_LABELS[p] || p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSavePractice(practice);
                        }}
                        data-testid={`button-save-personalized-${index}`}
                      >
                        Save
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">All Practices</h2>
          <div className="space-y-3">
            {SAMPLE_PRACTICES.map((practice, index) => (
              <Card 
                key={index} 
                className="hover-elevate cursor-pointer"
                data-testid={`card-all-practice-${index}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{practice.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {practice.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">{practice.duration} min</span>
                        {practice.practices.slice(0, 2).map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {PRACTICE_LABELS[p] || p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSavePractice(practice);
                      }}
                      data-testid={`button-save-all-practice-${index}`}
                    >
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <SpiritualProfileDialog
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          onComplete={handleProfileComplete}
        />
      </div>
    </ScrollArea>
  );
}
