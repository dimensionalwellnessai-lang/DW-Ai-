import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTutorialStart } from "@/contexts/tutorial-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import {
  Users,
  Heart,
  MapPin,
  Globe,
  Plus,
  Check,
  ChevronRight,
  Sparkles,
  Calendar,
  ExternalLink,
  SkipForward,
  Bookmark,
  BookmarkCheck,
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
  hasCompletedCommunityProfile,
  saveCalendarEvent,
  type CommunityProfile,
  type CommunityFocus,
  type AvailabilityLevel,
} from "@/lib/guest-storage";
import { apiRequest } from "@/lib/queryClient";

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

// Extended type for display purposes (matches API response shape)
interface OpportunityDisplay {
  id: string;
  title: string;
  organization: string;
  description: string;
  type: CommunityFocus;
  isOnline: boolean | null;
  location: string | null;
  url: string | null;
  tags: string[] | null;
  matchScore: number | null;
  featured: boolean | null;
  discoveredAt: number;
  isSaved?: boolean;
}

// Opportunity type styling
const OPPORTUNITY_STYLES: Record<CommunityFocus, { icon: typeof HandHeart; color: string; bg: string; label: string }> = {
  volunteering: { icon: HandHeart, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10 dark:bg-green-400/15", label: "Volunteering" },
  mentoring: { icon: GraduationCap, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 dark:bg-blue-400/15", label: "Mentoring" },
  advocacy: { icon: Megaphone, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 dark:bg-orange-400/15", label: "Advocacy" },
  local_events: { icon: Calendar, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 dark:bg-purple-400/15", label: "Local Event" },
  online_groups: { icon: Globe, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10 dark:bg-teal-400/15", label: "Online Group" },
  donations: { icon: Heart, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10 dark:bg-pink-400/15", label: "Fundraising" },
};

export default function CommunityPage() {
  useTutorialStart("community", 1000);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<CommunityProfile | null>(getCommunityProfile());
  const hasProfile = hasCompletedCommunityProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedOpp, setSelectedOpp] = useState<OpportunityDisplay | null>(null);

  // Fetch live opportunities from the API
  const { data: opportunitiesData = [], isLoading: oppsLoading, isError: oppsError } = useQuery<OpportunityDisplay[]>({
    queryKey: ["/api/community/opportunities"],
  });

  const savedIds = useMemo(
    () => opportunitiesData.filter((o) => o.isSaved).map((o) => o.id),
    [opportunitiesData],
  );

  const saveMutation = useMutation({
    mutationFn: async ({ opportunityId, saving }: { opportunityId: string; saving: boolean }) => {
      if (saving) {
        await apiRequest("POST", "/api/community/opportunities/saved", { opportunityId });
      } else {
        await apiRequest("DELETE", `/api/community/opportunities/saved/${opportunityId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/opportunities"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not update saved status. Please try again.", variant: "destructive" });
    },
  });

  const handleSaveProfile = (newProfile: CommunityProfile) => {
    saveCommunityProfile(newProfile);
    setProfile(newProfile);
    setProfileOpen(false);
  };

  const handleToggleSave = (opp: OpportunityDisplay) => {
    const nowSaved = !opp.isSaved;
    saveMutation.mutate({ opportunityId: opp.id, saving: nowSaved });
    toast({
      title: nowSaved ? "Opportunity saved" : "Opportunity removed",
      description: nowSaved ? `"${opp.title}" added to your saved list.` : `"${opp.title}" removed from saved.`,
    });
  };

  const handleAddToCalendar = (opp: OpportunityDisplay) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(10, 0, 0, 0);
    saveCalendarEvent({
      title: opp.title,
      description: `${opp.organization} — ${opp.description}`,
      dimension: "social", // community maps closest to social wellness dimension
      startTime: tomorrow.getTime(),
      endTime: end.getTime(),
      isAllDay: false,
      location: opp.location,
      virtualLink: opp.url,
      reminders: [15],
      recurring: false,
      recurrencePattern: null,
      recurrenceEndDate: null,
      relatedFoundationIds: [],
      tags: opp.tags ?? [],
    });
    toast({
      title: "Added to calendar",
      description: `"${opp.title}" scheduled for tomorrow at 9 AM.`,
    });
  };

  const displayOpportunities: OpportunityDisplay[] = opportunitiesData;
  const hasRealOpportunities = opportunitiesData.length > 0;
  const savedOpportunities = displayOpportunities.filter((o) => savedIds.includes(o.id));
  const featuredOpp = displayOpportunities.find((o) => o.featured);

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Community Wellness" />

      <ScrollArea className="flex-1 overflow-auto">
        <main className="p-4 max-w-2xl mx-auto space-y-6">
          <p className="text-sm text-muted-foreground text-center">
            Your impact on the world around you
          </p>
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

          {/* Saved Opportunities */}
          {savedOpportunities.length > 0 && (
            <section className="space-y-3" aria-label="Saved opportunities">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4 text-teal-500" aria-hidden="true" />
                Saved
                <Badge variant="secondary" className="text-xs ml-1">{savedOpportunities.length}</Badge>
              </h2>
              <div className="space-y-2">
                {savedOpportunities.map((opp) => {
                  const style = OPPORTUNITY_STYLES[opp.type as CommunityFocus];
                  const Icon = style.icon;
                  return (
                    <Card
                      key={opp.id}
                      className="hover-elevate cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-label={`View details for ${opp.title}`}
                      onClick={() => setSelectedOpp(opp)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedOpp(opp);
                        }
                      }}
                      data-testid={`card-saved-opportunity-${opp.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${style.bg} flex-shrink-0`}>
                            <Icon className={`h-4 w-4 ${style.color}`} aria-hidden="true" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{opp.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{opp.organization}</p>
                          </div>
                          <BookmarkCheck className="w-4 h-4 text-teal-500 flex-shrink-0" aria-hidden="true" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Opportunities for You */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Opportunities for You</h2>
              <Badge variant="outline" className="text-xs">
                {oppsLoading ? "Loading…" : `${displayOpportunities.length} available`}
              </Badge>
            </div>

            {oppsLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 animate-pulse" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">Loading opportunities…</p>
                </CardContent>
              </Card>
            ) : oppsError ? (
              <Card className="border-destructive/30">
                <CardContent className="p-8 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
                  <p className="font-medium mb-1">Could not load opportunities</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    There was a problem fetching community opportunities. Please try again.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/community/opportunities"] })} data-testid="button-retry-opportunities">
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : !hasRealOpportunities ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
                  <p className="font-medium mb-1">No opportunities yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set up your community profile to get personalized recommendations.
                  </p>
                  <Button size="sm" onClick={() => setProfileOpen(true)} data-testid="button-setup-from-empty">
                    Set up profile
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Featured Opportunity */}
                {featuredOpp && (
                  <Card
                    className="hover-elevate cursor-pointer border-2 border-teal-500/30 bg-gradient-to-br from-teal-500/5 to-transparent"
                    role="button"
                    tabIndex={0}
                    aria-label={`View featured opportunity: ${featuredOpp.title}`}
                    onClick={() => setSelectedOpp(featuredOpp)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedOpp(featuredOpp);
                      }
                    }}
                    data-testid="card-featured-opportunity"
                  >
                    <CardContent className="p-0">
                      <div className="h-32 bg-gradient-to-r from-teal-500/20 to-blue-500/20 rounded-t-lg flex items-center justify-center">
                        <Badge className="bg-teal-600 text-white">
                          <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" />
                          Featured
                        </Badge>
                      </div>
                      <div className="p-4">
                        {(() => {
                          const style = OPPORTUNITY_STYLES[featuredOpp.type as CommunityFocus];
                          const Icon = style.icon;
                          const isSaved = savedIds.includes(featuredOpp.id);
                          return (
                            <>
                              <div className="flex items-start gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${style.bg} flex-shrink-0`}>
                                  <Icon className={`h-5 w-5 ${style.color}`} aria-hidden="true" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-lg">{featuredOpp.title}</h3>
                                    {isSaved && <BookmarkCheck className="w-4 h-4 text-teal-500 flex-shrink-0" aria-hidden="true" />}
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{featuredOpp.organization}</p>
                                </div>
                              </div>
                              <p className="text-sm mb-3">{featuredOpp.description}</p>
                              <div className="flex flex-wrap gap-2 items-center">
                                <Badge variant="secondary" className={style.color}>
                                  {style.label}
                                </Badge>
                                {featuredOpp.isOnline ? (
                                  <Badge variant="outline" className="text-xs">
                                    <Globe className="w-3 h-3 mr-1" aria-hidden="true" />
                                    Online
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    <MapPin className="w-3 h-3 mr-1" aria-hidden="true" />
                                    {featuredOpp.location}
                                  </Badge>
                                )}
                                {(featuredOpp.tags ?? []).map((tag: string) => (
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
                    const isSaved = savedIds.includes(opp.id);

                    return (
                      <Card
                        key={opp.id}
                        className="hover-elevate cursor-pointer"
                        role="button"
                        tabIndex={0}
                        aria-label={`View details for ${opp.title}`}
                        onClick={() => setSelectedOpp(opp)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedOpp(opp);
                          }
                        }}
                        data-testid={`card-opportunity-${opp.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${style.bg} flex-shrink-0`}>
                              <Icon className={`h-5 w-5 ${style.color}`} aria-hidden="true" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-foreground">{opp.title}</h3>
                                <Badge variant="secondary" className={`text-xs ${style.color}`}>
                                  {style.label}
                                </Badge>
                                {isSaved && <BookmarkCheck className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" aria-hidden="true" />}
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
                                {(opp.tags ?? []).map((tag: string) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </main>
      </ScrollArea>

      <CommunityProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        existingProfile={profile}
        onSave={handleSaveProfile}
      />

      {/* Opportunity Detail Modal */}
      <Dialog open={!!selectedOpp} onOpenChange={(open) => !open && setSelectedOpp(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby="opportunity-detail-description">
          {selectedOpp && (() => {
            const style = OPPORTUNITY_STYLES[selectedOpp.type as CommunityFocus];
            const Icon = style.icon;
            const isSaved = savedIds.includes(selectedOpp.id);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`p-2 rounded-lg ${style.bg} flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${style.color}`} aria-hidden="true" />
                    </div>
                    <div>
                      <DialogTitle>{selectedOpp.title}</DialogTitle>
                      <p className="text-sm text-muted-foreground">{selectedOpp.organization}</p>
                    </div>
                  </div>
                  <DialogDescription id="opportunity-detail-description">
                    {selectedOpp.description}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  {/* Type & Location */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className={style.color}>
                      {style.label}
                    </Badge>
                    {selectedOpp.isOnline ? (
                      <Badge variant="outline" className="text-xs">
                        <Globe className="w-3 h-3 mr-1" />
                        Online
                      </Badge>
                    ) : selectedOpp.location ? (
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        {selectedOpp.location}
                      </Badge>
                    ) : null}
                    {(selectedOpp.tags ?? []).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    <Button
                      variant={isSaved ? "secondary" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleToggleSave(selectedOpp)}
                      data-testid="button-modal-save"
                    >
                      {isSaved ? (
                        <>
                          <BookmarkCheck className="w-4 h-4 mr-2 text-teal-500" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4 mr-2" />
                          Save opportunity
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        handleAddToCalendar(selectedOpp);
                        setSelectedOpp(null);
                      }}
                      data-testid="button-modal-calendar"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Add to calendar
                    </Button>

                    {selectedOpp.url && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => window.open(selectedOpp.url!, "_blank", "noopener,noreferrer")}
                        data-testid="button-modal-external-link"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Learn more
                      </Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
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
