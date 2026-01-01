import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Play,
  Clock,
  Dumbbell,
  Brain,
  Heart,
  Utensils,
  Sun,
  Filter,
  Sparkles,
} from "lucide-react";
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

export default function Browse() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  const { data: dbContent } = useQuery<WellnessContent[]>({
    queryKey: ["/api/wellness-content"],
  });

  const content = dbContent && dbContent.length > 0 ? dbContent : SAMPLE_CONTENT;
  
  const filteredContent = activeCategory
    ? content.filter((c) => c.category === activeCategory)
    : content;

  const getCategoryIcon = (category: string) => {
    const found = CONTENT_CATEGORIES.find((c) => c.id === category);
    return found ? found.icon : Sparkles;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-display font-semibold">Browse</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-filters"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        <ScrollArea className="w-full">
          <div className="flex gap-2 px-4 pb-4">
            <Button
              variant={activeCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(null)}
              data-testid="button-category-all"
            >
              All
            </Button>
            {CONTENT_CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat.id)}
                data-testid={`button-category-${cat.id}`}
              >
                <cat.icon className="h-4 w-4 mr-1" />
                {cat.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </header>

      {userProfile && (
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
    </div>
  );
}
