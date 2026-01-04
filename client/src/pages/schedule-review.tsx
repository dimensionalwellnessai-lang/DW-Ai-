import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Edit, Save, CalendarPlus, ArrowLeft, Clock, Check, 
  Dumbbell, Utensils, Heart, BookOpen, Loader2 
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  duration: number;
  category: string;
  selected: boolean;
}

const CATEGORY_ICONS: Record<string, typeof Dumbbell> = {
  workout: Dumbbell,
  nutrition: Utensils,
  mental: Heart,
  schedule: BookOpen,
};

const CATEGORY_COLORS: Record<string, string> = {
  workout: "bg-green-500",
  nutrition: "bg-orange-500",
  mental: "bg-purple-500",
  schedule: "bg-blue-500",
};

const SAMPLE_SCHEDULE: ScheduleItem[] = [
  { id: "1", title: "Morning Stretch", time: "06:30", duration: 15, category: "workout", selected: true },
  { id: "2", title: "Healthy Breakfast", time: "07:00", duration: 30, category: "nutrition", selected: true },
  { id: "3", title: "Meditation", time: "07:45", duration: 10, category: "mental", selected: true },
  { id: "4", title: "Workout Session", time: "12:00", duration: 45, category: "workout", selected: false },
  { id: "5", title: "Healthy Lunch", time: "13:00", duration: 30, category: "nutrition", selected: false },
  { id: "6", title: "Evening Walk", time: "18:00", duration: 30, category: "workout", selected: true },
  { id: "7", title: "Dinner Prep", time: "19:00", duration: 45, category: "nutrition", selected: false },
  { id: "8", title: "Journal", time: "21:00", duration: 15, category: "mental", selected: true },
];

const LOCAL_PLANS_KEY = "fts_local_plans";

export default function ScheduleReviewPage() {
  const [, params] = useRoute("/schedule-review/:draftId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [items, setItems] = useState<ScheduleItem[]>(SAMPLE_SCHEDULE);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);

  const draftId = params?.draftId;
  const selectedItems = items.filter(i => i.selected);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const handleSaveToLifeSystem = async () => {
    setIsSaving(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const stored = localStorage.getItem(LOCAL_PLANS_KEY);
      const plans = stored ? JSON.parse(stored) : [];
      const planIndex = plans.findIndex((p: any) => p.id === draftId);
      
      if (planIndex >= 0) {
        plans[planIndex].status = "active";
        plans[planIndex].scheduleItems = items;
        plans[planIndex].itemCount = items.length;
        localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(plans));
      }
      
      toast({
        title: "Saved.",
        description: `${items.length} items saved to your active plan.`,
      });
      
      setLocation("/plans");
    } catch (error) {
      toast({
        title: "That didn't save.",
        description: "You can try again, or come back later.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToCalendar = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "Pick 1 option to save.",
        description: "Select at least one item to continue.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAddingToCalendar(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Added to your system.",
      description: `${selectedItems.length} items added to your calendar.`,
    });
    
    setIsAddingToCalendar(false);
    setLocation("/calendar");
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Suggested Schedule" 
        backPath="/plans"
        rightContent={
          <Button 
            size="icon" 
            variant={isEditing ? "default" : "ghost"} 
            onClick={() => setIsEditing(!isEditing)}
            data-testid="button-toggle-edit"
          >
            <Edit className="w-4 h-4" />
          </Button>
        }
      />
      
      <ScrollArea className="h-[calc(100vh-57px-80px)]">
        <div className="p-4 max-w-lg mx-auto space-y-4 pb-8">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base">Your Draft Schedule</CardTitle>
                <Badge variant="outline">
                  {selectedItems.length}/{items.length} selected
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Review your AI-generated schedule. Select items to add to your calendar.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {items.map(item => {
              const Icon = CATEGORY_ICONS[item.category] || BookOpen;
              const color = CATEGORY_COLORS[item.category] || "bg-gray-500";
              
              return (
                <Card 
                  key={item.id}
                  className={`transition-all ${item.selected ? "ring-2 ring-primary/50" : ""}`}
                  data-testid={`card-schedule-item-${item.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {isEditing && (
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleItem(item.id)}
                          data-testid={`checkbox-item-${item.id}`}
                        />
                      )}
                      
                      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.title}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{item.time}</span>
                          <span className="text-muted-foreground/50">|</span>
                          <span>{item.duration} min</span>
                        </div>
                      </div>
                      
                      {!isEditing && item.selected && (
                        <Check className="w-5 h-5 text-primary shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={handleSaveToLifeSystem}
            disabled={isSaving}
            className="flex-1 gap-2"
            data-testid="button-save-life-system"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save to Life System
          </Button>
          
          <Button
            onClick={handleAddToCalendar}
            disabled={isAddingToCalendar || selectedItems.length === 0}
            className="flex-1 gap-2"
            data-testid="button-add-calendar"
          >
            {isAddingToCalendar ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CalendarPlus className="w-4 h-4" />
            )}
            Add to Calendar ({selectedItems.length})
          </Button>
        </div>
      </div>
    </div>
  );
}
