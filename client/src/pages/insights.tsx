import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, Activity, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";

export function InsightsPage() {
  const { data: insight } = useQuery<{ insight: string }>({
    queryKey: ["/api/dashboard/insight"],
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Insights" backPath="/" />
      
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Current Reflection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground font-body">
                {insight?.insight || "Check in a few more times and we'll start noticing patterns together."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Dimension Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground font-body text-sm mb-4">
                This is on its way. For now, the AI can help you reflect on your balance.
              </p>
              <Link href="/">
                <Button variant="outline" size="sm" data-testid="button-reflect-with-ai">
                  Reflect with AI
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold">Deeper Insights On the Way</h3>
              <p className="text-muted-foreground font-body text-sm mt-1">
                As you use Flip the Switch more, we'll surface patterns about your energy, mood, and activity across all wellness dimensions. No grades or scores - gentle observations.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
