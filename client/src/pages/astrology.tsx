import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Moon, 
  Sun, 
  Star, 
  Calendar, 
  ChevronRight,
  Sparkles,
  Settings2,
  RefreshCw
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AstrologyNote {
  id: string;
  date: string;
  content: string;
  moonPhase?: string;
}

interface BirthChart {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  sunSign?: string;
  moonSign?: string;
  risingSign?: string;
}

interface CosmicEvent {
  date: string;
  event: string;
  type: "moon" | "retrograde" | "transit";
  description: string;
}

const NOTES_KEY = "dw_astrology_notes";
const BIRTH_CHART_KEY = "dw_birth_chart";

function getStoredNotes(): AstrologyNote[] {
  try {
    const stored = localStorage.getItem(NOTES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveNote(note: AstrologyNote): void {
  const notes = getStoredNotes();
  notes.unshift(note);
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes.slice(0, 30)));
}

function getBirthChart(): BirthChart | null {
  try {
    const stored = localStorage.getItem(BIRTH_CHART_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveBirthChart(chart: BirthChart): void {
  localStorage.setItem(BIRTH_CHART_KEY, JSON.stringify(chart));
}

function getMoonPhase(): string {
  const phases = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  const now = new Date();
  const lunarCycle = 29.53;
  const knownNewMoon = new Date("2024-01-11");
  const daysSinceNew = (now.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const phaseIndex = Math.floor((daysSinceNew % lunarCycle) / (lunarCycle / 8)) % 8;
  return phases[phaseIndex];
}

function getMoonPhaseGuidance(phase: string): string {
  const guidance: Record<string, string> = {
    "New Moon": "A time for new beginnings and setting intentions. Plant seeds for what you want to grow.",
    "Waxing Crescent": "Nurture your intentions. Take small steps forward with focus and determination.",
    "First Quarter": "Time for action and decisions. Face challenges head-on and push through obstacles.",
    "Waxing Gibbous": "Refine and adjust. Trust the process and stay committed to your path.",
    "Full Moon": "Celebration and release. Acknowledge achievements and let go of what no longer serves you.",
    "Waning Gibbous": "Share wisdom and practice gratitude. Reflect on lessons learned.",
    "Last Quarter": "Release and forgive. Clear space for new growth by letting go of the old.",
    "Waning Crescent": "Rest and restore. Prepare for the next cycle with quiet reflection.",
  };
  return guidance[phase] || "Tune into your inner wisdom today.";
}

function getSunSign(birthDate: string): string {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const signs = [
    { sign: "Capricorn", start: [12, 22], end: [1, 19] },
    { sign: "Aquarius", start: [1, 20], end: [2, 18] },
    { sign: "Pisces", start: [2, 19], end: [3, 20] },
    { sign: "Aries", start: [3, 21], end: [4, 19] },
    { sign: "Taurus", start: [4, 20], end: [5, 20] },
    { sign: "Gemini", start: [5, 21], end: [6, 20] },
    { sign: "Cancer", start: [6, 21], end: [7, 22] },
    { sign: "Leo", start: [7, 23], end: [8, 22] },
    { sign: "Virgo", start: [8, 23], end: [9, 22] },
    { sign: "Libra", start: [9, 23], end: [10, 22] },
    { sign: "Scorpio", start: [10, 23], end: [11, 21] },
    { sign: "Sagittarius", start: [11, 22], end: [12, 21] },
  ];
  
  for (const { sign, start, end } of signs) {
    if (
      (month === start[0] && day >= start[1]) ||
      (month === end[0] && day <= end[1])
    ) {
      return sign;
    }
  }
  return "Capricorn";
}

function getUpcomingCosmicEvents(): CosmicEvent[] {
  const now = new Date();
  const events: CosmicEvent[] = [];
  
  const lunarCycle = 29.53;
  const knownNewMoon = new Date("2024-01-11");
  const daysSinceNew = (now.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const daysInCurrentCycle = daysSinceNew % lunarCycle;
  
  const nextNewMoon = new Date(now.getTime() + (lunarCycle - daysInCurrentCycle) * 24 * 60 * 60 * 1000);
  const nextFullMoon = new Date(now.getTime() + ((lunarCycle / 2) - daysInCurrentCycle + (daysInCurrentCycle > lunarCycle / 2 ? lunarCycle : 0)) * 24 * 60 * 60 * 1000);
  
  events.push({
    date: nextNewMoon.toISOString().split("T")[0],
    event: "New Moon",
    type: "moon",
    description: "Set intentions and plant seeds for new beginnings"
  });
  
  events.push({
    date: nextFullMoon.toISOString().split("T")[0],
    event: "Full Moon",
    type: "moon",
    description: "Harvest what you've grown and release what no longer serves"
  });
  
  const retrogradeStart = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  events.push({
    date: retrogradeStart.toISOString().split("T")[0],
    event: "Mercury Retrograde",
    type: "retrograde",
    description: "Review, reflect, and revisit. Avoid major decisions if possible"
  });
  
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { 
    weekday: "short", 
    month: "short", 
    day: "numeric" 
  });
}

const HOROSCOPE_READINGS: Record<string, { daily: string; weekly: string; monthly: string }> = {
  Aries: {
    daily: "Your fiery energy is well-aspected today. Channel your natural leadership into a creative project or meaningful conversation.",
    weekly: "This week invites you to balance action with reflection. The universe supports bold moves, but not impulsive ones.",
    monthly: "A month of transformation awaits. Old patterns are ready to release, making space for authentic self-expression."
  },
  Taurus: {
    daily: "Comfort and stability call to you today. Honor your need for groundedness while remaining open to small changes.",
    weekly: "Financial and material matters come into focus. Trust your practical wisdom while staying flexible.",
    monthly: "Relationships deepen this month. Your steady presence is a gift to those around you."
  },
  Gemini: {
    daily: "Your curious mind is extra active. Follow the threads of conversation and connection that light you up.",
    weekly: "Communication flows smoothly. Express your truth with both wit and heart.",
    monthly: "Learning opportunities abound. Whether formal study or life lessons, you're absorbing wisdom."
  },
  Cancer: {
    daily: "Emotional tides may be strong. Create a nurturing space for yourself and honor what arises.",
    weekly: "Home and family themes are highlighted. Tend to your inner and outer sanctuaries.",
    monthly: "Deep healing is available. Trust your intuition as it guides you toward emotional freedom."
  },
  Leo: {
    daily: "Your natural radiance shines bright. Share your warmth generously while also receiving appreciation.",
    weekly: "Creative expression is your medicine this week. Play, create, and let your heart lead.",
    monthly: "Recognition for your efforts is coming. Stay authentic rather than seeking validation."
  },
  Virgo: {
    daily: "Details matter today, but don't lose sight of the bigger picture. Balance precision with perspective.",
    weekly: "Health and wellness routines benefit from attention. Small adjustments create lasting change.",
    monthly: "Service to others brings fulfillment, but remember to serve yourself too."
  },
  Libra: {
    daily: "Harmony in relationships is your focus. Seek balance without abandoning your own needs.",
    weekly: "Beauty and aesthetics inspire you. Surround yourself with what pleases your senses.",
    monthly: "Partnerships of all kinds are evolving. Honest communication creates deeper connection."
  },
  Scorpio: {
    daily: "Intensity is your ally today. Channel your depth into transformation rather than control.",
    weekly: "Hidden truths may surface. Face them with courage and compassion.",
    monthly: "Powerful regeneration is available. Let go of what's ready to die so new life can emerge."
  },
  Sagittarius: {
    daily: "Adventure calls, even in small ways. Expand your horizons through learning or exploration.",
    weekly: "Philosophy and meaning-making are highlighted. What beliefs are ready to evolve?",
    monthly: "Travel or higher education themes arise. Follow your quest for truth and wisdom."
  },
  Capricorn: {
    daily: "Your ambition is well-supported. Take practical steps toward long-term goals with patience.",
    weekly: "Career and public life demand attention. Lead with integrity and persistence.",
    monthly: "Structure and discipline serve your highest vision. Build foundations that will last."
  },
  Aquarius: {
    daily: "Your unique perspective is needed. Share your innovative ideas without attachment to outcomes.",
    weekly: "Community and collaboration themes arise. Find your tribe and contribute your gifts.",
    monthly: "Revolutionary changes are brewing. Trust your vision even when others don't understand."
  },
  Pisces: {
    daily: "Dreams and intuition are heightened. Pay attention to symbols and synchronicities.",
    weekly: "Spiritual practices nourish your soul. Make time for meditation, art, or sacred rest.",
    monthly: "Compassion flows through you. Set healthy boundaries while remaining open-hearted."
  },
};

export default function AstrologyPage() {
  const [notes, setNotes] = useState<AstrologyNote[]>(getStoredNotes);
  const [newNote, setNewNote] = useState("");
  const [birthChart, setBirthChart] = useState<BirthChart | null>(getBirthChart);
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  
  const handleOpenDialog = () => {
    const savedChart = getBirthChart();
    setBirthDate(savedChart?.birthDate || "");
    setBirthTime(savedChart?.birthTime || "");
    setBirthPlace(savedChart?.birthPlace || "");
    setChartDialogOpen(true);
  };
  
  const moonPhase = getMoonPhase();
  const moonGuidance = getMoonPhaseGuidance(moonPhase);
  const today = new Date().toISOString().split("T")[0];
  const cosmicEvents = getUpcomingCosmicEvents();
  
  const sunSign = birthChart?.birthDate ? getSunSign(birthChart.birthDate) : null;
  const horoscope = sunSign ? HOROSCOPE_READINGS[sunSign] : null;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const note: AstrologyNote = {
      id: Date.now().toString(),
      date: today,
      content: newNote.trim(),
      moonPhase,
    };
    
    saveNote(note);
    setNotes(getStoredNotes());
    setNewNote("");
  };
  
  const handleSaveBirthChart = () => {
    if (!birthDate) return;
    
    const chart: BirthChart = {
      birthDate,
      birthTime,
      birthPlace,
      sunSign: getSunSign(birthDate),
    };
    
    saveBirthChart(chart);
    setBirthChart(chart);
    setChartDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Astrology" />

      <ScrollArea className="h-[calc(100vh-57px)]">
        <main className="p-4 max-w-2xl mx-auto space-y-6 pb-8">
          
          {!birthChart ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 mx-auto bg-violet-500/10 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Create Your Birth Chart</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your birth details for personalized horoscope readings
                  </p>
                </div>
                <Button onClick={handleOpenDialog} data-testid="button-create-birth-chart">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enter Birth Details
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Your Chart
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleOpenDialog}
                    data-testid="button-edit-birth-chart"
                  >
                    <Settings2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm">
                    <Sun className="w-3 h-3 mr-1" />
                    {sunSign}
                  </Badge>
                  {birthChart.birthTime && (
                    <span className="text-sm text-muted-foreground">
                      Born at {birthChart.birthTime}
                    </span>
                  )}
                </div>
                {birthChart.birthPlace && (
                  <p className="text-sm text-muted-foreground">
                    {birthChart.birthPlace}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Moon className="h-4 w-4" />
                Current Moon Phase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-display" data-testid="text-moon-phase">{moonPhase}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {moonGuidance}
              </p>
            </CardContent>
          </Card>
          
          {horoscope && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">{sunSign} Horoscope</h2>
              </div>
              
              <Tabs defaultValue="daily" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="daily" className="flex-1" data-testid="tab-daily-horoscope">
                    Today
                  </TabsTrigger>
                  <TabsTrigger value="weekly" className="flex-1" data-testid="tab-weekly-horoscope">
                    This Week
                  </TabsTrigger>
                  <TabsTrigger value="monthly" className="flex-1" data-testid="tab-monthly-horoscope">
                    This Month
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="daily" className="mt-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm leading-relaxed">{horoscope.daily}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="weekly" className="mt-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm leading-relaxed">{horoscope.weekly}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="monthly" className="mt-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm leading-relaxed">{horoscope.monthly}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <div className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Cosmic Calendar
            </h2>
            <div className="space-y-2">
              {cosmicEvents.map((event, idx) => (
                <Card 
                  key={idx} 
                  className="hover-elevate"
                  data-testid={`card-cosmic-event-${idx}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          event.type === "moon" ? "bg-violet-500/10" :
                          event.type === "retrograde" ? "bg-amber-500/10" : "bg-blue-500/10"
                        }`}>
                          {event.type === "moon" ? (
                            <Moon className={`w-5 h-5 ${
                              event.event.includes("Full") ? "text-amber-400" : "text-violet-500"
                            }`} />
                          ) : event.type === "retrograde" ? (
                            <RefreshCw className="w-5 h-5 text-amber-500" />
                          ) : (
                            <Star className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{event.event}</h3>
                          <p className="text-xs text-muted-foreground mb-1">
                            {formatDate(event.date)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Star className="h-4 w-4" />
                Cosmic Journal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="What are you noticing today? Any cosmic vibes, synchronicities, or intuitive hits..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-astrology-note"
              />
              <Button 
                onClick={handleAddNote} 
                disabled={!newNote.trim()}
                data-testid="button-add-note"
              >
                Save Note
              </Button>
            </CardContent>
          </Card>

          {notes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Past Notes
              </h2>
              {notes.map((note) => (
                <Card key={note.id} className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span>{formatDate(note.date)}</span>
                      {note.moonPhase && (
                        <>
                          <span>·</span>
                          <span>{note.moonPhase}</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm" data-testid={`text-note-${note.id}`}>{note.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </ScrollArea>
      
      <Dialog open={chartDialogOpen} onOpenChange={setChartDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Birth Chart Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                data-testid="input-birth-date"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birthTime">Birth Time (optional)</Label>
              <Input
                id="birthTime"
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                placeholder="For more accurate readings"
                data-testid="input-birth-time"
              />
              <p className="text-xs text-muted-foreground">
                For more accurate rising sign and moon sign calculations
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="birthPlace">Birth Place (optional)</Label>
              <Input
                id="birthPlace"
                type="text"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
                placeholder="City, Country"
                data-testid="input-birth-place"
              />
            </div>
            
            <Button 
              onClick={handleSaveBirthChart} 
              disabled={!birthDate}
              className="w-full"
              data-testid="button-save-birth-chart"
            >
              Save Birth Chart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
