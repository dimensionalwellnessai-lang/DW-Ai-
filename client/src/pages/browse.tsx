import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTutorialStart } from "@/contexts/tutorial-context";
import {
  Play,
  Clock,
  Dumbbell,
  Brain,
  Heart,
  Utensils,
  Sun,
  Filter,
  Sparkles,
  Loader2,
  X,
  Wand2,
  Users,
  MessageCircle,
  ThumbsUp,
  MapPin,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { WellnessContent, UserProfile } from "@shared/schema";

const CONTENT_CATEGORIES = [
  { id: "workout", name: "Workouts", icon: Dumbbell },
  { id: "meditation", name: "Meditation", icon: Brain },
  { id: "nutrition", name: "Nutrition", icon: Utensils },
  { id: "mindfulness", name: "Mindfulness", icon: Sun },
  { id: "recovery", name: "Recovery", icon: Heart },
];

const SAMPLE_CONTENT = [
  {
    id: "1",
    title: "Morning Energy Flow",
    description: "Start your day with gentle movement to wake up body and mind",
    contentType: "workout",
    category: "workout",
    duration: 15,
    difficulty: "beginner",
    goalTags: ["energy", "mobility"],
    moodTags: ["tired", "scattered"],
  },
  {
    id: "2",
    title: "Calm Mind Meditation",
    description: "A guided session to reduce anxiety and find inner peace",
    contentType: "meditation",
    category: "meditation",
    duration: 10,
    difficulty: "beginner",
    goalTags: ["stress-relief", "focus"],
    moodTags: ["anxious", "overwhelmed"],
  },
  {
    id: "3",
    title: "Strength Builder",
    description: "Full body workout to build muscle and confidence",
    contentType: "workout",
    category: "workout",
    duration: 30,
    difficulty: "intermediate",
    goalTags: ["muscle-gain", "strength"],
    moodTags: ["motivated", "energetic"],
  },
  {
    id: "4",
    title: "Sleep Preparation",
    description: "Wind down routine to prepare for restful sleep",
    contentType: "meditation",
    category: "meditation",
    duration: 20,
    difficulty: "beginner",
    goalTags: ["sleep", "relaxation"],
    moodTags: ["tired", "restless"],
  },
  {
    id: "5",
    title: "Quick HIIT",
    description: "High intensity interval training for busy schedules",
    contentType: "workout",
    category: "workout",
    duration: 12,
    difficulty: "advanced",
    goalTags: ["fat-loss", "endurance"],
    moodTags: ["energetic", "motivated"],
  },
  {
    id: "6",
    title: "Gratitude Practice",
    description: "Cultivate appreciation and positive mindset",
    contentType: "mindfulness",
    category: "mindfulness",
    duration: 8,
    difficulty: "beginner",
    goalTags: ["mental-health", "positivity"],
    moodTags: ["low", "neutral"],
  },
];

const COMMUNITY_GROUPS = [
  { id: "morning-reset", name: "Morning Reset", members: 234, icon: Sun, description: "Start your day with intention" },
  { id: "meal-prep", name: "Meal Prep Crew", members: 189, icon: Utensils, description: "Weekly meal planning together" },
  { id: "gym-strength", name: "Gym & Strength", members: 412, icon: Dumbbell, description: "Lift heavy, support each other" },
  { id: "study-sprint", name: "Study Sprint", members: 156, icon: Brain, description: "Focus sessions and study tips" },
  { id: "money-moves", name: "Money Moves", members: 98, icon: Sparkles, description: "Financial wellness & goals" },
];

const COMMUNITY_POSTS = [
  { id: "1", authorName: "Alex M.", timeAgo: "2h", text: "Just finished my morning workout. 30 minutes felt like nothing today. Small wins add up!", tags: ["motivation", "workout"] },
  { id: "2", authorName: "Sam K.", timeAgo: "4h", text: "Anyone else meal prepping for the week? Made a big batch of overnight oats and it's a game changer.", tags: ["meal-prep"] },
  { id: "3", authorName: "Jordan T.", timeAgo: "6h", text: "Had a rough day but took 5 minutes to breathe. Sometimes that's all you need.", tags: ["mindfulness"] },
  { id: "4", authorName: "Riley P.", timeAgo: "1d", text: "Pro tip: I started tracking my spending with just a notes app. Don't overcomplicate it.", tags: ["money", "tips"] },
  { id: "5", authorName: "Casey L.", timeAgo: "1d", text: "Joining the study sprint group helped me stay accountable. Highly recommend!", tags: ["community", "study"] },
];

export default function Browse() {
  useTutorialStart("browse", 1000);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"browse" | "community">("browse");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [currentMood, setCurrentMood] = useState("");
  const [aiRecommendations, setAiRecommendations] = useState<string[] | null>(null);

  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  const { data: dbContent } = useQuery<WellnessContent[]>({
    queryKey: ["/api/wellness-content"],
  });

  const aiCustomizeMutation = useMutation({
    mutationFn: async (mood: string) => {
      const contentList = content.map((c, i) => `[${i}] ${c.title}`).join("\n");
      
      const response = await apiRequest("POST", "/api/chat/smart", {
        message: `You are a gentle wellness guide. The user is feeling: "${mood}". 

Choose 2-3 activities from this numbered list that would be most supportive for their current energy. Return ONLY the numbers (e.g., "0, 2, 4"), nothing else.

${contentList}`,
        conversationHistory: [],
      });
      return response.json();
    },
    onSuccess: (data) => {
      const response = data.response || "";
      const indices = response.match(/\d+/g)?.map((n: string) => parseInt(n, 10)) || [];
      const titles = indices
        .filter((i: number) => i >= 0 && i < content.length)
        .map((i: number) => content[i].title);
      setAiRecommendations(titles.length > 0 ? titles : null);
      setAiDialogOpen(false);
    },
  });

  const content = dbContent && dbContent.length > 0 ? dbContent : SAMPLE_CONTENT;
  
  const filteredContent = activeCategory
    ? content.filter((c) => c.category === activeCategory)
    : aiRecommendations
    ? content.filter((c) => aiRecommendations.includes(c.title))
    : content;

  const getCategoryIcon = (category: string) => {
    const found = CONTENT_CATEGORIES.find((c) => c.id === category);
    return found ? found.icon : Sparkles;
  };

  const handleComingSoon = () => {
    toast({ title: "Coming soon", description: "This feature is not available yet." });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Browse"
        rightContent={activeTab === "browse" ? (
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setAiDialogOpen(true)}
              data-testid="button-ai-customize"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Pick for Me
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-filters"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      />
      
      <div className="sticky top-[57px] z-40 bg-background border-b">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "browse" | "community")} className="w-full">
          <TabsList className="w-full justify-start px-4 h-12 bg-transparent rounded-none">
            <TabsTrigger value="browse" className="data-[state=active]:bg-primary/10" data-testid="tab-browse">
              Browse
            </TabsTrigger>
            <TabsTrigger value="community" className="data-[state=active]:bg-primary/10" data-testid="tab-community">
              <Users className="h-4 w-4 mr-1" />
              Community
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {activeTab === "browse" && (
        <div className="sticky top-[109px] z-30 bg-background border-b">
        <div className="overflow-x-auto">
          <div className="flex gap-2 px-4 pb-4 w-max min-w-full">
            {aiRecommendations && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAiRecommendations(null);
                  setActiveCategory(null);
                }}
                data-testid="button-clear-ai"
              >
                <X className="h-4 w-4 mr-1" />
                AI Picks
              </Button>
            )}
            <Button
              variant={activeCategory === null && !aiRecommendations ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveCategory(null);
                setAiRecommendations(null);
              }}
              data-testid="button-category-all"
            >
              All
            </Button>
            {CONTENT_CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setAiRecommendations(null);
                }}
                data-testid={`button-category-${cat.id}`}
              >
                <cat.icon className="h-4 w-4 mr-1" />
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
      )}

      {activeTab === "browse" && userProfile && (
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>
              Personalized for you based on your{" "}
              {userProfile.fitnessGoal && (
                <Badge variant="secondary" className="mx-1">
                  {userProfile.fitnessGoal}
                </Badge>
              )}
              goals
            </span>
          </div>
        </div>
      )}

      {activeTab === "browse" && (
        <main className="p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContent.map((item) => {
              const CategoryIcon = getCategoryIcon(item.category);
              return (
                <Card
                  key={item.id}
                  className="overflow-visible hover-elevate cursor-pointer transition-all"
                  data-testid={`card-content-${item.id}`}
                >
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-md flex items-center justify-center relative">
                    <CategoryIcon className="h-12 w-12 text-primary/40" />
                    <Button
                      size="icon"
                      className="absolute bottom-3 right-3 rounded-full"
                      data-testid={`button-play-${item.id}`}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-medium">
                        {item.title}
                      </CardTitle>
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {item.duration}m
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {item.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {item.goalTags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.difficulty && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.difficulty}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredContent.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No content found in this category yet.
              </p>
            </div>
          )}
        </main>
      )}

      {activeTab === "community" && (
        <main className="p-4 space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Groups
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {COMMUNITY_GROUPS.map((group) => {
                const GroupIcon = group.icon;
                return (
                  <Card
                    key={group.id}
                    className="overflow-visible hover-elevate cursor-pointer transition-all"
                    onClick={handleComingSoon}
                    data-testid={`card-group-${group.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <GroupIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm">{group.name}</h3>
                          <p className="text-xs text-muted-foreground mb-2">{group.description}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{group.members} members</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Feed
            </h2>
            <div className="space-y-3">
              {COMMUNITY_POSTS.map((post) => (
                <Card key={post.id} className="overflow-visible" data-testid={`card-post-${post.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-medium">
                        {post.authorName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{post.authorName}</span>
                          <span className="text-xs text-muted-foreground">{post.timeAgo}</span>
                        </div>
                        <p className="text-sm mb-2">{post.text}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {post.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          <button 
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={handleComingSoon}
                            data-testid={`button-like-${post.id}`}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            Like
                          </button>
                          <button 
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={handleComingSoon}
                            data-testid={`button-comment-${post.id}`}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Comment
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </main>
      )}

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              What's your energy right now?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Share how you're feeling and we'll find the right content for you.
            </p>
            <Textarea
              placeholder="e.g., I'm feeling tired but need to move, anxious and need to calm down, energized and want a challenge..."
              value={currentMood}
              onChange={(e) => setCurrentMood(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-mood"
            />
            <div className="flex flex-wrap gap-2">
              {["Tired", "Anxious", "Energized", "Scattered", "Low energy", "Motivated"].map((mood) => (
                <Button
                  key={mood}
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMood(mood)}
                  data-testid={`button-mood-${mood.toLowerCase().replace(" ", "-")}`}
                >
                  {mood}
                </Button>
              ))}
            </div>
            <Button
              onClick={() => aiCustomizeMutation.mutate(currentMood)}
              disabled={!currentMood.trim() || aiCustomizeMutation.isPending}
              className="w-full"
              data-testid="button-get-recommendations"
            >
              {aiCustomizeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finding the right fit...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Recommendations
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
