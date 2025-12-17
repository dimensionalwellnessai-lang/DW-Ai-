import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Zap,
  Heart,
  Brain,
  Target,
  Calendar,
  RotateCcw,
  Lightbulb,
  AlertCircle,
  Download,
  FileText,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MoodLog, Goal, Habit } from "@shared/schema";

interface ProgressData {
  moodLogs: MoodLog[];
  goals: Goal[];
  habits: Habit[];
}

interface AIAnalysis {
  summary: string;
  patterns: string[];
  recommendations: string[];
  strengths: string[];
  areasToImprove: string[];
}

export function InsightsPage() {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<ProgressData>({
    queryKey: ["/api/progress"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/insights/analyze");
      return response as unknown as AIAnalysis;
    },
    onSuccess: (data) => {
      setAnalysis({
        summary: data.summary || "Analysis completed.",
        patterns: data.patterns || [],
        recommendations: data.recommendations || [],
        strengths: data.strengths || [],
        areasToImprove: data.areasToImprove || [],
      });
    },
  });

  const exportToCSV = () => {
    if (!data) return;

    const { moodLogs, goals, habits } = data;
    
    let csvContent = "Wellness Journey Report\n";
    csvContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    csvContent += "MOOD LOGS\n";
    csvContent += "Date,Energy Level,Mood Level,Clarity Level\n";
    moodLogs.forEach(log => {
      csvContent += `${log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'N/A'},${log.energyLevel},${log.moodLevel},${log.clarityLevel || 'N/A'}\n`;
    });
    
    csvContent += "\nGOALS\n";
    csvContent += "Title,Description,Progress,Wellness Dimension\n";
    goals.forEach(goal => {
      csvContent += `"${goal.title}","${goal.description || ''}",${goal.progress || 0}%,${goal.wellnessDimension || 'General'}\n`;
    });
    
    csvContent += "\nHABITS\n";
    csvContent += "Title,Description,Frequency,Current Streak\n";
    habits.forEach(habit => {
      csvContent += `"${habit.title}","${habit.description || ''}",${habit.frequency},${habit.streak || 0} days\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wellness-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast({ title: "CSV report downloaded successfully!" });
  };

  const exportToPDF = () => {
    if (!data) return;

    const { moodLogs, goals, habits } = data;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Wellness Journey Report", 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    
    let yPos = 45;
    
    doc.setFontSize(14);
    doc.text("Summary Statistics", 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    const avgEnergy = moodLogs.length > 0 
      ? (moodLogs.reduce((sum, m) => sum + m.energyLevel, 0) / moodLogs.length).toFixed(1)
      : 'N/A';
    const avgMood = moodLogs.length > 0
      ? (moodLogs.reduce((sum, m) => sum + m.moodLevel, 0) / moodLogs.length).toFixed(1)
      : 'N/A';
    const totalStreaks = habits.reduce((sum, h) => sum + (h.streak || 0), 0);
    const avgGoalProgress = goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length)
      : 0;
    
    doc.text(`Average Energy Level: ${avgEnergy}/10`, 20, yPos);
    doc.text(`Average Mood Level: ${avgMood}/10`, 100, yPos);
    yPos += 7;
    doc.text(`Total Habit Streak Days: ${totalStreaks}`, 20, yPos);
    doc.text(`Average Goal Progress: ${avgGoalProgress}%`, 100, yPos);
    yPos += 15;
    
    if (moodLogs.length > 0) {
      doc.setFontSize(14);
      doc.text("Mood Logs", 20, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Energy', 'Mood', 'Clarity']],
        body: moodLogs.slice(0, 10).map(log => [
          log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'N/A',
          `${log.energyLevel}/10`,
          `${log.moodLevel}/10`,
          log.clarityLevel ? `${log.clarityLevel}/10` : 'N/A'
        ]),
        margin: { left: 20 },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    if (goals.length > 0 && yPos < 250) {
      doc.setFontSize(14);
      doc.text("Goals", 20, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Goal', 'Progress', 'Category']],
        body: goals.slice(0, 5).map(goal => [
          goal.title,
          `${goal.progress || 0}%`,
          goal.wellnessDimension || 'General'
        ]),
        margin: { left: 20 },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }
    
    if (habits.length > 0 && yPos < 250) {
      doc.setFontSize(14);
      doc.text("Habits", 20, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [['Habit', 'Frequency', 'Streak']],
        body: habits.slice(0, 5).map(habit => [
          habit.title,
          habit.frequency,
          `${habit.streak || 0} days`
        ]),
        margin: { left: 20 },
      });
    }
    
    doc.save(`wellness-report-${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({ title: "PDF report downloaded successfully!" });
  };

  if (isLoading) {
    return <InsightsSkeleton />;
  }

  const moodLogs = data?.moodLogs || [];
  const goals = data?.goals || [];
  const habits = data?.habits || [];

  const avgEnergy = moodLogs.length > 0
    ? (moodLogs.reduce((sum, m) => sum + m.energyLevel, 0) / moodLogs.length).toFixed(1)
    : null;

  const avgMood = moodLogs.length > 0
    ? (moodLogs.reduce((sum, m) => sum + m.moodLevel, 0) / moodLogs.length).toFixed(1)
    : null;

  const avgClarity = moodLogs.length > 0 && moodLogs.some(m => m.clarityLevel)
    ? (moodLogs.reduce((sum, m) => sum + (m.clarityLevel || 0), 0) / moodLogs.filter(m => m.clarityLevel).length).toFixed(1)
    : null;

  const totalStreaks = habits.reduce((sum, h) => sum + (h.streak || 0), 0);
  const avgGoalProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length)
    : 0;

  const recentTrend = moodLogs.length >= 3
    ? moodLogs.slice(0, 3).reduce((sum, m) => sum + m.energyLevel, 0) / 3 -
      moodLogs.slice(-3).reduce((sum, m) => sum + m.energyLevel, 0) / 3
    : 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-insights-title">
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            Deep analysis of your wellness patterns and personalized recommendations
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={!data || (moodLogs.length === 0 && habits.length === 0 && goals.length === 0)}
            data-testid="button-export-csv"
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={exportToPDF}
            disabled={!data || (moodLogs.length === 0 && habits.length === 0 && goals.length === 0)}
            data-testid="button-export-pdf"
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending || (moodLogs.length === 0 && habits.length === 0)}
            data-testid="button-generate-insights"
          >
            {analyzeMutation.isPending ? (
              <>
                <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate AI Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="card-insight-energy">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Energy</p>
                <p className="text-3xl font-bold mt-1">{avgEnergy ?? "--"}/10</p>
                {recentTrend !== 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    {recentTrend > 0 ? (
                      <TrendingUp className="h-4 w-4 text-chart-2" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <span className={`text-xs ${recentTrend > 0 ? 'text-chart-2' : 'text-destructive'}`}>
                      {recentTrend > 0 ? '+' : ''}{recentTrend.toFixed(1)} recent
                    </span>
                  </div>
                )}
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-4/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-insight-mood">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Mood</p>
                <p className="text-3xl font-bold mt-1">{avgMood ?? "--"}/10</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-5/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-insight-clarity">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Clarity</p>
                <p className="text-3xl font-bold mt-1">{avgClarity ?? "--"}/10</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-insight-streaks">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Streaks</p>
                <p className="text-3xl font-bold mt-1">{totalStreaks} days</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-1/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-chart-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-data-overview">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Data Overview</CardTitle>
            <CardDescription>Your wellness tracking summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-chart-5" />
                <span>Mood Logs</span>
              </div>
              <Badge variant="secondary">{moodLogs.length} entries</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-chart-1" />
                <span>Goals</span>
              </div>
              <Badge variant="secondary">{goals.length} goals ({avgGoalProgress}% avg)</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-chart-2" />
                <span>Habits</span>
              </div>
              <Badge variant="secondary">{habits.length} habits</Badge>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-top-habits">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Top Performing Habits</CardTitle>
            <CardDescription>Your best habit streaks</CardDescription>
          </CardHeader>
          <CardContent>
            {habits.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No habits yet. Start building healthy routines!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {habits
                  .sort((a, b) => (b.streak || 0) - (a.streak || 0))
                  .slice(0, 5)
                  .map((habit) => (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                      data-testid={`habit-streak-${habit.id}`}
                    >
                      <span className="font-medium">{habit.title}</span>
                      <Badge variant={(habit.streak || 0) > 0 ? "default" : "secondary"}>
                        {habit.streak || 0} day streak
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {analysis && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-chart-1/10 to-chart-2/10 border-0" data-testid="card-ai-summary">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shrink-0">
                  <Sparkles className="h-6 w-6 text-chart-1" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">AI Summary</h3>
                  <p className="text-muted-foreground font-serif leading-relaxed" data-testid="text-ai-summary">
                    {analysis.summary}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-patterns">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-chart-1" />
                  Patterns Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <ul className="space-y-3">
                    {analysis.patterns.map((pattern, i) => (
                      <li key={i} className="flex items-start gap-3 p-2 rounded-md bg-muted/30">
                        <Brain className="h-4 w-4 text-chart-3 mt-0.5 shrink-0" />
                        <span className="text-sm">{pattern}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card data-testid="card-recommendations">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-chart-4" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <ul className="space-y-3">
                    {analysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3 p-2 rounded-md bg-muted/30">
                        <Sparkles className="h-4 w-4 text-chart-4 mt-0.5 shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card data-testid="card-strengths">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-chart-2" />
                  Your Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <ul className="space-y-3">
                    {analysis.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-3 p-2 rounded-md bg-chart-2/10">
                        <Target className="h-4 w-4 text-chart-2 mt-0.5 shrink-0" />
                        <span className="text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card data-testid="card-areas-improve">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-chart-5" />
                  Areas to Improve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <ul className="space-y-3">
                    {analysis.areasToImprove.map((area, i) => (
                      <li key={i} className="flex items-start gap-3 p-2 rounded-md bg-chart-5/10">
                        <Heart className="h-4 w-4 text-chart-5 mt-0.5 shrink-0" />
                        <span className="text-sm">{area}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!analysis && (
        <Card className="border-dashed" data-testid="card-no-analysis">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Ready for Deep Analysis</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Click "Generate AI Analysis" to get personalized insights about your wellness patterns, 
              including detected trends, recommendations, and areas for improvement.
            </p>
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending || (moodLogs.length === 0 && habits.length === 0)}
              data-testid="button-generate-insights-cta"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate AI Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-10 w-10 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-40 mb-1" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
