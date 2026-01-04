import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, MessageSquareText, Dumbbell, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export function WorkoutsPage() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Workouts" 
        backPath="/"
        rightContent={
          <Link href="/">
            <Button size="sm" className="gap-2" data-testid="button-ask-ai-workout">
              <MessageSquareText className="h-4 w-4" />
              Ask AI
            </Button>
          </Link>
        }
      />
      
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg">This isn't ready yet</h3>
              <p className="text-muted-foreground font-body mt-1">
                Your workout library and plan builder is on its way. For now, ask the AI to help you plan a workout.
              </p>
            </div>
            <div className="flex flex-col gap-2 items-center">
              <Link href="/">
                <Button className="gap-2" data-testid="button-create-workout-plan">
                  <Plus className="h-4 w-4" />
                  Plan Workout with AI
                </Button>
              </Link>
              <Link href="/">
                <Button 
                  variant="ghost" 
                  data-testid="button-go-back"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
