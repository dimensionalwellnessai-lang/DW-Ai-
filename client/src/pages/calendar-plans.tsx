import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, Calendar, ListTodo, RotateCcw, Sparkles } from "lucide-react";

const SECTIONS = [
  {
    id: "calendar",
    name: "Calendar",
    icon: Calendar,
    description: "View and manage your schedule",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "plans",
    name: "Plans",
    icon: ListTodo,
    description: "Action items from your conversations",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "routines",
    name: "Routines",
    icon: RotateCcw,
    description: "Daily and weekly patterns that support you",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

export function CalendarPlansPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-display font-bold text-xl">Calendar & Plans</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          <p className="text-muted-foreground font-body text-center py-4">
            These tools exist to support what comes out of conversation. They're here to help you, not to add pressure.
          </p>

          <div className="space-y-3">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <Card key={section.id} className="hover-elevate" data-testid={`card-section-${section.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${section.bgColor}`}>
                        <Icon className={`h-6 w-6 ${section.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-semibold">{section.name}</h3>
                        <p className="text-sm text-muted-foreground font-body mt-1">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="pt-6">
            <Link href="/">
              <Button variant="outline" className="w-full" data-testid="button-back-to-assistant">
                <Sparkles className="h-4 w-4 mr-2" />
                Back to assistant
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
