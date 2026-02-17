import { useState } from "react";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { Target, Plus, CheckCircle2, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GoalsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  const { data: goals = [] } = useQuery<any[]>({
    queryKey: ['/api/goals'],
  });

  const createGoalMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create goal');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      setShowForm(false);
      setGoalTitle("");
      setGoalDescription("");
      toast({ title: "Goal created successfully!" });
    },
  });

  const createHabitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create habit');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/habits'] });
      setHabitDialogOpen(false);
      setSelectedGoal(null);
      toast({ 
        title: "Habit created!", 
        description: "Your new habit has been created to support your goal." 
      });
    },
  });

  const handleCreateGoal = () => {
    if (goalTitle.trim()) {
      createGoalMutation.mutate({
        title: goalTitle,
        description: goalDescription,
        status: 'active',
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      <PageHeader 
        title="My Goals" 
        rightContent={
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        }
      />
      <div className="flex-1 overflow-auto">
        <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <p className="text-muted-foreground text-center">
          Track your progress toward what matters most
        </p>

        {/* Create Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Goal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Title</label>
                <Input
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g., Run a 5K, Learn Spanish"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Description (optional)</label>
                <Textarea
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  placeholder="What does success look like?"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateGoal} disabled={!goalTitle.trim()}>
                  Create Goal
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals List */}
        <div className="space-y-4">
          {goals.length === 0 && !showForm && (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium">No goals yet</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Create your first goal to start tracking progress
                </p>
              </CardContent>
            </Card>
          )}

          {goals.map((goal: any) => (
            <Card key={goal.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {goal.title}
                      {goal.status === 'completed' && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </CardTitle>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {goal.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={goal.status === 'active' ? 'default' : 'secondary'}>
                    {goal.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {goal.progress !== undefined && (
                  <div>
                    <Progress value={goal.progress || 0} className="h-2" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {goal.progress || 0}% complete
                    </p>
                  </div>
                )}
                {goal.status === 'active' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      setSelectedGoal(goal);
                      setHabitDialogOpen(true);
                    }}
                  >
                    <Repeat className="h-4 w-4 mr-2" />
                    Create habit to support this goal
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Habit Dialog */}
        <CreateHabitDialog
          open={habitDialogOpen}
          onOpenChange={setHabitDialogOpen}
          goal={selectedGoal}
          onCreateHabit={(habitData) => createHabitMutation.mutate(habitData)}
        />
      </div>
      </div>
    </div>
  );
}

interface CreateHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: any;
  onCreateHabit: (data: any) => void;
}

function CreateHabitDialog({ open, onOpenChange, goal, onCreateHabit }: CreateHabitDialogProps) {
  const [habitTitle, setHabitTitle] = useState("");
  const [habitDescription, setHabitDescription] = useState("");

  // Pre-fill based on goal when dialog opens and reset on close
  React.useEffect(() => {
    if (open && goal) {
      setHabitTitle(`Daily action for: ${goal.title}`);
      setHabitDescription(`Build momentum toward "${goal.title}" by taking consistent daily action.`);
    } else if (!open) {
      setHabitTitle("");
      setHabitDescription("");
    }
  }, [goal, open]);

  const handleCreate = () => {
    if (!habitTitle.trim()) return;
    
    onCreateHabit({
      title: habitTitle,
      description: habitDescription,
      frequency: 'daily',
      isActive: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Supporting Habit</DialogTitle>
          <DialogDescription>
            Build a habit that supports your goal: {goal?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Habit Title</label>
            <Input
              value={habitTitle}
              onChange={(e) => setHabitTitle(e.target.value)}
              placeholder="e.g., Practice Spanish for 15 minutes"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea
              value={habitDescription}
              onChange={(e) => setHabitDescription(e.target.value)}
              placeholder="What will you do?"
              className="mt-1"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!habitTitle.trim()}>
              Create Habit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
