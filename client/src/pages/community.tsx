import { useState } from "react";
import { Link } from "wouter";
import { useTutorialStart } from "@/contexts/tutorial-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  Heart,
  MapPin,
  Globe,
  Plus,
  Check,
  ChevronRight,
  Sparkles,
  Search,
  Calendar,
  ExternalLink,
  SkipForward,
  X,
  TrendingUp,
  HandHeart,
  GraduationCap,
  Megaphone,
} from "lucide-react";
import { InAppSearch, type SearchResult } from "@/components/in-app-search";
import { useToast } from "@/hooks/use-toast";
import {
  getCommunityProfile,
  saveCommunityProfile,
  getCommunityOpportunities,
  hasCompletedCommunityProfile,
  type CommunityProfile,
  type CommunityFocus,
  type AvailabilityLevel,
} from "@/lib/guest-storage";

const FOCUS_OPTIONS: { id: CommunityFocus; label: string; description: string }[] = [
  { id: "volunteering", label: "Volunteering", description: "Hands-on help for causes you care about" },
  { id: "mentoring", label: "Mentoring", description: "Sharing your experience with others" },
  { id: "advocacy", label: "Advocacy", description: "Speaking up for change" },
  { id: "local_events", label: "Local Events", description: "Connecting with your neighborhood" },
  { id: "online_groups", label: "Online Communities", description: "Finding your people digitally" },
  { id: "donations", label: "Donations & Fundraising", description: "Financial support for causes" },
];

const AVAILABILITY_OPTIONS: { id: AvailabilityLevel; label: string }[] = [
  { id: "few_hours_month", label: "A few hours a month" },
  { id: "bi_weekly", label: "Every couple of weeks" },
  { id: "weekly", label: "Weekly" },
  { id: "flexible", label: "Flexible / as needed" },
];

const CAUSE_OPTIONS = [
  "Environment",
  "Education",
  "Health & Wellness",
  "Poverty & Hunger",
  "Animal Welfare",
  "Arts & Culture",
  "Youth Programs",
  "Elderly Care",
  "Mental Health",
  "Community Development",
];

// Extended type for display purposes
interface OpportunityDisplay extends CommunityOpportunity {
  featured?: boolean;
}

const SAMPLE_OPPORTUNITIES: OpportunityDisplay[] = [
  {
    id: "1",
    title: "Weekend Park Cleanup",
    organization: "Green City Initiative",
    description: "Join us to beautify local parks and green spaces",
    type: "volunteering" as CommunityFocus,
    isOnline: false,
    location: "Local parks",
    url: null,
    tags: ["environment", "outdoors", "group"],
    matchScore: 0.85,
    discoveredAt: Date.now() - 86400000, // 1 day ago
    featured: true,
  },
  {
    id: "2",
    title: "Virtual Mentor Program",
    organization: "Youth Forward",
    description: "Guide young professionals through career challenges",
    type: "mentoring" as CommunityFocus,
    isOnline: true,
    location: null,
    url: null,
    tags: ["mentoring", "career", "remote"],
    matchScore: 0.9,
    discoveredAt: Date.now() - 172800000, // 2 days ago
  },
  {
    id: "3",
    title: "Community Garden Project",
    organization: "Neighborhood Alliance",
    description: "Help grow fresh produce for local food banks",
    type: "volunteering" as CommunityFocus,
    isOnline: false,
    location: "Community center",
    url: null,
    tags: ["food", "gardening", "local"],
    matchScore: 0.8,
    discoveredAt: Date.now() - 259200000, // 3 days ago
  },
  {
    id: "4",
    title: "Climate Action Advocacy",
    organization: "Earth Defenders",
    description: "Join campaigns for environmental policy change",
    type: "advocacy" as CommunityFocus,
    isOnline: true,
    location: null,
    url: null,
    tags: ["environment", "advocacy", "policy"],
    matchScore: 0.75,
    discoveredAt: Date.now() - 345600000, // 4 days ago
  },
  {
    id: "5",
    title: "Local Art Festival",
    organization: "Arts Council",
    description: "Help organize community cultural events",
    type: "local_events" as CommunityFocus,
    isOnline: false,
    location: "City Hall Plaza",
    url: null,
    tags: ["arts", "culture", "events"],
    matchScore: 0.7,
    discoveredAt: Date.now() - 432000000, // 5 days ago
  },
];

// Opportunity type styling
const OPPORTUNITY_STYLES: Record<CommunityFocus, { icon: typeof HandHeart; color: string; bg: string; label: string }> = {
  volunteering: { icon: HandHeart, color: "text-green-600", bg: "bg-green-500/10", label: "Volunteering" },
  mentoring: { icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-500/10", label: "Mentoring" },
  advocacy: { icon: Megaphone, color: "text-orange-600", bg: "bg-orange-500/10", label: "Advocacy" },
  local_events: { icon: Calendar, color: "text-purple-600", bg: "bg-purple-500/10", label: "Local Event" },
  online_groups: { icon: Globe, color: "text-teal-600", bg: "bg-teal-500/10", label: "Online Group" },
  donations: { icon: Heart, color: "text-pink-600", bg: "bg-pink-500/10", label: "Fundraising" },
};

export default function CommunityPage() {
  useTutorialStart("community", 1000);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<CommunityProfile | null>(getCommunityProfile());
  const opportunities = getCommunityOpportunities();
  const hasProfile = hasCompletedCommunityProfile();
  const { toast } = useToast();

  const handleSaveProfile = (newProfile: CommunityProfile) => {
    saveCommunityProfile(newProfile);
    setProfile(newProfile);
    setProfileOpen(false);
  };

  const displayOpportunities = opportunities.length > 0 ? opportunities : SAMPLE_OPPORTUNITIES;

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between gap-4 p-4 border-b sticky top-0 bg-background z-50">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display font-bold text-xl">Community Wellness</h1>
            <p className="text-sm text-muted-foreground">Your impact on the world around you</p>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <main className="p-4 max-w-2xl mx-auto space-y-6">
          {/* Profile Setup Banner (smaller, non-blocking) */}
          {!hasProfile && (
            <Card className="border-dashed border-teal-500/50 bg-teal-500/5">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <Users className="w-8 h-8 text-teal-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Personalize your community experience</p>
                    <p className="text-xs text-muted-foreground">Set up your profile for better recommendations</p>
                  </div>
                </div>
                <Button onClick={() => setProfileOpen(true)} size="sm" data-testid="button-setup-community">
                  Setup
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Profile Summary (if exists) */}
          {hasProfile && profile && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-500" />
                    Your Community Profile
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setProfileOpen(true)} data-testid="button-edit-community">
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.focusAreas && profile.focusAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {profile.focusAreas.map((focus) => (
                      <Badge key={focus} variant="secondary" className="capitalize">
                        {focus.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                )}
                {profile.preferredCauses && profile.preferredCauses.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {profile.preferredCauses.map((cause) => (
                      <Badge key={cause} variant="outline" className="text-xs">
                        <Heart className="w-3 h-3 mr-1" />
                        {cause}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {profile.preferLocal && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      Local
                    </span>
                  )}
                  {profile.preferOnline && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      Online
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Community Activity Feed */}
          <Card className="bg-gradient-to-br from-teal-500/5 to-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-500" />
                Community Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    12 people
                  </Badge>
                  <span className="text-muted-foreground">joined this week</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    5 new
                  </Badge>
                  <span className="text-muted-foreground">opportunities posted</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  <Badge variant="outline" className="text-xs">
                    #environment
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    #mentoring
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    #local-events
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI-Powered Community Search */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-semibold text-sm">Find Community Resources</h2>
              <Badge variant="outline" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
            </div>
            <InAppSearch 
              category="community"
              placeholder="Search volunteering, support groups, community help..."
              onResultSave={(result: SearchResult) => {
                toast({ title: "Resource noted", description: `${result.title} - ${result.description.slice(0, 50)}...` });
              }}
            />
          </section>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Opportunities for You</h2>
              <Badge variant="outline" className="text-xs">
                {displayOpportunities.length} available
              </Badge>
            </div>

            {/* Featured Opportunity */}
            {displayOpportunities.find((opp: OpportunityDisplay) => opp.featured) && (
              <Card className="hover-elevate cursor-pointer border-2 border-teal-500/30 bg-gradient-to-br from-teal-500/5 to-transparent" data-testid="card-featured-opportunity">
                <CardContent className="p-0">
                  {/* Featured Image Placeholder */}
                  <div className="h-32 bg-gradient-to-r from-teal-500/20 to-blue-500/20 rounded-t-lg flex items-center justify-center">
                    <Badge className="bg-teal-600 text-white">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Featured
                    </Badge>
                  </div>
                  <div className="p-4">
                    {(() => {
                      const opp = displayOpportunities.find((o: OpportunityDisplay) => o.featured)!;
                      const style = OPPORTUNITY_STYLES[opp.type as CommunityFocus];
                      const Icon = style.icon;
                      return (
                        <>
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${style.bg} flex-shrink-0`}>
                              <Icon className={`h-5 w-5 ${style.color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{opp.title}</h3>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{opp.organization}</p>
                            </div>
                          </div>
                          <p className="text-sm mb-3">{opp.description}</p>
                          <div className="flex flex-wrap gap-2 items-center">
                            <Badge variant="secondary" className={style.color}>
                              {style.label}
                            </Badge>
                            {opp.isOnline ? (
                              <Badge variant="outline" className="text-xs">
                                <Globe className="w-3 h-3 mr-1" />
                                Online
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="w-3 h-3 mr-1" />
                                {opp.location}
                              </Badge>
                            )}
                            {opp.tags.map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Regular Opportunities */}
            <div className="space-y-3">
              {displayOpportunities.filter((opp: OpportunityDisplay) => !opp.featured).map((opp: OpportunityDisplay) => {
                const style = OPPORTUNITY_STYLES[opp.type as CommunityFocus];
                const Icon = style.icon;
                
                return (
                  <Card key={opp.id} className="hover-elevate cursor-pointer" data-testid={`card-opportunity-${opp.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${style.bg} flex-shrink-0`}>
                          <Icon className={`h-5 w-5 ${style.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground">{opp.title}</h3>
                            <Badge variant="secondary" className={`text-xs ${style.color}`}>
                              {style.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{opp.organization}</p>
                          <p className="text-sm mb-2">{opp.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {opp.isOnline ? (
                              <Badge variant="outline" className="text-xs">
                                <Globe className="w-3 h-3 mr-1" />
                                Online
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="w-3 h-3 mr-1" />
                                {opp.location}
                              </Badge>
                            )}
                            {opp.tags.map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </main>
      </ScrollArea>

      <CommunityProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        existingProfile={profile}
        onSave={handleSaveProfile}
      />
    </div>
  );
}

interface CommunityProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProfile: CommunityProfile | null;
  onSave: (profile: CommunityProfile) => void;
}

function CommunityProfileDialog({ open, onOpenChange, existingProfile, onSave }: CommunityProfileDialogProps) {
  const [step, setStep] = useState(0);
  const [focusAreas, setFocusAreas] = useState<CommunityFocus[]>(existingProfile?.focusAreas || []);
  const [preferredCauses, setPreferredCauses] = useState<string[]>(existingProfile?.preferredCauses || []);
  const [availability, setAvailability] = useState<AvailabilityLevel | null>(existingProfile?.availability || null);
  const [preferOnline, setPreferOnline] = useState(existingProfile?.preferOnline ?? true);
  const [preferLocal, setPreferLocal] = useState(existingProfile?.preferLocal ?? true);
  const [locationCity, setLocationCity] = useState(existingProfile?.locationCity || "");
  const [customCause, setCustomCause] = useState("");

  const toggleFocus = (id: CommunityFocus) => {
    if (focusAreas.includes(id)) {
      setFocusAreas(focusAreas.filter(f => f !== id));
    } else {
      setFocusAreas([...focusAreas, id]);
    }
  };

  const toggleCause = (cause: string) => {
    if (preferredCauses.includes(cause)) {
      setPreferredCauses(preferredCauses.filter(c => c !== cause));
    } else {
      setPreferredCauses([...preferredCauses, cause]);
    }
  };

  const addCustomCause = () => {
    if (customCause.trim() && !preferredCauses.includes(customCause.trim())) {
      setPreferredCauses([...preferredCauses, customCause.trim()]);
      setCustomCause("");
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onSave({
        impactGoals: [],
        preferredCauses,
        focusAreas,
        availability,
        locationCity: locationCity || null,
        locationCountry: null,
        preferOnline,
        preferLocal,
        currentInvolvement: [],
        notes: "",
        updatedAt: Date.now(),
      });
    }
  };

  const handleSkip = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Community Profile</DialogTitle>
          <DialogDescription>
            Step {step + 1} of 4
          </DialogDescription>
        </DialogHeader>

        <div className="h-1 bg-muted rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: `${((step + 1) / 4) * 100}%` }}
          />
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">How would you like to contribute?</p>
            <div className="grid gap-2">
              {FOCUS_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  variant={focusAreas.includes(option.id) ? "default" : "outline"}
                  className="justify-start text-left h-auto py-3 px-4"
                  onClick={() => toggleFocus(option.id)}
                  data-testid={`option-focus-${option.id}`}
                >
                  {focusAreas.includes(option.id) && <Check className="w-4 h-4 mr-2 flex-shrink-0" />}
                  <div>
                    <div className="font-medium text-foreground">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">What causes matter to you?</p>
            <div className="flex flex-wrap gap-2">
              {CAUSE_OPTIONS.map((cause) => (
                <Button
                  key={cause}
                  variant={preferredCauses.includes(cause) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleCause(cause)}
                  data-testid={`option-cause-${cause.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {preferredCauses.includes(cause) && <Check className="w-3 h-3 mr-1" />}
                  {cause}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add your own..."
                value={customCause}
                onChange={(e) => setCustomCause(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomCause()}
                data-testid="input-custom-cause"
              />
              <Button onClick={addCustomCause} size="icon" variant="outline" data-testid="button-add-cause">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">How much time can you offer?</p>
            <div className="grid gap-2">
              {AVAILABILITY_OPTIONS.map((option) => (
                <Button
                  key={option.id}
                  variant={availability === option.id ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setAvailability(option.id)}
                  data-testid={`option-availability-${option.id}`}
                >
                  {availability === option.id && <Check className="w-4 h-4 mr-2" />}
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Where would you like to contribute?</p>
            <div className="grid gap-2">
              <Button
                variant={preferLocal ? "default" : "outline"}
                className="justify-start"
                onClick={() => setPreferLocal(!preferLocal)}
                data-testid="option-prefer-local"
              >
                {preferLocal && <Check className="w-4 h-4 mr-2" />}
                <MapPin className="w-4 h-4 mr-2" />
                Local / In-person
              </Button>
              <Button
                variant={preferOnline ? "default" : "outline"}
                className="justify-start"
                onClick={() => setPreferOnline(!preferOnline)}
                data-testid="option-prefer-online"
              >
                {preferOnline && <Check className="w-4 h-4 mr-2" />}
                <Globe className="w-4 h-4 mr-2" />
                Online / Remote
              </Button>
            </div>
            {preferLocal && (
              <Input
                placeholder="Your city (optional)"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                data-testid="input-location-city"
              />
            )}
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="ghost" onClick={handleSkip} data-testid="button-skip-community">
            <SkipForward className="w-4 h-4 mr-2" />
            Skip
          </Button>
          <Button onClick={handleNext} data-testid="button-next-community">
            {step === 3 ? "Complete" : "Continue"}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
