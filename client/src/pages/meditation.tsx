import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export function MeditationPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Meditation" />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <p className="text-muted-foreground font-body">
            This will be a searchable meditation library with mood-based suggestions and the ability to schedule sessions to your calendar.
          </p>

          <div className="flex gap-2 flex-wrap">
            <Link href="/">
              <Button className="gap-2" data-testid="button-ask-ai-meditation">
                <MessageSquareText className="h-4 w-4" />
                Ask AI for a meditation
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
