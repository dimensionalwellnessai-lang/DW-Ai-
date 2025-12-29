import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquareText } from "lucide-react";

export function MealsPage() {
  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background to-muted/30" />
      
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold">Meals</h1>
          <p className="text-muted-foreground font-body">
            This will become a real meal library with weekly planner, dietary filters, macro tracking, and grocery list generation.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link href="/">
            <Button variant="secondary" className="gap-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <Link href="/assistant">
            <Button className="gap-2" data-testid="button-ask-ai-meal">
              <MessageSquareText className="h-4 w-4" />
              Ask AI to build a meal plan
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
