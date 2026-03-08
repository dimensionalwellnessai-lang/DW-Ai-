import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  Edit2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target,
  Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LIFE_DIMENSIONS, ASSESSMENT_QUESTIONS, getDimensionById, type LifeDimension } from "@/lib/life-dimensions";
import { motion } from "framer-motion";
import { COPY } from "@/copy/en";

type ViewMode = "overview" | "dimension-detail" | "assessment";

interface Assessment {
  id: string;
  dimension: string;
  score: number;
  answers: Record<string, number>;
  assessedAt: string;
}

interface DimensionSystem {
  id: string;
  dimension: string;
  name: string;
  description: string | null;
  components: string[] | null;
  relatedGoals: string[] | null;
  isActive: boolean;
}

interface Goal {
  id: string;
  title: string;
  dimension?: string;
  status: string;
}

export default function LifeBlueprintV2() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [assessmentDimension, setAssessmentDimension] = useState<string | null>(null);
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, number>>({});
  const [showingResults, setShowingResults] = useState(false);
  const [editingResetProtocol, setEditingResetProtocol] = useState(false);
  const [newSystemName, setNewSystemName] = useState("");
  const [newSystemDescription, setNewSystemDescription] = useState("");
  const [showAddSystem, setShowAddSystem] = useState(false);

  // Fetch assessments
  const { data: assessments = [] } = useQuery<Assessment[]>({
    queryKey: ['/api/life-dimension-assessments'],
  });

  // Fetch dimension systems
  const { data: allSystems = [] } = useQuery<DimensionSystem[]>({
    queryKey: ['/api/dimension-systems'],
  });

  // Fetch goals
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
  });

  // Fetch reset protocol
  const { data: resetProtocol } = useQuery({
    queryKey: ['/api/reset-protocol'],
  });

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async (data: { dimension: string; score: number; answers: Record<string, number> }) => {
      const res = await fetch('/api/life-dimension-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save assessment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/life-dimension-assessments'] });
      toast({
        title: "Assessment completed!",
        description: "Your dimension score has been updated.",
      });
      setShowingResults(true);
    },
  });

  // Create system mutation
  const createSystemMutation = useMutation({
    mutationFn: async (data: { dimension: string; name: string; description: string }) => {
      const res = await fetch('/api/dimension-systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create system');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dimension-systems'] });
      toast({
        title: "System created!",
        description: "Your new system has been added.",
      });
      setShowAddSystem(false);
      setNewSystemName("");
      setNewSystemDescription("");
    },
  });

  // Delete system mutation
  const deleteSystemMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dimension-systems/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete system');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dimension-systems'] });
      toast({
        title: "System deleted",
        description: "The system has been removed.",
      });
    },
  });

  // Update reset protocol mutation
  const updateResetProtocolMutation = useMutation({
    mutationFn: async (data: { redFlags?: string[]; howIReset?: string[]; whenThingsGetHard?: string[] }) => {
      const typedProtocol = resetProtocol as any;
      if (typedProtocol?.id) {
        const res = await fetch(`/api/reset-protocol/${typedProtocol.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        });
        return res.json();
      } else {
        const res = await fetch('/api/reset-protocol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        });
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reset-protocol'] });
      setEditingResetProtocol(false);
      toast({
        title: "Reset Protocol updated!",
        description: "Your recovery system has been saved.",
      });
    },
  });

  // Get latest assessment for a dimension
  const getLatestAssessment = (dimension: string): Assessment | undefined => {
    const dimensionAssessments = assessments
      .filter((a) => a.dimension === dimension)
      .sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime());
    return dimensionAssessments[0];
  };

  // Calculate overall balance score
  const calculateBalanceScore = (): number => {
    if (assessments.length === 0) return 0;
    const scores = LIFE_DIMENSIONS.map((dim) => {
      const assessment = getLatestAssessment(dim.id);
      return assessment?.score || 0;
    });
    const total = scores.reduce((sum, score) => sum + score, 0);
    return Math.round((total / LIFE_DIMENSIONS.length) * 20); // Convert to 0-100 scale
  };

  // Get visual progress indicators
  const getProgressIndicators = (score: number): string => {
    const filled = Math.round(score);
    const empty = 5 - filled;
    return "●".repeat(filled) + "○".repeat(empty);
  };

  // Start assessment
  const startAssessment = (dimension: string) => {
    setAssessmentDimension(dimension);
    setAssessmentAnswers({});
    setShowingResults(false);
    setViewMode("assessment");
  };

  // Submit assessment
  const submitAssessment = () => {
    if (!assessmentDimension) return;
    
    const scores = Object.values(assessmentAnswers);
    const expectedQuestions = questions.length;
    
    if (scores.length < expectedQuestions) {
      toast({
        title: "Incomplete assessment",
        description: "Please answer all questions.",
        variant: "destructive",
      });
      return;
    }

    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    createAssessmentMutation.mutate({
      dimension: assessmentDimension,
      score: averageScore,
      answers: assessmentAnswers,
    });
  };

  // Get systems for dimension
  const getSystemsForDimension = (dimension: string) => {
    return allSystems.filter((s) => s.dimension === dimension && s.isActive);
  };

  // Get goals for dimension (with more precise matching)
  const getGoalsForDimension = (dimension: string) => {
    return goals.filter((g) => {
      // Exact match on dimension field
      if (g.dimension === dimension) return true;
      
      // Check if goal title contains dimension as a standalone word
      const titleLower = g.title.toLowerCase();
      const dimensionLower = dimension.toLowerCase();
      
      // Use word boundary matching to avoid false positives
      const wordBoundaryRegex = new RegExp(`\\b${dimensionLower}\\b`, 'i');
      return wordBoundaryRegex.test(titleLower);
    });
  };

  // Calculate last check-in
  const getLastCheckIn = (): string => {
    if (assessments.length === 0) return "Never";
    const sorted = [...assessments].sort((a, b) => 
      new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
    );
    const latest = sorted[0];
    const date = new Date(latest.assessedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Get strengths and growth areas from assessment
  const getStrengthsAndGrowth = (dimension: string, answers: Record<string, number>) => {
    const questions = ASSESSMENT_QUESTIONS[dimension] || [];
    const strengths: string[] = [];
    const growth: string[] = [];

    Object.entries(answers).forEach(([index, score]) => {
      const question = questions[parseInt(index)];
      if (score >= 4) {
        strengths.push(question);
      } else if (score <= 2) {
        growth.push(question);
      }
    });

    return { strengths, growth };
  };

  // Render overview
  const renderOverview = () => {
    const balanceScore = calculateBalanceScore();
    const lastCheckIn = getLastCheckIn();

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overall Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{balanceScore}%</div>
              <Progress value={balanceScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Check-In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{lastCheckIn}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Assessed Dimensions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {LIFE_DIMENSIONS.filter((d) => getLatestAssessment(d.id)).length}/8
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dimensions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LIFE_DIMENSIONS.map((dimension) => {
            const Icon = dimension.icon;
            const assessment = getLatestAssessment(dimension.id);
            const score = assessment?.score || 0;
            const hasAssessment = !!assessment;

            return (
              <motion.div
                key={dimension.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => {
                    setSelectedDimension(dimension.id);
                    setViewMode("dimension-detail");
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-3 rounded-lg ${dimension.bg}`}>
                          <Icon className={`h-6 w-6 ${dimension.color}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{dimension.label}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {dimension.description}
                          </p>
                          {hasAssessment ? (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{getProgressIndicators(score)}</span>
                                <Badge variant="outline" className="ml-auto">
                                  {score.toFixed(1)}/5
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Last assessed {new Date(assessment.assessedAt).toLocaleDateString()}
                              </p>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <AlertCircle className="h-4 w-4" />
                              <span>Not yet assessed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Take an assessment or update your dimensions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {LIFE_DIMENSIONS.map((dimension) => (
                <Button
                  key={dimension.id}
                  variant="outline"
                  size="sm"
                  onClick={() => startAssessment(dimension.id)}
                >
                  Assess {dimension.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render dimension detail
  const renderDimensionDetail = () => {
    if (!selectedDimension) return null;

    const dimension = getDimensionById(selectedDimension);
    if (!dimension) return null;

    const Icon = dimension.icon;
    const assessment = getLatestAssessment(dimension.id);
    const systems = getSystemsForDimension(dimension.id);
    const dimensionGoals = getGoalsForDimension(dimension.id);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedDimension(null);
              setViewMode("overview");
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </Button>
        </div>

        {/* Dimension Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-lg ${dimension.bg}`}>
                  <Icon className={`h-8 w-8 ${dimension.color}`} />
                </div>
                <div>
                  <CardTitle className="text-2xl mb-2">{dimension.label}</CardTitle>
                  <CardDescription className="text-base">
                    {dimension.description}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {assessment ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold mb-2">
                      {getProgressIndicators(assessment.score)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Score: {assessment.score.toFixed(1)}/5.0
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last assessed: {new Date(assessment.assessedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button onClick={() => startAssessment(dimension.id)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Retake Assessment
                  </Button>
                </div>

                {assessment.score >= 4 ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <TrendingUp className="h-5 w-5" />
                    <span className="font-medium">Strong dimension</span>
                  </div>
                ) : assessment.score <= 2.5 ? (
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <TrendingDown className="h-5 w-5" />
                    <span className="font-medium">Needs attention</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">{COPY.lifeBlueprint.assessmentEmpty}</p>
                <Button onClick={() => startAssessment(dimension.id)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Take Assessment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Related Goals
                </CardTitle>
                <CardDescription>Goals linked to this dimension</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dimensionGoals.length > 0 ? (
              <div className="space-y-2">
                {dimensionGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <span className="font-medium">{goal.title}</span>
                    <Badge variant={goal.status === "completed" ? "default" : "secondary"}>
                      {goal.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                {COPY.lifeBlueprint.goalsEmpty}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Systems */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Systems & Frameworks
                </CardTitle>
                <CardDescription>Supporting systems for this dimension</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddSystem(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add System
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showAddSystem && (
              <div className="mb-4 p-4 border rounded-lg space-y-3">
                <div className="space-y-2">
                  <Label>System Name</Label>
                  <Input
                    value={newSystemName}
                    onChange={(e) => setNewSystemName(e.target.value)}
                    placeholder="e.g., Morning Routine"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newSystemDescription}
                    onChange={(e) => setNewSystemDescription(e.target.value)}
                    placeholder="Describe this system..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddSystem(false);
                      setNewSystemName("");
                      setNewSystemDescription("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newSystemName.trim()) {
                        createSystemMutation.mutate({
                          dimension: dimension.id,
                          name: newSystemName,
                          description: newSystemDescription,
                        });
                      }
                    }}
                    disabled={!newSystemName.trim()}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save System
                  </Button>
                </div>
              </div>
            )}

            {systems.length > 0 ? (
              <div className="space-y-3">
                {systems.map((system) => (
                  <div
                    key={system.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{system.name}</h4>
                        {system.description && (
                          <p className="text-sm text-muted-foreground">{system.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSystemMutation.mutate(system.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : !showAddSystem ? (
              <p className="text-muted-foreground text-center py-4">
                No systems created yet. Add your first system to get started.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render assessment
  const renderAssessment = () => {
    if (!assessmentDimension) return null;

    const dimension = getDimensionById(assessmentDimension);
    if (!dimension) return null;

    const Icon = dimension.icon;
    const questions = ASSESSMENT_QUESTIONS[assessmentDimension] || [];
    const allAnswered = questions.every((_, i) => assessmentAnswers[i] !== undefined);

    // Show results after submission
    if (showingResults) {
      const latestAssessment = getLatestAssessment(assessmentDimension);
      if (!latestAssessment) return null;

      const { strengths, growth } = getStrengthsAndGrowth(
        assessmentDimension,
        latestAssessment.answers
      );

      return (
        <div className="space-y-6 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-lg ${dimension.bg}`}>
                  <Icon className={`h-8 w-8 ${dimension.color}`} />
                </div>
                <div>
                  <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
                  <CardDescription>Your {dimension.label} dimension results</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-6">
                <div className="text-5xl font-bold mb-4">
                  {getProgressIndicators(latestAssessment.score)}
                </div>
                <div className="text-3xl font-bold mb-2">
                  {latestAssessment.score.toFixed(1)}/5.0
                </div>
                <p className="text-muted-foreground">Overall Score</p>
              </div>

              <Separator />

              {strengths.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-green-600 dark:text-green-400">
                      Strengths
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {strengths.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {growth.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <h3 className="font-semibold text-orange-600 dark:text-orange-400">
                      Growth Areas
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {growth.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewMode("overview");
                    setAssessmentDimension(null);
                    setShowingResults(false);
                  }}
                >
                  Back to Overview
                </Button>
                <Button
                  onClick={() => {
                    setSelectedDimension(assessmentDimension);
                    setViewMode("dimension-detail");
                    setAssessmentDimension(null);
                    setShowingResults(false);
                  }}
                >
                  View Dimension Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Show assessment questions
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setViewMode("overview");
              setAssessmentDimension(null);
              setAssessmentAnswers({});
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel Assessment
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className={`p-4 rounded-lg ${dimension.bg}`}>
                <Icon className={`h-8 w-8 ${dimension.color}`} />
              </div>
              <div>
                <CardTitle className="text-2xl">{dimension.label} Assessment</CardTitle>
                <CardDescription>
                  Answer these questions to assess your current state
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <Progress
              value={(Object.keys(assessmentAnswers).length / questions.length) * 100}
              className="mb-4"
            />

            {questions.map((question, index) => (
              <div key={index} className="space-y-3">
                <Label className="text-base font-medium">
                  {index + 1}. {question}
                </Label>
                <RadioGroup
                  value={assessmentAnswers[index]?.toString()}
                  onValueChange={(value) =>
                    setAssessmentAnswers({ ...assessmentAnswers, [index]: parseInt(value) })
                  }
                >
                  <div className="flex justify-between gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <div key={value} className="flex flex-col items-center gap-2 flex-1">
                        <RadioGroupItem
                          value={value.toString()}
                          id={`q${index}-${value}`}
                          className="w-6 h-6"
                        />
                        <Label
                          htmlFor={`q${index}-${value}`}
                          className="text-xs text-center cursor-pointer"
                        >
                          {value === 1 && "Strongly Disagree"}
                          {value === 2 && "Disagree"}
                          {value === 3 && "Neutral"}
                          {value === 4 && "Agree"}
                          {value === 5 && "Strongly Agree"}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
                {index < questions.length - 1 && <Separator className="mt-6" />}
              </div>
            ))}

            <div className="flex justify-end pt-6">
              <Button
                onClick={submitAssessment}
                disabled={!allAnswered || createAssessmentMutation.isPending}
                size="lg"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                {createAssessmentMutation.isPending ? "Saving..." : "Complete Assessment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Check if reset protocol is complete
  const isResetProtocolComplete = (protocol: any): boolean => {
    if (!protocol) return false;
    return !!(
      protocol.redFlags?.length > 0 ||
      protocol.howIReset?.length > 0 ||
      protocol.whenThingsGetHard?.length > 0
    );
  };

  const resetProtocolComplete = isResetProtocolComplete(resetProtocol);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      <PageHeader title="Life Blueprint" />
      <div className="flex-1 overflow-auto">
        <div className="container max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <p className="text-muted-foreground">
            Assess and optimize your life across 8 key dimensions. Build systems that support your wellbeing.
          </p>
        </div>

        <Tabs defaultValue="dimensions" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="dimensions">8 Dimensions</TabsTrigger>
            <TabsTrigger value="reset">Reset Protocol</TabsTrigger>
          </TabsList>

          <TabsContent value="dimensions" className="space-y-6 mt-6">
            {viewMode === "overview" && renderOverview()}
            {viewMode === "dimension-detail" && renderDimensionDetail()}
            {viewMode === "assessment" && renderAssessment()}
          </TabsContent>

          <TabsContent value="reset" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Reset Protocol</CardTitle>
                    <CardDescription>Your personal recovery system for tough days</CardDescription>
                  </div>
                  {!editingResetProtocol && resetProtocol && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingResetProtocol(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingResetProtocol ? (
                  <ResetProtocolEditor
                    protocol={resetProtocol}
                    onSave={(data: { redFlags?: string[]; howIReset?: string[]; whenThingsGetHard?: string[] }) => updateResetProtocolMutation.mutate(data)}
                    onCancel={() => setEditingResetProtocol(false)}
                  />
                ) : resetProtocolComplete ? (
                  <ResetProtocolView protocol={resetProtocol} />
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">{COPY.lifeBlueprint.resetEmpty}</p>
                    <Button onClick={() => setEditingResetProtocol(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Reset Protocol
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </div>
  );
}

// Reset Protocol Components (reused from existing page)
function ResetProtocolView({ protocol }: { protocol: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">🚨 Red Flags</h3>
        {protocol.redFlags?.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {protocol.redFlags.map((flag: string, i: number) => (
              <li key={i} className="text-muted-foreground">{flag}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No red flags defined</p>
        )}
      </div>
      <div>
        <h3 className="font-semibold mb-2">🔄 How I Reset</h3>
        {protocol.howIReset?.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {protocol.howIReset.map((action: string, i: number) => (
              <li key={i} className="text-muted-foreground">{action}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No reset actions defined</p>
        )}
      </div>
      <div>
        <h3 className="font-semibold mb-2">💪 When Things Get Hard</h3>
        {protocol.whenThingsGetHard?.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {protocol.whenThingsGetHard.map((plan: string, i: number) => (
              <li key={i} className="text-muted-foreground">{plan}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No backup plans defined</p>
        )}
      </div>
    </div>
  );
}

function ResetProtocolEditor({ protocol, onSave, onCancel }: { 
  protocol: any; 
  onSave: (data: { redFlags?: string[]; howIReset?: string[]; whenThingsGetHard?: string[] }) => void; 
  onCancel: () => void 
}) {
  const [redFlags, setRedFlags] = useState<string[]>(protocol?.redFlags || []);
  const [howIReset, setHowIReset] = useState<string[]>(protocol?.howIReset || []);
  const [whenThingsGetHard, setWhenThingsGetHard] = useState<string[]>(protocol?.whenThingsGetHard || []);
  const [newRedFlag, setNewRedFlag] = useState("");
  const [newReset, setNewReset] = useState("");
  const [newBackup, setNewBackup] = useState("");

  const addItemAndClearInput = (value: string, setter: Function, list: string[]) => {
    if (value.trim()) {
      setter([...list, value.trim()]);
      return "";
    }
    return value;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>🚨 Red Flags (Early warning signs)</Label>
        <div className="space-y-2">
          {redFlags.map((flag, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={flag} onChange={(e) => {
                const updated = [...redFlags];
                updated[i] = e.target.value;
                setRedFlags(updated);
              }} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRedFlags(redFlags.filter((_, idx) => idx !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newRedFlag}
              onChange={(e) => setNewRedFlag(e.target.value)}
              placeholder="e.g., Skipping workouts 3 days in a row"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setNewRedFlag(addItemAndClearInput(newRedFlag, setRedFlags, redFlags));
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewRedFlag(addItemAndClearInput(newRedFlag, setRedFlags, redFlags))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>🔄 How I Reset (Tools to get back on track)</Label>
        <div className="space-y-2">
          {howIReset.map((reset, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={reset} onChange={(e) => {
                const updated = [...howIReset];
                updated[i] = e.target.value;
                setHowIReset(updated);
              }} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHowIReset(howIReset.filter((_, idx) => idx !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newReset}
              onChange={(e) => setNewReset(e.target.value)}
              placeholder="e.g., 10-minute walk outside"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setNewReset(addItemAndClearInput(newReset, setHowIReset, howIReset));
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewReset(addItemAndClearInput(newReset, setHowIReset, howIReset))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>💪 When Things Get Hard (Backup plans)</Label>
        <div className="space-y-2">
          {whenThingsGetHard.map((plan, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={plan} onChange={(e) => {
                const updated = [...whenThingsGetHard];
                updated[i] = e.target.value;
                setWhenThingsGetHard(updated);
              }} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWhenThingsGetHard(whenThingsGetHard.filter((_, idx) => idx !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newBackup}
              onChange={(e) => setNewBackup(e.target.value)}
              placeholder="e.g., Call my accountability partner"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setNewBackup(addItemAndClearInput(newBackup, setWhenThingsGetHard, whenThingsGetHard));
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewBackup(addItemAndClearInput(newBackup, setWhenThingsGetHard, whenThingsGetHard))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave({ redFlags, howIReset, whenThingsGetHard })}>
          <Save className="h-4 w-4 mr-2" />
          Save Reset Protocol
        </Button>
      </div>
    </div>
  );
}
