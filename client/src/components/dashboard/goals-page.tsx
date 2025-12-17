import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Target, Plus, Trash2, Edit } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Goal, InsertGoal } from "@shared/schema";

const WELLNESS_DIMENSIONS = [
  { value: "physical", label: "Physical Health" },
  { value: "mental", label: "Mental Wellness" },
  { value: "emotional", label: "Emotional Balance" },
  { value: "financial", label: "Financial Health" },
  { value: "social", label: "Social Connection" },
  { value: "creative", label: "Creative Expression" },
  { value: "spiritual", label: "Spiritual Growth" },
  { value: "professional", label: "Professional Development" },
];

export function GoalsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    wellnessDimension: "",
  });

  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertGoal>) => {
      return apiRequest("POST", "/api/goals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Goal created successfully!" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create goal", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Goal> }) => {
      return apiRequest("PATCH", `/api/goals/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Goal updated successfully!" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update goal", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Goal deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete goal", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ title: "", description: "", wellnessDimension: "" });
    setEditingGoal(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || "",
      wellnessDimension: goal.wellnessDimension || "",
    });
    setIsDialogOpen(true);
  };

  const updateProgress = (goal: Goal, newProgress: number) => {
    updateMutation.mutate({ id: goal.id, data: { progress: newProgress } });
  };

  if (isLoading) {
    return <GoalsSkeleton />;
  }

  const activeGoals = goals.filter((g) => g.isActive);
  const completedGoals = goals.filter((g) => !g.isActive || (g.progress ?? 0) >= 100);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-goals-title">Goals</h1>
          <p className="text-muted-foreground">Track your wellness goals and milestones</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} data-testid="button-add-goal">
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Goal Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Exercise 3 times a week"
                  required
                  data-testid="input-goal-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add more details about this goal..."
                  data-testid="input-goal-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dimension">Wellness Dimension</Label>
                <Select
                  value={formData.wellnessDimension}
                  onValueChange={(value) => setFormData({ ...formData, wellnessDimension: value })}
                >
                  <SelectTrigger data-testid="select-goal-dimension">
                    <SelectValue placeholder="Select a dimension" />
                  </SelectTrigger>
                  <SelectContent>
                    {WELLNESS_DIMENSIONS.map((dim) => (
                      <SelectItem key={dim.value} value={dim.value}>
                        {dim.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-goal"
                >
                  {editingGoal ? "Save Changes" : "Create Goal"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-chart-1/10 flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-chart-1" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No goals yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Set meaningful goals to track your progress across different wellness dimensions.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-goal">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Active Goals ({activeGoals.length})</h2>
            <div className="grid gap-4">
              {activeGoals.map((goal) => (
                <Card key={goal.id} data-testid={`card-goal-${goal.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-lg">{goal.title}</h3>
                          {goal.wellnessDimension && (
                            <Badge variant="secondary">{goal.wellnessDimension}</Badge>
                          )}
                        </div>
                        {goal.description && (
                          <p className="text-muted-foreground">{goal.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(goal)}
                          data-testid={`button-edit-goal-${goal.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(goal.id)}
                          data-testid={`button-delete-goal-${goal.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{goal.progress ?? 0}%</span>
                      </div>
                      <Progress value={goal.progress ?? 0} className="h-3" />
                      <div className="flex gap-2 pt-2 flex-wrap">
                        {[25, 50, 75, 100].map((val) => (
                          <Button
                            key={val}
                            variant="outline"
                            size="sm"
                            onClick={() => updateProgress(goal, val)}
                            disabled={(goal.progress ?? 0) >= val}
                            data-testid={`button-progress-${goal.id}-${val}`}
                          >
                            {val}%
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {completedGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Completed ({completedGoals.length})
              </h2>
              <div className="grid gap-4 opacity-60">
                {completedGoals.map((goal) => (
                  <Card key={goal.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-chart-2/10 flex items-center justify-center">
                          <Target className="h-4 w-4 text-chart-2" />
                        </div>
                        <span className="font-medium">{goal.title}</span>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GoalsSkeleton() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
