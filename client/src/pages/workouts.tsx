import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, MessageSquareText, Dumbbell } from "lucide-react";

export function WorkoutsPage() {
  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background to-muted/30" />
      
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold">Workouts</h1>
            <p className="text-muted-foreground font-body mt-1">
              Build and track your workout plans
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/assistant">
              <Button className="gap-2" data-testid="button-ask-ai-workout">
                <MessageSquareText className="h-4 w-4" />
                Ask AI
              </Button>
            </Link>
          </div>
        </header>

        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg">Workout Library Coming Soon</h3>
              <p className="text-muted-foreground font-body mt-1">
                This will be your workout library and plan builder. You'll be able to browse exercises, create workout plans, and schedule sessions to your calendar.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Link href="/assistant">
                <Button className="gap-2" data-testid="button-create-workout-plan">
                  <Plus className="h-4 w-4" />
                  Create Workout Plan with AI
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
