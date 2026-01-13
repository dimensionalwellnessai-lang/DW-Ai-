import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Archive, CheckCircle, Clock, MoreHorizontal, Play, Trash2, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { markPlanVisit } from "@/lib/analytics";
import { consumeHighlightNext } from "@/lib/momentum";
import { getCalendarEvents, getSavedRoutines, type CalendarEvent, type SavedRoutine } from "@/lib/guest-storage";
import type { LifeSystem } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PlanStatus = "draft" | "active" | "archived";

interface Plan {
  id: string;
  name: string;
  status: PlanStatus;
  itemCount: number;
  createdAt: string;
  updatedAt?: string;
}

const LOCAL_PLANS_KEY = "fts_local_plans";

function getLocalPlans(): Plan[] {
  try {
    const stored = localStorage.getItem(LOCAL_PLANS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalPlans(plans: Plan[]) {
  localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(plans));
}

export default function PlansPage() {
  const [, setLocation] = useLocation();
  const [localPlans, setLocalPlans] = useState<Plan[]>(getLocalPlans);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  
  const momentumEvents = getCalendarEvents().filter(e => e.tags?.includes("momentum"));
  const momentumRoutines = getSavedRoutines().filter(r => r.tags?.includes("momentum"));

  const { data: lifeSystemData } = useQuery<{ lifeSystem: LifeSystem | null }>({
    queryKey: ["/api/life-system"],
  });

  const allPlans: Plan[] = [
    ...localPlans,
    ...(lifeSystemData?.lifeSystem ? [{
      id: lifeSystemData.lifeSystem.id,
      name: lifeSystemData.lifeSystem.name,
      status: "active" as PlanStatus,
      itemCount: (lifeSystemData.lifeSystem.scheduleBlocks as any[])?.length || 0,
      createdAt: lifeSystemData.lifeSystem.createdAt?.toString() || new Date().toISOString(),
    }] : []),
  ];

  const draftPlans = allPlans.filter(p => p.status === "draft");
  const activePlans = allPlans.filter(p => p.status === "active");
  const archivedPlans = allPlans.filter(p => p.status === "archived");
  
  useEffect(() => {
    markPlanVisit();
    const highlight = consumeHighlightNext("/plans");
    if (highlight) {
      // Priority order: momentumEvents > momentumRoutines > draftPlans > activePlans
      const foundInMomentumEvents = momentumEvents.some(e => e.id === highlight.id);
      const foundInMomentumRoutines = momentumRoutines.some(r => r.id === highlight.id);
      const foundInDraftPlans = draftPlans.some(p => p.id === highlight.id);
      const foundInActivePlans = activePlans.some(p => p.id === highlight.id);
      
      if (foundInMomentumEvents || foundInMomentumRoutines || foundInDraftPlans || foundInActivePlans) {
        setHighlightedId(highlight.id);
        setTimeout(() => {
          highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        setTimeout(() => setHighlightedId(null), 3000);
      }
    }
  }, [momentumEvents, momentumRoutines, draftPlans, activePlans]);

  const handleCreateNew = () => {
    setLocation("/plan-builder");
  };

  const handleDeletePlan = (id: string) => {
    const updated = localPlans.filter(p => p.id !== id);
    setLocalPlans(updated);
    saveLocalPlans(updated);
  };
  
  const handleActivatePlan = (id: string) => {
    const updated = localPlans.map(p => 
      p.id === id ? { ...p, status: "active" as PlanStatus, updatedAt: new Date().toISOString() } : p
    );
    setLocalPlans(updated);
    saveLocalPlans(updated);
  };
  
  const handleArchivePlan = (id: string) => {
    const updated = localPlans.map(p => 
      p.id === id ? { ...p, status: "archived" as PlanStatus, updatedAt: new Date().toISOString() } : p
    );
    setLocalPlans(updated);
    saveLocalPlans(updated);
  };

  const renderPlanCard = (plan: Plan) => {
    const isHighlighted = highlightedId === plan.id;
    const isDraft = plan.status === "draft";
    
    return (
      <div 
        key={plan.id}
        ref={isHighlighted ? highlightRef : undefined}
      >
        <Card 
          data-testid={`card-plan-${plan.id}`}
          className={`transition-all duration-500 ${isHighlighted ? "ring-2 ring-primary bg-primary/5" : ""}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isHighlighted && <Sparkles className="w-4 h-4 text-primary shrink-0" />}
                  <h3 className="font-medium truncate">{plan.name}</h3>
                  <Badge variant={plan.status === "active" ? "default" : "secondary"} className="shrink-0">
                    {plan.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {plan.itemCount} items
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Visible Activate button for drafts */}
                {isDraft && (
                  <Button
                    size="sm"
                    onClick={() => handleActivatePlan(plan.id)}
                    className="gap-1.5"
                    data-testid={`button-activate-${plan.id}`}
                  >
                    <Play className="w-4 h-4" />
                    Activate
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" data-testid={`button-plan-menu-${plan.id}`}>
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isDraft && (
                      <DropdownMenuItem 
                        className="gap-2"
                        onClick={() => handleActivatePlan(plan.id)}
                      >
                        <Play className="w-4 h-4" />
                        Activate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      className="gap-2"
                      onClick={() => handleArchivePlan(plan.id)}
                    >
                      <Archive className="w-4 h-4" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="gap-2 text-destructive"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderEmptyState = (status: PlanStatus) => (
    <div className="text-center py-12 text-muted-foreground">
      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p className="mb-4">No {status} plans yet</p>
      {status === "draft" && (
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Create New Plan
        </Button>
      )}
    </div>
  );

  const renderMomentumEvent = (event: CalendarEvent) => {
    const isHighlighted = highlightedId === event.id;
    const eventDate = new Date(event.startTime);
    
    return (
      <div 
        key={event.id}
        ref={isHighlighted ? highlightRef : undefined}
        data-testid={`momentum-event-${event.id}`}
      >
        <Card className={`transition-all duration-500 ${isHighlighted ? "ring-2 ring-primary bg-primary/5" : ""}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {isHighlighted && <Sparkles className="w-4 h-4 text-primary shrink-0" />}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{event.title}</h3>
                <p className="text-sm text-muted-foreground">{event.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                <Clock className="w-3 h-3 mr-1" />
                30 min
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  const renderMomentumRoutine = (routine: SavedRoutine) => {
    const isHighlighted = highlightedId === routine.id;
    
    return (
      <div 
        key={routine.id}
        ref={isHighlighted ? highlightRef : undefined}
        data-testid={`momentum-routine-${routine.id}`}
      >
        <Card className={`transition-all duration-500 ${isHighlighted ? "ring-2 ring-primary bg-primary/5" : ""}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {isHighlighted && <Sparkles className="w-4 h-4 text-primary shrink-0" />}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{routine.title}</h3>
                <p className="text-sm text-muted-foreground">{routine.description}</p>
              </div>
              <Badge variant="outline" className="shrink-0">Task</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Plans" 
        rightContent={
          <Button size="sm" onClick={handleCreateNew} className="gap-2" data-testid="button-new-plan">
            <Plus className="w-4 h-4" />
            New
          </Button>
        }
      />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-2xl mx-auto pb-8">
          {(momentumEvents.length > 0 || momentumRoutines.length > 0) && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Momentum Items
              </h2>
              <div className="space-y-3">
                {momentumEvents.map(renderMomentumEvent)}
                {momentumRoutines.map(renderMomentumRoutine)}
              </div>
            </div>
          )}
          
          <Tabs defaultValue="drafts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="drafts" className="gap-2" data-testid="tab-drafts">
                <FileText className="w-4 h-4" />
                Drafts ({draftPlans.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-2" data-testid="tab-active">
                <CheckCircle className="w-4 h-4" />
                Active ({activePlans.length})
              </TabsTrigger>
              <TabsTrigger value="archived" className="gap-2" data-testid="tab-archived">
                <Archive className="w-4 h-4" />
                Archived ({archivedPlans.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="drafts" className="space-y-3 mt-4">
              {draftPlans.length > 0 ? draftPlans.map(renderPlanCard) : renderEmptyState("draft")}
            </TabsContent>
            
            <TabsContent value="active" className="space-y-3 mt-4">
              {activePlans.length > 0 ? activePlans.map(renderPlanCard) : renderEmptyState("active")}
            </TabsContent>
            
            <TabsContent value="archived" className="space-y-3 mt-4">
              {archivedPlans.length > 0 ? archivedPlans.map(renderPlanCard) : renderEmptyState("archived")}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
